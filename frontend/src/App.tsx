import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { AdminModule } from './admin/AdminModule'

type ActiveScreen = 'home' | 'report'

type ApiSuccess = {
  id: string
  protocolo: string
  status: 'aberta'
  created_at: string
  request_id: string
}

type ProtocolApiSuccess = {
  protocolo: string
  nome_empresa: string
  setor: string
  status: 'aberta' | 'em análise' | 'resolvida'
  historico: Array<{
    evento: string
    detalhes: string
    created_at: string
  }>
  request_id: string
}

type ApiError = {
  error?: {
    code?: number
    message?: string
  }
}

type UploadSummary = {
  sent: number
  success: number
  failed: Array<{
    fileName: string
    message: string
  }>
}

const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const SUBMIT_TIMEOUT_MS = 30000
const UPLOAD_TIMEOUT_MS = 45000
const PROTOCOL_QUERY_TIMEOUT_MS = 20000
const TOAST_DURATION_MS = 4000
const PROTOCOL_INPUT_HINT = 'DEN-20260318-1A2B3C4D'
const SETOR_SUGGESTIONS = [
  'Administrativo',
  'Atendimento',
  'Comercial',
  'Financeiro',
  'Jurídico',
  'Logística',
  'Operações',
  'Produção',
  'Recursos Humanos',
  'Tecnologia'
]
const TIPO_OCORRENCIA_SUGGESTIONS = [
  'Organização do Trabalho',
  'Gestão e liderança',
  'Relações Interpessoais',
  'Conteúdo da tarefa',
  'Segurança no emprego'
]

function isAbortTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function timeoutMessage(defaultMessage: string): string {
  return `${defaultMessage} (tempo limite excedido)`
}

function resolveClientErrorMessage(error: unknown, fallback: string): string {
  if (isAbortTimeout(error)) {
    return timeoutMessage(fallback)
  }

  if (error instanceof TypeError) {
    return `${fallback} (erro de rede ou URL inválida)`
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

function resolveStatusClassName(status: ProtocolApiSuccess['status']): string {
  if (status === 'aberta') {
    return 'status-open'
  }

  if (status === 'em análise') {
    return 'status-in-progress'
  }

  return 'status-resolved'
}

function resolveStatusLabel(status: ApiSuccess['status'] | ProtocolApiSuccess['status']): string {
  if (status === 'aberta') {
    return 'Recebida'
  }

  if (status === 'em análise') {
    return 'Em Apuração'
  }

  return 'Concluída'
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

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function MegaphoneIcon() {
  return (
    <svg className="home-icon" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path
        d="M21 49.5V36.5C21 34.6 22.6 33 24.5 33H37L61 20V66L37 53H24.5C22.6 53 21 51.4 21 49.5Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M37 53L42.5 72H29.5L25 53" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M67 31C72 35 75 41.1 75 48C75 54.9 72 61 67 65" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M73 24.5C80.4 31 84.5 39.2 84.5 48C84.5 56.8 80.4 65 73 71.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="home-icon" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle cx="41" cy="41" r="21" stroke="currentColor" strokeWidth="4" />
      <path d="M56.5 56.5L75 75" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M31.5 41H50.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M41 31.5V50.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home')
  const [anonima, setAnonima] = useState(true)
  const [nomeDenunciante, setNomeDenunciante] = useState('')
  const [emailDenunciante, setEmailDenunciante] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [setorSelecionado, setSetorSelecionado] = useState('')
  const [outroSetor, setOutroSetor] = useState('')
  const [tipoOcorrenciaSelecionada, setTipoOcorrenciaSelecionada] = useState('')
  const [outroTipoOcorrencia, setOutroTipoOcorrencia] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [dataOcorrenciaAprox, setDataOcorrenciaAprox] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFilesError, setSelectedFilesError] = useState('')
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)
  const [created, setCreated] = useState<ApiSuccess | null>(null)
  const [fileInputResetKey, setFileInputResetKey] = useState(0)
  const [toastMessage, setToastMessage] = useState('')

  const [protocolo, setProtocolo] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [trackingError, setTrackingError] = useState('')
  const [trackingResult, setTrackingResult] = useState<ProtocolApiSuccess | null>(null)

  const apiBaseUrl = useMemo(() => {
    const value = import.meta.env.VITE_API_BASE_URL
    return value && value.trim().length > 0 ? value : '/api'
  }, [])

  const showAdminModule = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('admin') === '1'
  }, [])

  useEffect(() => {
    if (!toastMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, TOAST_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  function handleOpenReportForm() {
    setActiveScreen('report')
    scrollToTop()
  }

  function handleBackToHome() {
    setActiveScreen('home')
    scrollToTop()
  }

  function handleProtocolInputChange(event: ChangeEvent<HTMLInputElement>) {
    setProtocolo(event.target.value.toUpperCase())
    setTrackingError('')
    setTrackingResult(null)
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget
    const files = Array.from(target.files ?? [])

    const accepted: File[] = []
    const rejected: string[] = []

    for (const file of files) {
      if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
        rejected.push(`${file.name}: formato inválido`)
        continue
      }

      if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
        rejected.push(`${file.name}: excede 5MB`)
        continue
      }

      accepted.push(file)
    }

    setSelectedFiles(accepted)
    setSelectedFilesError(rejected.length > 0 ? `Arquivos ignorados: ${rejected.join(', ')}` : '')
  }

  async function uploadSelectedFiles(denunciaId: string, files: File[]): Promise<UploadSummary> {
    const failed: UploadSummary['failed'] = []
    let success = 0

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file, file.name)

      try {
        const response = await fetchWithTimeout(
          `${apiBaseUrl}/denuncias/${encodeURIComponent(denunciaId)}/anexos`,
          {
            method: 'POST',
            body: formData
          },
          UPLOAD_TIMEOUT_MS
        )

        if (!response.ok) {
          const apiError = (await response.json().catch(() => ({}))) as ApiError
          failed.push({
            fileName: file.name,
            message: apiError.error?.message ?? `Falha no upload (HTTP ${response.status})`
          })
          continue
        }

        success += 1
      } catch (error) {
        failed.push({
          fileName: file.name,
          message: resolveClientErrorMessage(error, 'Falha de rede ao enviar anexo')
        })
      }
    }

    return {
      sent: files.length,
      success,
      failed
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setCreated(null)
    setUploadSummary(null)
    setIsSubmitting(true)

    const setor = outroSetor.trim() || setorSelecionado
    const tipoOcorrencia = outroTipoOcorrencia.trim() || tipoOcorrenciaSelecionada

    if (!setor) {
      setErrorMessage('Selecione ou informe o setor.')
      setIsSubmitting(false)
      return
    }

    if (!tipoOcorrencia) {
      setErrorMessage('Selecione ou informe o tipo da ocorrência.')
      setIsSubmitting(false)
      return
    }

    const payload = {
      anonima,
      nome_denunciante: anonima ? undefined : nomeDenunciante,
      email_denunciante: anonima ? undefined : emailDenunciante,
      nome_empresa: nomeEmpresa,
      setor,
      tipo_ocorrencia: tipoOcorrencia,
      descricao,
      local,
      data_ocorrencia_aprox: dataOcorrenciaAprox || undefined
    }

    try {
      const response = await fetchWithTimeout(
        `${apiBaseUrl}/denuncias`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        },
        SUBMIT_TIMEOUT_MS
      )

      if (!response.ok) {
        const apiError = (await response.json().catch(() => ({}))) as ApiError
        const message = apiError.error?.message ?? 'Falha ao enviar denúncia'
        throw new Error(message)
      }

      const data = (await response.json()) as ApiSuccess
      if (selectedFiles.length > 0) {
        const summary = await uploadSelectedFiles(data.id, selectedFiles)
        setUploadSummary(summary)
      }

      setCreated(data)
      setToastMessage('Denúncia registrada com sucesso.')
      setNomeDenunciante('')
      setEmailDenunciante('')
      setNomeEmpresa('')
      setSetorSelecionado('')
      setOutroSetor('')
      setTipoOcorrenciaSelecionada('')
      setOutroTipoOcorrencia('')
      setDescricao('')
      setLocal('')
      setDataOcorrenciaAprox('')
      setAnonima(true)
      setSelectedFiles([])
      setSelectedFilesError('')
      setFileInputResetKey((currentValue) => currentValue + 1)
      scrollToTop()
    } catch (error) {
      setErrorMessage(resolveClientErrorMessage(error, 'Falha ao enviar denúncia'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleProtocolSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTrackingError('')
    setTrackingResult(null)
    setIsChecking(true)

    const normalized = protocolo.trim().toUpperCase()

    try {
      const response = await fetchWithTimeout(
        `${apiBaseUrl}/denuncias/protocolo/${encodeURIComponent(normalized)}`,
        {
          method: 'GET'
        },
        PROTOCOL_QUERY_TIMEOUT_MS
      )

      if (!response.ok) {
        const apiError = (await response.json().catch(() => ({}))) as ApiError
        const message = apiError.error?.message ?? 'Falha ao consultar protocolo'
        throw new Error(message)
      }

      const data = (await response.json()) as ProtocolApiSuccess
      setTrackingResult(data)
    } catch (error) {
      setTrackingError(resolveClientErrorMessage(error, 'Falha ao consultar protocolo'))
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <main className="site-shell">
      {toastMessage && (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}

      <section className="hero-banner">
        <div className="hero-logo-placeholder" aria-label="Espaço reservado para logo da empresa">
          logo
        </div>
        <div className="hero-photo" aria-hidden="true">
          <div className="hero-figure hero-figure-left" />
          <div className="hero-figure hero-figure-center" />
          <div className="hero-figure hero-figure-right" />
          <div className="hero-desk hero-desk-left" />
          <div className="hero-desk hero-desk-right" />
          <div className="hero-screen hero-screen-left" />
          <div className="hero-screen hero-screen-center" />
          <div className="hero-screen hero-screen-right" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-cut" aria-hidden="true" />
        <div className="hero-content">
          <h1>VIU UMA IRREGULARIDADE?</h1>
          <p className="hero-highlight">FAÇA SUA DENÚNCIA</p>
        </div>
      </section>

      {activeScreen === 'home' ? (
        <>
          <section className="home-actions" aria-label="Ações principais">
            <article className="home-option">
              <MegaphoneIcon />
              <button type="button" className="outline-button" onClick={handleOpenReportForm}>
                FAÇA SUA DENÚNCIA
              </button>
            </article>

            <article className="home-option home-option-protocol">
              <SearchIcon />
              <form className="protocol-search-form" onSubmit={handleProtocolSearch}>
                <label htmlFor="protocol-home-input" className="protocol-label">
                  Digite aqui o protocolo do seu relato
                </label>
                <div className="protocol-search-row">
                  <input
                    id="protocol-home-input"
                    type="text"
                    placeholder="Digite aqui o protocolo"
                    maxLength={40}
                    value={protocolo}
                    onChange={handleProtocolInputChange}
                    required
                  />
                  <button type="submit" className="outline-button" disabled={isChecking}>
                    {isChecking ? 'CONSULTANDO...' : 'CONSULTAR'}
                  </button>
                </div>
              </form>
              <p className="field-hint">Exemplo: {PROTOCOL_INPUT_HINT}</p>
            </article>
          </section>

          {(trackingError || trackingResult) && (
            <section className="content-card tracking-card">
              <h2>Resultado da consulta</h2>
              {trackingError && (
                <p className="feedback error" role="alert">
                  {trackingError}
                </p>
              )}

              {trackingResult && (
                <section className="protocol-result" aria-live="polite">
                  <div className="tracking-header">
                    <div>
                      <p className="tracking-label">Protocolo</p>
                      <strong className="tracking-protocol">{trackingResult.protocolo}</strong>
                    </div>
                    <span className={`status-pill ${resolveStatusClassName(trackingResult.status)}`}>
                      {resolveStatusLabel(trackingResult.status)}
                    </span>
                  </div>

                  <div className="tracking-meta">
                    <div>
                      <span className="tracking-label">Empresa</span>
                      <strong>{trackingResult.nome_empresa}</strong>
                    </div>
                    <div>
                      <span className="tracking-label">Setor</span>
                      <strong>{trackingResult.setor}</strong>
                    </div>
                  </div>

                  <div>
                    <h3>Histórico</h3>
                    {trackingResult.historico.length > 0 ? (
                      <ul className="history-list">
                        {trackingResult.historico.map((item) => (
                          <li key={`${item.evento}-${item.created_at}`}>
                            <p className="history-date">{formatTimestamp(item.created_at)}</p>
                            <p className="history-event">{formatHistoricoEventoLabel(item.evento)}</p>
                            <p className="history-details">{item.detalhes || 'Sem detalhes adicionais.'}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="history-empty">Nenhum evento adicional foi registrado até o momento.</p>
                    )}
                  </div>
                </section>
              )}
            </section>
          )}
        </>
      ) : (
        <section className="content-card report-shell">
          <div className="section-toolbar">
            <button type="button" className="outline-button outline-button-small" onClick={handleBackToHome}>
              VOLTAR
            </button>
          </div>

          <h2>Faça sua denúncia</h2>
          <p className="section-copy">
            Preencha o relato com contexto suficiente para triagem. Se optar por denúncia anônima, nenhum dado de
            identificação será exigido.
          </p>

          <div className="lgpd-box">
            <strong>Finalidade e base legal (LGPD)</strong>
            <p>
              Os dados são tratados para investigação de riscos psicossociais e cumprimento de obrigação legal em
              saúde e segurança do trabalho.
            </p>
            <p>Na modalidade anônima, dados de identificação não são persistidos.</p>
          </div>

          {created && (
            <section className="feedback success success-card" role="status">
              <h3>Denúncia registrada</h3>
              <p>
                Guarde este protocolo: <strong>{created.protocolo}</strong>
              </p>
              <p>Status inicial: {resolveStatusLabel(created.status)}</p>
              {uploadSummary && (
                <>
                  <p>
                    Anexos enviados com sucesso: {uploadSummary.success}/{uploadSummary.sent}
                  </p>
                  {uploadSummary.failed.length > 0 && (
                    <ul className="upload-failures-list">
                      {uploadSummary.failed.map((item) => (
                        <li key={`${item.fileName}-${item.message}`}>
                          {item.fileName}: {item.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          )}

          <form className="form report-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Modalidade da denúncia
                <select value={anonima ? 'anonima' : 'identificada'} onChange={(event) => setAnonima(event.target.value === 'anonima')}>
                  <option value="anonima">Anônima</option>
                  <option value="identificada">Identificada</option>
                </select>
              </label>

              {!anonima && (
                <label>
                  Nome do denunciante
                  <input
                    type="text"
                    maxLength={140}
                    value={nomeDenunciante}
                    onChange={(event) => setNomeDenunciante(event.target.value)}
                    required={!anonima}
                  />
                </label>
              )}

              {!anonima && (
                <label>
                  E-mail do denunciante
                  <input
                    type="email"
                    maxLength={180}
                    value={emailDenunciante}
                    onChange={(event) => setEmailDenunciante(event.target.value)}
                    required={!anonima}
                  />
                </label>
              )}

              <label>
                Nome da empresa
                <input
                  type="text"
                  maxLength={160}
                  value={nomeEmpresa}
                  onChange={(event) => setNomeEmpresa(event.target.value)}
                  required
                />
              </label>

              <label>
                Setor
                <div className="field-choice">
                  <select value={setorSelecionado} onChange={(event) => setSetorSelecionado(event.target.value)}>
                    <option value="">Selecione um setor</option>
                    {SETOR_SUGGESTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    maxLength={120}
                    value={outroSetor}
                    onChange={(event) => setOutroSetor(event.target.value)}
                    placeholder="Ou digite outro setor"
                  />
                </div>
                <span className="field-hint">Escolha uma opção da lista ou preencha manualmente.</span>
              </label>

              <label>
                Tipo da ocorrência
                <div className="field-choice">
                  <select value={tipoOcorrenciaSelecionada} onChange={(event) => setTipoOcorrenciaSelecionada(event.target.value)}>
                    <option value="">Selecione o tipo da ocorrência</option>
                    {TIPO_OCORRENCIA_SUGGESTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    maxLength={120}
                    value={outroTipoOcorrencia}
                    onChange={(event) => setOutroTipoOcorrencia(event.target.value)}
                    placeholder="Ou digite outro tipo de ocorrência"
                  />
                </div>
                <span className="field-hint">Escolha uma opção da lista ou preencha manualmente.</span>
              </label>

              <label>
                Local
                <input type="text" maxLength={160} value={local} onChange={(event) => setLocal(event.target.value)} required />
              </label>

              <label>
                Data aproximada da ocorrência (opcional)
                <input type="date" value={dataOcorrenciaAprox} onChange={(event) => setDataOcorrenciaAprox(event.target.value)} />
              </label>

              <label className="field-full">
                Descrição da ocorrência
                <textarea
                  minLength={20}
                  maxLength={5000}
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Descreva a situação com contexto suficiente para análise."
                  required
                />
              </label>

              <label className="field-full">
                Fotos/Evidências (opcional)
                <input
                  key={fileInputResetKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelection}
                />
                <span className="field-hint">Formatos permitidos: JPEG, PNG, WEBP. Máximo: 5MB por arquivo.</span>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <ul className="selected-files-list">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            )}

            {selectedFilesError && (
              <p className="feedback error" role="alert">
                {selectedFilesError}
              </p>
            )}

            {errorMessage && (
              <p className="feedback error" role="alert">
                {errorMessage}
              </p>
            )}

            <div className="form-footer">
              <button type="submit" className="outline-button wide-button" disabled={isSubmitting}>
                {isSubmitting ? 'ENVIANDO...' : 'ENVIAR DENÚNCIA'}
              </button>
              <p className="field-hint">O protocolo é gerado imediatamente após o envio válido.</p>
            </div>
          </form>
        </section>
      )}

      {showAdminModule && (
        <section className="content-card admin-shell">
          <AdminModule apiBaseUrl={apiBaseUrl} />
        </section>
      )}
    </main>
  )
}
