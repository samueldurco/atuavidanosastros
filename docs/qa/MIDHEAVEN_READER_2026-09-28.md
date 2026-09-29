# Meio do Céu — fluxo persistido e leitor

WU-131 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Requisito e alteração

E3/E4: delivery `atv-product-delivery/1.5.0` apresenta o fato MC, contribuição pública, possibilidades, tensão e síntese com três perguntas. Preserva texto, tipo e evidências. A versão altera o digest das novas revisões; snapshots anteriores permanecem imutáveis. O leitor identifica Meio do Céu e contexto relatado separadamente.

O catálogo prevê web. A capacidade purpose-direction não contém cartografia; SVG de mapa e PDF permanecem ausentes. O card privado de seção deriva da leitura web conforme WU040. A rota de demonstração continua restrita ao ambiente local e identifica explicitamente o conteúdo sintético.

## Provas locais

- Worker: check e 92 testes PASS; projeção dos cinco títulos preserva evidências MC e três perguntas, com digest distinto da versão anterior. `test-results/wu131-worker-check.log` e `wu131-worker-unit.log`.
- Web: check com zero erros e avisos, `test-results/wu131-web-check.log`.
- SQL local: vertical MC PASS (um caso, 14 não selecionados). Cálculo real → facts → aprovação fictícia explícita → snapshot web → reabertura privada e idempotência; outro proprietário recebe 404, reprocessamento cria versão filha independente e revogação impede recuperação. `test-results/wu131-sql-mc.log`. Aprovação da fixture não constitui autoridade legítima.
- Playwright: 26 PASS, sendo cinco MC e 21 regressões de ASC/Bússola/Três Pilares/Natal. MC cobre 1440/820/390/320, cinco seções, três perguntas, proveniência, teclado, histórico, reabertura e estados pendente/revogado/falha que retêm leitura e downloads. `test-results/wu131-reader-e2e.log`.
- Revisão visual direta dos quatro PNGs completos e das faixas móveis: texto, limites, ações e histórico legíveis, sem corte ou overflow horizontal. Capturas `test-results/wu131-reader-visual/midheaven-reader-{1440,820,390,320}.png`. Gate B `LOCAL_QA_PASS / VISUAL_REVIEW_PARTIAL`, referência P0-05 existente; sem aprovação visual integral.
- CI130 do SHA `a769e588943c6c1ed174c62e9f5301bd544955b0`: [36507221187 PASS](https://github.com/samueldurco/atuavidanosastros/actions/runs/36507221187). CI131 será registrada após o commit.

## Aceite e pendências

| Marco | Estado integral | Evidência ou dependência |
| --- | --- | --- |
| E1 | BLOQUEADO | Coerência local WU129; homologação do cálculo pendente. |
| E2 | BLOQUEADO | Estrutura WU130; conteúdo/modelo/revisão legítima pendentes. |
| E3 | BLOQUEADO | Fluxo SQL local validado; autoridade e sessão hospedada pendentes. |
| E4 | BLOQUEADO | Leitor local validado; conteúdo aprovado e Gate B integral pendentes. |
| E5 | BLOQUEADO | Percurso sintético local demonstrado; aceite real depende dos itens acima. |

Supabase permanece pausado: proprietário deve retomar o projeto para validar OAuth/sessão. Sem novas chamadas de modelo, gasto, migração ou mudança de gates. MC permanece parcial, sem release. Próximo requisito seguro: E1 da Carta do Dia.
