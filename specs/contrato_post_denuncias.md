# Contrato Final - POST /api/denuncias

## Endpoint
- Método: `POST`
- URL: `/api/denuncias`
- Autenticação: pública (sem token no MVP)
- Transporte: HTTPS obrigatório

## Request JSON
```json
{
  "anonima": true,
  "nome_denunciante": "string | opcional",
  "email_denunciante": "string | opcional",
  "nome_empresa": "string",
  "setor": "string",
  "tipo_ocorrencia": "string",
  "descricao": "string",
  "local": "string",
  "data_ocorrencia_aprox": "YYYY-MM-DD | opcional"
}
```

## Regras de validação
- `anonima` obrigatório (`boolean`).
- `nome_empresa` obrigatório, `1..160` caracteres.
- `setor` obrigatório, `1..120` caracteres.
- `tipo_ocorrencia` obrigatório, `1..120` caracteres.
- `local` obrigatório, `1..160` caracteres.
- `descricao` obrigatória, `20..5000` caracteres.
- `data_ocorrencia_aprox` opcional, formato `YYYY-MM-DD`.
- Se `anonima=true`:
  - `nome_denunciante` e `email_denunciante` são descartados e persistidos como `null`.
- Se `anonima=false`:
  - `nome_denunciante` obrigatório, `1..140` caracteres.
  - `email_denunciante` obrigatório, `1..180` caracteres, formato válido.

## Response de sucesso (`201`)
```json
{
  "id": "uuid",
  "protocolo": "DEN-20260318-1A2B3C4D",
  "status": "aberta",
  "created_at": "2026-03-18T23:55:30.123Z",
  "request_id": "uuid"
}
```

## Respostas de erro
- `400`: payload inválido ou regra de validação violada.
- `426`: requisição sem HTTPS.
- `500`: falha de persistência/configuração.

## Garantias de negócio
- `protocolo` gerado no backend e imutável.
- `status` inicial sempre `aberta`.
- Denúncia anônima não persiste dados de identificação.
