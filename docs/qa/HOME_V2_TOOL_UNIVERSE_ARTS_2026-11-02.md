# HOME V2 — artes de ferramentas e universos

Data: 2026-11-02. Checkout: `home-editorial-20261102`. RUN_ID preservado: `ATV-20260902-170644Z-01A0630F`.

## Origem e direção

15 artes raster originais, geradas com a ferramenta integrada `image_gen`, uma chamada por arte. Referências aprovadas visualizadas antes da geração: `mandala-gravada.webp`, `micro-horizonte.webp` e `flor-gravada.webp`, em `static/brand/mvp/assets/revisao/`. Aplicadas as skills `atvna-web-design` e `imagegen`, os critérios da skill e `docs/DESIGN.md`.

Direção preservada: gravura artesanal, hachura fina, materialidade de impressão, tinta azul-petróleo `#183746` e cobre atenuado. As artes dos universos usam pigmentos minerais irregulares e a paleta temática vigente; a metade esquerda permanece calma para título HTML. Não há texto incorporado às imagens.

Originais PNG, prompts exatos, caminhos da geração e scripts de otimização: `C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/home-v2-20261102/tools-universes/manifest.json` e arquivos adjacentes. Os originais permanecem nessa pasta.

## Assets finais

Todos em `apps/web/static/brand/home-v2/`.

| Ferramenta | Arquivo | Motivo próprio |
| --- | --- | --- |
| Ascendente | `tool-ascendant.webp` | Sol emergindo no horizonte e eixo estrelado |
| Mapa Astral | `tool-birth-chart.webp` | Diagrama simples de posições e relações |
| Horóscopo | `tool-horoscope.webp` | Janela para o céu do dia |
| Combinação do Casal | `tool-compatibility.webp` | Dois diagramas ligados por um vínculo |
| Meio do Céu | `tool-midheaven.webp` | Eixo de culminação com arco gravado |
| Dinheiro no Mapa | `tool-money.webp` | Campo cultivado, sementes e recursos |
| Carta do Dia | `tool-daily-card.webp` | Uma carta com semente e broto |
| Carta do Amor | `tool-love-card.webp` | Uma carta com concha e laço |
| Registro de Sonhos | `tool-dream-journal.webp` | Caderno aberto e pena |

| Universo | Arquivo | Motivo e pigmento |
| --- | --- | --- |
| Mapa Astral | `universe-mapa-astral.webp` | Instrumento de observação e órbitas; azul profundo e ouro |
| Previsões | `universe-previsoes.webp` | Ampulheta, ave e vento; petróleo e dourado |
| Amor | `universe-amor.webp` | Ponte, aves e ramos entrelaçados; vinho e coral |
| Carreira | `universe-carreira.webp` | Caminhos, montanhas e portal; oliva e ocre |
| Tarot | `universe-tarot.webp` | Vela, chave, espelho e concha; terra e âmbar |
| Sonhos | `universe-sonhos.webp` | Mariposa, janela e mar noturno; ametista e lavanda |

## Integração e verificação

- Ferramentas: WebP transparente 512 × 512, qualidade 88, alphaQuality 100, effort 6. Universos: WebP 1200 × 800 (3:2), qualidade 85, effort 6. Conversão com Sharp 0.35.5 instalado no checkout. Total das 15 imagens: 2.377.968 bytes.
- `free-tool-design.ts` tem um mapa exclusivo para o contexto HOME. `FreeToolsCollection.svelte` seleciona esse contexto apenas em `/`; estilos adicionais estão no próprio componente. As instâncias de `/ferramentas` mantêm o mapa anterior. Não foram alterados formulários, sessões, quotas ou contratos de produtos.
- As seis artes de universos foram entregues ao responsável pelo layout; a integração delas é registrada na verificação geral da HOME.
- Inspeção visual realizada nos 15 resultados de geração, na folha de contato das nove ferramentas e nas capturas reais da seção em 1440 px e 390 px. Artes legíveis, sem repetições entre estas duas famílias e com fundo transparente adequado ao papel.
- Playwright no preview `http://127.0.0.1:4330/`: nove URLs de ferramentas únicas, todas carregadas com largura natural de 512 px; sem overflow horizontal em 390 px. `/ferramentas` manteve as nove referências anteriores. Evidências: `tool-browser-verification.json`, `tools-home-desktop.png`, `tools-home-mobile.png` e `tools-contact-sheet.png` na pasta acima.
- Prettier e ESLint focais nos dois arquivos de integração: aprovados (exit 0).

Esta entrega é implementação e verificação local, sem publicação hospedada.
