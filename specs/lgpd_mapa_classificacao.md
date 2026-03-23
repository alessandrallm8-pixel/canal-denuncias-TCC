# Mapa de Dados Sensíveis - Fase 3

## Objetivo
Mapear classificação de dados de banco, API e logs para aplicar minimização e anonimato real.

## Classificação adotada
- `publico`: dado sem risco de identificação.
- `interno`: dado técnico/operacional sem PII direta.
- `pii`: dado pessoal identificável.
- `sensivel`: conteúdo potencialmente ligado a saúde mental, assédio e denúncias.

## Banco (Supabase/PostgreSQL)
| Entidade | Campo | Classe | Controle |
|---|---|---|---|
| `denuncias` | `protocolo` | `interno` | Exposição pública permitida para consulta por protocolo. |
| `denuncias` | `nome_denunciante` | `pii` | Só persistir quando `anonima=false`; nunca em logs brutos. |
| `denuncias` | `email_denunciante` | `pii` | Só persistir quando `anonima=false`; mascarar em logs/respostas públicas. |
| `denuncias` | `descricao` | `sensivel` | Não registrar em logs de aplicação; acesso administrativo restrito. |
| `usuarios_admin` | `email` | `pii` | Uso interno e controle de acesso por perfil. |

## API
| Endpoint | Campo | Classe | Controle |
|---|---|---|---|
| `POST /api/denuncias` | `anonima` | `interno` | Define aplicação das regras de anonimato/minimização. |
| `POST /api/denuncias` | `nome_denunciante` | `pii` | Obrigatório somente em denúncia identificada. |
| `POST /api/denuncias` | `email_denunciante` | `pii` | Obrigatório somente em denúncia identificada; validar formato. |
| `POST /api/denuncias` | `descricao` | `sensivel` | Validar e persistir sem replicar em logs. |

## Logs
| Evento | Campo | Classe | Controle |
|---|---|---|---|
| request/response | `request_id` | `interno` | Correlação obrigatória. |
| request/response | `nome_denunciante` | `pii` | Mascaramento obrigatório (`[REDACTED]`). |
| request/response | `email_denunciante` | `pii` | Mascaramento obrigatório (`[REDACTED]`). |
| request/response | `descricao` | `sensivel` | Proibido em logs de negócio. |

## Decisões implementadas nesta fase
- Middleware `httpsOnlyMiddleware` para bloquear tráfego não HTTPS (`426`).
- Logger estruturado JSON com redação automática de campos sensíveis.
- Sanitização de payload (`sanitizeDenunciaPayload`) com minimização:
  - denúncia anônima força `nome_denunciante=null` e `email_denunciante=null`;
  - denúncia identificada aceita apenas os campos mínimos necessários.

## Pendências controladas
- Política operacional de retenção e descarte no banco (janela e rotina automatizada).
- RBAC administrativo e autenticação serão concluídos na Fase 8.
