# Spec - Administração e Gestão de Denúncias

## Objetivo
Definir operações administrativas de triagem, investigação e resolução no backend e frontend interno não exposto.

## Escopo
- API administrativa autenticada.
- Frontend administrativo implementado, mas oculto da navegação pública.

## Requisitos Funcionais
- Listar denúncias com filtros por status e período.
- Abrir detalhes da denúncia e anexos.
- Registrar tratativas.
- Alterar status conforme fluxo.

## Regras de Negócio
- Apenas perfil administrativo autenticado pode usar endpoints admin.
- Ocultação no frontend não substitui autorização no backend.
- Toda ação administrativa deve gerar histórico/auditoria.

## Contrato de API (proposto)
- `GET /api/admin/denuncias`
- `GET /api/admin/denuncias/:id`
- `PATCH /api/admin/denuncias/:id/status`
- `POST /api/admin/denuncias/:id/tratativas`

## Segurança
- Controle de acesso por perfil (`admin`, `analista`).
- Rate limit em endpoints críticos.
- Auditoria de ator, data/hora e ação.

## Critérios de Aceite
- Operações admin funcionam somente com autenticação válida.
- Módulo existe no frontend, mas não aparece no menu público.
