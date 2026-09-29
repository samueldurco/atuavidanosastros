# Três Perguntas — leitor web e aceite local

RUN_ID: ATV-20260902-170644Z-01A0630F. WU143, 29/09/2026. Produto `three-questions`, rota `/tres-perguntas`, formato web. Cálculo real determinístico com dados sintéticos; nenhuma aprovação editorial legítima ou liberação hospedada. R$0 e gates preservados.

## Requisito e alteração

Delivery `atv-product-delivery/1.9.0` apresenta oito seções: pergunta/carta registradas e leitura própria para cada um dos três pares, relação conjunta e síntese com três perguntas práticas. Os seis fatos confiáveis vêm da projeção validada, fora das afirmações editoriais; o contexto continua relato separado. Afirmações são ordenadas pelo papel numérico, preservando seus textos, referências, relação e síntese. A preparação captura a base validada antes do trabalho assíncrono, impedindo alteração concorrente dos pares. Versão e conteúdo integram o digest de revisão; revisão anterior não autoriza esta entrega.

O leitor distingue `question-1..3`, `card-1..3` e `tarot-context`. A demonstração restrita ao hostname local usa UUID sintético `00000000-0000-4000-8000-000000000143`, cartas A Lua, Seis de Ouros e Dez de Copas, na ordem registrada. Perguntas e contexto são relatos sintéticos consentidos. Textos identificados como fixtures não fornecem significados homologados nem autoridade editorial. Downloads web/card/e-mail ficam desabilitados nessa demonstração; PDF e cartografia não são formatos do produto.

## Provas locais

- Worker 111/111 PASS (`test-results/wu143-worker.log`): pares e títulos exatos, ordem canônica, preservação de textos/referências, serialização recuperável, captura contra mutação concorrente, rejeição de incoerência dos fatos e ausência de papéis/relação/síntese/perguntas. Nenhuma promoção sem revisão e autoridade legítimas.
- Checks Worker e web PASS (`wu143-worker-check.log`, `wu143-web-check-final2.log`); Svelte sem erros ou avisos.
- Suite web: 1246 casos PASS e uma expectativa antiga de síntese falhou (`wu143-web-unit-final.log`). Após corrigir essa expectativa, vertical Três Perguntas 1 PASS, 14 omitidos (`wu143-web-vertical-final.log`), incluindo os novos oito blocos, seis fatos, textos exatos dos pares e export. As 1246 provas anteriores e a prova focal corrigida cobrem os 1247 casos; não é uma única rodada integral verde.
- Vertical prova persistência SQL privada, proprietário/Biblioteca, leitura e snapshot web, reprocessamento idempotente com revisão independente e revogação. Publicação e autoridade são fixtures explícitas. SQL dos cálculos simbólicos reais 1 PASS (`wu143-sql.log`), preservando cartas no reprocessamento.
- CI142 `36518928341`, SHA `0a0ff91`, FAILURE por dois parâmetros sem tipo no helper de fixture. WU143 acrescenta a anotação JSDoc; check web final PASS. A suite vertical também recebe a fixture específica omitida na WU142. Evidência `wu142-ci-failure.json` e `wu142-ci-quality.log`; CI143 será registrado no checkpoint após push.
- Playwright: primeira rodada de 46 cenários encerrou por falha do servidor local de preview após 20 PASS (`wu143-readers-e2e.log`). Nova rodada aprovou 25 cenários dos leitores Carta do Dia, Meio do Céu, Foco Agora, Sim/Não e Três Pilares, antes de falhar numa expectativa de separador em Três Perguntas (`wu143-readers-e2e-final.log`). O leitor usa `·`; corrigida a expectativa, os cinco cenários de Três Perguntas passaram (`wu143-three-questions-e2e-final.log`). Os 16 cenários de Bússola/Ascendente/Mapa Astral passaram na primeira rodada. Assim, os 46 cenários distintos tiveram aprovação, distribuída nessas rodadas, sem afirmar uma rodada única verde.
- Três Perguntas em 1440/820/390/320 px: oito seções e sete fatos/contexto, igualdade dos pares registrados, versões/limites, três perguntas práticas, overflow horizontal máximo de 1 px, teclado/histórico, recarga dos mesmos pares e estados pendente/revogado/falha sem leitura ou formatos. Inspeção visual das quatro capturas `apps/web/test-results/tests-three-questions-read-*/three-questions-reader-{1440,820,390,320}.png` PASS: texto, fontes, navegação, histórico e ações sem sobreposição ou cortes; fluxo vertical em mobile. Títulos longos quebram linhas sem ultrapassar a largura.
- Intake e base preservados: [THREE_QUESTIONS_BASE_2026-09-29.md](THREE_QUESTIONS_BASE_2026-09-29.md), cobertura editorial [THREE_QUESTIONS_EDITORIAL_2026-09-29.md](THREE_QUESTIONS_EDITORIAL_2026-09-29.md). Essas provas locais não encerram o Gate B integral.

## Aceite E1–E5

| Marco | Implementação e validação locais                                                                | Aceite integral                                                 |
| ----- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| E1    | Intake/base real e coerência dos três pares PASS/WU141                                          | BLOQUEADO: homologar política simbólica candidata               |
| E2    | Três leituras, relação/síntese/perguntas estruturais PASS/WU142                                 | BLOQUEADO: conteúdo/modelo/prompt/metadados e revisão legítimos |
| E3    | Persistência, Biblioteca, leitura privada, revisão independente e recuperação PASS em SQL local | BLOQUEADO: aprovação legítima e sessão hospedada                |
| E4    | Leitor, estados, teclado e QA visual nas quatro larguras PASS/WU143                             | BLOQUEADO: conteúdo completo e hospedagem                       |
| E5    | Percurso sintético SQL, salvar/reabrir e recarga dos mesmos pares PASS                          | BLOQUEADO: percurso real aprovado e hospedado                   |

Editor/proprietário: aprovar política e conteúdo com fontes/metadados/revisão autênticos. Proprietário: retomar Supabase `irgnhvouvzyoqfmltrna` para validação hospedada. Sem mudança desses bloqueios, nenhuma nova chamada paga ou abertura de gate. Após o fechamento local, avançar automaticamente para Registro de sonho (`dream-journal`) E1, mantendo os 25 produtos, ATV+ e todo o plano original no escopo.
