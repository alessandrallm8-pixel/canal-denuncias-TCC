import { HttpError } from '../errors/http-error.js'

type DenunciaPayload = {
  anonima: boolean
  nome_denunciante: string | null
  email_denunciante: string | null
  nome_empresa: string
  setor: string
  descricao: string
  tipo_ocorrencia: string
  local: string
  data_ocorrencia_aprox: string | null
}

function requireString(value: unknown, field: string, maxLength: number, minLength = 1): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, `Campo inválido: ${field}`)
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new HttpError(400, `Campo inválido: ${field}`)
  }

  return normalized
}

function normalizeEmail(value: unknown): string {
  const email = requireString(value, 'email_denunciante', 180).toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email)) {
    throw new HttpError(400, 'Campo inválido: email_denunciante')
  }

  return email
}

function normalizeOptionalDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'Campo inválido: data_ocorrencia_aprox')
  }

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!isoDateRegex.test(value)) {
    throw new HttpError(400, 'Campo inválido: data_ocorrencia_aprox')
  }

  return value
}

export function sanitizeDenunciaPayload(payload: unknown): DenunciaPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'Payload inválido')
  }

  const input = payload as Record<string, unknown>

  if (typeof input.anonima !== 'boolean') {
    throw new HttpError(400, 'Campo inválido: anonima')
  }

  const basePayload = {
    anonima: input.anonima,
    nome_empresa: requireString(input.nome_empresa, 'nome_empresa', 160),
    setor: requireString(input.setor, 'setor', 120),
    descricao: requireString(input.descricao, 'descricao', 5000, 20),
    tipo_ocorrencia: requireString(input.tipo_ocorrencia, 'tipo_ocorrencia', 120),
    local: requireString(input.local, 'local', 160),
    data_ocorrencia_aprox: normalizeOptionalDate(input.data_ocorrencia_aprox)
  }

  if (input.anonima) {
    return {
      ...basePayload,
      nome_denunciante: null,
      email_denunciante: null
    }
  }

  return {
    ...basePayload,
    nome_denunciante: requireString(input.nome_denunciante, 'nome_denunciante', 140),
    email_denunciante: normalizeEmail(input.email_denunciante)
  }
}
