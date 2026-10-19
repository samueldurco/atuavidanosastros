# Interpretações de Sonhos — evidência local da edição 4

Data: 2026-10-15. Checkout: `arquitetura-integral-20261015`. Contrato: `docs/contracts/private-dream-interpretations-v4.md`. Skills aplicadas: `atv-aprovar-interpretacoes` (critérios edição 4) e `pdf` (renderização e revisão de todas as páginas). Amostras exclusivamente sintéticas.

## E1–E5 e alcance

| Marco                 | Evidência                                                                                                                                                                                                                        | Limite                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1 — entrada e método | Relato integral, emoções, associações e contexto atribuídos ao usuário. Aprofundada com 1–3 registros consentidos e revisões fixadas; projeção recalculada.                                                                      | Correspondência literal entre categorias; não há descoberta de significado universal ou autenticação isolada da origem pelo compositor.           |
| E2 — interpretação    | Avaliador específico, cinco grupos emocionais condicionais, contrafactuais, ablações, comparação por categoria, síntese e prática dependentes dos campos. Revisão manual dos dois documentos completos.                          | Corpus finito de rótulos exatos; palavras desconhecidas permanecem abertas. Não comprova interpretação clínica ou compreensão livre da narrativa. |
| E3 — caminho privado  | Integração em `calculateTrial`, composição e aprovação normais. Snapshot fixa fontes/revisões e conserva versões antigas. O carregador existente busca registros por proprietário; UI/API aplicam o limite em frente coordenada. | Esta frente não realizou concessão real nem sessão hospedada; testes não substituem RLS, autorização e gate integrado.                            |
| E4 — entrega local    | 18 casos focais; suíte combinada de 89 casos aprovada. Após ajuste final de copy, 23/23 Sonhos + nomes aprovados. ESLint dos sete arquivos alterados sem erros. Dois PDFs abertos, extraídos e renderizados integralmente.       | Check/lint/build, E2E integrado, publicação e conta real são coordenados pela execução principal.                                                 |
| E5 — aceite pessoal   | Não preenchido.                                                                                                                                                                                                                  | Depende do proprietário experimentar os produtos na conta autorizada.                                                                             |

## Provas funcionais e semânticas

- Trocar associação altera hipótese, síntese e prática; trocar emoção altera a direção da hipótese e o experimento correspondente. As seções independentes permanecem estáveis. Trocar contexto altera o trecho pertinente sem mudar o relato.
- Cobertura explícita de exploração, cautela, atrito, ausência e acolhimento; remover o rótulo remove a conclusão dependente. Remover hesitação elimina a integração de curiosidade com cautela. Rótulos desconhecidos e frases negadas não são classificados por substring.
- Campos ausentes permanecem lacunas. Na comparação, emoção e associação com a mesma palavra não cruzam categorias. São testados associação compartilhada, somente emoção compartilhada, nenhuma coincidência, campo ausente e relato duplicado.
- Um, dois e três registros têm ordem e revisões estáveis. Zero, quatro, ID duplicado, revisão inválida, data futura ou falta de consentimento são rejeitados. A UI/API do limite pertencem à frente de integração e não são apresentadas como prova deste teste unitário.
- Alterações em entrada, dados, fatos, revisão, proveniência, texto, plano, perguntas ou prática não aprovam. Casos negativos incluem previsão universal, diagnóstico, leitura da mente, ação irreversível e instruções hostis dentro do relato. O relato hostil permanece citado, sem comandar a interpretação.
- Leitura V3 individual e aprofundada de cálculo V1 conservam aprovação e payload, inclusive ausência de `nameRevision`. O Diário de 30 Dias conserva seu despacho próprio e passou na suíte combinada.

## Conteúdo e PDF

Os PDFs finais foram gerados em 15/10/2026 após reduzir repetições no método e nos limites da edição nova. A interpretação individual tem **3 páginas**; a aprofundada, com três registros selecionados, **7 páginas**. Todas as dez páginas foram renderizadas com Poppler a 100 dpi e examinadas. Não foram observados cortes, sobreposição ou glifos inválidos. O índice da aprofundada aponta para os capítulos nas páginas corretas; capa, títulos, referências e numeração foram conferidos. Uma quebra anterior que deixava duas linhas em uma quarta página da individual foi eliminada sem alterar o texto das hipóteses.

A extração com pypdf confirmou presença integral normalizada de título, abertura, seções, perguntas, prática, fonte e limites: **14 blocos** na individual e **18** na aprofundada, nenhum ausente. Os capítulos preservam cenas completas e exemplos que apoiam ou contrariam hipóteses. O dossier acrescenta comparação e síntese da amostra, além do conteúdo individual. Duplicação proposital da cena em registros sintéticos é explicada como possível anotação repetida.

Artefatos locais reproduzíveis: `test-results/dream-interpretation/` contém PDFs, snapshots JSON, TXT, PNGs, extração e `pdf-parity-report.json`; `verify-pdf.py` verifica a correspondência. Os PDFs podem ser regenerados pelo teste focal, sem dados pessoais ou serviço externo. SHA-256 dos PDFs inspecionados:

- `dream-reading.pdf`: `881928f3091b6580040134f7e9dd47b613f648f3b3f769043ffb62fef22026c9`.
- `dream-dossier.pdf`: `c7be79957baf368a9a97a8fdb12606b6f760f517f3cfc80fa2f9dbde9dbc21f8`.

Comandos focais executados em `apps/web`: `pnpm exec vitest run src/lib/trials/dream-interpretation.spec.ts src/lib/trials/private-trials.spec.ts src/lib/trials/dream-atlas-reading.spec.ts` (89/89); após o último ajuste de source/limites, `pnpm exec vitest run src/lib/trials/dream-interpretation.spec.ts src/lib/trials/offer-names.spec.ts` (23/23). ESLint focal passou. Nenhum deploy, cobrança, concessão real ou aceite pessoal é alegado por este relatório.
