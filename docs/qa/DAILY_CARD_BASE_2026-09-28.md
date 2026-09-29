# Carta do Dia — entrada e coerência da base

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU132, executor único. Implementação e validação locais; nenhuma liberação hospedada.

## Falha e correção

Uma carta com nome divergente do ID salvo era aceita pela preparação editorial (`test-results/wu132-before.log`: baseline e registro corrompido `prepared`). A inspeção agora bloqueia inconsistências entre carta, pergunta, fatos, proveniência e política, preservando os registros válidos. Cálculo, baralho, algoritmo, semente, versões do sorteio e política de recuperação permanecem os mesmos.

O teste específico usa o cálculo real determinístico com dados sintéticos. Cobre registros com e sem contexto, isolamento e ausência de mutação, mais 37 corrupções independentes. Os testes de revisão/entrega usam o mesmo cálculo real; textos e notas de revisão continuam fixtures sem autoridade editorial. Proveniência incoerente bloqueia antes de gerar digest; alterações válidas de contexto invalidam a revisão anterior. Ordenação de chaves JSON mantém o digest estável.

## Evidências

- Worker check PASS e 94 testes PASS: `test-results/wu132-worker-check.log`, `wu132-worker-unit.log`.
- Corpus: 13 testes PASS, incluindo fingerprint inalterado dos requests válidos, `test-results/wu132-corpus-test.log`. Versão sintética 1.14.0.
- Entrada/consentimento e percurso real de FormData, parser, recuperação, RPC/SQL e Biblioteca: provas existentes em `SYMBOLIC_PRODUCT_INTAKE_2026-09-25.md` e `SYMBOLIC_INTAKE_VERTICAL_2026-09-25.md`; não repetidas sem alteração nessas superfícies.
- CI da WU131, SHA `47fef37f108f07051cc78a2bc8b9e19a17df5ca5`, run `36507945629`, success: https://github.com/samueldurco/atuavidanosastros/actions/runs/36507945629. CI da WU132 será registrada no log/checkpoint após commit.

## Marcos e próximos requisitos

| Marco | Estado integral | Prova local / requisito pendente |
| --- | --- | --- |
| E1 | BLOQUEADO | Entrada e coerência locais validadas; responsável editorial deve revisar a política candidata de uma carta direta por pergunta. |
| E2 | EM_EXECUCAO | Próxima WU: contrato de leitura completa vinculada à carta e pergunta, com contexto relatado; conteúdo/modelo/revisão legítimos ainda pendentes. |
| E3 | PENDENTE | Persistência/recuperação de base existentes; integração com leitura e aprovação legítimas pendente. |
| E4 | PENDENTE | Entrega web de catálogo; resultado completo e QA específicos pendentes. |
| E5 | PENDENTE | Aceite integral exige os requisitos anteriores e percurso hospedado. |

R$0, sem chamadas de modelo, migrações, promoção ou mudança de gates. A inspeção não autentica o sorteio nem aprova interpretação. Supabase permanece pausado: proprietário deve executar Resume project para permitir a validação hospedada. A continuidade de E2 exige resolver a identificação de modelo/revisão e a avaliação legítima já registradas; não se fabrica evidência de fornecedor.
