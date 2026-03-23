# Spec - Upload de Anexos (Fotos)

## Objetivo
Definir upload opcional de fotos como evidências vinculadas à denúncia.

## Escopo
- Upload para Supabase Storage.
- Vinculação de anexos à denúncia.
- Metadados de arquivo no banco.

## Requisitos Funcionais
- Permitir anexar 0..N imagens por denúncia.
- Aceitar apenas tipos de imagem aprovados (`image/jpeg`, `image/png`, `image/webp`).
- Gravar metadados em `anexos_denuncia`.

## Regras de Negócio
- Upload é opcional e não bloqueia abertura da denúncia.
- Arquivo inválido por tipo/tamanho deve ser rejeitado com erro claro.
- URL de arquivo deve ser armazenada com vínculo em `denuncia_id`.

## Contrato de API (proposto)
- `POST /api/denuncias/:id/anexos`
- Entrada: multipart/form-data com `file`.
- Saída:
  - `id: string`
  - `denuncia_id: string`
  - `arquivo_url: string`
  - `arquivo_nome: string`
  - `mime_type: string`

## Segurança
- Validar MIME real do arquivo.
- Limitar tamanho máximo por arquivo.
- Bloquear extensões executáveis mascaradas.

## Critérios de Aceite
- Upload válido salva arquivo e metadados.
- Upload inválido retorna erro e não grava registro parcial.
