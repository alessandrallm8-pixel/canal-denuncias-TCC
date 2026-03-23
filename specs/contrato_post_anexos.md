# Contrato Final - POST /api/denuncias/:id/anexos

## Endpoint
- Método: `POST`
- URL: `/api/denuncias/:id/anexos`
- Transporte: HTTPS obrigatório
- Content-Type: `multipart/form-data`
- Campo esperado: `file`

## Regras de validação
- `id` deve ser UUID válido.
- Denúncia deve existir antes do upload.
- Apenas um arquivo por requisição.
- Tamanho máximo por arquivo: `5MB`.
- MIME real detectado por assinatura do arquivo.
- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`.

## Resposta de sucesso (`201`)
```json
{
  "id": "uuid",
  "denuncia_id": "uuid",
  "arquivo_url": "https://<supabase>/storage/v1/object/denuncias-anexos/denuncias/<id>/<arquivo>",
  "arquivo_nome": "evidencia_1.jpg",
  "mime_type": "image/jpeg",
  "request_id": "uuid"
}
```

## Respostas de erro
- `400`: multipart inválido, `file` ausente, arquivo grande, MIME inválido ou `id` inválido.
- `404`: denúncia inexistente.
- `426`: requisição sem HTTPS.
- `500`: falha de persistência/storage/configuração.

## Garantias de consistência
- Sem metadado órfão: metadado só é criado após upload no storage.
- Sem registro parcial: se falhar ao gravar metadado, o arquivo já enviado é removido do storage.
