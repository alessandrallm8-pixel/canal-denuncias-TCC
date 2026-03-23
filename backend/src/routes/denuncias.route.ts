import { Router } from 'express'
import { createDenuncia } from '../services/denuncias/create-denuncia.service.js'
import { parseSingleFileUpload } from '../services/uploads/multipart-parser.service.js'
import { uploadDenunciaAnexo } from '../services/denuncias/upload-anexo.service.js'
import { getDenunciaByProtocolPublic } from '../services/denuncias/get-denuncia-por-protocolo.service.js'

export const denunciasRouter = Router()

denunciasRouter.post('/denuncias', async (req, res, next) => {
  try {
    const created = await createDenuncia(req.body, { requestId: req.requestId })

    return res.status(201).json({
      ...created,
      request_id: req.requestId
    })
  } catch (error) {
    return next(error)
  }
})

denunciasRouter.get('/denuncias/protocolo/:protocolo', async (req, res, next) => {
  try {
    const data = await getDenunciaByProtocolPublic(req.params.protocolo)

    return res.status(200).json({
      ...data,
      request_id: req.requestId
    })
  } catch (error) {
    return next(error)
  }
})

denunciasRouter.post('/denuncias/:id/anexos', async (req, res, next) => {
  try {
    const file = await parseSingleFileUpload(req)
    const created = await uploadDenunciaAnexo(req.params.id, file)

    return res.status(201).json({
      ...created,
      request_id: req.requestId
    })
  } catch (error) {
    return next(error)
  }
})
