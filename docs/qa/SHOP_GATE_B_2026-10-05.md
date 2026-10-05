# Loja dos Signos — Gate B da superfície de preparação (WU228)

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo: `/loja` e uma página representativa `/loja/signo/aries`, com a mesma estrutura das 12 rotas por signo.

## Entrega e limite

- A entrada pública apresenta a proposta editorial, estado “Em preparação” e índice dos 12 signos em grade responsiva. Os links são navegáveis e identificados por nome.
- A página por signo explicita ausência de produtos, preços e disponibilidade, oferece retorno à Loja e mantém `noindex,follow`.
- Não há catálogo publicado, cards de produto, carrinho, checkout, preço, estoque, avaliações ou marcação `Product`/`Offer`. A migração privada da WU227 não alimenta a superfície pública.
- Foram aplicados tokens e tipografia Atlas Essencial v3.1. O export PNG salvo da referência FUT-01 não contém uma tela utilizável; por isso, a prova atesta conformidade local com o sistema de design, não paridade pixel a pixel com Stitch.

## Verificação local

- `pnpm --dir apps/web check`: 0 erros, 0 avisos.
- Prettier e ESLint focais: PASS.
- `pnpm --dir apps/web exec playwright test tests/shop.e2e.ts`: 5/5 PASS após correção da asserção de espaços; nova verificação da página por signo: 1/1 PASS.
- O E2E confirma 12 links, navegação para Áries, `noindex,follow`, ausência de marcação comercial e ausência de rolagem horizontal em 1440, 820, 390 e 320 px. Capturas inspecionadas: `test-results/gate-b/loja-1440.png`, `loja-390.png`, `loja-320.png`, `loja-signo-1280.png` e `loja-signo-390.png`.

Aceite: **PASS local apenas para a preparação editorial**. O Gate B integral da Loja, catálogo, páginas de produto e liberação hospedada seguem pendentes de curadoria real, contratos comerciais, políticas e demais gates.
