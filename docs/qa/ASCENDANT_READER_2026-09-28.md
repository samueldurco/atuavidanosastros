# Ascendente — fluxo persistido e leitor

WU-128 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Requisito e alteração

E3/E4: o perfil ASC completo precisa atravessar a aprovação simulada, a persistência e o leitor com títulos próprios. A fixture antiga do teste vertical, recusada corretamente pelo perfil da WU127, foi substituída pela fixture estrutural ASC. O delivery `atv-product-delivery/1.4.0` preserva texto, tipo e evidências e nomeia fato, abordagem, possibilidades, tensão e síntese com três perguntas. Sua versão altera o digest de futuras revisões; snapshots anteriores permanecem imutáveis.

O leitor identifica a base como Ascendente e distingue contexto relatado, quando presente. O cálculo usado contém somente ASC: sem MC, posições planetárias ou cúspides. Relatório web e cartografia SVG usam os produtores existentes. O card privado de seção continua uma derivação da leitura web conforme WU040; não constitui novo entitlement. PDF não é oferecido para este produto.

## Provas locais

- Worker: check e 86 testes PASS; a projeção dos cinco títulos preserva todo o texto/evidência e exatamente três perguntas. Revisão, promoção e release continuam exigidos. Logs `test-results/wu128-worker-check.log` e `wu128-worker-unit.log`.
- Web: check com zero erros e avisos, `test-results/wu128-web-check.log`.
- SQL local: teste vertical ASC PASS após correção da asserção sobre o contexto relatado. Cálculo real → facts → aprovação fictícia explícita → snapshot → web/SVG persistidos → reabertura privada e idempotência; outro proprietário recebe 404 e revogação impede recuperação de ambos. Reprocessamento cria versão filha independente. `test-results/wu128-sql-ascendant.log`. Os outros 14 casos passaram na execução inicial, `wu128-sql.log`.
- A rodada inicial dos leitores confirmou 17 casos anteriores/estados e encontrou quatro seletores SVG ambíguos no novo teste. O contrato permite cartografia e card de seção; o teste passou a identificá-los separadamente, ambos desativados na apresentação sintética. Evidência `test-results/wu128-reader-e2e.log`.
- Rodada final ASC: cinco testes PASS, com reflow 1440/820/390/320, cinco seções, três perguntas, proveniência, teclado até o histórico, reabertura e estados pendente/revogado/falha. O teste de teclado usa scroll e foco explícitos, como o teste natal existente. `test-results/wu128-ascendant-final.log`; Prettier e diff check PASS, `wu128-prettier.log`.
- Revisão visual direta dos quatro PNGs completos, em faixas superior, central e inferior: texto, bases, limites, recuperação, histórico e ações legíveis, sem corte ou overflow horizontal. Capturas `test-results/wu128-reader-visual/ascendant-reader-{1440,820,390,320}.png`. Gate B: `LOCAL_QA_PASS / VISUAL_REVIEW_PARTIAL` da superfície usada; referência ReadingShell P0-05 existente, sem aprovação de paridade integral ou conteúdo final.

## Aceite E1–E5

| Marco | Evidência local | Aceite integral |
| --- | --- | --- |
| E1 | Intake natal consentido, projeção exclusiva, coerência e limites; WU126 | BLOQUEADO: homologação determinística aplicável |
| E2 | Perfil, cobertura, prompt, Director/Gateway/Lab; WU127 | BLOQUEADO: conteúdo/modelo/revisão legítima |
| E3 | Percurso SQL privado, versões, recuperação e revogação; WU128 | BLOQUEADO: aprovação legítima e demonstração hospedada |
| E4 | Títulos, web/SVG e estados locais; WU128 | BLOQUEADO: conteúdo final e validação hospedada |
| E5 | Consolidação das provas de entrada até recuperação | BLOQUEADO: aceites anteriores e percurso hospedado |

Nenhuma fixture constitui interpretação aprovada. Supabase pausado: proprietário deve executar Resume project antes de nova prova de sessão hospedada. Revisão editorial/homologação pertencem aos responsáveis técnicos/editoriais; nenhuma nova chamada de modelo enquanto o bloqueio de metadados/revisão conhecido não mudar. Sem migração, gasto, alteração de gates ou publicação. Administração/TikTok/mídia/social paralelos preservados. Após terminar o QA local, o próximo produto elegível da fila é Meio do Céu; Ascendente permanece parcial e não liberado.
