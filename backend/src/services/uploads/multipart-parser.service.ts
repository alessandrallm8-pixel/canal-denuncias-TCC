import Busboy from 'busboy'
import type { Request } from 'express'
import { HttpError } from '../../errors/http-error.js'

export type UploadedFile = {
  filename: string
  mimeType: string
  size: number
  buffer: Buffer
}

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024

export async function parseSingleFileUpload(req: Request): Promise<UploadedFile> {
  const contentType = req.headers['content-type']
  if (!contentType || !contentType.includes('multipart/form-data')) {
    throw new HttpError(400, 'Content-Type deve ser multipart/form-data')
  }

  return await new Promise<UploadedFile>((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: MAX_UPLOAD_SIZE_BYTES
      }
    })

    let fileFound = false
    let tooLarge = false
    let completed = false

    const done = (handler: () => void) => {
      if (completed) {
        return
      }

      completed = true
      handler()
    }

    busboy.on('file', (fieldname, file, info) => {
      if (fieldname !== 'file') {
        file.resume()
        return
      }

      fileFound = true
      const chunks: Buffer[] = []
      let size = 0

      file.on('limit', () => {
        tooLarge = true
      })

      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        size += chunk.length
      })

      file.on('end', () => {
        if (tooLarge) {
          done(() => reject(new HttpError(400, 'Arquivo excede o limite de 5MB')))
          return
        }

        done(() =>
          resolve({
            filename: info.filename,
            mimeType: info.mimeType,
            size,
            buffer: Buffer.concat(chunks)
          })
        )
      })
    })

    busboy.on('filesLimit', () => {
      done(() => reject(new HttpError(400, 'Envie apenas um arquivo por requisição')))
    })

    busboy.on('error', () => {
      done(() => reject(new HttpError(400, 'Falha ao processar upload multipart')))
    })

    busboy.on('finish', () => {
      if (!fileFound) {
        done(() => reject(new HttpError(400, 'Campo file é obrigatório')))
      }
    })

    req.pipe(busboy)
  })
}
