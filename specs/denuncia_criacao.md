# Spec - Criação de Denúncia

## Objetivo
Definir o comportamento de criação de denúncia anônima ou identificada, com geração de protocolo único e rastreável.

## Escopo
- Formulário público de denúncia.
- Persistência da denúncia no Supabase.
- Geração e retorno de protocolo.

## Requisitos Funcionais
- Permitir denúncia com `anonima = true` sem exigir nome/email.
- Permitir denúncia com `anonima = false` exigindo nome e contato mínimo.
- Campos obrigatórios: nome da empresa, setor, tipo da ocorrência, descrição, local.
- Campo opcional: data aproximada da ocorrência.
- Status inicial obrigatório: `aberta`.

## Regras de Negócio
- Protocolo deve ser único e imutável.
- Denúncia não pode ser excluída fisicamente no MVP.
- Dados pessoais só podem ser coletados quando denúncia não for anônima.

## Contrato de API (proposto)
- `POST /api/denuncias`
- Entrada:
  - `anonima: boolean`
  - `nome_denunciante?: string`
  - `email_denunciante?: string`
  - `nome_empresa: string`
  - `setor: string`
  - `tipo_ocorrencia: string`
  - `descricao: string`
  - `local: string`
  - `data_ocorrencia_aprox?: string`
- Saída:
  - `id: string`
  - `protocolo: string`
  - `status: "aberta"`
  - `created_at: string`

## Validações
- `descricao` com tamanho mínimo técnico definido na implementação.
- `nome_empresa`, `setor`, `tipo_ocorrencia` e `local` não podem ser vazios.
- Se `anonima = false`, validar formato de e-mail.

## Critérios de Aceite
- Sistema cria denúncia anônima sem dados pessoais.
- Sistema cria denúncia identificada com validação de campos.
- Toda criação retorna protocolo válido para consulta futura.
