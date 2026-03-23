import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../errors/http-error.js'

type HitBucket = {
  resetAt: number
  count: number
}

const buckets = new Map<string, HitBucket>()

function readLimitValue(name: 'ADMIN_RATE_LIMIT_MAX' | 'ADMIN_RATE_LIMIT_WINDOW_MS', fallback: number): number {
  const raw = Number(process.env[name] ?? '')

  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback
  }

  return Math.floor(raw)
}

export function adminRateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
  const maxRequests = readLimitValue('ADMIN_RATE_LIMIT_MAX', 30)
  const windowMs = readLimitValue('ADMIN_RATE_LIMIT_WINDOW_MS', 60000)
  const ip = req.ip || 'unknown'
  const key = `${ip}:${req.method}:${req.route?.path ?? req.path}`
  const now = Date.now()

  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    })

    return next()
  }

  if (current.count >= maxRequests) {
    return next(new HttpError(429, 'Limite de requisições administrativas excedido'))
  }

  current.count += 1
  return next()
}
