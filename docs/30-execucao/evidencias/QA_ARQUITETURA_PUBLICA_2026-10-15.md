# QA local da arquitetura pública — 15/10/2026

Servidor congelado: `http://127.0.0.1:4182`. Nenhum build, mudança de runtime ou publicação foi executado nesta revisão. A skill `atvna-web-design` orientou a inspeção da composição renderizada.

## Reprodução e resultado

Em `apps/web`, executar `ATV_QA_BASE_URL=http://127.0.0.1:4182 node scripts/qa-public-architecture.mjs` (no PowerShell, definir a variável de ambiente antes do comando). O roteiro foi atualizado somente nos seletores de abertura/recolhimento do Ascendente: `.tool-open[aria-controls="interactive-ascendente"]`. As verificações funcionais foram preservadas.

| Largura | Home e sorteio | Erros de página | Excesso horizontal em formulário/resultado | Última ferramenta alcançável | Violações Axe |
| ------- | -------------- | --------------- | ------------------------------------------ | ---------------------------- | ------------- |
| 390 px  | HTTP 200       | 0               | Não / não                                  | Sim                          | 0             |
| 768 px  | HTTP 200       | 0               | Não / não                                  | Sim                          | 0             |
| 1440 px | HTTP 200       | 0               | Não / não                                  | Sim                          | 0             |

Nas três larguras, o formulário preservou os dados ao recolher/reabrir; a Carta do Amor preservou o resultado ao recolher/reabrir e recarregar; a limpeza removeu o resultado e seu registro de sessão. A largura do documento permaneceu igual à do viewport, sem imagens quebradas detectadas. O Axe verificou os estados de formulário e resultado com as regras WCAG 2 A/AA e 2.1 AA. Isso não substitui uma auditoria manual integral de acessibilidade.

## Inspeção visual

Foram inspecionadas capturas da abertura, dos seis universos, das nove ferramentas, da Revista ATVNA, da vitrine de produtos físicos, dos três planos ATV+, das redes sociais e do rodapé. A inspeção incluiu 390, 768 e 1440 px, com capturas suplementares do resultado dentro da ferramenta em viewport real.

As ferramentas mantêm sua identidade gráfica em blocos horizontais, com indicação de continuidade, contador e botões de navegação. Os formulários e resultados permanecem dentro do bloco. A composição dos universos mantém arte, nome e destino próprios; Revista, Loja dos Signos, ATV+ e redes possuem seções identificáveis. A vitrine informa que a coleção física está em preparação. Não foi encontrado defeito visual bloqueador nos estados inspecionados.

## Evidências e limites das capturas

Artefatos locais, não versionados, em `test-results/architecture/`:

- `public-architecture.json`: resultados automatizados das três larguras.
- `tools-{390,768,1440}.png`: ferramentas recolhidas.
- `hero-*`, `universes-*`, `magazine-*`, `shop-*`, `membership-*`, `presence-*`, `footer-*`: revisão das seções.
- `love-open-viewport-*` e `love-result-viewport-*`: ferramenta aberta e resultado em viewport normal.
- `visual-supplement.json`: nove botões de ferramenta e geometria do resultado nas três larguras.
- `universes-loaded-390.png` e `universe-sonhos-390.png`: artes móveis após rolagem normal e carregamento das imagens.

As capturas automáticas `love-result-*` de elemento muito alto não servem como prova visual: o ajuste de área feito pelo Playwright deslocou o carrossel durante a fotografia. A inspeção independente confirmou que, antes dessa captura e após rolagem normal ao resultado, a Carta do Amor permanece visível (em 390 px: bloco em x=36, resultado sem excesso horizontal). Por isso a conclusão visual usa as capturas `*-viewport-*`. A captura longa inicial dos universos em 390 px também precedeu o carregamento de uma arte lazy; a recaptura após rolagem confirmou todas as imagens carregadas.

Esta evidência cobre renderização e interação públicas no servidor local. Não comprova publicação hospedada, acesso privado do proprietário, pagamento, automações externas ou validação editorial de cada interpretação sorteável.
