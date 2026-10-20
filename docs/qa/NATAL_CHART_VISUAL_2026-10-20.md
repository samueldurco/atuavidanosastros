# Desenho do mapa astral — 20/10/2026

RUN_ID: ATV-20260902-170644Z-01A0630F.

O pedido do proprietário é aprimorar o desenho astrológico com a identidade visual ATVNA. A composição usa marfim, azul e cobre, hierarquia entre signos, posições, casas, eixos e aspectos. A geometria vem do cálculo existente; o desenho não calcula nem inventa posições.

## Implementação

- Motor vetorial compartilhado entre a ferramenta gratuita, leituras e exportação SVG/PDF.
- Doze glifos zodiacais, graduação de 360 graus, glifos planetários, graus e minutos, casas reais e eixos identificados.
- Aspectos maiores usam a mesma política do mapa natal. Linhas-guia mantêm a posição verdadeira quando os símbolos se afastam para evitar colisão.
- Tabela de referência apresenta planeta, signo, grau e casa; legenda distingue os aspectos e a retrogradação.
- Coordenadas de desenho são serializadas com precisão suficiente para exibição; fatos e longitudes originais permanecem intactos. A compactação vetorial mantém o resultado gratuito dentro dos limites de persistência existentes.
- A interface oferece ampliação, ajuste ao espaço e exportação SVG.

## Verificação local

- Motor: 14 testes passaram, incluindo sete aglomerados densos, cruzamento 359°→0°, proteção de eixos/casas, ausência de colisões e preservação das longitudes.
- Cálculo gratuito e recibo: 21 testes passaram; o mapa detalhado continua válido após serialização JSON, assinatura e verificação do recibo.
- Exportação de produto: oito testes passaram.
- Prévia sintética e PDF vetorial renderizados e inspecionados: glifos, casas, graus, tabela e legendas legíveis, sem cortes. A prévia usa dados de teste, não os dados pessoais do proprietário.
- SVG gratuito de referência: aproximadamente 44 mil caracteres; resultado JSON de aproximadamente 54 mil bytes, abaixo dos limites existentes.

As evidências de execução ficam em `test-results/mandala-*.log`, `test-results/mandala-natal.svg`, `test-results/mandala-natal.pdf` e prévias PNG. Conferência local, publicação hospedada e aceite pessoal são etapas distintas; os respectivos resultados devem ser registrados após sua execução.

## Interface e exportação SVG

Revisão local por `/root/temporal_final`, em 20/10/2026. Os dados usados são sintéticos, destinados à verificação visual; esta etapa não aprova uma leitura de cliente.

- Ferramenta gratuita e leitor salvo: seis combinações dos componentes reais com larguras de 320, 768 e 1440 px. As doze capturas, em 100% e 300%, foram inspecionadas. Nenhuma página apresentou rolagem horizontal indevida.
- Ampliação de 100% a 300%, em passos de 50%, com limites desabilitados. O comando “Ajustar à tela” restaura 100% e a posição inicial da região rolável.
- A região recebe foco para exploração pelas setas do teclado; deslocamento horizontal e vertical confirmado nos seis casos. Controles com altura mínima de 44 px, nomes acessíveis e indicação visível de foco. A exceção de lint do `tabindex` está documentada no elemento rolável.
- O SVG baixado corresponde exatamente ao SVG calculado nos seis casos, com nome de arquivo definido. Nenhum erro de página foi registrado.
- `product-svg.ts` participa dos caminhos ativos de download e produção de artefatos. Usa a cena compartilhada, preservando gates, metadados completos, `reviewDigest`, fontes embutidas e coordenadas originais. Registros sem aspectos não recebem aspectos inventados.
- Playwright: oito testes passaram. Quatro exportações (natal, aglomeração, casas indisponíveis e Ascendente) preservam fatos e metadados, não fazem requisições externas, carregam as fontes e mantêm os textos dentro do `viewBox`. As quatro capturas foram inspecionadas. Os quatro testes restantes verificam a ação SVG em 1440, 820, 390 e 320 px, incluindo indisponibilidade após revogação.
- `svelte-check`: zero erros e zero avisos. Prettier, ESLint e `git diff --check` passaram nos quatro arquivos desta revisão.

Evidências: `C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/current-interpretation-20261019/mandala-ui/qa-ui.json`, script `qa-ui.mjs`, doze PNGs de interface e subdiretório `product-svg-e2e`; logs `test-results/mandala-product-svg-e2e.log` e `test-results/mandala-ui-svelte-check.log`. O ensaio usa o servidor local; a publicação hospedada permanece sob os gates de integração e liberação.
