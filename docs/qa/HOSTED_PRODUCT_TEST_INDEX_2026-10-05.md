# Área hospedada de testes dos produtos

WU243 — RUN_ID `ATV-20260902-170644Z-01A0630F`.

Pedido do proprietário: publicar e deixar acessíveis os produtos para teste. A rota `/testar-produtos` reúne as entradas reais dos 25 produtos em `/biblioteca/nova/{productId}`, o login Google, Biblioteca e conta, além dos cálculos experimentais públicos da Bússola e do Meio do Céu. O catálogo contém também ATV+, cujo plano e assinatura ainda estão em definição.

As entradas privadas exigem sessão. Pedidos de novas leituras, interpretações completas, salvamento e formatos finais continuam sujeitos aos gates de cada produto. A página informa essas limitações e não apresenta fixtures como leituras liberadas. Nenhuma flag comercial, migração remota ou cobrança foi habilitada.

Validação local: `product-test-index.e2e.ts`, 2/2 testes aprovados; 25 links distintos; entrada anônima de Três Pilares redireciona ao login; cabeçalho noindex; viewport de 375 × 812 sem overflow horizontal; axe WCAG 2 A/AA e 2.1 AA sem violações. Captura em `apps/web/test-results/product-test-index-mobile.png`. `pnpm check` aprovado, sem erros ou avisos Svelte. O teste foi incluído no job de acessibilidade do CI.

Base preservada: `bb3d125c659efcdf3d2846f66aae56d16959985e`. Ajustes locais de finais de linha após o merge não alteram o conteúdo rastreado dos arquivos anteriores. O checkout primário e o trabalho paralelo foram preservados.

As provas finais de lint, CI, deploy e HTTP ficam no registro canônico externo `E:/ATVNA/docs/30-execucao/WU243_HOSTED_PRODUCT_TEST_INDEX_2026-10-05.md`; validação local não substitui confirmação hospedada.
