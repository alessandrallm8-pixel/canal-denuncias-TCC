import { HttpError } from '../../errors/http-error.js'
import {
  assertAdminUserActive,
  getAdminDenunciaById,
  listAdminAnexosByDenunciaId,
  listAdminDenuncias,
  listAdminHistoricoByDenunciaId,
  type AdminDenunciaListFilters
} from '../../repositories/admin-denuncias.repository.js'
import { createDenunciaTratativa, updateDenunciaStatus } from '../denuncias/workflow.service.js'
import type { AdminPrincipal } from '../../middlewares/admin-auth.middleware.js'
import type { DenunciaStatus } from '../../repositories/workflow.repository.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const ALLOWED_LIST_STATUS: DenunciaStatus[] = ['aberta', 'em_analise', 'resolvida']
const ALLOWED_TARGET_STATUS: DenunciaStatus[] = ['em_analise', 'resolvida']

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'Parâmetro de paginação inválido')
  }

  return Math.min(parsed, max)
}

function parseOptionalDate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    throw new HttpError(400, `Parâmetro inválido: ${fieldName}`)
  }

  return value
}

function parseStatusFilter(value: unknown): DenunciaStatus | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string' || !ALLOWED_LIST_STATUS.includes(value as DenunciaStatus)) {
    throw new HttpError(400, 'Parâmetro inválido: status')
  }

  return value as DenunciaStatus
}

function assertUuid(value: string, fieldName: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new HttpError(400, `Parâmetro inválido: ${fieldName}`)
  }
}

async function assertPrincipalAllowed(principal: AdminPrincipal): Promise<void> {
  try {
    await assertAdminUserActive(principal.adminId)
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_NAO_AUTORIZADO') {
      throw new HttpError(403, 'Usuário administrativo inativo ou inexistente')
    }

    throw error
  }
}

export async function listAdminDenunciasService(query: Record<string, unknown>, principal: AdminPrincipal) {
  await assertPrincipalAllowed(principal)

  const page = parsePositiveInt(query.page, 1, 10000)
  const pageSize = parsePositiveInt(query.page_size, 20, 100)
  const status = parseStatusFilter(query.status)
  const dataInicio = parseOptionalDate(query.data_inicio, 'data_inicio')
  const dataFim = parseOptionalDate(query.data_fim, 'data_fim')

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new HttpError(400, 'Intervalo inválido: data_inicio maior que data_fim')
  }

  const filters: AdminDenunciaListFilters = {
    page,
    pageSize,
    status,
    dataInicio,
    dataFim
  }

  try {
    const result = await listAdminDenuncias(filters)

    return {
      items: result.items,
      page,
      page_size: pageSize,
      total: result.total,
      total_pages: Math.max(1, Math.ceil(result.total / pageSize))
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
      throw new HttpError(500, error.message)
    }

    if (error instanceof Error && error.message.startsWith('Timeout em')) {
      throw new HttpError(504, error.message)
    }

    throw new HttpError(500, 'Falha ao listar denúncias administrativas')
  }
}

export async function getAdminDenunciaDetailService(denunciaId: string, principal: AdminPrincipal) {
  assertUuid(denunciaId, 'id')
  await assertPrincipalAllowed(principal)

  try {
    const denuncia = await getAdminDenunciaById(denunciaId)

    if (!denuncia) {
      throw new HttpError(404, 'Denúncia não encontrada')
    }

    const [anexos, historico] = await Promise.all([
      listAdminAnexosByDenunciaId(denunciaId),
      listAdminHistoricoByDenunciaId(denunciaId)
    ])

    return {
      denuncia,
      anexos,
      historico
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
      throw new HttpError(500, error.message)
    }

    if (error instanceof Error && error.message.startsWith('Timeout em')) {
      throw new HttpError(504, error.message)
    }

    throw new HttpError(500, 'Falha ao consultar detalhes administrativos da denúncia')
  }
}

export async function updateAdminDenunciaStatusService(
  denunciaId: string,
  status: unknown,
  principal: AdminPrincipal
) {
  await assertPrincipalAllowed(principal)

  if (typeof status !== 'string' || !ALLOWED_TARGET_STATUS.includes(status as DenunciaStatus)) {
    throw new HttpError(400, 'Campo inválido: status')
  }

  return updateDenunciaStatus(denunciaId, status, {
    atorTipo: principal.role,
    atorId: principal.adminId
  })
}

export async function createAdminTratativaService(
  denunciaId: string,
  descricao: unknown,
  principal: AdminPrincipal
) {
  await assertPrincipalAllowed(principal)

  return createDenunciaTratativa(denunciaId, descricao, {
    atorTipo: principal.role,
    atorId: principal.adminId
  })
}
