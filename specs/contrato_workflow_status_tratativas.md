# Contrato de Workflow - Status e Tratativas

## POST /api/denuncias/:id/tratativas
- Content-Type: `application/json`
- Entrada:
```json
{
  "descricao": "Texto da tratativa"
}
```
- Headers de auditoria (opcionais nesta fase):
  - `x-actor-type` (default: `admin`)
  - `x-actor-id` (UUID ou omitido)
- Regras:
  - `id` deve ser UUID válido.
  - `descricao` entre `10..4000` caracteres.
  - Denúncia `resolvida` não aceita nova tratativa.
- Saída `201`:
```json
{
  "id": "uuid",
  "denuncia_id": "uuid",
  "admin_id": "uuid|null",
  "descricao": "Texto da tratativa",
  "created_at": "2026-03-18T23:59:59.000Z",
  "request_id": "uuid"
}
```

## PATCH /api/denuncias/:id/status
- Content-Type: `application/json`
- Entrada:
```json
{
  "status": "em_analise | resolvida"
}
```
- Headers de auditoria (opcionais nesta fase):
  - `x-actor-type` (default: `admin`)
  - `x-actor-id` (UUID ou omitido)
- Regras:
  - Máquina de estados: `aberta -> em_analise -> resolvida`.
  - Bloqueia transição fora da sequência.
  - Para `resolvida`, exige ao menos 1 tratativa registrada.
  - Em `aberta -> em_analise`, calcula SLA de triagem (`TRIAGEM_SLA_HOURS`, default `72`).
- Saída `200`:
```json
{
  "id": "uuid",
  "protocolo": "DEN-20260318-ABCDEF01",
  "status_anterior": "aberta",
  "status_atual": "em_analise",
  "sla_triagem": {
    "limite_horas": 72,
    "horas_decorridas": 10,
    "atrasado": false
  },
  "request_id": "uuid"
}
```

## Eventos de histórico gerados
- `denuncia_criada`
- `anexo_adicionado`
- `tratativa_registrada`
- `status_alterado` (via função transacional do banco)
- `triagem_iniciada`
- `sla_triagem_violado` (quando aplicável)
- `caso_resolvido`

## Garantia append-only
- Migration adiciona trigger para bloquear `UPDATE/DELETE` em `historico_denuncia`.
