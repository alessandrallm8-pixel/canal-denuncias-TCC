import { logWarn } from '../observability/logger.js'

type RequestProfile = 'query' | 'upload'

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT'])
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function getIdempotentRetryCount(): number {
  return parsePositiveNumber(process.env.BACKEND_IDEMPOTENT_RETRY_COUNT, 1)
}

function getTimeoutMs(profile: RequestProfile): number {
  if (profile === 'upload') {
    return parsePositiveNumber(process.env.BACKEND_TIMEOUT_UPLOAD_MS, 45000)
  }

  return parsePositiveNumber(process.env.BACKEND_TIMEOUT_QUERY_MS, 20000)
}

function shouldRetry(method: string, statusCode: number): boolean {
  return IDEMPOTENT_METHODS.has(method) && RETRYABLE_STATUS.has(statusCode)
}

function mergeSignals(signalA: AbortSignal | undefined, signalB: AbortSignal): AbortSignal {
  if (!signalA) {
    return signalB
  }

  return AbortSignal.any([signalA, signalB])
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function parseHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return 'invalid_url'
  }
}

export async function requestWithTimeoutAndIdempotentRetry(
  url: string,
  init: RequestInit & {
    profile?: RequestProfile
    operationName: string
  }
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const profile = init.profile ?? 'query'
  const timeoutMs = getTimeoutMs(profile)
  const host = parseHost(url)
  const maxAttempts = IDEMPOTENT_METHODS.has(method) ? getIdempotentRetryCount() + 1 : 1
  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now()
    const timeoutController = new AbortController()
    const timeoutHandle = setTimeout(() => timeoutController.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...init,
        signal: mergeSignals(init.signal ?? undefined, timeoutController.signal)
      })

      if (response.ok) {
        return response
      }

      const shouldRetryThisAttempt = attempt < maxAttempts && shouldRetry(method, response.status)
      logWarn('http.client.response_non_ok', {
        operation_name: init.operationName,
        method,
        profile,
        host,
        attempt,
        max_attempts: maxAttempts,
        status_code: response.status,
        duration_ms: Date.now() - startedAt,
        retry: shouldRetryThisAttempt
      })

      if (shouldRetryThisAttempt) {
        continue
      }

      return response
    } catch (error) {
      if (isAbortError(error)) {
        lastError = new Error(`Timeout em ${init.operationName} após ${timeoutMs}ms`)
        logWarn('http.client.timeout', {
          operation_name: init.operationName,
          method,
          profile,
          host,
          attempt,
          max_attempts: maxAttempts,
          timeout_ms: timeoutMs,
          duration_ms: Date.now() - startedAt
        })
      } else {
        lastError = error
        logWarn('http.client.network_error', {
          operation_name: init.operationName,
          method,
          profile,
          host,
          attempt,
          max_attempts: maxAttempts,
          duration_ms: Date.now() - startedAt,
          error_type: error instanceof Error ? error.name : 'UnknownError',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }

      if (attempt < maxAttempts && IDEMPOTENT_METHODS.has(method)) {
        continue
      }

      throw lastError instanceof Error ? lastError : new Error(`Falha em ${init.operationName}`)
    } finally {
      clearTimeout(timeoutHandle)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Falha em ${init.operationName}`)
}
