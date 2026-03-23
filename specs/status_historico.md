# Spec - Status e Histórico

## Objetivo
Padronizar ciclo de vida da denúncia e regras de rastreabilidade por histórico imutável.

## Estados Permitidos
- `aberta`
- `em análise`
- `resolvida`

## Transições Permitidas
- `aberta -> em análise`
- `em análise -> resolvida`

## Requisitos Funcionais
- Registrar cada mudança de status no histórico.
- Registrar criação da denúncia no histórico inicial.
- Registrar inclusão de tratativas e anexos como eventos.

## Regras de Negócio
- Histórico é append-only.
- Não permitir transição fora da sequência definida no MVP.
- Toda mudança deve conter ator e timestamp.

## Estrutura de Evento de Histórico
- `evento`
- `detalhes`
- `ator_tipo`
- `ator_id`
- `created_at`

## Critérios de Aceite
- Qualquer mudança gera evento auditável.
- API bloqueia transição de status inválida.
