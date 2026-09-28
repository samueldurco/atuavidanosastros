# Três Pilares — leitor web e aceite local

WU-121 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

O requisito E4 era identificar os temas da leitura no resultado: a projeção genérica exibia tipo e ID sem distinguir Sol, Lua, Ascendente ou dinâmica conjunta. `atv-product-delivery/1.2.0` acrescenta esses títulos e a síntese com três perguntas práticas. Preserva integralmente texto, tipos, IDs, evidências, ordem e referências. A nova representação participa do digest; uma revisão da versão anterior não aprova um candidato novo. O leitor identifica fatores e contexto relatado junto dos IDs originais. Snapshots existentes não são reescritos.

## Provas locais

- Worker: 78 testes PASS, incluindo cálculo experimental real, perfil editorial dos Três Pilares, sete títulos e conservação exata de texto/evidência/perguntas; captura do produto antes da espera assíncrona e digest diferente de 1.1.0. `test-results/wu121-worker.log`.
- Fluxo SQL local: 15 integrações PASS, com persistência real, leitura privada, Biblioteca, reabertura/histórico, export web e reprocessamento como versão independente. A autoridade de publicação nesses testes é exclusivamente sintética. `test-results/wu121-vertical.log`.
- TypeScript Worker e Svelte check PASS (zero erros/avisos); ESLint e Prettier focais PASS. `test-results/wu121-worker-check.log`, `test-results/wu121-web-check.log`, `test-results/wu121-eslint.log`, `test-results/wu121-format-check.log`.
- Playwright: 19 testes PASS (cinco Três Pilares, cinco Bússola, nove leitor genérico), incluindo build de produção e Pages preview locais. `test-results/wu121-reader-e2e.log`.
- Quatro larguras: 1440, 820, 390 e 320 px. Sete títulos, três perguntas, bases, contexto, proveniência/versões e limites presentes; um main, sem overflow horizontal, foco de teclado e âncora de histórico funcionais. Recarregar preserva a apresentação da fixture. Estados pendente/revogado/falha ocultam leitura, origem e download web. PDF ausente; download/e-mail desabilitados na fixture.
- Capturas completas: `apps/web/test-results/tests-three-pillars-reader-*/three-pillars-reader-*.png`. Inspeção visual com recortes em `test-results/wu121-visual/`: hierarquia e quebras legíveis, sem sobreposição ou corte de conteúdo; celular em uma coluna, incluindo limites, recuperação, histórico, ações e rodapé. Não constitui auditoria completa de acessibilidade.

## Referência visual focal

Stitch canônico `2141801333950500965`, tela `c6dc45fd4ccf4bcb8cefaa13fe9c4741`, P0-03 — TRÊS PILARES / ESSENCIAL. Export HTML cacheado em `test-results/gate-b/references/c6dc45fd4ccf4bcb8cefaa13fe9c4741.html`, SHA-256 `4f6f9d0268bca98e3d4fce6e70d0bf8d795658bdbdd74baf5b49527e466e3bba`; PNG SHA-256 `ce10a36bdc056d7bfb1e4c24db4dd9e78b5c38a6e0b9d61a34d29b350373c466`.

A referência orienta três fatores → dinâmica → síntese/arquivo pessoal, dentro do ReaderShell vigente. O PNG contém extensas áreas vazias e não permite comprovar paridade integral. Aspectos/orbes, tipologias e promessa de compartilhamento criptografado do mockup não são fatos nem capacidades aprovadas. `STITCH_ROUTE_MATRIX.md` permanece MAPPED/NOT_VISUAL_PASS; esta WU não concede Gate B global nem paridade de pixels.

## E1–E5 e pendências finitas

| Marco | Implementação/prova local | Aceite final |
| --- | --- | --- |
| E1 | Intake consentido existente; WU119 valida projeção Sol/Lua/ASC persistida, fontes, limites e recusa polar sem ASC. `THREE_PILLARS_BASE_2026-09-28.md`. | BLOQUEADO: homologador deve aprovar motor/referências/tolerâncias aplicáveis; candidata experimental permanece parcial. |
| E2 | WU120 perfil/prompt exigem três fatores exatos, dinâmica, abordagem, relação, síntese e três perguntas. `THREE_PILLARS_EDITORIAL_2026-09-28.md`. | BLOQUEADO: operador deve fornecer metadados autênticos; revisor autorizado/proprietário deve validar conteúdo e homologação. Fixture não é interpretação aprovada. |
| E3 | Integrações SQL verificam persistência/privacidade/Biblioteca/histórico/recuperação e aprovação independente por versão. | BLOQUEADO: autoridade editorial legítima e sessão hospedada ainda não demonstradas. |
| E4 | Representação web 1.2.0 integrada, QA local em quatro larguras e estados. Entrega de catálogo: web. | BLOQUEADO: conteúdo completo aprovado, Gate B aplicável e recuperação em sessão hospedada pendentes. |
| E5 | Cadeia local intake → cálculo → validação editorial → representação → persistência/reabertura/export/reprocessamento comprovada por testes complementares. | BLOQUEADO: evidências experimentais/sintéticas não comprovam a cadeia aprovada hospedada. |

A fixture de `_spec/fluxo` é construída somente após a guarda localhost/127.0.0.1/::1. Usa cálculo real experimental, contexto e texto explicitamente sintéticos, sem autoridade de promoção. Seu reload não prova persistência: essa prova vem das integrações SQL separadas.

Supabase pausado impede login/sessão hospedada: proprietário deve executar Resume project; somente após mudança, retestar DNS/OAuth/sessão. Sem chamadas externas de modelo, migração hospedada, promoção ou gasto. Releases/allowlists e R$0 preservados. WU120 corretiva `258c26194d30f4547ce2e3d02a680e5b620455a8`: CI `36491758870` completed/success; sucesso não prova deploy/release. Alterações paralelas de administração/TikTok/mídia preservadas.

Sem requisito local independente restante demonstrado para Três Pilares após estas correções, produto estacionado parcial com E1–E5 BLOQUEADOS para aceite final. Próximo produto seguro: Mapa Astral, E1 — verificar contrato e integridade da projeção persistida completa, reutilizando motor e provas existentes. A fila dos 25 produtos, ATV+ e o plano integral continuam.
