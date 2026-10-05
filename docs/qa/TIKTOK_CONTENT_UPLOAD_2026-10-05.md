# TikTok da marca — preparação de envio de vídeos

RUN_ID: ATV-20260902-170644Z-01A0630F. Escopo solicitado: conectar a conta da marca para divulgação orgânica futura, sem login TikTok de clientes e sem publicar conteúdo nesta etapa. R$0.

## Alteração e validação local

- A rota administrativa OAuth solicita `user.info.basic` e `video.upload`. O callback exige ambos antes de consultar o perfil e persistir tokens criptografados. Autorização administrativa e estado CSRF continuam obrigatórios.
- O painel distingue uma conexão básica antiga da autorização de envio. Termos e privacidade explicam a finalidade da conta da marca e que o envio ainda não foi implementado.
- `pnpm --filter @atv/web check`: zero erros e avisos. Integrations typecheck: PASS.
- Testes focados do backend: 17 PASS, incluindo rejeição de concessões incompletas. Integrations: 8 PASS.
- Playwright social/legal: 4 PASS. Build usado pela suíte: PASS. ESLint web: PASS. Prettier dos seis arquivos web alterados: PASS.
- O Prettier global local encontrou diferenças pré-existentes de finais de linha no checkout Windows. Nenhuma reformatação global foi aplicada. Os dois arquivos de integrations preservam a formatação original com adições pontuais.
- Evidências extensas: `E:/ATVNA/app/test-results/social-setup/tiktok-upload-*.log`. CI e liberação hospedada devem ser registrados separadamente após seus resultados reais.

## Limites e caminho para publicação

O Sandbox Developers tem Content Posting API e `video.upload` salvos; Direct Post permanece desligado. A [Upload API](https://developers.tiktok.com/docs/en/content-posting-api-reference-upload-video) envia um rascunho para finalização pelo responsável no aplicativo TikTok. Ela não satisfaz sozinha a intenção futura de publicação automática.

As [diretrizes de Direct Post](https://developers.tiktok.com/doc/content-sharing-guidelines) excluem ferramentas internas para as contas da própria equipe. Não apresentar esta integração como um aplicativo público para obter uma aprovação incompatível com o uso real.

A [Accounts API for Business](https://business-api.tiktok.com/portal/docs/accounts-api-overview/v1.3) documenta gestão e publicação orgânica nas contas da empresa. Sua solicitação de acesso exige cadastro empresarial, verificação e gravação do fluxo ou protótipo. O formulário oficial, acessado pela documentação, é https://bytedance.sg.larkoffice.com/share/base/form/shrlgu4WEvtSXpEDLcCw56u4Rfc.

Pendências externas: acesso ao perfil developer Business; comprovação legal da empresa ou Business Center verificado; app Business e elegibilidade para Accounts API; demonstração verdadeira do fluxo; aceite dos termos e revisão da plataforma. Consentimento OAuth, Target User e callback hospedado ainda não comprovados. Nenhum token de conta ou postagem pública deve ser alegado até a prova real.

## Texto proposto para o caso de uso empresarial

ATVNA is building an internal administrative workflow to prepare and publish its own brand videos on the TikTok account @atuavidanosastros for organic customer acquisition. It is not a TikTok sign-in option for ATVNA customers. The intended workflow is an administrator reviewing the brand's video and caption, choosing when to publish, and tracking the publication result. We seek Accounts API access for the company's own account, initially one account. API access is needed to integrate content preparation, approval and future scheduling with the existing ATVNA backoffice. The publishing workflow is still under development; no posting automation is active. We will use only capabilities approved for this actual use case and will not publish customer-private data.

Este texto é uma proposta de preenchimento. Não prova funcionalidades já implementadas, não substitui identidade empresarial e não representa envio do formulário ou aceite de acordo.
