import type { DenunciaStatus } from './workflow.repository.js'
import { requestWithTimeoutAndIdempotentRetry } from './http-client.repository.js'

type SupabaseError = {
  code?: string
  details?: string
  hint?: string
  message?: string
}

export type AdminDenunciaListFilters = {
  status?: DenunciaStatus
  dataInicio?: string
  dataFim?: string
  page: number
  pageSize: number
}

export type AdminDenunciaListItem = {
  id: string
  protocolo: string
  anonima: boolean
  nome_empresa: string
  tipo_ocorrencia: string
  setor: string
  status: DenunciaStatus
  created_at: string
  updated_at: string
}

export type AdminDenunciaDetail = {
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

export type AdminAnexoItem = {
  id: string
  denuncia_id: string
  arquivo_url: string
  arquivo_nome: string
  mime_type: string
  created_at: string
}

export type AdminHistoricoItem = {
  id: string
  denuncia_id: string
  evento: string
  detalhes: string | null
  ator_tipo: string
  ator_id: string | null
  created_at: string
}

function getSupabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL?.trim() ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const missing: string[] = []

  if (!baseUrl) {
    missing.push('SUPABASE_URL')
  }

  if (!serviceKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length > 0) {
    throw new Error(`Configuração Supabase ausente: ${missing.join(', ')}`)
  }

  return { baseUrl, serviceKey }
}

function buildHeaders(serviceKey: string, includeContentType = false): Record<string, string> {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    ...(includeContentType ? { 'content-type': 'application/json' } : {})
  }
}

function readTotalFromContentRange(contentRange: string | null): number {
  if (!contentRange || !contentRange.includes('/')) {
    return 0
  }

  const total = Number(contentRange.split('/')[1])
  return Number.isFinite(total) ? total : 0
}

async function parseSupabaseError(response: Response): Promise<SupabaseError | null> {
  return (await response.json().catch(() => null)) as SupabaseError | null
}

export async function listAdminDenuncias(filters: AdminDenunciaListFilters): Promise<{ items: AdminDenunciaListItem[]; total: number }> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const query = new URLSearchParams({
    select: 'id,protocolo,anonima,nome_empresa,tipo_ocorrencia,setor,status,created_at,updated_at',
    order: 'created_at.desc',
    limit: String(filters.pageSize),
    offset: String((filters.page - 1) * filters.pageSize)
  })

  if (filters.status) {
    query.set('status', `eq.${filters.status}`)
  }

  if (filters.dataInicio && filters.dataFim) {
    const endDate = `${filters.dataFim}T23:59:59.999Z`
    query.set('and', `(created_at.gte.${filters.dataInicio},created_at.lte.${endDate})`)
  } else if (filters.dataInicio) {
    query.set('created_at', `gte.${filters.dataInicio}`)
  } else if (filters.dataFim) {
    const endDate = `${filters.dataFim}T23:59:59.999Z`
    query.set('created_at', `lte.${endDate}`)
  }

  const response = await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/rest/v1/denuncias?${query.toString()}`, {
    method: 'GET',
    operationName: 'list_admin_denuncias',
    headers: {
      ...buildHeaders(serviceKey),
      prefer: 'count=exact'
    }
  })

  if (!response.ok) {
    throw new Error(`Falha ao listar denúncias administrativas: ${response.status}`)
  }

  const items = (await response.json()) as AdminDenunciaListItem[]
  const total = readTotalFromContentRange(response.headers.get('content-range'))

  return { items, total }
}

export async function getAdminDenunciaById(denunciaId: string): Promise<AdminDenunciaDetail | null> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/denuncias?id=eq.${encodeURIComponent(denunciaId)}&select=id,protocolo,anonima,nome_denunciante,email_denunciante,nome_empresa,setor,descricao,tipo_ocorrencia,local,data_ocorrencia_aprox,status,created_at,updated_at&limit=1`,
    {
      method: 'GET',
      operationName: 'get_admin_denuncia_by_id',
      headers: buildHeaders(serviceKey)
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao consultar denúncia administrativa: ${response.status}`)
  }

  const rows = (await response.json()) as AdminDenunciaDetail[]
  return rows[0] ?? null
}

export async function listAdminAnexosByDenunciaId(denunciaId: string): Promise<AdminAnexoItem[]> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/anexos_denuncia?denuncia_id=eq.${encodeURIComponent(denunciaId)}&select=id,denuncia_id,arquivo_url,arquivo_nome,mime_type,created_at&order=created_at.asc`,
    {
      method: 'GET',
      operationName: 'list_admin_anexos_by_denuncia_id',
      headers: buildHeaders(serviceKey)
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao consultar anexos administrativos: ${response.status}`)
  }

  return (await response.json()) as AdminAnexoItem[]
}

export async function listAdminHistoricoByDenunciaId(denunciaId: string): Promise<AdminHistoricoItem[]> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/historico_denuncia?denuncia_id=eq.${encodeURIComponent(denunciaId)}&select=id,denuncia_id,evento,detalhes,ator_tipo,ator_id,created_at&order=created_at.asc`,
    {
      method: 'GET',
      operationName: 'list_admin_historico_by_denuncia_id',
      headers: buildHeaders(serviceKey)
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao consultar histórico administrativo: ${response.status}`)
  }

  return (await response.json()) as AdminHistoricoItem[]
}

export async function assertAdminUserActive(adminId: string | null): Promise<void> {
  if (!adminId) {
    return
  }

  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/usuarios_admin?id=eq.${encodeURIComponent(adminId)}&select=id,ativo&limit=1`,
    {
      method: 'GET',
      operationName: 'assert_admin_user_active',
      headers: buildHeaders(serviceKey)
    }
  )

  if (!response.ok) {
    const parsed = await parseSupabaseError(response)
    throw new Error(`Falha ao validar usuário admin: ${response.status} ${parsed?.message ?? ''}`.trim())
  }

  const rows = (await response.json()) as Array<{ id: string; ativo: boolean }>
  const user = rows[0]

  if (!user || !user.ativo) {
    throw new Error('ADMIN_NAO_AUTORIZADO')
  }
}
