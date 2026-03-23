import express from 'express'
import { apiRouter } from './routes/index.js'
import { requestIdMiddleware } from './middlewares/request-id.middleware.js'
import { errorHandlerMiddleware, notFoundMiddleware } from './middlewares/error-handler.middleware.js'
import { httpsOnlyMiddleware } from './middlewares/https-only.middleware.js'
import { httpLoggingMiddleware } from './middlewares/http-logging.middleware.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(requestIdMiddleware)
  app.use(httpsOnlyMiddleware)
  app.use(express.json())
  app.use(httpLoggingMiddleware)
  app.use('/api', apiRouter)
  app.use(notFoundMiddleware)
  app.use(errorHandlerMiddleware)

  return app
}
