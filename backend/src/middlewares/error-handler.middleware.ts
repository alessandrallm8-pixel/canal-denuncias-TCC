import type { Request, Response, NextFunction } from 'express'
import { HttpError } from '../errors/http-error.js'
import { logWarn, logError } from '../observability/logger.js'

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Rota não encontrada: ${req.method} ${req.originalUrl}`))
}

export function errorHandlerMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const endpoint = `${req.baseUrl}${req.path}` || req.path

  if (error instanceof HttpError) {
    logWarn('http.request.error', {
      request_id: req.requestId,
      method: req.method,
      endpoint,
      status_code: error.statusCode,
      error_message: error.message
    })

    return res.status(error.statusCode).json({
      error: {
        code: error.statusCode,
        message: error.message
      },
      request_id: req.requestId
    })
  }

  logError('http.request.unhandled_error', {
    request_id: req.requestId,
    method: req.method,
    endpoint,
    status_code: 500,
    error_type: error instanceof Error ? error.name : 'UnknownError'
  })

  return res.status(500).json({
    error: {
      code: 500,
      message: 'Erro interno do servidor'
    },
    request_id: req.requestId
  })
}
