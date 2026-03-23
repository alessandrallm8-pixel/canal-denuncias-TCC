# Spec - Acompanhamento por Protocolo

## Objetivo
Permitir ao denunciante consultar o estado da denúncia sem exposição indevida de dados sensíveis.

## Escopo
- Consulta pública por protocolo.
- Exibição de nome da empresa, setor, status atual e histórico.

## Requisitos Funcionais
- Endpoint público para consulta por protocolo.
- Retornar nome da empresa e setor.
- Retornar status atual (`aberta`, `em análise`, `resolvida`).
- Retornar histórico cronológico com eventos relevantes.

## Regras de Negócio
- Consulta não deve expor dados internos administrativos sensíveis.
- Protocolo inexistente deve retornar erro de não encontrado.
- Mensagens de erro não devem vazar estrutura interna do sistema.

## Contrato de API (final)
- `GET /api/denuncias/protocolo/:protocolo`
- Parâmetro de rota:
  - `protocolo`: formato `DEN-YYYYMMDD-XXXXXXXX` (`X` alfanumérico maiúsculo).
- Saída `200`:
  - `protocolo: string`
  - `nome_empresa: string`
  - `setor: string`
  - `status: "aberta" | "em análise" | "resolvida"`
  - `historico: Array<{ evento: string, detalhes: string, created_at: string }>`
  - `request_id: string`
- Erros:
  - `400`: protocolo inválido.
  - `404`: protocolo não encontrado.
  - `426`: requisição sem HTTPS.
  - `500`: falha de infraestrutura/configuração.

### Exemplo de resposta (`200`)
```json
{
  "protocolo": "DEN-20260318-1A2B3C4D",
  "nome_empresa": "Empresa Exemplo",
  "setor": "Recursos Humanos",
  "status": "em análise",
  "historico": [
    {
      "evento": "denuncia_criada",
      "detalhes": "Denúncia recebida e registrada no canal.",
      "created_at": "2026-03-18T22:31:10.000Z"
    },
    {
      "evento": "triagem_iniciada",
      "detalhes": "Denúncia encaminhada para análise.",
      "created_at": "2026-03-19T11:45:00.000Z"
    }
  ],
  "request_id": "uuid"
}
```

## Critérios de Aceite
- Protocolo válido retorna status e histórico.
- Protocolo inválido retorna erro controlado.
