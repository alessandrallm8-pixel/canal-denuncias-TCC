# Spec - QA e Critérios de Aceite

## Objetivo
Definir cobertura mínima de testes e validações para liberar o MVP.

## Cobertura Funcional Mínima
- Criação de denúncia anônima.
- Criação de denúncia identificada.
- Upload opcional de imagem.
- Consulta por protocolo.
- Alteração de status por admin.
- Registro de histórico em eventos críticos.

## Cobertura Não Funcional Mínima
- Testes de autorização em rotas admin.
- Testes de validação de input.
- Testes de regressão de fluxo `aberta -> em análise -> resolvida`.

## Cenários Críticos
- Tentativa de transição de status inválida.
- Upload de arquivo inválido.
- Consulta com protocolo inexistente.
- Acesso admin sem autenticação.

## Critérios de Aceite do Produto
- Todos os fluxos críticos aprovados.
- Sem falha de autorização em endpoints admin.
- Sem vazamento de dados sensíveis em respostas públicas.
