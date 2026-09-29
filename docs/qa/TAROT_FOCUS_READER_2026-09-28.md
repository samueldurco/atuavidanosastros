# Foco Agora — leitor web e aceite local

RUN_ID: ATV-20260902-170644Z-01A0630F. WU137, 28/09/2026. Produto `tarot-focus`, rota `/foco-agora`, entrega web. Fixtures identificadas, cálculo real determinístico e R$0; nenhuma aprovação editorial legítima ou liberação hospedada.

## Requisito e alteração

O baseline `test-results/wu137-before.log` mostrava cinco títulos genéricos e uma síntese genérica. Delivery `atv-product-delivery/1.7.0` nomeia carta registrada, pergunta relatada, possibilidade/tensão/alternativa, conexão com a pergunta, pequeno experimento e síntese de Foco Agora com uma pergunta prática. Textos e evidências permanecem iguais; contexto consentido mantém proveniência `input.context`. A nova versão integra o digest de revisão e distingue a entrega anterior 1.6.0.

O leitor identifica `card-1`, `question-1` e `tarot-context`. A demonstração disponível somente em hostname local usa o cálculo real para UUID sintético `00000000-0000-4000-8000-000000000137`: Cavaleiro de Copas, pergunta “Que alternativa posso observar no meu foco agora?” e contexto relatado de uma pequena pausa. A fixture declara ausência de conteúdo aprovado. Não há interpretação homologada, autenticação hospedada ou autoridade real simulada como legítima.

## Provas locais

- Worker: 101/101 PASS; teste específico preserva textos, evidências, cálculo, sorteio e digest estável; a revisão da versão anterior difere. Carta incoerente, falta de papel ou pergunta adicional são rejeitadas. `test-results/wu137-worker.log`.
- Checks Worker e web PASS, sem erros ou avisos do Svelte. `test-results/wu137-worker-check.log` e `wu137-web-check.log`.
- Vertical SQL de Foco Agora: 1 PASS, 14 outros casos não executados. Base real, proprietário, Biblioteca, leitura privada sem cache público, snapshot web, reprocessamento idempotente, filho com revisão independente e revogação; promoção é fixture explícita. `test-results/wu137-web-vertical.log`.
- Playwright: 36/36 PASS, incluindo cinco cenários de Foco Agora e 31 regressões dos seis leitores anteriores. Larguras 1440/820/390/320, seis seções, contexto relatado, sorteio preservado após reabertura, foco por teclado e histórico; overflow horizontal ≤1 px. Aguardando revisão, revogação e falha ocultam leitura, base e downloads. `test-results/wu137-reader-e2e.log`.
- Inspeção visual das quatro capturas PASS: hierarquia legível, quebra de títulos e proveniência, sem sobreposição ou corte na leitura. Arquivos `apps/web/test-results/tests-tarot-focus-reader.*/tarot-focus-reader-{1440,820,390,320}.png`. Download web/card/e-mail permanecem desabilitados na fixture; PDF e cartografia ausentes.
- Prettier focal PASS: `test-results/wu137-prettier-check.log`. Diff e varredura de segredos registrados no fechamento.
- CI136: SUCCESS, run36513298157, SHA6cfce05622377b60c29490a1daf31a5081083a58; prova `test-results/wu136-ci.json`.

## Aceite E1–E5

| Marco | Implementação e validação locais | Aceite integral |
| --- | --- | --- |
| E1 | Coerência da base real PASS/WU135; política candidata | BLOQUEADO: avaliar e aprovar política simbólica |
| E2 | Cobertura estrutural PASS/WU136; fixture não é leitura útil aprovada | BLOQUEADO: conteúdo/modelo/prompt/metadados e revisão legítimos |
| E3 | Persistência, leitura privada, Biblioteca e recuperação PASS em SQL local | BLOQUEADO: aprovação legítima e sessão hospedada |
| E4 | Leitor web, estados, responsividade e teclado PASS localmente | BLOQUEADO: conteúdo completo e hospedagem |
| E5 | Percurso sintético local, SQL e reabertura PASS | BLOQUEADO: percurso real aprovado e hospedado |

Proprietário/editor responsável deve fornecer aprovação legítima de política e conteúdo, metadados autênticos do modelo/revisão e retomar Supabase `irgnhvouvzyoqfmltrna`. Não houve mudança dessa condição, nova chamada paga, gate aberto ou release. Após concluir a validação local independente, estacionar Foco Agora com os bloqueios registrados e avançar para Sim/Não responsável E1. Os 25 produtos, ATV+ e todo o plano original permanecem no escopo.
