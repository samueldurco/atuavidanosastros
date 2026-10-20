# Navegação e distinção dos catálogos — 19/10/2026

O visitante encontrava leituras digitais e a Loja dos Signos sem uma distinção consistente entre os tipos de oferta. A navegação passa a apresentar três caminhos: **Leituras digitais** (`/leituras`, produtos avulsos), **Produtos físicos** (`/loja`, marca Loja dos Signos) e **ATV+ · Assinatura** (`/atv-mais`, planos digitais recorrentes).

O menu agrupa produtos e assinatura antes de ferramentas, revista e seis universos. Cada entrada descreve seu destino. O rodapé usa a mesma fonte de navegação. Home, catálogos, universos, páginas de produto, loja por signo, contato e metadados mantêm essa distinção; os dois catálogos oferecem links recíprocos.

Conforme a revisão do proprietário, o cabeçalho mantém somente a marca, Entrar e Menu tanto em desktop quanto em mobile. Os atalhos comerciais e editoriais ficam exclusivamente dentro do menu, eliminando a duplicação que aparecia em telas grandes. A sessão autenticada preserva o acesso à Minha área.

As 19 ofertas digitais, três planos ATV+, preços, slugs, direitos e estados comerciais foram preservados. A coleção física continua em preparação, sem compra habilitada. Nenhum checkout, pagamento, migração ou ativação comercial foi introduzido.

## Validação local

- Svelte/TypeScript: zero erros e avisos; Wrangler types check aprovado.
- `pnpm lint`, `pnpm test:unit` e builds de produção dos testes Playwright aprovados.
- 24 verificações de acessibilidade pública aprovadas; após corrigir um seletor ambíguo antigo de Tarot, os nove testes de menu e catálogo passaram na execução final.
- Navegação por teclado, Escape com restauração de foco, identificação da página atual, seis universos, 19 cards digitais, assinatura e preservação da loja física sem venda verificados.
- Refluxo e alcance dos links em 320, 390, 768 e 1280 px; inspeção visual de menu desktop em 1440 px, menu móvel, home, loja física e rodapé.
- A execução hospedada identificou transbordamento do cabeçalho em 320 px. A reprodução local com fontes bloqueadas confirmou o problema na fonte de reserva: 325 px de conteúdo em uma tela de 320 px. O cabeçalho móvel permite acomodar as ações em mais de uma linha; o botão aberto mostra “Fechar”, com nome acessível “Fechar menu”. O teste mantém a exigência de transbordamento zero e cobre também a falha de carregamento das fontes.
- Após esse ajuste, os dez testes de menu e catálogo passaram. A medição adicional confirmou largura sem transbordamento de 320 a 1280 px com fontes normais e bloqueadas; evidências: `navigation-responsive-final.log`, `menu-width-diagnostic.json` e `menu-mobile-fonte-reserva.png`.
- A revisão final do cabeçalho passou em 12 testes: menu e catálogos, ausência de atalhos duplicados em 320/390/820/1440/1920 px, fontes bloqueadas, teclado, rotas legadas e zoom de 200% com falha das artes. Svelte/TypeScript e Wrangler types continuam sem erros ou avisos. A inspeção visual confirmou marca, Entrar e Menu no desktop e celular. Evidências: `header-simple-final.log`, `header-simple-check.log`, `cabecalho-desktop-simples.png`, `menu-desktop-final.png` e `menu-mobile-final.png`.
- `git diff --check` aprovado.

Evidências extensas locais: `C:/ATVNA/docs/30-execucao/evidencias/navigation-catalog-20261019/`. Arquivos de referência: `navigation-browser-final.log`, `navigation-browser.log`, `navigation-check.log`, `navigation-lint.log`, `navigation-types-check.log`, `navigation-unit.log`, `menu-desktop.png`, `menu-mobile-produtos.png`, `home-catalogos.png`, `loja-produtos-fisicos.png` e `rodape-catalogos.png`.

## Integração e liberação

A validação local não comprova publicação. CI, SHA integrado, implantação e verificações HTTP hospedadas devem ser registrados no log canônico após a integração. Base para reversão: `4b0ba64d31659d35bb76fc3da8d3e4de888ae60c`.
