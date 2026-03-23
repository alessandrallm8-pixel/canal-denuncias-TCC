# Spec - Fluxo BPM de Tratativas

## Objetivo
Formalizar o processo operacional de tratamento de denúncias psicossociais.

## Fluxo Operacional
1. Recebimento da denúncia.
2. Validação mínima de integridade dos dados.
3. Geração de protocolo.
4. Triagem inicial administrativa.
5. Investigação e registro de tratativas.
6. Conclusão e resolução.
7. Disponibilização do histórico para consulta por protocolo.

## Pontos de Controle
- SLA de triagem inicial.
- Obrigatoriedade de registro de tratativa antes de resolução.
- Auditoria obrigatória em toda decisão administrativa.

## Entradas e Saídas por Etapa
- Entrada: denúncia e anexos opcionais.
- Saída: protocolo, status atualizado, histórico registrado.

## Critérios de Aceite
- Fluxo executa sem etapas órfãs.
- Toda denúncia percorre trilha rastreável do início ao fim.
