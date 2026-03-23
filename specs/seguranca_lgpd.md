# Spec - Segurança, Anonimato e LGPD

## Objetivo
Estabelecer os controles mínimos de proteção de dados e confidencialidade para o canal de denúncias.

## Princípios
- Minimização de dados.
- Necessidade de acesso.
- Rastreabilidade sem quebra de anonimato.

## Requisitos de Segurança
- Tráfego exclusivamente via HTTPS.
- Autenticação obrigatória em área administrativa.
- Autorização por perfil nos endpoints admin.
- Logs estruturados com mascaramento de dados sensíveis.

## Requisitos LGPD
- Informar finalidade e base legal no fluxo de denúncia.
- Coletar apenas dados necessários.
- Definir política de retenção e descarte.
- Restringir acesso a dados pessoais a perfis autorizados.

## Regras de Anonimato
- Denúncia anônima não deve exigir identificação.
- Não persistir identificadores indiretos desnecessários em logs de negócio.
- Respostas públicas não devem vazar dados pessoais.

## Critérios de Aceite
- Denúncia anônima mantém anonimato em banco e API pública.
- Acesso admin sem credencial válida é negado.
- Logs de produção não exibem dados pessoais brutos.
