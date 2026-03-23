# Spec - Modelagem de Banco (Supabase/PostgreSQL)

## Objetivo
Definir estrutura de dados relacional para denúncias, anexos, histórico e administração.

## Entidades
- `denuncias`
- `anexos_denuncia`
- `historico_denuncia`
- `usuarios_admin`
- `tratativas`

## Estrutura Mínima

### `denuncias`
- `id` uuid pk
- `protocolo` varchar unique
- `anonima` boolean
- `nome_denunciante` varchar nullable
- `email_denunciante` varchar nullable
- `nome_empresa` varchar
- `setor` varchar
- `descricao` text
- `tipo_ocorrencia` varchar
- `local` varchar
- `data_ocorrencia_aprox` date nullable
- `status` enum
- `created_at` timestamp
- `updated_at` timestamp

### `anexos_denuncia`
- `id` uuid pk
- `denuncia_id` uuid fk -> denuncias.id
- `arquivo_url` text
- `arquivo_nome` varchar
- `mime_type` varchar
- `created_at` timestamp

### `historico_denuncia`
- `id` uuid pk
- `denuncia_id` uuid fk -> denuncias.id
- `evento` varchar
- `detalhes` text
- `ator_tipo` varchar
- `ator_id` uuid nullable
- `created_at` timestamp

### `usuarios_admin`
- `id` uuid pk
- `nome` varchar
- `email` varchar unique
- `perfil` varchar
- `ativo` boolean
- `created_at` timestamp

## Índices Recomendados
- `denuncias(protocolo)` unique.
- `denuncias(status, created_at)` para listagem admin.
- `historico_denuncia(denuncia_id, created_at)` para timeline.

## Integridade
- Foreign keys obrigatórias.
- Constraints de domínio para status.
- Controle transacional em mudança de status + histórico.

## Critérios de Aceite
- Consultas de protocolo e timeline executam com desempenho estável.
- Integridade referencial impede registros órfãos.
