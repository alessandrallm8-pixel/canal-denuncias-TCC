export type DataClassification = 'publico' | 'interno' | 'pii' | 'sensivel'

export type DataFieldClassification = {
  domain: 'banco' | 'api' | 'log'
  entity: string
  field: string
  classification: DataClassification
  notes: string
}

export const DATA_CLASSIFICATION: DataFieldClassification[] = [
  {
    domain: 'banco',
    entity: 'denuncias',
    field: 'protocolo',
    classification: 'interno',
    notes: 'Identificador de acompanhamento; não é PII isoladamente.'
  },
  {
    domain: 'banco',
    entity: 'denuncias',
    field: 'nome_denunciante',
    classification: 'pii',
    notes: 'Dado pessoal direto; exige acesso restrito.'
  },
  {
    domain: 'banco',
    entity: 'denuncias',
    field: 'email_denunciante',
    classification: 'pii',
    notes: 'Contato pessoal direto; deve ser mascarado em logs e respostas públicas.'
  },
  {
    domain: 'banco',
    entity: 'denuncias',
    field: 'descricao',
    classification: 'sensivel',
    notes: 'Pode conter relato sensível de saúde mental e assédio.'
  },
  {
    domain: 'banco',
    entity: 'usuarios_admin',
    field: 'email',
    classification: 'pii',
    notes: 'Dado pessoal de operador interno.'
  },
  {
    domain: 'api',
    entity: 'POST /api/denuncias',
    field: 'nome_denunciante',
    classification: 'pii',
    notes: 'Obrigatório apenas quando anonima=false.'
  },
  {
    domain: 'api',
    entity: 'POST /api/denuncias',
    field: 'email_denunciante',
    classification: 'pii',
    notes: 'Obrigatório apenas quando anonima=false.'
  },
  {
    domain: 'api',
    entity: 'POST /api/denuncias',
    field: 'descricao',
    classification: 'sensivel',
    notes: 'Nunca deve ser replicado em logs de aplicação.'
  },
  {
    domain: 'log',
    entity: 'request',
    field: 'request_id',
    classification: 'interno',
    notes: 'Permitido para correlação de eventos.'
  },
  {
    domain: 'log',
    entity: 'request',
    field: 'nome_denunciante',
    classification: 'pii',
    notes: 'Sempre mascarado; coleta desnecessária bloqueada.'
  },
  {
    domain: 'log',
    entity: 'request',
    field: 'email_denunciante',
    classification: 'pii',
    notes: 'Sempre mascarado; coleta desnecessária bloqueada.'
  },
  {
    domain: 'log',
    entity: 'request',
    field: 'descricao',
    classification: 'sensivel',
    notes: 'Nunca registrar em texto bruto.'
  }
]

export const SENSITIVE_LOG_FIELDS = new Set([
  'authorization',
  'admin_api_token',
  'token',
  'cookie',
  'set-cookie',
  'email',
  'email_denunciante',
  'nome_denunciante',
  'descricao'
])
