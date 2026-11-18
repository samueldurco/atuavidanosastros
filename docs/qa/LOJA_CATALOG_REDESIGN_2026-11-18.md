# Loja dos Signos — catálogo de 18/11/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Pedido do proprietário: reformular e publicar a Loja dos Signos usando a estrutura comercial da Terabyte como inspiração, preservando a identidade ATVNA, com liberdade para novas imagens e prioridade para celular.

## Entrega

- Busca por palavras, com ou sem acentos; categorias; coleções temáticas e por signo.
- Filtros laterais no desktop e diálogo modal no celular, com retorno do foco, Escape e fechamento ao mudar para desktop.
- Combinações de dois signos em qualquer ordem; filtros removíveis; ordenação por nome ou preços revisados; filtro de compra online quando o comércio estiver habilitado.
- Grade de três colunas no desktop e duas no celular; 24 peças por etapa e carregamento incremental.
- Preços extraídos de `shop-reviewed-offers.json`, respeitando elegibilidade e flags atuais. Oferta, disponibilidade final, frete e compra continuam no fluxo existente da peça. As peças em preparação permanecem identificadas.
- Novo banner decorativo em gravura e aquarela, com as cores, fontes e materialidade ATVNA. Sem alteração das artes de produtos físicos.

Superfícies: `/loja`, `/loja/colecao/[colecao]` e `/loja/signo/[signo]`. O componente compacto de coleções só é ativado nesse catálogo. A vitrine da home e o fluxo de checkout mantêm seus contratos.

## Arte gerada

Ferramenta: geração de imagens nativa. Ilustração original de site, sem texto, produtos, pessoas ou logotipos.

Prompt:

> Use case: ads-marketing. Create an original premium editorial illustration for the ATVNA Loja dos Signos ecommerce website, a Brazilian zodiac art shop. Asset: panoramic wide banner illustration, no text. A small celestial botanical garden: a beautifully engraved copper sun, an elegant zodiac wheel partly hidden behind flowers, indigo botanical leaves, delicate red, ochre and violet watercolor flowers, hand-inked star details. Rich navy midnight #102c3d and mineral ink #183746 ground with copper #a36632, warm cream #fff8e9 highlights, muted sage greens. Handmade etching linework with fine hatching and authentic translucent watercolor, subtle tactile paper. Sophisticated, artistic, clear at mobile size, not a cartoon. Composition: dominant compact circular celestial garden on the right two thirds, quiet dark navy negative space toward left; avoid a central giant moon. Edge-to-edge panoramic landscape 3:1 aspect ratio. This is a decorative website illustration, not a product mockup or an astrology calculation. No people, no products, no typography, no labels, no logos, no watermarks, no UI.

Arquivos finais em `apps/web/static/brand/shop/storefront-20261118/`:

- `celestial-garden.webp`: 1800 × 600, 355.388 bytes.
- `celestial-garden-small.webp`: 900 × 300, 85.748 bytes, selecionado por `<picture>` em telas de até 640 px.

## Validação e publicação

Revisão visual local das capturas em 1440 e 390 px; ensaio de ausência de transbordamento em 320, 390, 820 e 1440 px para loja, coleção de casal e peça. Verificação axe e teclado em desktop e celular, incluindo diálogo móvel e página de peça.

Testes de busca, paginação, recuperação sem resultados, combinações e transição de viewport; testes unitários com o catálogo real; regressão do fluxo de compra com fixtures sintéticas. Nenhum pedido, pagamento ou chamada à fábrica é criado por esses testes.

A rodada final de navegação e loja passou com 19 testes. A navegação confere todos os links do catálogo após o carregamento incremental e verifica que a troca de departamento reinicia a exibição em 24 peças.

Limitação já existente antes da publicação: o postflight de produção passou em 13 de 15 verificações; as consultas de produto de `caneca-aries` e `caneca-cancer` retornaram HTTP 503 com `provider_unavailable`. O mesmo resultado foi confirmado no domínio oficial e no deployment anterior `dd0e8a74-9d49-4043-9688-a22a351e9fce`. A reformulação não altera a integração de disponibilidade ou as flags comerciais.

A publicação exige CI na revisão exata, preflight, build e postflight. IDs, revisão publicada e verificações HTTP finais ficam na evidência de release e no log canônico externo. Reversão: restaurar o deployment de produção anterior registrado imediatamente antes da publicação ou reverter este conjunto de alterações, preservando alterações concorrentes.
