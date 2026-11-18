# Leituras digitais — catálogo de 18/11/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Pedido do proprietário: implementar e publicar uma vitrine de leituras digitais com a estrutura comercial da Terabyte como inspiração, preservando a identidade ATVNA, criando ilustrações e mockups e otimizando o celular.

## Entrega

- Busca por palavras e assuntos, sem distinção de acentos; seis departamentos; filtros de tema e disponibilidade; ordenação por nome ou testes gratuitos.
- Endereço compartilhável com filtros, busca e ordenação preservados ao recarregar. Canonical permanece `/leituras`.
- Barra lateral no desktop e painel expansível no celular, com contagem de resultados, filtros removíveis e recuperação da busca sem resultados.
- Grade de três colunas no desktop, duas no tablet e uma no celular; banner e busca compactos em telas pequenas.
- Trinta capas com gravuras específicas do produto, paleta do universo, título e materialidade de livro. O mesmo componente apresenta a leitura na página de produto.
- Amostras completas existentes preservadas em `#amostra`. Os cartões distinguem os 11 testes gratuitos dos 19 produtos em preparação, respeitando também o acesso de teste já previsto pela aplicação. Nenhum preço, avaliação, estoque ou desconto foi inventado.
- ATV+ mantém seu percurso separado. Rotas de teste, autenticação, leitores privados e regras comerciais não foram alterados.

Superfícies: `/leituras`, cartões compartilhados de leituras e apresentação visual de `/produtos/[slug]`. A integração inclui a revisão da Loja dos Signos já publicada em `699f4ba8`.

## Arte e referências

Direção aplicada: skill `atvna-web-design`, MVP visual aprovado em 14/10/2026 e `docs/DESIGN.md`; Newsreader e Onest, papel marfim, tinta petróleo, cobre e cores dos seis universos.

As capas reutilizam as gravuras aprovadas de `mvp-product-design.json` por meio de `MvpProductArt`, com nova montagem em fólio. São apresentações decorativas; o conteúdo real continua acessível na amostra identificada como fictícia.

Nova ilustração de banner gerada com a ferramenta nativa de imagens, usando `brand/mvp/assets/revisao/mandala-gravada.webp` como referência de traço. Prompt:

> Create one new illustration asset for the ATVNA Brazilian astrology digital reading shop. Style reference image 1 ONLY: its meticulous antique woodcut/copperplate engraving, deep petrol blue ink, warm ivory cuts and restrained muted copper accents. New subject: an open antique book whose pages gently become a celestial arch, with a small crescent moon and a radiant sun above the book, a few fine orbital lines. A single cohesive compact engraving, beautifully hand carved linework, quiet editorial craft, credible fine art print, no photorealism, no gradients, no 3D render, no lettering, no words, no logos. Wide balanced silhouette with generous transparent margin. Warm ivory ink parts should remain opaque inside the engraving. Entire outside background genuinely transparent. Intended as the right-side hero illustration of a tactile paper website; artwork must be legible at 330px width. Do not duplicate the reference zodiac wheel; invent this book composition.

Arquivo publicado: `apps/web/static/brand/mvp/assets/catalogo/livro-celeste-v1.webp`, 960 × 640, 170.782 bytes, com transparência. A conversão do PNG preservou a composição aprovada na revisão local.

## Validação e publicação

Revisão visual local em 320, 390 e 1440 px, incluindo catálogo e apresentação do produto. Os testes verificam a correspondência entre as 30 gravuras e suas amostras, limites das capas, filtros combinados, ordenação, recarga, estado vazio e ausência de transbordamento. As 30 amostras também são verificadas em 390 e 1440 px.

A publicação exige CI na revisão exata, preflight e conferência do deployment de produção. Resultados finais, capturas, revisão publicada e verificações HTTP ficam na evidência de release e no log canônico externo.

Limitação anterior a esta alteração: o postflight de produção registra 13 de 15 verificações, com HTTP 503 `provider_unavailable` nas consultas das canecas de Áries e Câncer. Esta reformulação de produtos digitais não modifica essa integração.

Reversão: restaurar o deployment anterior registrado na evidência de release ou reverter esta alteração, preservando trabalho concorrente.
