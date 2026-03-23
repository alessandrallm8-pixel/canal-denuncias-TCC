import { Router } from 'express'
import { getHealth, getOperationalMetrics } from '../services/health.service.js'

export const healthRouter = Router()

healthRouter.get('/health', (req, res) => {
  const health = getHealth()

  return res.status(200).json({
    ...health,
    request_id: req.requestId
  })
})

healthRouter.get('/health/metrics', (req, res) => {
  const metrics = getOperationalMetrics()

  return res.status(200).json({
    ...metrics,
    request_id: req.requestId
  })
})
