import { FormEvent, useState } from 'react'

type AdminListItem = {
  id: string
  protocolo: string
  anonima: boolean
  nome_empresa: string
  tipo_ocorrencia: string
  setor: string
  status: string
  created_at: string
}

type AdminListResponse = {
  items: AdminListItem[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

type AdminDetailResponse = {
  denuncia: {
    id: string
    protocolo: string
    anonima: boolean
    nome_denunciante: string | null
    email_denunciante: string | null
    nome_empresa: string
    setor: string
    descricao: string
    tipo_ocorrencia: string
    local: string
    data_ocorrencia_aprox: string | null
    status: string
    created_at: string
    updated_at: string
  }
  anexos: Array<{
    id: string
    arquivo_nome: string
    mime_type: string
    arquivo_url: string
    created_at: string
  }>
  historico: Array<{
    id: string
    evento: string
    detalhes: string | null
    ator_tipo: string
    ator_id: string | null
    created_at: string
  }>
}

type ApiError = {
  error?: {
    message?: string
  }
}

type Props = {
  apiBaseUrl: string
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const parsed = (await response.json().catch(() => ({}))) as ApiError
  return parsed.error?.message ?? fallback
}

function formatAdminStatusLabel(status: string): string {
  if (status === 'aberta') {
    return 'Recebida'
  }

  if (status === 'em_analise') {
    return 'Em Apuração'
  }

  if (status === 'resolvida') {
    return 'Concluída'
  }

  return status
}

function formatHistoricoEventoLabel(evento: string): string {
  const normalized = evento.trim()

  const labels: Record<string, string> = {
    denuncia_criada: 'Denúncia criada',
    anexo_adicionado: 'Anexo adicionado',
    triagem_iniciada: 'Triagem iniciada',
    tratativa_registrada: 'Tratativa registrada',
    status_alterado: 'Status atualizado',
    sla_triagem_violado: 'SLA de triagem violado',
    caso_resolvido: 'Caso concluído',
    atualizacao_registrada: 'Atualização registrada'
  }

  if (labels[normalized]) {
    return labels[normalized]
  }

  if (!normalized.includes('_')) {
    return normalized
  }

  return normalized
    .split('_')
    .filter(Boolean)
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }

      return word
    })
    .join(' ')
}

export function AdminModule({ apiBaseUrl }: Props) {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [listError, setListError] = useState('')
  const [listResult, setListResult] = useState<AdminListResponse | null>(null)

  const [detailId, setDetailId] = useState('')
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailResult, setDetailResult] = useState<AdminDetailResponse | null>(null)

  const [statusTarget, setStatusTarget] = useState<'em_analise' | 'resolvida'>('em_analise')
  const [tratativa, setTratativa] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const authHeaders: Record<string, string> = {
    'content-type': 'application/json'
  }

  if (token.trim()) {
    authHeaders.authorization = `Bearer ${token.trim()}`
  }

  async function loadList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setListError('')
    setListResult(null)
    setIsLoadingList(true)

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20'
      })

      if (status) {
        params.set('status', status)
      }

      const response = await fetch(`${apiBaseUrl}/admin/denuncias?${params.toString()}`, {
        method: 'GET',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Falha ao listar denúncias administrativas'))
      }

      setListResult((await response.json()) as AdminListResponse)
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Falha ao listar denúncias administrativas')
    } finally {
      setIsLoadingList(false)
    }
  }

  async function loadDetail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDetailError('')
    setDetailResult(null)
    setActionMessage('')
    setIsLoadingDetail(true)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/denuncias/${encodeURIComponent(detailId.trim())}`, {
        method: 'GET',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Falha ao carregar detalhes da denúncia'))
      }

      setDetailResult((await response.json()) as AdminDetailResponse)
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Falha ao carregar detalhes da denúncia')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  async function updateStatus() {
    if (!detailResult) {
      return
    }

    setActionMessage('')

    const response = await fetch(`${apiBaseUrl}/admin/denuncias/${encodeURIComponent(detailResult.denuncia.id)}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: statusTarget })
    })

    if (!response.ok) {
      setActionMessage(await readApiError(response, 'Falha ao atualizar status'))
      return
    }

    setActionMessage('Status atualizado com sucesso. Recarregue o detalhe para ver estado atual.')
  }

  async function createTratativa() {
    if (!detailResult) {
      return
    }

    setActionMessage('')

    const response = await fetch(`${apiBaseUrl}/admin/denuncias/${encodeURIComponent(detailResult.denuncia.id)}/tratativas`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ descricao: tratativa })
    })

    if (!response.ok) {
      setActionMessage(await readApiError(response, 'Falha ao registrar tratativa'))
      return
    }

    setTratativa('')
    setActionMessage('Tratativa registrada com sucesso. Recarregue o detalhe para atualizar histórico.')
  }

  return (
    <section className="admin-module">
      <h2>Módulo administrativo (oculto)</h2>
      <p>Use token Bearer e filtros para operar triagem, investigação e resolução.</p>

      <label>
        Token administrativo
        <input type="password" value={token} onChange={(event) => setToken(event.target.value)} />
      </label>

      <form className="form" onSubmit={loadList}>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="aberta">Recebida</option>
            <option value="em_analise">Em Apuração</option>
            <option value="resolvida">Concluída</option>
          </select>
        </label>

        <label>
          Página
          <input type="number" min={1} value={page} onChange={(event) => setPage(Number(event.target.value || '1'))} />
        </label>

        <button type="submit" disabled={isLoadingList}>
          {isLoadingList ? 'Consultando...' : 'Listar denúncias'}
        </button>
      </form>

      {listError && <p className="feedback error">{listError}</p>}

      {listResult && (
        <div className="admin-grid">
          {listResult.items.map((item) => (
            <article key={item.id} className="admin-item">
              <strong>{item.protocolo}</strong>
              <p>ID: {item.id}</p>
              <p>Status: {formatAdminStatusLabel(item.status)}</p>
              <p>Empresa: {item.nome_empresa}</p>
              <p>Tipo: {item.tipo_ocorrencia}</p>
              <p>Setor: {item.setor}</p>
              <p>Criado em: {new Date(item.created_at).toLocaleString('pt-BR')}</p>
            </article>
          ))}
        </div>
      )}

      <form className="form" onSubmit={loadDetail}>
        <label>
          ID da denúncia
          <input type="text" value={detailId} onChange={(event) => setDetailId(event.target.value)} required />
        </label>

        <button type="submit" disabled={isLoadingDetail}>
          {isLoadingDetail ? 'Carregando...' : 'Abrir detalhe'}
        </button>
      </form>

      {detailError && <p className="feedback error">{detailError}</p>}

      {detailResult && (
        <div className="admin-detail">
          <h3>Detalhe da denúncia</h3>
          <p>Protocolo: {detailResult.denuncia.protocolo}</p>
          <p>Status: {formatAdminStatusLabel(detailResult.denuncia.status)}</p>
          <p>Empresa: {detailResult.denuncia.nome_empresa}</p>
          <p>Setor: {detailResult.denuncia.setor}</p>
          <p>Local: {detailResult.denuncia.local}</p>
          <p>Descrição: {detailResult.denuncia.descricao}</p>

          <h4>Ações</h4>
          <div className="admin-actions">
            <select value={statusTarget} onChange={(event) => setStatusTarget(event.target.value as 'em_analise' | 'resolvida')}>
              <option value="em_analise">Em Apuração</option>
              <option value="resolvida">Concluída</option>
            </select>
            <button type="button" onClick={updateStatus}>
              Atualizar status
            </button>
          </div>

          <label>
            Nova tratativa
            <textarea value={tratativa} onChange={(event) => setTratativa(event.target.value)} minLength={10} maxLength={4000} />
          </label>
          <button type="button" onClick={createTratativa}>
            Registrar tratativa
          </button>

          {actionMessage && <p className="feedback success">{actionMessage}</p>}

          <h4>Anexos ({detailResult.anexos.length})</h4>
          <ul className="admin-list">
            {detailResult.anexos.map((anexo) => (
              <li key={anexo.id}>
                <a href={anexo.arquivo_url} target="_blank" rel="noreferrer">
                  {anexo.arquivo_nome}
                </a>{' '}
                ({anexo.mime_type})
              </li>
            ))}
          </ul>

          <h4>Histórico ({detailResult.historico.length})</h4>
          <ul className="admin-list">
            {detailResult.historico.map((item) => (
              <li key={item.id}>
                <strong>{formatHistoricoEventoLabel(item.evento)}</strong> - {item.detalhes ?? 'Sem detalhes'} -{' '}
                {new Date(item.created_at).toLocaleString('pt-BR')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
