import { after, before, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createDenuncia } from '../services/denuncias/create-denuncia.service.js'
import { uploadDenunciaAnexo } from '../services/denuncias/upload-anexo.service.js'
import { getDenunciaByProtocolPublic } from '../services/denuncias/get-denuncia-por-protocolo.service.js'
import { createDenunciaTratativa, updateDenunciaStatus } from '../services/denuncias/workflow.service.js'
import { requireAdminAuth } from '../middlewares/admin-auth.middleware.js'
import { HttpError } from '../errors/http-error.js'

type DenunciaStatus = 'aberta' | 'em_analise' | 'resolvida'

type DenunciaRow = {
  id: string
  protocolo: string
  anonima: boolean
  nome_denunciante: string | null
  email_denunciante: string | null
  nome_empresa: string
  setor: string
  descricao: string
  tipo_ocorrencia: string
  local: string
  data_ocorrencia_aprox: string | null
  status: DenunciaStatus
  created_at: string
  updated_at: string
}

type HistoricoRow = {
  id: string
  denuncia_id: string
  evento: string
  detalhes: string | null
  ator_tipo: string
  ator_id: string | null
  created_at: string
}

type AnexoRow = {
  id: string
  denuncia_id: string
  arquivo_url: string
  arquivo_nome: string
  mime_type: string
  created_at: string
}

type TratativaRow = {
  id: string
  denuncia_id: string
  admin_id: string | null
  descricao: string
  created_at: string
}

type AdminRow = {
  id: string
  ativo: boolean
}

type FakeDb = {
  denuncias: DenunciaRow[]
  historico: HistoricoRow[]
  anexos: AnexoRow[]
  tratativas: TratativaRow[]
  admins: AdminRow[]
  storage: Set<string>
}

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0JYAAAAASUVORK5CYII='
const ADMIN_ID = '11111111-1111-4111-8111-111111111111'
const NOW = () => new Date().toISOString()

let db: FakeDb

function createDb(): FakeDb {
  return {
    denuncias: [],
    historico: [],
    anexos: [],
    tratativas: [],
    admins: [{ id: ADMIN_ID, ativo: true }],
    storage: new Set<string>()
  }
}

function parseEq(value: string | null): string | null {
  if (!value) {
    return null
  }

  if (!value.startsWith('eq.')) {
    return value
  }

  return decodeURIComponent(value.slice(3))
}

function createJsonResponse(payload: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  })
}

function createNoContent(status = 204): Response {
  return new Response(null, { status })
}

function generateUuid(prefix: string, index: number): string {
  const raw = `${prefix}${index}`.padEnd(12, '0').slice(0, 12)
  return `00000000-0000-4000-8000-${raw}`
}

function installFakeSupabaseFetch(currentDb: FakeDb) {
  const realFetch = globalThis.fetch

  return mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const urlValue = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const url = new URL(urlValue)

    if (!url.hostname.includes('supabase.test')) {
      return realFetch(input as RequestInfo | URL, init)
    }

    if (url.pathname === '/rest/v1/denuncias' && method === 'POST') {
      const payload = JSON.parse(String(init?.body ?? '{}')) as Omit<DenunciaRow, 'id' | 'created_at' | 'updated_at'>
      const row: DenunciaRow = {
        ...payload,
        id: generateUuid('d', currentDb.denuncias.length + 1),
        created_at: NOW(),
        updated_at: NOW()
      }
      currentDb.denuncias.push(row)
      return createJsonResponse([{ id: row.id, protocolo: row.protocolo, status: row.status, created_at: row.created_at }], 201)
    }

    if (url.pathname === '/rest/v1/denuncias' && method === 'GET') {
      const idEq = parseEq(url.searchParams.get('id'))
      const protocoloEq = parseEq(url.searchParams.get('protocolo'))
      let items = [...currentDb.denuncias]

      if (idEq) {
        items = items.filter((item) => item.id === idEq)
      }
      if (protocoloEq) {
        items = items.filter((item) => item.protocolo === protocoloEq)
      }

      return createJsonResponse(items.slice(0, 1), 200)
    }

    if (url.pathname === '/rest/v1/historico_denuncia' && method === 'POST') {
      const payload = JSON.parse(String(init?.body ?? '{}')) as Omit<HistoricoRow, 'id' | 'created_at'>
      const row: HistoricoRow = {
        ...payload,
        id: generateUuid('h', currentDb.historico.length + 1),
        created_at: NOW()
      }
      currentDb.historico.push(row)
      return createNoContent(201)
    }

    if (url.pathname === '/rest/v1/historico_denuncia' && method === 'GET') {
      const denunciaId = parseEq(url.searchParams.get('denuncia_id'))
      const items = currentDb.historico
        .filter((item) => !denunciaId || item.denuncia_id === denunciaId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
      return createJsonResponse(items, 200)
    }

    if (url.pathname === '/rest/v1/anexos_denuncia' && method === 'POST') {
      const payload = JSON.parse(String(init?.body ?? '{}')) as Omit<AnexoRow, 'id' | 'created_at'>
      const row: AnexoRow = {
        ...payload,
        id: generateUuid('a', currentDb.anexos.length + 1),
        created_at: NOW()
      }
      currentDb.anexos.push(row)
      return createJsonResponse([row], 201)
    }

    if (url.pathname === '/rest/v1/tratativas' && method === 'POST') {
      const payload = JSON.parse(String(init?.body ?? '{}')) as Omit<TratativaRow, 'id' | 'created_at'>
      const row: TratativaRow = {
        ...payload,
        id: generateUuid('t', currentDb.tratativas.length + 1),
        created_at: NOW()
      }
      currentDb.tratativas.push(row)
      return createJsonResponse([row], 201)
    }

    if (url.pathname === '/rest/v1/tratativas' && method === 'GET') {
      const denunciaId = parseEq(url.searchParams.get('denuncia_id'))
      const items = currentDb.tratativas.filter((item) => !denunciaId || item.denuncia_id === denunciaId)
      return createJsonResponse(items, 200, { 'content-range': `0-${Math.max(0, items.length - 1)}/${items.length}` })
    }

    if (url.pathname === '/rest/v1/usuarios_admin' && method === 'GET') {
      const adminId = parseEq(url.searchParams.get('id'))
      const items = currentDb.admins.filter((item) => !adminId || item.id === adminId)
      return createJsonResponse(items, 200)
    }

    if (url.pathname === '/rest/v1/rpc/transition_denuncia_status' && method === 'POST') {
      const payload = JSON.parse(String(init?.body ?? '{}')) as {
        p_denuncia_id: string
        p_novo_status: DenunciaStatus
      }
      const target = currentDb.denuncias.find((item) => item.id === payload.p_denuncia_id)
      if (!target) {
        return createJsonResponse({ message: 'DENUNCIA_NAO_ENCONTRADA' }, 400)
      }

      target.status = payload.p_novo_status
      target.updated_at = NOW()
      return createNoContent(200)
    }

    if (url.pathname.startsWith('/storage/v1/object/') && method === 'POST') {
      currentDb.storage.add(url.pathname)
      return createNoContent(200)
    }

    if (url.pathname.startsWith('/storage/v1/object/') && method === 'DELETE') {
      currentDb.storage.delete(url.pathname)
      return createNoContent(204)
    }

    throw new Error(`Fetch mock sem handler para ${method} ${url.pathname}?${url.searchParams.toString()}`)
  })
}

function toUploadedFile(buffer: Buffer, filename: string) {
  return {
    filename,
    mimeType: 'application/octet-stream',
    size: buffer.length,
    buffer
  }
}

async function expectHttpError(promise: Promise<unknown>, statusCode: number): Promise<void> {
  try {
    await promise
    assert.fail(`Era esperado erro HTTP ${statusCode}`)
  } catch (error) {
    assert.ok(error instanceof HttpError)
    assert.equal(error.statusCode, statusCode)
  }
}

describe('Fase 10 - QA critico sem dependencias externas', () => {
  before(() => {
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
    process.env.ADMIN_API_TOKENS = `token-admin:admin:${ADMIN_ID}`
    process.env.TRIAGEM_SLA_HOURS = '72'

    db = createDb()
    installFakeSupabaseFetch(db)
  })

  after(() => {
    mock.restoreAll()
  })

  it('cria denuncia anonima e identificada', async () => {
    const anonima = await createDenuncia({
      anonima: true,
      nome_denunciante: 'Nao Deve Persistir',
      email_denunciante: 'nao@persistir.com',
      nome_empresa: 'Empresa A',
      setor: 'Operacoes',
      tipo_ocorrencia: 'Assedio moral',
      descricao: 'Relato detalhado com mais de vinte caracteres para validar entrada.',
      local: 'Unidade 1'
    })

    const identificada = await createDenuncia({
      anonima: false,
      nome_denunciante: 'Pessoa Teste',
      email_denunciante: 'pessoa@empresa.com',
      nome_empresa: 'Empresa B',
      setor: 'Financeiro',
      tipo_ocorrencia: 'Sobrecarga',
      descricao: 'Descricao longa o suficiente para ser considerada valida no cadastro.',
      local: 'Escritorio central'
    })

    const rowAnonima = db.denuncias.find((item) => item.id === anonima.id)
    const rowIdentificada = db.denuncias.find((item) => item.id === identificada.id)

    assert.equal(rowAnonima?.nome_denunciante, null)
    assert.equal(rowAnonima?.email_denunciante, null)
    assert.equal(rowIdentificada?.email_denunciante, 'pessoa@empresa.com')
  })

  it('upload de imagem funciona e arquivo invalido falha', async () => {
    const created = await createDenuncia({
      anonima: true,
      nome_empresa: 'Empresa C',
      setor: 'RH',
      tipo_ocorrencia: 'Teste upload',
      descricao: 'Descricao valida para teste de upload de evidencia em imagem.',
      local: 'Bloco A'
    })

    const ok = await uploadDenunciaAnexo(created.id, toUploadedFile(Buffer.from(PNG_1X1_BASE64, 'base64'), 'evidencia.png'))
    assert.equal(ok.denuncia_id, created.id)

    await expectHttpError(uploadDenunciaAnexo(created.id, toUploadedFile(Buffer.from('texto invalido'), 'arquivo.txt')), 400)
  })

  it('consulta por protocolo existente e inexistente', async () => {
    const created = await createDenuncia({
      anonima: true,
      nome_empresa: 'Empresa D',
      setor: 'Atendimento',
      tipo_ocorrencia: 'Consulta',
      descricao: 'Descricao valida para consulta por protocolo no fluxo publico.',
      local: 'Recepcao'
    })

    db.historico.push({
      id: generateUuid('h', 9999),
      denuncia_id: created.id,
      evento: 'evento_interno',
      detalhes: 'email privado pessoa@empresa.com',
      ator_tipo: 'sistema',
      ator_id: null,
      created_at: NOW()
    })

    const tracked = await getDenunciaByProtocolPublic(created.protocolo)
    assert.equal(tracked.protocolo, created.protocolo)
    assert.equal(tracked.nome_empresa, 'Empresa D')
    assert.equal(tracked.setor, 'Atendimento')
    assert.ok(!JSON.stringify(tracked).includes('pessoa@empresa.com'))

    await expectHttpError(getDenunciaByProtocolPublic('DEN-20990101-AAAAAAAA'), 404)
  })

  it('bloqueia autenticacao admin sem bearer token', async () => {
    const req = {
      get: (_name: string) => undefined
    } as unknown as Parameters<typeof requireAdminAuth>[0]

    const nextCalls: unknown[] = []
    requireAdminAuth(req, {} as never, (error?: unknown) => {
      nextCalls.push(error)
    })

    assert.equal(nextCalls.length, 1)
    assert.ok(nextCalls[0] instanceof HttpError)
    assert.equal((nextCalls[0] as HttpError).statusCode, 401)
  })

  it('valida regressao de status e auditoria de historico', async () => {
    const created = await createDenuncia({
      anonima: true,
      nome_empresa: 'Empresa E',
      setor: 'TI',
      tipo_ocorrencia: 'Fluxo BPM',
      descricao: 'Descricao valida para testes de transicao de status administrativa.',
      local: 'Andar 2'
    })

    const actor = { atorTipo: 'admin', atorId: ADMIN_ID }

    await expectHttpError(updateDenunciaStatus(created.id, 'resolvida', actor), 400)

    const emAnalise = await updateDenunciaStatus(created.id, 'em_analise', actor)
    assert.equal(emAnalise.status_atual, 'em_analise')

    await expectHttpError(updateDenunciaStatus(created.id, 'resolvida', actor), 400)

    await createDenunciaTratativa(created.id, 'Tratativa registrada para permitir resolucao.', actor)
    const resolvida = await updateDenunciaStatus(created.id, 'resolvida', actor)
    assert.equal(resolvida.status_atual, 'resolvida')

    const eventos = db.historico.filter((item) => item.denuncia_id === created.id).map((item) => item.evento)
    assert.ok(eventos.includes('denuncia_criada'))
    assert.ok(eventos.includes('triagem_iniciada'))
    assert.ok(eventos.includes('tratativa_registrada'))
    assert.ok(eventos.includes('caso_resolvido'))
  })
})
