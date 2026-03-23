import { requestWithTimeoutAndIdempotentRetry } from './http-client.repository.js'
import { logWarn } from '../observability/logger.js'

export type CreateDenunciaRepositoryInput = {
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
  status: 'aberta'
}

export type CreateDenunciaRepositoryResult = {
  id: string
  protocolo: string
  status: 'aberta'
  created_at: string
}

type SupabaseError = {
  code?: string
  details?: string
  hint?: string
  message?: string
}

export class ProtocolCollisionError extends Error {
  constructor() {
    super('Protocolo duplicado')
    this.name = 'ProtocolCollisionError'
  }
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

function isProtocolConflict(error: SupabaseError | null): boolean {
  if (!error) {
    return false
  }

  const details = `${error.details ?? ''} ${error.message ?? ''}`.toLowerCase()
  return error.code === '23505' && details.includes('protocolo')
}

export async function createDenunciaRepository(
  input: CreateDenunciaRepositoryInput
): Promise<CreateDenunciaRepositoryResult> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/rest/v1/denuncias`, {
    method: 'POST',
    operationName: 'create_denuncia_repository',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as SupabaseError | null

    if (isProtocolConflict(errorBody)) {
      throw new ProtocolCollisionError()
    }

    logWarn('supabase.create_denuncia_repository.failed', {
      status_code: response.status,
      supabase_code: errorBody?.code,
      supabase_message: errorBody?.message,
      supabase_hint: errorBody?.hint,
      supabase_details: errorBody?.details
    })

    throw new Error(`Falha ao persistir denúncia: ${response.status}`)
  }

  const rows = (await response.json()) as Array<CreateDenunciaRepositoryResult>
  const created = rows[0]

  if (!created) {
    throw new Error('Resposta inválida ao criar denúncia')
  }

  return created
}
