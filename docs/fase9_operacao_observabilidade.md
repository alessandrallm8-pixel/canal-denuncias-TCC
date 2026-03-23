# Fase 9 - Operacao e Observabilidade

## Observabilidade implementada
- Logs estruturados em JSON com `request_id`.
- Mascaramento de campos sensiveis de log (`authorization`, `token`, `email_denunciante`, `nome_denunciante`, `descricao`).
- Metricas operacionais expostas em `GET /api/health/metrics`:
  - `http.sem_upload_p95_ms`
  - `http.endpoints[*].error_rate`
  - `denuncias.total_sucesso`
  - `denuncias.ultimas_24h`

## Resiliencia implementada
- Cliente HTTP interno com timeout por perfil:
  - Consulta: `BACKEND_TIMEOUT_QUERY_MS` (default `5000`)
  - Upload: `BACKEND_TIMEOUT_UPLOAD_MS` (default `30000`)
- Retry automatico apenas para metodos idempotentes (`GET`, `HEAD`, `OPTIONS`, `DELETE`, `PUT`) e status transientes (`408`, `425`, `429`, `500`, `502`, `503`, `504`).
- Retry configuravel por `BACKEND_IDEMPOTENT_RETRY_COUNT` (default `1`).
- Timeout do servidor HTTP:
  - `BACKEND_REQUEST_TIMEOUT_MS` (default `35000`)
  - `BACKEND_HEADERS_TIMEOUT_MS` (default `40000`)

## Deploy Vercel por ambiente (projeto unico)
Objetivo: publicar frontend + backend no mesmo projeto Vercel, com variaveis segregadas por `Development`, `Preview` e `Production`.

1. Projeto unico:
- Root Directory: raiz do repositorio.
- Configuracao de deploy em `vercel.json` na raiz.
- Build Command: `npm run build:frontend`.
- Output Directory: `frontend/dist`.
- API serverless em `api/[...path].ts` usando o app Express do backend.

2. Variaveis obrigatorias:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET_ANEXOS`
- `ADMIN_API_TOKENS`
- `BACKEND_TIMEOUT_QUERY_MS`
- `BACKEND_TIMEOUT_UPLOAD_MS`
- `BACKEND_IDEMPOTENT_RETRY_COUNT`
- `BACKEND_REQUEST_TIMEOUT_MS`
- `BACKEND_HEADERS_TIMEOUT_MS`

3. Variavel opcional de frontend:
- `VITE_API_BASE_URL` (default recomendado: `/api`).

4. Checklist de release:
- Popular variaveis no escopo correto de ambiente no Vercel.
- Fazer deploy de `Preview` e validar:
  - `GET /api/health`
  - `GET /api/health/metrics`
  - Fluxo `POST /api/denuncias` + `GET /api/denuncias/protocolo/:protocolo`
- Promover para `Production` apos validacao.
