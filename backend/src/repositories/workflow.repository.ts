import { requestWithTimeoutAndIdempotentRetry } from './http-client.repository.js'

export type DenunciaStatus = 'aberta' | 'em_analise' | 'resolvida'

export type DenunciaWorkflowSnapshot = {
  id: string
  protocolo: string
  status: DenunciaStatus
  created_at: string
}

export type DenunciaPublicSnapshot = {
  id: string
  protocolo: string
  nome_empresa: string
  setor: string
  status: DenunciaStatus
}

export type DenunciaHistoricoPublicRow = {
  evento: string
  detalhes: string | null
  created_at: string
}

export type HistoricoInput = {
  denuncia_id: string
  evento: string
  detalhes: string | null
  ator_tipo: string
  ator_id: string | null
}

export type TratativaInput = {
  denuncia_id: string
  admin_id: string | null
  descricao: string
}

export type TratativaResult = {
  id: string
  denuncia_id: string
  admin_id: string | null
  descricao: string
  created_at: string
}

type SupabaseError = {
  code?: string
  details?: string
  hint?: string
  message?: string
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

async function parseSupabaseError(response: Response): Promise<SupabaseError | null> {
  return (await response.json().catch(() => null)) as SupabaseError | null
}

function buildHeaders(serviceKey: string, includeContentType = false): Record<string, string> {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    ...(includeContentType ? { 'content-type': 'application/json' } : {})
  }
}

export async function getDenunciaWorkflowSnapshot(denunciaId: string): Promise<DenunciaWorkflowSnapshot | null> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/denuncias?id=eq.${encodeURIComponent(denunciaId)}&select=id,protocolo,status,created_at&limit=1`,
    {
      method: 'GET',
      operationName: 'get_denuncia_workflow_snapshot',
      headers: buildHeaders(serviceKey)
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao consultar denúncia: ${response.status}`)
  }

  const rows = (await response.json()) as DenunciaWorkflowSnapshot[]
  return rows[0] ?? null
}

export async function getDenunciaByProtocol(protocolo: string): Promise<DenunciaPublicSnapshot | null> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/denuncias?protocolo=eq.${encodeURIComponent(protocolo)}&select=id,protocolo,nome_empresa,setor,status&limit=1`,
    {
      method: 'GET',
      operationName: 'get_denuncia_by_protocol',
      headers: buildHeaders(serviceKey)
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao consultar denúncia por protocolo: ${response.status}`)
  }

  const rows = (await response.json()) as DenunciaPublicSnapshot[]
  return rows[0] ?? null
}

export async function listDenunciaHistoricoPublic(denunciaId: string): Promise<DenunciaHistoricoPublicRow[]> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/historico_denuncia?denuncia_id=eq.${encodeURIComponent(denunciaId)}&select=evento,detalhes,created_at&order=created_at.asc`,
    {
      method: 'GET',
      operationName: 'list_denuncia_historico_public',
      headers: buildHeaders(serviceKey)
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao consultar histórico público da denúncia: ${response.status}`)
  }

  return (await response.json()) as DenunciaHistoricoPublicRow[]
}

export async function insertHistoricoEvent(input: HistoricoInput): Promise<void> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/rest/v1/historico_denuncia`, {
    method: 'POST',
    operationName: 'insert_historico_event',
    headers: {
      ...buildHeaders(serviceKey, true),
      prefer: 'return=minimal'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new Error(`Falha ao registrar histórico: ${response.status}`)
  }
}

export async function createTratativa(input: TratativaInput): Promise<TratativaResult> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/rest/v1/tratativas`, {
    method: 'POST',
    operationName: 'create_tratativa',
    headers: {
      ...buildHeaders(serviceKey, true),
      prefer: 'return=representation'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new Error(`Falha ao criar tratativa: ${response.status}`)
  }

  const rows = (await response.json()) as TratativaResult[]
  const created = rows[0]

  if (!created) {
    throw new Error('Resposta inválida ao criar tratativa')
  }

  return created
}

export async function countTratativasByDenuncia(denunciaId: string): Promise<number> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/tratativas?denuncia_id=eq.${encodeURIComponent(denunciaId)}&select=id`,
    {
      method: 'GET',
      operationName: 'count_tratativas_by_denuncia',
      headers: {
        ...buildHeaders(serviceKey),
        prefer: 'count=exact'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao consultar tratativas: ${response.status}`)
  }

  const countHeader = response.headers.get('content-range')
  if (!countHeader) {
    return 0
  }

  const parts = countHeader.split('/')
  const total = Number(parts[1])

  return Number.isNaN(total) ? 0 : total
}

export async function transitionDenunciaStatus(params: {
  denunciaId: string
  novoStatus: DenunciaStatus
  atorTipo: string
  atorId: string | null
  detalhes: string | null
}): Promise<void> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/rest/v1/rpc/transition_denuncia_status`, {
    method: 'POST',
    operationName: 'transition_denuncia_status',
    headers: buildHeaders(serviceKey, true),
    body: JSON.stringify({
      p_denuncia_id: params.denunciaId,
      p_novo_status: params.novoStatus,
      p_ator_tipo: params.atorTipo,
      p_ator_id: params.atorId,
      p_detalhes: params.detalhes
    })
  })

  if (!response.ok) {
    const errorBody = await parseSupabaseError(response)
    const message = `${errorBody?.message ?? ''} ${errorBody?.details ?? ''}`.toUpperCase()

    if (message.includes('DENUNCIA_NAO_ENCONTRADA')) {
      throw new Error('DENUNCIA_NAO_ENCONTRADA')
    }

    if (message.includes('TRANSICAO_STATUS_INVALIDA')) {
      throw new Error('TRANSICAO_STATUS_INVALIDA')
    }

    throw new Error(`Falha ao alterar status: ${response.status}`)
  }
}
