import type { Request, Response, NextFunction } from 'express'
import { logInfo } from '../observability/logger.js'
import { recordHttpMetric } from '../observability/metrics.registry.js'

function resolveEndpoint(req: Request): string {
  const routePath = req.route?.path

  if (typeof routePath === 'string') {
    return `${req.baseUrl}${routePath}` || req.path
  }

  return req.path
}

export function httpLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()

  res.on('finish', () => {
    const endpoint = resolveEndpoint(req)
    const durationMs = Date.now() - startedAt

    recordHttpMetric({
      method: req.method,
      endpoint,
      statusCode: res.statusCode,
      durationMs,
      isUploadRoute: endpoint.includes('/anexos')
    })

    logInfo('http.request.completed', {
      request_id: req.requestId,
      method: req.method,
      endpoint,
      status_code: res.statusCode,
      duration_ms: durationMs,
      user_agent: req.get('user-agent')
    })
  })

  next()
}
