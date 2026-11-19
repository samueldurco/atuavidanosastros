# Páginas de produto — prévia ilustrada da entrega

Início: 18/11/2026. Validação final: 19/11/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Pedido: reformular e publicar as páginas dos produtos digitais, tornando “Amostra da leitura” e “Por dentro da leitura” apresentações visuais do conteúdo e dos entregáveis, com identidade ATVNA e adaptação para celular.

## Implementação

- As 30 ofertas públicas recebem chamada, introdução e três tópicos próprios em `product-delivery-presentation.ts`. Cada apresentação usa a amostra específica já existente do produto; os textos das interpretações e a identificação de conteúdo fictício foram preservados.
- `ProductDeliveryPreview.svelte` apresenta um leitor ilustrado: mapa e dados fictícios nas leituras astrológicas pertinentes; cartas, posições e legendas da tiragem nas amostras de Tarot; gravura aprovada do produto nas demais famílias. O índice, o contexto, os dados e os capítulos permitem reconhecer o conteúdo recebido.
- `ProductDeliveryFormats.svelte` mostra mockups de leitura na tela, páginas em PDF, desenho do mapa em SVG ou áudio, exclusivamente conforme `data.product.delivery`. Os mockups usam título, gravura e conteúdo da amostra correspondente. A representação de áudio é ilustrativa, sem reprodução ou duração inventada.
- A página conecta as seções por navegação para amostra, formatos e disponibilidade. Leitor e mockups se reorganizam em telas pequenas. Mantêm papel marfim, tinta petróleo, tipografia e gravuras do MVP aprovado; wallpapers, gravuras existentes e demais superfícies permanecem preservados.
- O texto integral dos capítulos permanece no DOM. Trechos com mais de 420 caracteres aparecem inicialmente em até sete linhas; o botão “Ler os trechos completos” / “Recolher os trechos” controla a expansão com `aria-expanded`, `aria-controls` e foco visível.

## Contrato de entrega e jornada

Contagem atual das 30 ofertas, a partir do catálogo do domínio:

| Formato        | Produtos | Limite da apresentação                                         |
| -------------- | -------: | -------------------------------------------------------------- |
| Leitura na web |       30 | Inclui os 11 lançamentos, cujo único formato contratado é web. |
| PDF            |       16 | Mockup aparece somente quando previsto no catálogo.            |
| SVG            |        2 | `birth-chart` e `life-atlas`.                                  |
| Áudio          |        1 | `purpose-career`.                                              |

Todas as 30 ofertas estão em `PREPARING`. A página passa `planned={data.product.state !== 'ACTIVE'}`; portanto, todos os mockups informam “Formato previsto” e que os formatos e a apresentação final serão confirmados na liberação do produto. A ilustração não declara um arquivo pronto nem disponibilidade comercial.

Continuam os percursos existentes: os 19 produtos do fluxo principal apontam para as condições de disponibilidade; os 11 lançamentos mantêm seus testes gratuitos e formulários próprios. A reformulação não altera autenticação, gates de acesso, preços, checkout, contratos de entrega ou interpretações aprovadas. A conferência de copy e jornada foi feita por inspeção de código; não representa homologação dos leitores privados.

## Validação e evidências

Verificação local Svelte final com **0 erros e 0 avisos**; ESLint e formatação dos arquivos alterados aprovados; auditoria de linguagem sem apontamentos em 525 fontes. Os dois novos testes passaram em **320 e 1440 px**, cobrindo os 30 produtos, textos integrais das amostras, expansão/recolhimento, formatos contratuais, limites de tela, carregamento do wallpaper e comparação exata da gravura aprovada. O teste foi incluído na suíte obrigatória de CI.

As capturas de amostra e formatos dos seis universos foram inspecionadas nos dois tamanhos: mapas, cartas, gravuras, páginas abertas e mockups permanecem legíveis e inteiros. A conferência local por HTTP passou nos **30 produtos, 49 mockups e 68 recursos**, sem falhas. A primeira rodada ampla de regressão teve 83 aprovações e detectou duas falhas novas de limite decorativo do PDF; o ajuste foi aplicado. A rodada final passou **5/5 testes**, incluindo os dois novos, as 30 amostras em 320/1440 px e falha de imagens com zoom de 200%. O registro final da rodada e do CI fica na evidência externa.

As provas, capturas, resultados finais, revisão exata do CI e identificação do novo deployment são registrados na [evidência externa desta entrega](C:/ATVNA/docs/30-execucao/evidencias/produtos-entrega-visual-2026-11-18/). O diretório contém a referência inicial de Cloudflare, o preflight final **19/19**, o relatório HTTP local e os relatórios de postflight e fornecedor físico. A liberação requer conferir o CI e o deployment da revisão exata; este documento, preparado para o PR, não declara publicação concluída.

Baseline anterior à alteração: **preflight 19/19** e **postflight 13/15**. As duas falhas são as consultas físicas de caneca Áries e caneca Câncer, HTTP 503 `provider_unavailable`; não pertencem ao fluxo digital alterado aqui.

Referência de rollback verificada em `baseline-cloudflare.json`: projeto Cloudflare Pages `atuavidanosastros`, deployment de produção `6cfaee6e-a41c-4aa6-84cb-c33227b5aadd`, commit `cb312d233b355d6cb94d56bf4c5053d8ff524d19`. A execução e a verificação de eventual reversão devem permanecer na evidência externa, preservando trabalho concorrente.
