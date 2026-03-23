import { SENSITIVE_LOG_FIELDS } from '../privacy/data-classification.js'

type LogLevel = 'info' | 'warn' | 'error'

type LogData = Record<string, unknown>

function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const input = value as Record<string, unknown>
  const output: Record<string, unknown> = {}

  for (const [key, rawValue] of Object.entries(input)) {
    if (SENSITIVE_LOG_FIELDS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]'
      continue
    }

    output[key] = redactSensitiveData(rawValue)
  }

  return output
}

function emit(level: LogLevel, event: string, data: LogData = {}) {
  const sanitized = redactSensitiveData(data)
  const safeData: LogData = sanitized && typeof sanitized === 'object' ? (sanitized as LogData) : {}

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeData
  }

  const line = JSON.stringify(payload)

  if (level === 'error') {
    console.error(line)
    return
  }

  console.log(line)
}

export function logInfo(event: string, data: LogData = {}) {
  emit('info', event, data)
}

export function logWarn(event: string, data: LogData = {}) {
  emit('warn', event, data)
}

export function logError(event: string, data: LogData = {}) {
  emit('error', event, data)
}
