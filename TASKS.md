# TASKS

## Fase 1 - Base técnica
- [x] Estruturar monorepo com `frontend` (React + CSS) e `backend` (TypeScript) - [spec](specs/arquitetura_front_back.md)
- [x] Definir arquitetura em camadas no backend (`routes`, `services`, `repositories`) - [spec](specs/arquitetura_front_back.md)
- [x] Configurar middleware base de erro HTTP (`400`, `401/403`, `404`, `500`) - [spec](specs/arquitetura_front_back.md)
- [x] Configurar middleware de correlação por `request_id` - [spec](specs/deploy_observabilidade.md)

## Fase 2 - Banco e migrations
- [x] Padronizar nome de migrations em `YYYYMMDDHHMMSS_nome_da_migration.sql` - [spec](specs/migrations_supabase.md)
- [x] Garantir diretório único de migrations em `supabase/migrations` - [spec](specs/migrations_supabase.md)
- [x] Criar migration base das tabelas `denuncias`, `anexos_denuncia`, `historico_denuncia`, `usuarios_admin`, `tratativas` - [spec](specs/modelagem_banco_supabase.md)
- [x] Criar domínio de status (`aberta`, `em análise`, `resolvida`) no banco - [spec](specs/modelagem_banco_supabase.md)
- [x] Aplicar constraints de unicidade para `protocolo` e `email` de admin - [spec](specs/modelagem_banco_supabase.md)
- [x] Aplicar foreign keys obrigatórias para evitar registros órfãos - [spec](specs/modelagem_banco_supabase.md)
- [x] Criar índices de desempenho para protocolo, status e timeline - [spec](specs/modelagem_banco_supabase.md)
- [x] Implementar controle transacional de mudança de status + histórico - [spec](specs/modelagem_banco_supabase.md)
- [x] Revisar tecnicamente cada migration antes da execução manual no SQL Editor - [spec](specs/migrations_supabase.md)

## Fase 3 - Segurança e LGPD (baseline)
- [x] Mapear e classificar campos PII/sensíveis em banco, API e logs - [spec](specs/seguranca_lgpd.md)
- [x] Implementar política de minimização de dados para denúncias identificadas - [spec](specs/seguranca_lgpd.md)
- [x] Implementar regra de anonimato real para denúncias anônimas - [spec](specs/seguranca_lgpd.md)
- [x] Forçar HTTPS-only em todos os ambientes - [spec](specs/seguranca_lgpd.md)

## Fase 4 - Fluxo público de denúncias
- [x] Definir contrato final de `POST /api/denuncias` - [spec](specs/denuncia_criacao.md)
- [x] Implementar geração de protocolo único e imutável - [spec](specs/denuncia_criacao.md)
- [x] Implementar validação de payload para denúncia anônima e identificada - [spec](specs/denuncia_criacao.md)
- [x] Implementar endpoint de criação de denúncia com status inicial `aberta` - [spec](specs/denuncia_criacao.md)
- [x] Construir formulário React de criação de denúncia (layout acadêmico, CSS simples) - [spec](specs/denuncia_criacao.md)
- [x] Exibir finalidade e base legal LGPD no fluxo de abertura - [spec](specs/seguranca_lgpd.md)

## Fase 5 - Upload de anexos
- [x] Definir contrato final de `POST /api/denuncias/:id/anexos` - [spec](specs/anexos_upload.md)
- [x] Implementar upload multipart com validação de denúncia existente - [spec](specs/anexos_upload.md)
- [x] Validar MIME real e limite de tamanho para imagens permitidas - [spec](specs/anexos_upload.md)
- [x] Integrar upload ao Supabase Storage com path padronizado - [spec](specs/anexos_upload.md)
- [x] Persistir metadados de anexos sem criar registro parcial em falha - [spec](specs/anexos_upload.md)

## Fase 6 - Status, histórico e BPM
- [x] Implementar máquina de estados `aberta -> em análise -> resolvida` no serviço - [spec](specs/status_historico.md)
- [x] Criar histórico append-only com ator, evento e timestamp - [spec](specs/status_historico.md)
- [x] Registrar evento inicial no histórico ao criar denúncia - [spec](specs/status_historico.md)
- [x] Registrar eventos de anexos, tratativas e mudanças de status - [spec](specs/status_historico.md)
- [x] Bloquear transições inválidas de status na API - [spec](specs/status_historico.md)
- [x] Implementar orquestração BPM do recebimento até resolução - [spec](specs/fluxo_bpm_tratativas.md)
- [x] Implementar controle de SLA da triagem inicial - [spec](specs/fluxo_bpm_tratativas.md)
- [x] Exigir pelo menos uma tratativa registrada antes de resolver caso - [spec](specs/fluxo_bpm_tratativas.md)

## Fase 7 - Consulta por protocolo
- [x] Definir contrato final de `GET /api/denuncias/protocolo/:protocolo` - [spec](specs/acompanhamento_protocolo.md)
- [x] Implementar endpoint público de consulta por protocolo - [spec](specs/acompanhamento_protocolo.md)
- [x] Retornar status atual e histórico cronológico sanitizado - [spec](specs/acompanhamento_protocolo.md)
- [x] Implementar tela React de acompanhamento por protocolo - [spec](specs/acompanhamento_protocolo.md)
- [x] Padronizar erros controlados para protocolo inexistente - [spec](specs/acompanhamento_protocolo.md)

## Fase 8 - Módulo administrativo
- [x] Implementar autenticação e autorização RBAC para rotas `/api/admin/*` - [spec](specs/admin_gestao_denuncias.md)
- [x] Implementar `GET /api/admin/denuncias` com filtros e paginação - [spec](specs/admin_gestao_denuncias.md)
- [x] Implementar `GET /api/admin/denuncias/:id` com anexos e histórico - [spec](specs/admin_gestao_denuncias.md)
- [x] Implementar `PATCH /api/admin/denuncias/:id/status` com auditoria - [spec](specs/admin_gestao_denuncias.md)
- [x] Implementar `POST /api/admin/denuncias/:id/tratativas` com validação - [spec](specs/admin_gestao_denuncias.md)
- [x] Implementar rate limit em endpoints críticos de administração - [spec](specs/admin_gestao_denuncias.md)
- [x] Implementar frontend admin no código sem exibir na navegação pública - [spec](specs/admin_gestao_denuncias.md)

## Fase 9 - Observabilidade e operação
- [x] Padronizar logs estruturados JSON com mascaramento de dados sensíveis - [spec](specs/deploy_observabilidade.md)
- [x] Instrumentar métricas p95, taxa de erro por endpoint e volume de denúncias - [spec](specs/deploy_observabilidade.md)
- [x] Definir timeouts de backend para upload e consulta - [spec](specs/deploy_observabilidade.md)
- [x] Implementar política de retry apenas para operações idempotentes - [spec](specs/deploy_observabilidade.md)
- [x] Configurar deploy unificado de frontend + backend em projeto único Vercel por ambiente - [spec](specs/deploy_observabilidade.md)
- [x] Configurar variáveis de ambiente segregadas por ambiente - [spec](specs/deploy_observabilidade.md)
- [x] Registrar histórico de migrations aplicadas manualmente no Supabase - [spec](specs/migrations_supabase.md)

## Fase 10 - Documentação e validação final
- [x] Atualizar diagrama de caso de uso em Mermaid aderente ao PRD final - [spec](specs/diagramas_uml.md)
- [x] Atualizar diagrama de classes em Mermaid aderente ao modelo final - [spec](specs/diagramas_uml.md)
- [x] Validar renderização dos diagramas no repositório - [spec](specs/diagramas_uml.md)
- [x] Implementar testes de criação de denúncia (anônima e identificada) - [spec](specs/qa_criterios_aceite.md)
- [x] Implementar testes de upload de imagem (sucesso e falha) - [spec](specs/qa_criterios_aceite.md)
- [x] Implementar testes de consulta por protocolo (existente/inexistente) - [spec](specs/qa_criterios_aceite.md)
- [x] Implementar testes de autorização admin e transições de status - [spec](specs/qa_criterios_aceite.md)
- [x] Implementar testes de histórico/auditoria e privacidade de resposta - [spec](specs/qa_criterios_aceite.md)
- [x] Configurar suíte de regressão no CI como gate de release - [spec](specs/qa_criterios_aceite.md)
