# Acessibilidade dos componentes privados — 05/10/2026

WU237 / plano §0.6 e Onda 8 §15 / Gate B. RUN_ID `ATV-20260902-170644Z-01A0630F`.

## Escopo e correção

O scanner público passa a ser compartilhado com oito estados existentes: dashboard, onboarding inicial e indisponível, Biblioteca com itens e indisponível, leitor disponível, em revisão e interrompido. Cada estado é verificado em desktop 1440×1000 e mobile 390×844. As páginas locais `_spec` montam os componentes reais com dados sintéticos; o onboarding recebe respostas de API interceptadas. Não há sessão autenticada, escrita em banco ou dado de produção.

Cada caso verifica status 200, heading, estado esperado e análise axe completa. No onboarding indisponível, o alerta aparece e salvar permanece desabilitado; em leituras não aprovadas ou interrompidas, o conteúdo `#leitura` permanece ausente. As regras WCAG 2 A/AA, 2.1 A/AA e 2.2 AA usam axe 4.13.0 sem exclusões ou regras desativadas.

A primeira rodada teve 16/16 PASS sem violações, mas dois relatórios apontaram `aria-prohibited-attr` inconclusivo: `aria-label` em um `div` sem papel apropriado na Biblioteca. A coleção agora usa `section` com o mesmo nome “Itens salvos”, tornando-se uma região nomeada. O teste verifica seus três artigos. Classe, filtros, links e apresentação permanecem preservados. A semântica segue a referência primária [WAI — regiões de navegação](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/).

## Validação

- Check final: zero erros e avisos; lint e build PASS.
- Antes da correção semântica, a regressão com scanner compartilhado passou 26/26 (17 públicos e nove Gate B). Essa rodada não valida a correção posterior.
- Rodada final após reconstrução: **42/42 PASS**, 4,4 minutos (16 privados, 17 públicos e nove Gate B). Os 33 relatórios axe têm zero violações. Nos 16 privados há zero resultados inconclusivos; o achado ARIA corrigido não reaparece. Os limites públicos permanecem preservados nos relatórios.
- Evidências locais no checkout isolado: `test-results/wu237-check-final.log`, `wu237-lint-final.log`, `wu237-build.log`, `wu237-e2e-final.log` e `wu237-e2e-final-artifacts/`. O resumo inicial `wu237-axe-summary.json` preserva os achados anteriores.
- CI executa as três suítes em um worker; artifact `accessibility-results`, retenção de sete dias, inclusive em falha. A prova do CI do SHA exato será registrada no log canônico externo.

## Limites

O aceite verifica os componentes nos estados enumerados e não certifica conformidade WCAG integral. Os relatórios completos preservam resultados inconclusivos; a revisão manual e o leitor de tela continuam necessários. Os limites públicos de contraste e sobreposição estão registrados em `PUBLIC_ACCESSIBILITY_2026-10-05.md`.

Fixtures não demonstram autorização real, persistência hospedada, conteúdo editorial aprovado ou E1–E5 concluídos. Supabase pausado e dependências editoriais/comerciais permanecem bloqueadores. Nenhuma flag, permissão, oferta, custo ou gate de liberação foi alterado.
