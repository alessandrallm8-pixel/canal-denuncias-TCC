# Spec - Deploy, Operação e Observabilidade

## Objetivo
Definir critérios operacionais mínimos para publicar e sustentar o MVP.

## Deploy
- Frontend e backend no mesmo projeto Vercel.
- Frontend servido como estático e API exposta em `/api/*` no mesmo domínio.
- Variáveis de ambiente separadas por ambiente.

## Observabilidade
- Logs estruturados JSON.
- Inclusão de `request_id` por requisição.
- Logs de erro com contexto técnico e sem dados pessoais sensíveis.

## Métricas Operacionais
- p95 de endpoints sem upload.
- Taxa de erro por endpoint.
- Volume de denúncias por período.

## Resiliência
- Timeouts configurados para upload e consultas.
- Retentativa apenas quando segura (idempotência).

## Critérios de Aceite
- Aplicação publica e responde em ambiente de produção.
- Falhas são investigáveis por logs e correlação por `request_id`.
