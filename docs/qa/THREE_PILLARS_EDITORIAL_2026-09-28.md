# Três Pilares — contrato editorial local

WU-120 · RUN_ID `ATV-20260902-170644Z-01A0630F`.

O problema era aceitar como candidata uma saída genérica que citava somente um fator. A preparação persistida agora seleciona `atv-three-pillars-editorial/1.0.0`; o prompt 1.0.4 e o diretor exigem três fatos, duas hipóteses/interpretações com evidência pertinente, uma relação simbólica, síntese conjunta e três perguntas. Cinco afirmações cabem nos limites atuais do nível gratuito. O contrato completo está em `../contracts/three-pillars-editorial.md`.

Provas locais:

- 54 testes da IA PASS (`test-results/wu120-ai.log`): perfil/fatos, 17 mutações de cobertura/referências/escopo, prompt com relato adversarial, minimização e bloqueio de produção.
- 77 testes do worker PASS (`test-results/wu120-worker.log`): projeção coerente e polar, seleção do perfil, digest e recusa de integração ausente mesmo com revisão exclusivamente sintética anexada.
- TypeScript IA/worker PASS (`test-results/wu120-check.log`).
- 63 testes dos cinco arquivos de corpus/benchmark/revisões/comparações PASS (`test-results/wu120-scripts.log`). Corpus 1.7.0 preserva 105/103/2/309; novas fingerprints refletem perfil e contratos. Fixtures do encanamento foram adaptadas, sem declaração de qualidade ou aprovação.
- 56 testes da integração SQL natal PASS (`test-results/wu120-integration.log`): snapshot realmente persistido prepara o perfil, preserva facts e permanece em revisão; polar continua bloqueado.
- 15 testes do fluxo SQL completo PASS (`test-results/wu120-vertical.log`): fixture Três Pilares adaptada ao contrato; leitura privada, export web, Biblioteca e reprocessamento preservam a saída e suas referências. Aprovação inserida pelo dono do banco de teste, sem autoridade real.
- Formatação dos arquivos TypeScript/Svelte focal PASS (`test-results/wu120-format-check.log`). Diff e scan de adições staged registrados junto do commit. CI119 `c67d30f` completed/success: run36489926604.

Nenhuma chamada externa de IA, gasto, aprovação real, mudança de modelo, promoção, publicação, migração hospedada ou alteração de gates. Checks estruturais não avaliam qualidade semântica, conteúdo das perguntas ou clareza dos limites. E2 está implementado/validado estruturalmente, **BLOQUEADO para aceite** por conteúdo/revisão legítima e metadados autênticos de execução exigidos pelo Lab; responsável: revisor/proprietário e operador do conector. E1 permanece parcial aguardando homologador. E3–E5 seguem pendentes; Supabase pausado exige Resume pelo proprietário para validação hospedada.

Próximo requisito independente: integrar a representação e o leitor web dos três fatos, dinâmica, abordagem, síntese e perguntas ao fluxo persistido, com QA local identificado como fixture, sem simular aceites editoriais.
