# Bússola — apresentação web da leitura

WU-117 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

Requisito E4: a projeção genérica mostrava apenas tipo/ID de afirmação, sem identificar os temas exigidos pela Bússola. `atv-product-delivery/1.1.0` acrescenta títulos para MC, direção/contribuição, ambientes/modos de trabalho, tensão/excesso e síntese com três perguntas práticas. Tipos, IDs, texto, evidências, relações e referências permanecem íntegros. O digest inclui a nova versão e representação: a revisão anterior não aprova um novo candidato. O leitor identifica o MC e o contexto relatado junto dos IDs originais; nenhum snapshot publicado é reescrito.

## Provas locais

- 16 testes focais de projeção/revisão e 74 testes do Worker PASS. O caso integrado usa MC da candidata e perfil editorial real com texto sintético; preserva perguntas/texto/evidência e verifica captura do produto antes de espera assíncrona e diferença do digest anterior. `test-results/wu117-delivery.log`, `test-results/wu117-worker.log`.
- 15 integrações locais PASS, incluindo persistência, leitura privada, publicação com autoridade exclusivamente sintética, reabertura, histórico e recuperação. `test-results/wu117-vertical.log`.
- TypeScript Worker, ESLint focal e Svelte check PASS, zero erros/avisos. `test-results/wu117-worker-check.log`, `test-results/wu117-eslint.log`, `test-results/wu117-web-check.log`.
- Playwright: nove regressões do leitor genérico PASS; cinco testes específicos da Bússola PASS após corrigir uma expectativa de texto do teste (“experimental” versus “experimentais”). `test-results/wu117-reader-e2e.log`, `test-results/wu117-reader-e2e-retry.log`. Build local de produção/Pages preview PASS na execução.
- Quatro larguras (1440, 820, 390, 320): cinco títulos, três perguntas, base calculada/contexto relatado, versões e limites presentes; sem overflow horizontal, um main, navegação por âncora ao histórico funcional. Estados pendente/revogado/falha ocultam cálculo, leitura e download. Fixture não oferece PDF; download web/e-mail permanecem desabilitados.
- Capturas completas em `apps/web/test-results/tests-career-compass-reade-*/career-compass-reader-*.png`; recortes para inspeção em `test-results/wu117-visual/`. Inspeção visual das quatro larguras: hierarquia e quebras legíveis, sem sobreposição ou corte; colunas viram sequência no celular. Não representa auditoria de acessibilidade completa.

## Limites e continuidade

A rota `_spec/fluxo` mantém guarda local (localhost/127.0.0.1/::1) antes de construir a fixture. Ela calcula MC experimental, usa texto explicitamente sintético e não fornece autoridade de revisão, promoção ou persistência real. Essa prova de apresentação não satisfaz E2 nem E4/E5 integrais.

Motor experimental, nenhum modelo homologado, releases/allowlists intactos, R$0, sem migração hospedada. Supabase pausado mantém bloqueio de login/sessão hospedada já registrado; nenhuma consulta repetida sem mudança de condição. Alterações paralelas de administração/TikTok/mídia foram preservadas fora deste commit.

WU116 `9a0a71a`: CI run36485090020 completed/success. Próximo requisito da Bússola: avaliar uma interpretação efetiva com o perfil/prompt atual e os gates existentes, distinguindo candidato, revisão legítima e liberação; completar somente requisitos independentes enquanto persistirem bloqueios externos.
