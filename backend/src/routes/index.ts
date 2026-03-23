import { Router } from 'express'
import { healthRouter } from './health.route.js'
import { denunciasRouter } from './denuncias.route.js'
import { adminRouter } from './admin.route.js'

export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use(denunciasRouter)
apiRouter.use(adminRouter)
