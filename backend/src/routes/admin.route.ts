import { Router } from 'express'
import { requireAdminAuth, requireAdminRole } from '../middlewares/admin-auth.middleware.js'
import { adminRateLimitMiddleware } from '../middlewares/admin-rate-limit.middleware.js'
import {
  createAdminTratativaService,
  getAdminDenunciaDetailService,
  listAdminDenunciasService,
  updateAdminDenunciaStatusService
} from '../services/admin/admin-denuncias.service.js'

export const adminRouter = Router()

adminRouter.use('/admin', requireAdminAuth)
adminRouter.use('/admin', adminRateLimitMiddleware)

adminRouter.get('/admin/denuncias', requireAdminRole(['admin', 'analista']), async (req, res, next) => {
  try {
    const payload = await listAdminDenunciasService(req.query as Record<string, unknown>, req.adminPrincipal!)

    return res.status(200).json({
      ...payload,
      request_id: req.requestId
    })
  } catch (error) {
    return next(error)
  }
})

adminRouter.get('/admin/denuncias/:id', requireAdminRole(['admin', 'analista']), async (req, res, next) => {
  try {
    const payload = await getAdminDenunciaDetailService(req.params.id, req.adminPrincipal!)

    return res.status(200).json({
      ...payload,
      request_id: req.requestId
    })
  } catch (error) {
    return next(error)
  }
})

adminRouter.patch('/admin/denuncias/:id/status', requireAdminRole(['admin', 'analista']), async (req, res, next) => {
  try {
    const payload = await updateAdminDenunciaStatusService(req.params.id, req.body?.status, req.adminPrincipal!)

    return res.status(200).json({
      ...payload,
      request_id: req.requestId
    })
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/admin/denuncias/:id/tratativas', requireAdminRole(['admin', 'analista']), async (req, res, next) => {
  try {
    const payload = await createAdminTratativaService(req.params.id, req.body?.descricao, req.adminPrincipal!)

    return res.status(201).json({
      ...payload,
      request_id: req.requestId
    })
  } catch (error) {
    return next(error)
  }
})
