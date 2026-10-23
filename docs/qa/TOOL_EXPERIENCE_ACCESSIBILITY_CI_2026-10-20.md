# Acessibilidade — ajuste dos testes à experiência integrada

- PR: #45 (`codex/tool-experience-20261020`).
- Base verificada: `0d6d5f8da7184899e72d486b8e54c460e119fa3e`.
- CI de origem: run `39459221821`, job `118754009813` (accessibility).
- Resultado anterior: 41 falhas e 133 casos aprovados. Os outros cinco jobs do run passaram.

## Causa delimitada

As 41 falhas eram expectativas anteriores à integração do desenho e das cartas:

1. O mapa passou de SVG inline para uma imagem SVG no componente compartilhado. Os seletores `svg [data-layer=...]` procuravam nós que já não pertencem ao DOM da página.
2. Os fatores técnicos passaram a ficar em um `details`. Os testes tentavam clicar no botão de Sol sem abrir essa seção.
3. A ampliação passou a usar um diálogo acessível, com fechamento e retorno de foco. O teste ainda esperava um botão alternado para “Ajustar à tela”.
4. As cartas passaram a ser figuras com imagem, legenda e ação própria. Os testes usavam o nome anterior da lista e uma estrutura de botão anterior; “Carta Única” também passou a existir em dois níveis de título, exigindo o título principal explícito.

A primeira rodada local chegou a duas expectativas adicionais, antes encobertas pelo primeiro seletor: o controle “Graus” oculta os dez rótulos planetários da camada `markers`, preservando os três paths de graduação fixa; e o capítulo final da mandala de Tarot passou a se chamar “O fio que aproxima as áreas”. Os testes passaram a exigir esses contratos exatos, com presença dos rótulos antes e ausência depois da ação.

A busca no log original por `pageerror`, `Uncaught`, `ReferenceError`, `TypeError`, `SyntaxError`, `hydration` e `net::ERR` não retornou ocorrências. Isso delimita o diagnóstico ao que o log registra; não constitui uma captura independente de todos os eventos do navegador.

## Correção e cobertura preservada

Nenhum código de produção, workflow, gate ou configuração de acessibilidade foi alterado.

- O helper `apps/web/tests/chart-image.ts` exige imagem visível, texto alternativo, decodificação válida, dimensões naturais positivas, SVG sem erro de parser e engine esperado. Confere a quantidade real de posições dentro do SVG e os limites do desenho na tela.
- O horóscopo, a semana e o dossiê continuam verificando camadas de aspectos/casas e arquivos SVG/PNG. A semana continua verificando que a geometria muda ao selecionar outra data.
- Os mapas individuais continuam exigindo duas imagens e dez posições por pessoa.
- A seção de fatores é aberta por teclado antes da navegação pelo Sol.
- A ampliação é aberta por Enter; o teste exige foco inicial no fechamento, região de exploração focável, imagem decodificada e maior que a prévia, axe no diálogo aberto, fechamento por Escape e por botão, e retorno de foco à ação original. Em 390 px, exige conteúdo horizontal maior que a região e deslocamento real por ArrowRight.
- O Tarot exige cada carta visível e decodificada, nome alternativo correspondente à legenda, tamanho e proporção legíveis, limites horizontais na tela e navegação da posição por teclado.
- Foram preservadas verificações de capítulos, conteúdo, estado atual, marcação, consentimento, recuperação de falha de salvamento, downloads, reflow, axe e screenshots em 390 e 1440 px; a suíte privada também verifica 320 px.

## Validação local

Prettier e ESLint dos arquivos alterados: aprovados.

Primeira rodada Playwright: **65 aprovados e 4 falhas em 6,9 min**, com Chromium e um worker. Os quatro casos restantes eram as duas expectativas descritas acima, em 390 e 1440 px. O lote de 69 inclui os 41 casos que falharam no CI, os demais casos privados selecionados, os seis casos do horóscopo público e as verificações adicionais de reflow dos Três Pilares.

```powershell
pnpm --dir apps/web exec playwright test private-trials.e2e.ts reconstruction.e2e.ts tarot-reconstruction.e2e.ts reconstruction-ascendant.e2e.ts reconstruction-atlas.e2e.ts reconstruction-birth.e2e.ts reconstruction-compass.e2e.ts reconstruction-dossier.e2e.ts reconstruction-horoscope.e2e.ts reconstruction-midheaven.e2e.ts reconstruction-pillars.e2e.ts reconstruction-week.e2e.ts --workers=1
```

Repetição focal após os dois ajustes: **4 aprovados em 53,1 s**. Repetiu os quatro casos com uma nova carga do teste, incluindo as provas finais de ampliação e teclado. Em conjunto, as duas rodadas aprovam os 69 casos selecionados; o lote completo não foi repetido após os ajustes restritos a esses quatro casos.

```powershell
pnpm --dir apps/web exec playwright test reconstruction.e2e.ts tarot-reconstruction.e2e.ts --grep 'career reconstruction|tarot-astrological-mandala' --workers=1
```

Evidências locais extensas (não versionadas):

- `test-results/tool-experience-ci-accessibility-failed.log`: log original do job.
- `output/qa/tool-experience-accessibility-local.log`: execução focal local.
- `output/qa/accessibility-first-pass/`: traces e estados das quatro expectativas antigas encontradas no primeiro lote, preservados antes da repetição.
- `output/qa/tool-experience-accessibility-final.log`: repetição dos quatro casos.
- `apps/web/test-results/`: screenshots/traces e estado da última execução.

Este registro comprova o ajuste e a validação local. A aprovação final do CI hospedado e a publicação ficam a cargo da execução principal.
