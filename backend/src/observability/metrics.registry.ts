type HttpSample = {
  durationMs: number
  statusCode: number
}

type EndpointStats = {
  method: string
  endpoint: string
  samples: HttpSample[]
  total: number
  errors: number
}

type MetricsSnapshot = {
  generated_at: string
  http: {
    sem_upload_p95_ms: number | null
    endpoints: Array<{
      method: string
      endpoint: string
      requests: number
      errors: number
      error_rate: number
      p95_ms: number | null
    }>
  }
  denuncias: {
    total_sucesso: number
    ultimas_24h: number
  }
}

const MAX_LATENCY_SAMPLES = 2000
const DENUNCIAS_SUCCESS_PATH = '/api/denuncias'
const endpointStatsMap = new Map<string, EndpointStats>()
const nonUploadDurations: number[] = []
const denunciaSuccessTimestamps: number[] = []
let totalDenunciasSuccess = 0

function normalizeEndpoint(endpoint: string): string {
  if (!endpoint.startsWith('/')) {
    return `/${endpoint}`
  }

  return endpoint
}

function addDurationSample(target: number[], value: number): void {
  target.push(value)
  if (target.length > MAX_LATENCY_SAMPLES) {
    target.shift()
  }
}

function calculateP95(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const ordered = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil(ordered.length * 0.95) - 1)
  return ordered[index] ?? null
}

function trimDenunciaVolume(now: number): void {
  const threshold = now - 24 * 60 * 60 * 1000

  while (denunciaSuccessTimestamps.length > 0 && denunciaSuccessTimestamps[0]! < threshold) {
    denunciaSuccessTimestamps.shift()
  }
}

function isDenunciaCreationSuccess(method: string, endpoint: string, statusCode: number): boolean {
  return method === 'POST' && endpoint === DENUNCIAS_SUCCESS_PATH && statusCode >= 200 && statusCode < 300
}

export function recordHttpMetric(params: {
  method: string
  endpoint: string
  statusCode: number
  durationMs: number
  isUploadRoute: boolean
}): void {
  const endpoint = normalizeEndpoint(params.endpoint)
  const method = params.method.toUpperCase()
  const key = `${method} ${endpoint}`
  const existing = endpointStatsMap.get(key)
  const stats: EndpointStats = existing ?? {
    method,
    endpoint,
    samples: [],
    total: 0,
    errors: 0
  }

  stats.total += 1
  if (params.statusCode >= 400) {
    stats.errors += 1
  }

  stats.samples.push({ durationMs: params.durationMs, statusCode: params.statusCode })
  if (stats.samples.length > MAX_LATENCY_SAMPLES) {
    stats.samples.shift()
  }
  endpointStatsMap.set(key, stats)

  if (!params.isUploadRoute) {
    addDurationSample(nonUploadDurations, params.durationMs)
  }

  if (isDenunciaCreationSuccess(method, endpoint, params.statusCode)) {
    totalDenunciasSuccess += 1
    const now = Date.now()
    denunciaSuccessTimestamps.push(now)
    trimDenunciaVolume(now)
  }
}

export function getOperationalMetricsSnapshot(): MetricsSnapshot {
  const now = Date.now()
  trimDenunciaVolume(now)

  const endpoints = [...endpointStatsMap.values()]
    .map((stats) => ({
      method: stats.method,
      endpoint: stats.endpoint,
      requests: stats.total,
      errors: stats.errors,
      error_rate: stats.total > 0 ? Number((stats.errors / stats.total).toFixed(4)) : 0,
      p95_ms: calculateP95(stats.samples.map((sample) => sample.durationMs))
    }))
    .sort((a, b) => b.requests - a.requests)

  return {
    generated_at: new Date(now).toISOString(),
    http: {
      sem_upload_p95_ms: calculateP95(nonUploadDurations),
      endpoints
    },
    denuncias: {
      total_sucesso: totalDenunciasSuccess,
      ultimas_24h: denunciaSuccessTimestamps.length
    }
  }
}
