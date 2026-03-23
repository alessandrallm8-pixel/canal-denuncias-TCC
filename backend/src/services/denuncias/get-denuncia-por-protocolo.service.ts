import { HttpError } from '../../errors/http-error.js'
import {
  getDenunciaByProtocol,
  listDenunciaHistoricoPublic,
  type DenunciaHistoricoPublicRow,
  type DenunciaStatus
} from '../../repositories/workflow.repository.js'

const PROTOCOL_REGEX = /^DEN-\d{8}-[A-Z0-9]{8}$/

type PublicStatus = 'aberta' | 'em análise' | 'resolvida'

export type PublicHistoricoItem = {
  evento: string
  detalhes: string
  created_at: string
}

export type DenunciaByProtocolResult = {
  protocolo: string
  nome_empresa: string
  setor: string
  status: PublicStatus
  historico: PublicHistoricoItem[]
}

const EVENTO_PUBLICO: Record<string, { evento: string; detalhes: string }> = {
  denuncia_criada: {
    evento: 'Denúncia criada',
    detalhes: 'Denúncia recebida e registrada no canal.'
  },
  anexo_adicionado: {
    evento: 'Anexo adicionado',
    detalhes: 'Evidência anexada à denúncia.'
  },
  triagem_iniciada: {
    evento: 'Triagem iniciada',
    detalhes: 'Denúncia encaminhada para análise.'
  },
  tratativa_registrada: {
    evento: 'Tratativa registrada',
    detalhes: 'Tratativa interna registrada.'
  },
  status_alterado: {
    evento: 'Status atualizado',
    detalhes: 'Status da denúncia atualizado.'
  },
  sla_triagem_violado: {
    evento: 'SLA de triagem violado',
    detalhes: 'Triagem iniciada fora do SLA definido.'
  },
  caso_resolvido: {
    evento: 'Caso concluído',
    detalhes: 'Denúncia concluída como resolvida.'
  }
}

function normalizeProtocol(protocolo: string): string {
  return protocolo.trim().toUpperCase()
}

function assertProtocol(protocolo: string): string {
  const normalized = normalizeProtocol(protocolo)

  if (!PROTOCOL_REGEX.test(normalized)) {
    throw new HttpError(400, 'Parâmetro inválido: protocolo')
  }

  return normalized
}

function toPublicStatus(status: DenunciaStatus): PublicStatus {
  if (status === 'em_analise') {
    return 'em análise'
  }

  return status
}

function sanitizeHistoricoRow(row: DenunciaHistoricoPublicRow): PublicHistoricoItem {
  const rule = EVENTO_PUBLICO[row.evento]

  if (!rule) {
    return {
      evento: 'Atualização registrada',
      detalhes: 'Atualização registrada no histórico da denúncia.',
      created_at: row.created_at
    }
  }

  return {
    evento: rule.evento,
    detalhes: rule.detalhes,
    created_at: row.created_at
  }
}

export async function getDenunciaByProtocolPublic(protocolo: string): Promise<DenunciaByProtocolResult> {
  const protocol = assertProtocol(protocolo)

  try {
    const denuncia = await getDenunciaByProtocol(protocol)

    if (!denuncia) {
      throw new HttpError(404, 'Protocolo não encontrado')
    }

    const historico = await listDenunciaHistoricoPublic(denuncia.id)

    return {
      protocolo: denuncia.protocolo,
      nome_empresa: denuncia.nome_empresa,
      setor: denuncia.setor,
      status: toPublicStatus(denuncia.status),
      historico: historico.map(sanitizeHistoricoRow)
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

    throw new HttpError(500, 'Falha ao consultar denúncia por protocolo')
  }
}
