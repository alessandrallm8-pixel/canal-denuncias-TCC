import { randomBytes } from 'crypto'
import { HttpError } from '../../errors/http-error.js'
import { sanitizeDenunciaPayload } from '../../privacy/denuncia-privacy.js'
import { logError, logWarn } from '../../observability/logger.js'
import {
  createDenunciaRepository,
  ProtocolCollisionError,
  type CreateDenunciaRepositoryResult
} from '../../repositories/denuncias.repository.js'
import { registerDenunciaCreatedHistory } from './workflow.service.js'

const MAX_PROTOCOL_RETRIES = 5

type CreateDenunciaContext = {
  requestId?: string
}

function generateProtocol(): string {
  const now = new Date()
  const y = String(now.getUTCFullYear())
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const randomSuffix = randomBytes(4).toString('hex').toUpperCase()

  return `DEN-${y}${m}${d}-${randomSuffix}`
}

export async function createDenuncia(
  payload: unknown,
  context: CreateDenunciaContext = {}
): Promise<CreateDenunciaRepositoryResult> {
  const sanitized = sanitizeDenunciaPayload(payload)

  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_PROTOCOL_RETRIES; attempt += 1) {
    const protocolo = generateProtocol()

    try {
      const created = await createDenunciaRepository({
        ...sanitized,
        protocolo,
        status: 'aberta'
      })

      try {
        await registerDenunciaCreatedHistory(created.id)
      } catch (error) {
        logError('denuncias.create.history_failed', {
          request_id: context.requestId,
          attempt,
          denuncia_id: created.id,
          protocolo: created.protocolo,
          error_type: error instanceof Error ? error.name : 'UnknownError',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido'
        })

        if (error instanceof HttpError) {
          throw error
        }

        throw new HttpError(500, 'Falha ao registrar histórico inicial da denúncia')
      }

      return created
    } catch (error) {
      if (error instanceof ProtocolCollisionError) {
        logWarn('denuncias.create.protocol_collision', {
          request_id: context.requestId,
          attempt,
          protocolo
        })
        lastError = error
        continue
      }

      logError('denuncias.create.failed', {
        request_id: context.requestId,
        attempt,
        error_type: error instanceof Error ? error.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      })

      if (error instanceof HttpError) {
        throw error
      }

      if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
        throw new HttpError(500, error.message)
      }

      if (error instanceof Error && error.message.startsWith('Timeout em')) {
        throw new HttpError(504, error.message)
      }

      throw new HttpError(500, 'Falha ao criar denúncia')
    }
  }

  if (lastError) {
    throw new HttpError(500, 'Falha ao gerar protocolo único')
  }

  throw new HttpError(500, 'Falha ao criar denúncia')
}
