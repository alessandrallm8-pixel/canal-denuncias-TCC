import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id')
  const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID()

  req.requestId = requestId
  res.setHeader('x-request-id', requestId)

  next()
}
