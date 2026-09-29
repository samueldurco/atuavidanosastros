# Sim/Não responsável — leitor web e aceite local

RUN_ID: ATV-20260902-170644Z-01A0630F. WU140, 29/09/2026. Produto `tarot-yes-no`, rota `/sim-nao-responsavel`, formato web. Fixtures identificadas, cálculo real determinístico e R$0; nenhuma aprovação editorial legítima ou liberação hospedada.

## Requisito e alteração

Baseline `test-results/wu140-before.log`: cinco títulos genéricos e síntese genérica. Delivery `atv-product-delivery/1.8.0` nomeia carta registrada, pergunta relatada, possibilidades/limites/alternativas, pergunta e o que verificar, escolha e passo reversível, síntese do Sim/Não responsável com uma pergunta prática. Textos e evidências são preservados; a nova versão integra o digest de revisão e distingue a entrega anterior 1.7.0. Prova focal `wu140-after.log`: publicação bloqueada, cálculo intacto e `binaryVerdict: null`.

O leitor identifica `card-1`, `question-1` e `tarot-context`. A demonstração só em hostname local usa UUID sintético `00000000-0000-4000-8000-000000000139`, Rainha de Copas, pergunta “Que condição devo observar antes de escolher?” e contexto “Relato sintético consentido.” Não fornece interpretação homologada, autenticação hospedada ou autoridade editorial legítima. Download web/card/e-mail desabilitados na fixture; PDF e cartografia ausentes do contrato.

## Provas locais

- Worker 106/106 PASS (`test-results/wu140-worker.log`): textos/evidências/cálculo/sorteio intactos, digest estável e revisão da versão anterior diferente; carta incoerente, papel ausente ou pergunta adicional rejeitados.
- Checks Worker e web PASS, Svelte sem erros/avisos (`wu140-worker-check.log`, `wu140-web-check.log`). Prettier focal concluído (`wu140-prettier.log`).
- Vertical SQL Sim/Não 1 PASS, 14 omitidos (`wu140-web-vertical.log`): proprietário, Biblioteca, leitura privada sem cache público, snapshot web, reprocessamento idempotente, filho com revisão independente e revogação. Promoção é fixture explícita.
- Intake preservado: consentimento explícito, uma pergunta/contexto opcional, isolamento, reprocessamento sem novo sorteio e QA responsivo da WU074, [TAROT_QUESTION_PRODUCTS_2026-09-28.md](TAROT_QUESTION_PRODUCTS_2026-09-28.md). Essa prova histórica não encerra o Gate B integral.
- CI139 `36516122246`, SHA `68005da`, SUCCESS (`wu139-ci.json`).
- Playwright 41/41 PASS nos oito leitores (`test-results/wu140-playwright.log`), incluindo cinco cenários de Sim/Não: 1440/820/390/320 px, teclado, histórico, recarga/reabertura da mesma carta e estados pendente/revogado/falha sem leitura ou formatos. Overflow horizontal máximo de 1 px.
- Inspeção visual das quatro capturas `apps/web/test-results/tests-tarot-yes-no-reader.*/tarot-yes-no-reader-{1440,820,390,320}.png` PASS: títulos, relatos, bases/limites, histórico e ações legíveis, sem cortes ou sobreposição. Mobile mantém o fluxo vertical; fixture e bloqueios identificados.

## Aceite E1–E5

| Marco | Implementação e validação locais | Aceite integral |
| --- | --- | --- |
| E1 | Coerência da base real PASS/WU138; intake existente validado | BLOQUEADO: homologar política simbólica candidata |
| E2 | Cobertura estrutural PASS/WU139; fixture sem conteúdo aprovado | BLOQUEADO: conteúdo/modelo/prompt/metadados e revisão legítimos |
| E3 | Persistência, leitura privada, Biblioteca e recuperação PASS em SQL local | BLOQUEADO: aprovação legítima e sessão hospedada |
| E4 | Leitor, estados, teclado e QA visual nas quatro larguras PASS | BLOQUEADO: conteúdo completo e hospedagem |
| E5 | Percurso sintético SQL e salvar/reabrir/recarga no leitor local PASS | BLOQUEADO: percurso real aprovado e hospedado |

Proprietário/editor responsável deve fornecer aprovação de política/conteúdo, metadados autênticos do modelo/revisão e retomar Supabase `irgnhvouvzyoqfmltrna`. Sem mudança dessa condição, chamadas pagas, gate aberto ou release. Após a validação local independente, estacionar Sim/Não com bloqueios preservados e avançar para Três Perguntas E1. Os 25 produtos, ATV+ e todo o plano original permanecem no escopo.
