# Sim/Não responsável — E2 local

RUN_ID: ATV-20260902-170644Z-01A0630F. WU139, 29/09/2026. Perfil candidato integrado ao prompt, Director, preparação persistida, corpus e fixtures de teste. Conteúdo sintético permanece explicitamente sem homologação.

Antes: `test-results/wu139-before.log` registra perfil ausente e leitura de um único fato chegando a `needs_editorial_review`. Depois: `wu139-after-final.log` confirma perfil específico, leitura incompleta `rejected`, fixture completa `needs_editorial_review`, cálculo inalterado e `binaryVerdict: null`. Rainha de Copas na execução sintética UUID139, sem nova chamada de provider.

- AI 86/86 PASS, incluindo seis testes do novo perfil (`wu139-ai.log`); Worker 105/105 PASS, incluindo revisão persistida específica (`wu139-worker.log`). Checks AI/Worker/web PASS (`wu139-ai-check.log`, `wu139-worker-check.log`, `wu139-web-check.log`).
- Corpus, comparação/revisão, processamento PostgreSQL e benchmarks: 78/78 PASS (`wu139-lab-db.log`). Corpus 1.18.0 mantém 105 casos, 102 preparados e três bloqueados. Fingerprint `bac58d61a1d47192756ed7763f0775c3e4a2bc318c4dc7b5996b6d4fe7728ea7`; remoção somente do perfil YesNo restaura `58d1a7e26bd0398d373733efa0b5de361f48e6099d1dadbe4d7eb28d618e2fc5` (`wu139-corpus-digests.json`). Sem mudança de fatos, sorteio ou casos.
- SQL vertical local Sim/Não 1 PASS, 14 omitidos (`wu139-web-vertical-final-pass.log`): cálculo real, publicação com autoridade fictícia explícita, web persistida, histórico e reprocessamento. Expectativa antiga de síntese foi adaptada à fixture nova; asserção transitória indevida de política no DTO de leitura foi substituída pela preservação da carta. A política nula é provada no snapshot de cálculo pela prova focal.
- Fixtures genéricas de entrega/revisão usam agora Três Perguntas com três perguntas/cartas, preservando os testes gerais; o perfil YesNo é testado separadamente. Não conferem aprovação real a nenhum produto.
- CI138 `36515035753`, SHA `2e879cb`, SUCCESS (`wu138-ci.json`). Formatação focal, diff e scanner de segredos acompanham o fechamento desta WU.

E2 integral BLOQUEADO: fonte/conteúdo aprovado ou modelo validado com metadados e revisão legítimos ainda ausentes. E1 mantém política candidata. E3–E5 seguem com trabalho local independente, sem aceite hospedado. Supabase pausado depende do proprietário; gates/releases desativados, R$0 e zero chamadas de provider. A apresentação web das seis seções e QA visual seguem na WU140.
