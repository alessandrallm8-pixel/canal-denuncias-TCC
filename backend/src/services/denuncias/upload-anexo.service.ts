import { fileTypeFromBuffer } from 'file-type'
import { HttpError } from '../../errors/http-error.js'
import {
  createAnexoMetadata,
  deleteStorageObject,
  ensureDenunciaExists,
  uploadAnexoToStorage,
  type CreateAnexoMetadataResult
} from '../../repositories/anexos.repository.js'
import type { UploadedFile } from '../uploads/multipart-parser.service.js'
import { registerAnexoHistory } from './workflow.service.js'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim().replace(/\s+/g, '_')
  return normalized.length > 0 ? normalized.slice(0, 240) : 'anexo'
}

export async function uploadDenunciaAnexo(
  denunciaId: string,
  file: UploadedFile
): Promise<CreateAnexoMetadataResult> {
  if (!UUID_REGEX.test(denunciaId)) {
    throw new HttpError(400, 'Parâmetro inválido: id')
  }

  const detectedType = await fileTypeFromBuffer(file.buffer)
  if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
    throw new HttpError(400, 'Arquivo inválido. Apenas JPEG, PNG e WEBP são permitidos')
  }

  try {
    await ensureDenunciaExists(denunciaId)
  } catch (error) {
    if (error instanceof Error && error.message === 'DENUNCIA_NAO_ENCONTRADA') {
      throw new HttpError(404, 'Denúncia não encontrada')
    }

    if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
      throw new HttpError(500, error.message)
    }

    if (error instanceof Error && error.message.startsWith('Timeout em')) {
      throw new HttpError(504, error.message)
    }

    throw new HttpError(500, 'Falha ao validar denúncia')
  }

  let storageObject: { bucket: string; path: string; publicUrl: string } | null = null
  let metadataCreated = false

  try {
    storageObject = await uploadAnexoToStorage(denunciaId, file.buffer, detectedType.mime)

    const created = await createAnexoMetadata({
      denuncia_id: denunciaId,
      arquivo_url: storageObject.publicUrl,
      arquivo_nome: sanitizeFileName(file.filename),
      mime_type: detectedType.mime
    })
    metadataCreated = true

    await registerAnexoHistory(denunciaId, created.id)

    return created
  } catch (error) {
    if (storageObject && !metadataCreated) {
      await deleteStorageObject(storageObject.bucket, storageObject.path)
    }

    if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
      throw new HttpError(500, error.message)
    }

    if (error instanceof Error && error.message.startsWith('Timeout em')) {
      throw new HttpError(504, error.message)
    }

    throw new HttpError(500, 'Falha ao processar upload do anexo')
  }
}
