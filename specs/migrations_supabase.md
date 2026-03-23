# Spec - Estratégia de Migrations Supabase

## Objetivo
Padronizar criação, organização e execução de migrations SQL do projeto.

## Regra Obrigatória
Todas as migrations SQL devem ficar exclusivamente em `supabase/migrations`.

## Estrutura
- Pasta única de migrations versionadas por ordem cronológica.
- Nome recomendado: `YYYYMMDDHHMMSS_nome_da_migration.sql`.

## Processo de Trabalho
1. Criar arquivo SQL na pasta `supabase/migrations`.
2. Revisar constraints, índices e rollback lógico.
3. Executar manualmente no SQL Editor do Supabase.
4. Registrar no histórico técnico do projeto qual migration foi aplicada.

## Proibições
- Não criar migration fora de `supabase/migrations`.
- Não aplicar SQL ad-hoc em produção sem versionar arquivo.

## Critérios de Aceite
- Todas as mudanças de schema estão versionadas em arquivos SQL.
- Execução manual no SQL Editor do Supabase segue a ordem de versionamento.
