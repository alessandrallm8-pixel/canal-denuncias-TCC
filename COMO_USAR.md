# COMO USAR

Guia direto para subir o projeto do zero.

## 1) Pré-requisitos

- Node.js 22+
- npm 10+
- Conta no Supabase
- (Opcional) Conta na Vercel para deploy

## 2) Configurar Supabase

### 2.1 Criar projeto

Crie um projeto no Supabase e copie:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2.2 Executar migrations (manual)

No SQL Editor do Supabase, rode **nesta ordem**:

1. `supabase/migrations/20260318220000_base_schema.sql`
2. `supabase/migrations/20260318233000_historico_append_only.sql`

Depois registre execução em:
- `supabase/migrations/APPLIED_HISTORY.md`

### 2.3 Criar bucket de anexos

No Supabase Storage, crie o bucket:
- `denuncias-anexos`

Pode ser privado (o backend usa service role key).

### 2.4 Criar usuário admin (recomendado)

Rode no SQL Editor:

```sql
insert into usuarios_admin (id, nome, email, perfil, ativo)
values
  ('11111111-1111-4111-8111-111111111111', 'Admin Principal', 'admin@empresa.com', 'admin', true),
  ('22222222-2222-4222-8222-222222222222', 'Analista', 'analista@empresa.com', 'analista', true);
```

## 3) Configurar backend

Crie `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Ajuste os valores:

```env
PORT=3000
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET_ANEXOS=denuncias-anexos

# IMPORTANTE: separador é ; (ponto e vírgula), não vírgula
# formato: token:papel:admin_id_uuid
ADMIN_API_TOKENS=token-admin:admin:11111111-1111-4111-8111-111111111111;token-analista:analista:22222222-2222-4222-8222-222222222222

ADMIN_RATE_LIMIT_MAX=120
ADMIN_RATE_LIMIT_WINDOW_MS=60000
TRIAGEM_SLA_HOURS=72
BACKEND_TIMEOUT_QUERY_MS=5000
BACKEND_TIMEOUT_UPLOAD_MS=30000
BACKEND_IDEMPOTENT_RETRY_COUNT=1
BACKEND_REQUEST_TIMEOUT_MS=35000
BACKEND_HEADERS_TIMEOUT_MS=40000
```

## 4) Configurar frontend

Crie `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

Defina:

```env
VITE_API_BASE_URL=/api
```

Observação:
- Em deploy unificado na Vercel, o fallback já é `/api`, então essa variável é opcional.

## 5) Instalar dependências

Na raiz do projeto:

```bash
npm install
```

## 6) Rodar localmente

Em dois terminais:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

## 7) Ponto crítico: HTTPS obrigatório no backend

O backend rejeita requisição sem HTTPS (`426`).

No ambiente local, o Vite já está configurado com proxy `/api -> http://localhost:3000` enviando `x-forwarded-proto: https`.

Para teste rápido via curl:

```bash
curl -i http://localhost:3000/api/health -H "x-forwarded-proto: https"
```

## 8) Rodar validações

```bash
npm run build:backend
npm run test:backend
npm run build:frontend
```

Ou tudo junto:

```bash
npm run ci
```

## 9) Endpoints úteis

- Health: `GET /api/health`
- Métricas: `GET /api/health/metrics`
- Criar denúncia: `POST /api/denuncias`
- Consultar protocolo: `GET /api/denuncias/protocolo/:protocolo`
- Upload anexo: `POST /api/denuncias/:id/anexos`
- Admin (auth Bearer): `/api/admin/*`

## 10) Deploy (resumo)

- Projeto único Vercel com root na raiz do repositório
- Frontend servido de `frontend/dist`
- Backend servido por função serverless em `api/[...path].ts`
- Configurar variáveis por ambiente (Development/Preview/Production)
- Referência operacional completa: `docs/fase9_operacao_observabilidade.md`
