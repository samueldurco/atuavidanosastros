# Carta do Dia — fluxo persistido e leitor

WU-134 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Requisito e alteração

E3/E4: delivery `atv-product-delivery/1.6.0` apresenta carta registrada, pergunta relatada, observação, conexão com a pergunta, prática e síntese com uma pergunta exploratória. Texto e evidências são preservados; a versão muda o digest das novas revisões, sem reescrever snapshots anteriores. O leitor diferencia carta sorteada, pergunta e contexto relatados.

O catálogo prevê web. O card privado de seção existente segue WU040; cartografia e PDF não são adicionados. A demonstração continua restrita ao ambiente local, explicitamente sintética e sem autoridade de aprovação real.

## Provas locais

- Worker: check e 96 testes PASS; seis títulos, evidências e pergunta preservados, digest diferente da versão anterior e rejeição de cobertura incompleta. `test-results/wu134-worker-check.log` e `wu134-worker-unit.log`.
- Web: check com zero erros e avisos, `test-results/wu134-web-check.log`.
- SQL local: vertical Daily PASS (um caso, 14 não selecionados). Cálculo real → facts → aprovação fictícia explícita → snapshot → reabertura privada e idempotência; outro proprietário recebe 404, reprocessamento cria versão filha e revogação impede recuperação. `test-results/wu134-sql-daily.log`. A fixture não constitui aprovação legítima.
- CI133 [36510375894](https://github.com/samueldurco/atuavidanosastros/actions/runs/36510375894), SHA `7ca364a33ce2e06ffd65f03a009db7bd7e55dd60`, falhou em test:db porque a antiga fixture do Director não cobria o perfil Daily. Correção focal: cobertura completa ainda exige revisão, remoção da prática rejeita e nenhum estado persistido é alterado. `test-results/wu133-quality-ci.log` e `wu134-processing-director-db.log` (um PASS). A primeira rodada local carregou um seletor de claim incorreto; os outros casos passaram e a nova rodada focal confirmou a correção.
- Playwright: cinco Daily PASS em 1440/820/390/320, seis seções, uma pergunta, proveniência, teclado, histórico e reabertura com a mesma carta; estados pendente/revogado/falha retêm leitura e formatos. `test-results/wu134-daily-reader-e2e.log`. As 26 regressões ASC/Bússola/Três Pilares/Natal/MC passaram na rodada `wu134-reader-e2e.log`; os quatro casos Daily inicialmente falharam por um seletor que procurava “Sorteio” fora do campo, corrigido para o rótulo da carta.
- Revisão visual dos quatro PNGs completos e faixas móveis: texto, limites, ações e histórico legíveis, sem corte ou overflow horizontal. Capturas em `test-results/wu134-daily-reader-visual/` e `wu134-reader-bands/`. Gate B `LOCAL_QA_PASS / VISUAL_REVIEW_PARTIAL`, referência P0-05 existente; sem aprovação visual integral.
- Prettier focal, diff e scan de segredos são registrados antes do commit. CI134 será registrada após o push.

## Aceite e pendências

| Marco | Estado integral | Evidência ou dependência |
| --- | --- | --- |
| E1 | BLOQUEADO | Coerência local WU132; política candidata requer homologação. |
| E2 | BLOQUEADO | Cobertura WU133; significados, conteúdo/modelo e revisão legítimos pendentes. |
| E3 | BLOQUEADO | Fluxo SQL local validado; autoridade legítima e sessão hospedada pendentes. |
| E4 | BLOQUEADO | Leitor local validado; conteúdo aprovado e Gate B integral pendentes. |
| E5 | BLOQUEADO | Percurso sintético local demonstrado; aceite real depende dos itens acima. |

Supabase permanece pausado: proprietário deve retomar o projeto para validar OAuth/sessão. Sem novas chamadas de modelo, gasto, migração ou mudança de gates. Carta do Dia permanece parcial, sem release. Próximo requisito seguro: E1 de Foco Agora.
