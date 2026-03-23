# Spec - Diagramas Acadêmicos (Caso de Uso e Classes)

## Objetivo
Consolidar os diagramas acadêmicos exigidos para documentação de projeto.

## Diagrama de Caso de Uso
```mermaid
flowchart LR
D["Denunciante"] --> U1["Criar denuncia"]
D --> U2["Anexar evidencia"]
D --> U3["Acompanhar por protocolo"]
A["Admin/Analista"] --> U4["Autenticar em modulo administrativo"]
A --> U5["Listar e filtrar denuncias"]
A --> U6["Consultar detalhe, anexos e historico"]
A --> U7["Atualizar status (aberta -> em_analise -> resolvida)"]
A --> U8["Registrar tratativa"]
U7 --> U9["Auditar evento de status no historico"]
U8 --> U10["Auditar evento de tratativa no historico"]
```

## Diagrama de Classes (conceitual)
```mermaid
classDiagram
class Denuncia {
  +uuid id
  +string protocolo
  +boolean anonima
  +string nome_empresa
  +string setor
  +string tipo_ocorrencia
  +string local
  +date data_ocorrencia_aprox
  +string descricao
  +string status
  +datetime created_at
  +datetime updated_at
}
class Anexo {
  +uuid id
  +uuid denuncia_id
  +string arquivo_nome
  +string mime_type
  +string arquivo_url
  +datetime created_at
}
class Historico {
  +uuid id
  +uuid denuncia_id
  +string evento
  +string detalhes
  +string ator_tipo
  +uuid ator_id
  +datetime created_at
}
class UsuarioAdmin {
  +uuid id
  +string nome
  +string email
  +string perfil
  +boolean ativo
}
class Tratativa {
  +uuid id
  +uuid denuncia_id
  +uuid admin_id
  +string descricao
  +datetime created_at
}
Denuncia "1" --> "0..*" Anexo
Denuncia "1" --> "0..*" Historico
Denuncia "1" --> "0..*" Tratativa
UsuarioAdmin "1" --> "0..*" Historico
UsuarioAdmin "1" --> "0..*" Tratativa
```

## Critérios de Aceite
- Diagramas renderizam corretamente em Markdown compatível com Mermaid.
- Entidades e casos de uso refletem o escopo do PRD.
