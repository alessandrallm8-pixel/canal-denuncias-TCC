# Spec - Arquitetura Frontend e Backend

## Objetivo
Definir arquitetura técnica base para entrega do MVP com baixo acoplamento e manutenção viável.

## Stack
- Frontend: React + CSS (sem Tailwind)
- Backend: TypeScript
- Banco: Supabase
- Hospedagem: Vercel

## Frontend
- Módulos públicos:
  - Cadastro de denúncia
  - Consulta por protocolo
- Módulo administrativo:
  - Implementado no código
  - Não exibido na navegação pública
- CSS simples e acadêmico, sem design premium.

## Backend
- API REST em TypeScript.
- Camadas:
  - `routes`
  - `services`
  - `repositories`
- Middleware para autenticação, autorização e rastreio (`request_id`).

## Estratégia de Erros
- Erros de validação: 400.
- Não encontrado: 404.
- Não autorizado/sem permissão: 401/403.
- Falhas internas: 500 com mensagem genérica.

## Critérios de Aceite
- Fronteiras entre camadas estão claras.
- Endpoints públicos e admin separados por responsabilidade.
