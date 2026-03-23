# Migrations Supabase

Padrão de nome:
`YYYYMMDDHHMMSS_nome_da_migration.sql`

Fluxo:
1. Criar novo arquivo SQL nesta pasta.
2. Validar constraints, índices e transações.
3. Executar manualmente no SQL Editor do Supabase em ordem cronológica.
4. Registrar quais migrations foram aplicadas em `APPLIED_HISTORY.md`.
