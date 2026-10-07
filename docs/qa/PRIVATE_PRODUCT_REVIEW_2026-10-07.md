# Revisão dos produtos privados — 07/10/2026

RUN_ID: ATV-20260902-170644Z-01A0630F. Escopo: corrigir os problemas relatados pelo proprietário e revisar os 25 produtos gratuitos antes de preço e Hotmart. O aceite pessoal permanece separado da aprovação automática.

## Diagnóstico dos anexos

Foram examinados 11 PDFs, três SVGs, quatro capturas e a crítica editorial fornecida pelo proprietário. Os anexos e as extrações contêm dados pessoais e permanecem fora do Git, em `E:/ATVNA/.worktrees/product-review-private/`.

- A Sinastria chegava a 48 páginas e a leitura semanal a 83, com repetição de ausência de aspectos e explicações de método que ocupavam o lugar da interpretação. Extensão não demonstrava profundidade.
- Os produtos natais expunham vocabulário interno e tinham pouca síntese entre posição, signo, casa e relações efetivamente calculadas. A mandala precisava de identificação e legibilidade.
- Atlas da Vida aceitava prioridades em texto livre sem oferecer as opções esperadas pelo contrato.
- Geração dos produtos de casal e download de PDF ultrapassavam o limite de CPU do Worker. A resposta HTML do provedor era apresentada como erro de JSON.

## Correções

O processamento de cálculos e da aprovação foi transferido para a função Supabase `atv-trial-runtime`. Pages mantém autenticação, autorização, validação, idempotência e persistência. Não há fallback de cálculo pesado em Pages. A função exige uma chave dedicada do servidor além da autenticação do gateway; JWT de usuário e chave anônima não concedem acesso. Segredos não estão neste repositório. As requisições têm limites de tamanho e tempo e não geram logs com dados pessoais. Não houve alteração de plano pago, grants, RLS ou dados do proprietário.

O PDF é composto no navegador a partir da leitura salva e autorizada. O endpoint autentica, verifica a leitura e encaminha à tela de download, evitando a composição no Worker. A apresentação usa capa, sumário, capítulos, prática, fontes da marca e mandala com corpos, signos, casas e aspectos calculados. TXT e SVG continuam disponíveis conforme o catálogo. A falha do provedor passa a ter mensagem compreensível, com repetição idempotente da solicitação.

A edição editorial 2 interpreta fatos reais em conjunto com o corpus editorial: posições, casas, aspectos selecionados, contexto e prioridades. Elimina capítulos de ausência de aspectos entre todos os pares. Os produtos de casal distinguem as duas pessoas e propõem acordos; ciclos indicam as datas calculadas sem anunciar amostras como janelas exatas; Revolução Solar usa o instante de retorno; leituras de sonhos preservam hipóteses e a origem do histórico. Jornadas e práticas acompanham o escopo de cada produto. A IA não calcula mapas, sorteia cartas nem altera autorização.

As quatro prioridades do Atlas da Vida agora são seleções distintas. Dados antigos continuam válidos. Uma leitura antiga pode gerar uma nova edição sem alterar o registro original, os fatos ou o sorteio de cartas. Avaliações pessoais não são convertidas em aprovação da nova edição. A skill versionada exige revisão editorial e visual além da integridade de dados.

Também foi corrigida a validação das fontes do histórico dos sonhos: os seis campos da entrada são validados separadamente do identificador e da revisão do registro salvo.

## Evidências e limites

- Suíte unitária e 111 verificações de contratos de banco passaram; ver logs `E:/ATVNA/.worktrees/trials-review-unit.log` e `trials-review-db.log`.
- Svelte sem erros ou avisos e lint aprovado; ver `trials-review-check-2.log` e `trials-review-lint-3.log` no mesmo diretório.
- 12 testes locais de navegação passaram, incluindo download real, seleção de prioridades, tratamento de HTML e repetição após falha: `trials-review-e2e-2.log`.
- 16 verificações de processamento, autenticação do serviço e reedição passaram: `trials-runtime-tests-5.log`.
- A função hospedada passou em 29 casos sintéticos: geração dos 25 produtos, verificação das três leituras de casal e recusa de acesso anônimo. Evidência: `E:/ATVNA/.worktrees/trials-edge-smoke.json`, de 07/10/2026 12:54 UTC. Esse teste não escreve no banco e não representa uso autenticado pelo proprietário.
- PDFs sintéticos foram abertos e renderizados para inspeção de capa, mandala, corpo e páginas finais: `E:/ATVNA/.worktrees/product-review-synthetic/`. A medição e a revisão usam dados sintéticos, sem transcrever anexos pessoais.
- A inspeção encontrou uma página isolada com o último item do sumário do Atlas. O espaçamento entre itens foi corrigido, preservando o tamanho das fontes. Os 24 capítulos cabem na mesma página de índice, e o texto começa na página seguinte. Os 45 testes de composição e exportação passaram novamente: `trials-review-index-tests.log`.

A função de processamento está publicada. A liberação do frontend depende dos gates do PR e do deploy Pages correspondente. A aprovação ou rejeição do proprietário, com sua própria conta, continua pendente. Preços e Hotmart permanecem fora desta liberação.

## Operação e recuperação

Build da função: `pnpm build:trial-runtime`. Deploy: `pnpm exec supabase functions deploy atv-trial-runtime --project-ref irgnhvouvzyoqfmltrna --use-api`. `ATV_TRIAL_RUNTIME_KEY` deve existir no Supabase e no ambiente Pages; a chave não deve ser exposta ao cliente.

O bundle gerado é ignorado pelo Git. A CI verifica seu build. Em caso de regressão, reverter o frontend ao deploy anterior e republicar a função a partir da revisão correspondente. Não remover a função enquanto um deploy do frontend a utiliza. Esta mudança não exige migração destrutiva nem limpeza de leituras salvas.
