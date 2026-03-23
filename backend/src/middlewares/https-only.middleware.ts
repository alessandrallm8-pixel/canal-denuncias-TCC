import type { Request, Response, NextFunction } from 'express'
import { HttpError } from '../errors/http-error.js'

function isHttpsRequest(req: Request): boolean {
  if (req.secure) {
    return true
  }

  const forwardedProto = req.get('x-forwarded-proto')
  return typeof forwardedProto === 'string' && forwardedProto.split(',')[0]?.trim() === 'https'
}

export function httpsOnlyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isHttpsRequest(req)) {
    return next(new HttpError(426, 'Conexão insegura. Use HTTPS.'))
  }

  res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains; preload')

  return next()
}
