import { randomUUID } from 'crypto'
import { requestWithTimeoutAndIdempotentRetry } from './http-client.repository.js'

type SupabaseError = {
  code?: string
  details?: string
  hint?: string
  message?: string
}

export type UploadedStorageObject = {
  bucket: string
  path: string
  publicUrl: string
}

export type CreateAnexoMetadataInput = {
  denuncia_id: string
  arquivo_url: string
  arquivo_nome: string
  mime_type: string
}

export type CreateAnexoMetadataResult = {
  id: string
  denuncia_id: string
  arquivo_url: string
  arquivo_nome: string
  mime_type: string
}

function getSupabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL?.trim() ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const bucket = process.env.SUPABASE_STORAGE_BUCKET_ANEXOS ?? 'denuncias-anexos'
  const missing: string[] = []

  if (!baseUrl) {
    missing.push('SUPABASE_URL')
  }

  if (!serviceKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length > 0) {
    throw new Error(`Configuração Supabase ausente: ${missing.join(', ')}`)
  }

  return { baseUrl, serviceKey, bucket }
}

async function parseSupabaseError(response: Response): Promise<SupabaseError | null> {
  return (await response.json().catch(() => null)) as SupabaseError | null
}

export async function ensureDenunciaExists(denunciaId: string): Promise<void> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(
    `${baseUrl}/rest/v1/denuncias?id=eq.${encodeURIComponent(denunciaId)}&select=id&limit=1`,
    {
    method: 'GET',
      operationName: 'ensure_denuncia_exists',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`
    }
    }
  )

  if (!response.ok) {
    throw new Error(`Falha ao validar denúncia: ${response.status}`)
  }

  const rows = (await response.json()) as Array<{ id: string }>
  if (rows.length === 0) {
    throw new Error('DENUNCIA_NAO_ENCONTRADA')
  }
}

function getFileExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') {
    return 'jpg'
  }

  if (mimeType === 'image/png') {
    return 'png'
  }

  return 'webp'
}

export async function uploadAnexoToStorage(
  denunciaId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<UploadedStorageObject> {
  const { baseUrl, serviceKey, bucket } = getSupabaseConfig()
  const fileName = `${Date.now()}-${randomUUID()}.${getFileExtension(mimeType)}`
  const path = `denuncias/${denunciaId}/${fileName}`

  const response = await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    operationName: 'upload_anexo_to_storage',
    profile: 'upload',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': mimeType,
      'x-upsert': 'false'
    },
    body: new Uint8Array(fileBuffer)
  })

  if (!response.ok) {
    const errorBody = await parseSupabaseError(response)
    throw new Error(`Falha no upload do anexo: ${response.status} ${errorBody?.message ?? ''}`.trim())
  }

  return {
    bucket,
    path,
    publicUrl: `${baseUrl}/storage/v1/object/${bucket}/${path}`
  }
}

export async function deleteStorageObject(bucket: string, path: string): Promise<void> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: 'DELETE',
    operationName: 'delete_storage_object',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`
    }
  })
}

export async function createAnexoMetadata(
  input: CreateAnexoMetadataInput
): Promise<CreateAnexoMetadataResult> {
  const { baseUrl, serviceKey } = getSupabaseConfig()

  const response = await requestWithTimeoutAndIdempotentRetry(`${baseUrl}/rest/v1/anexos_denuncia`, {
    method: 'POST',
    operationName: 'create_anexo_metadata',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new Error(`Falha ao persistir metadados de anexo: ${response.status}`)
  }

  const rows = (await response.json()) as Array<CreateAnexoMetadataResult>
  const created = rows[0]

  if (!created) {
    throw new Error('Resposta inválida ao persistir metadados de anexo')
  }

  return created
}
