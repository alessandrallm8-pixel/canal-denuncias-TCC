import { getHealthSource } from '../repositories/health.repository.js'
import { getOperationalMetricsSnapshot } from '../observability/metrics.registry.js'

export function getHealth() {
  const source = getHealthSource()

  return {
    status: 'ok',
    service: source.service,
    timestamp: source.timestamp
  }
}

export function getOperationalMetrics() {
  return getOperationalMetricsSnapshot()
}
