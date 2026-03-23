import { HttpError } from '../../errors/http-error.js'
import {
  countTratativasByDenuncia,
  createTratativa,
  getDenunciaWorkflowSnapshot,
  insertHistoricoEvent,
  transitionDenunciaStatus,
  type DenunciaStatus,
  type DenunciaWorkflowSnapshot,
  type TratativaResult
} from '../../repositories/workflow.repository.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_TARGET_STATUS: DenunciaStatus[] = ['em_analise', 'resolvida']

const ALLOWED_TRANSITIONS: Record<DenunciaStatus, DenunciaStatus[]> = {
  aberta: ['em_analise'],
  em_analise: ['resolvida'],
  resolvida: []
}

export type ActorInfo = {
  atorTipo: string
  atorId: string | null
}

export type StatusTransitionResult = {
  id: string
  protocolo: string
  status_anterior: DenunciaStatus
  status_atual: DenunciaStatus
  sla_triagem: {
    limite_horas: number
    horas_decorridas: number
    atrasado: boolean
  } | null
}

function assertUuid(value: string, fieldName: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new HttpError(400, `Parâmetro inválido: ${fieldName}`)
  }
}

function readSlaHours(): number {
  const configured = Number(process.env.TRIAGEM_SLA_HOURS ?? '72')

  if (Number.isNaN(configured) || configured <= 0) {
    return 72
  }

  return configured
}

async function getDenunciaOr404(denunciaId: string): Promise<DenunciaWorkflowSnapshot> {
  const denuncia = await getDenunciaWorkflowSnapshot(denunciaId)

  if (!denuncia) {
    throw new HttpError(404, 'Denúncia não encontrada')
  }

  return denuncia
}

function assertTransitionAllowed(current: DenunciaStatus, target: DenunciaStatus): void {
  const allowed = ALLOWED_TRANSITIONS[current]

  if (!allowed.includes(target)) {
    throw new HttpError(400, `Transição inválida: ${current} -> ${target}`)
  }
}

export async function registerDenunciaCreatedHistory(denunciaId: string): Promise<void> {
  try {
    await insertHistoricoEvent({
      denuncia_id: denunciaId,
      evento: 'denuncia_criada',
      detalhes: 'Recebimento da denúncia e abertura do fluxo BPM',
      ator_tipo: 'sistema',
      ator_id: null
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
      throw new HttpError(500, error.message)
    }

    if (error instanceof Error && error.message.startsWith('Timeout em')) {
      throw new HttpError(504, error.message)
    }

    throw new HttpError(500, 'Falha ao registrar histórico inicial da denúncia')
  }
}

export async function registerAnexoHistory(denunciaId: string, anexoId: string): Promise<void> {
  try {
    await insertHistoricoEvent({
      denuncia_id: denunciaId,
      evento: 'anexo_adicionado',
      detalhes: `Anexo ${anexoId} vinculado à denúncia`,
      ator_tipo: 'sistema',
      ator_id: null
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
      throw new HttpError(500, error.message)
    }

    if (error instanceof Error && error.message.startsWith('Timeout em')) {
      throw new HttpError(504, error.message)
    }

    throw new HttpError(500, 'Falha ao registrar histórico do anexo')
  }
}

export async function createDenunciaTratativa(
  denunciaId: string,
  descricao: unknown,
  actor: ActorInfo
): Promise<TratativaResult> {
  assertUuid(denunciaId, 'id')

  if (typeof descricao !== 'string') {
    throw new HttpError(400, 'Campo inválido: descricao')
  }

  const normalizedDescricao = descricao.trim().replace(/\s+/g, ' ')
  if (normalizedDescricao.length < 10 || normalizedDescricao.length > 4000) {
    throw new HttpError(400, 'Campo inválido: descricao')
  }

  try {
    const denuncia = await getDenunciaOr404(denunciaId)

    if (denuncia.status === 'resolvida') {
      throw new HttpError(400, 'Não é permitido registrar tratativa em denúncia resolvida')
    }

    const created = await createTratativa({
      denuncia_id: denunciaId,
      admin_id: actor.atorId,
      descricao: normalizedDescricao
    })

    await insertHistoricoEvent({
      denuncia_id: denunciaId,
      evento: 'tratativa_registrada',
      detalhes: `Tratativa ${created.id} registrada`,
      ator_tipo: actor.atorTipo,
      ator_id: actor.atorId
    })

    return created
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

    throw new HttpError(500, 'Falha ao registrar tratativa')
  }
}

export async function updateDenunciaStatus(
  denunciaId: string,
  novoStatus: unknown,
  actor: ActorInfo
): Promise<StatusTransitionResult> {
  assertUuid(denunciaId, 'id')

  if (typeof novoStatus !== 'string' || !VALID_TARGET_STATUS.includes(novoStatus as DenunciaStatus)) {
    throw new HttpError(400, 'Campo inválido: status')
  }

  const targetStatus = novoStatus as DenunciaStatus

  try {
    const denuncia = await getDenunciaOr404(denunciaId)
    assertTransitionAllowed(denuncia.status, targetStatus)

    if (targetStatus === 'resolvida') {
      const totalTratativas = await countTratativasByDenuncia(denunciaId)

      if (totalTratativas < 1) {
        throw new HttpError(400, 'Não é permitido resolver denúncia sem tratativa registrada')
      }
    }

    let slaTriagem: StatusTransitionResult['sla_triagem'] = null

    if (denuncia.status === 'aberta' && targetStatus === 'em_analise') {
      const limitHours = readSlaHours()
      const elapsedHours = Math.floor((Date.now() - new Date(denuncia.created_at).getTime()) / 3600000)
      const overdue = elapsedHours > limitHours

      slaTriagem = {
        limite_horas: limitHours,
        horas_decorridas: elapsedHours,
        atrasado: overdue
      }

      if (overdue) {
        await insertHistoricoEvent({
          denuncia_id: denunciaId,
          evento: 'sla_triagem_violado',
          detalhes: `Triagem iniciada com ${elapsedHours}h (SLA ${limitHours}h)`,
          ator_tipo: actor.atorTipo,
          ator_id: actor.atorId
        })
      }
    }

    await transitionDenunciaStatus({
      denunciaId,
      novoStatus: targetStatus,
      atorTipo: actor.atorTipo,
      atorId: actor.atorId,
      detalhes: `Transição ${denuncia.status} -> ${targetStatus}`
    })

    if (targetStatus === 'em_analise') {
      await insertHistoricoEvent({
        denuncia_id: denunciaId,
        evento: 'triagem_iniciada',
        detalhes: 'Triagem administrativa iniciada',
        ator_tipo: actor.atorTipo,
        ator_id: actor.atorId
      })
    }

    if (targetStatus === 'resolvida') {
      await insertHistoricoEvent({
        denuncia_id: denunciaId,
        evento: 'caso_resolvido',
        detalhes: 'Fluxo BPM concluído com resolução da denúncia',
        ator_tipo: actor.atorTipo,
        ator_id: actor.atorId
      })
    }

    return {
      id: denuncia.id,
      protocolo: denuncia.protocolo,
      status_anterior: denuncia.status,
      status_atual: targetStatus,
      sla_triagem: slaTriagem
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    if (error instanceof Error && error.message === 'DENUNCIA_NAO_ENCONTRADA') {
      throw new HttpError(404, 'Denúncia não encontrada')
    }

    if (error instanceof Error && error.message === 'TRANSICAO_STATUS_INVALIDA') {
      throw new HttpError(400, 'Transição de status inválida')
    }

    if (error instanceof Error && error.message.startsWith('Configuração Supabase ausente')) {
      throw new HttpError(500, error.message)
    }

    if (error instanceof Error && error.message.startsWith('Timeout em')) {
      throw new HttpError(504, error.message)
    }

    throw new HttpError(500, 'Falha ao atualizar status da denúncia')
  }
}
