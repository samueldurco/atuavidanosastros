# Oferta após compra e atualização da navegação — 20/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Revisão da frente comercial do PR #37 sobre a versão pública mais recente da home e do menu (PR #38, commit `b1d3f1c`).

## Regra da jornada

A página de `birth-chart → life-atlas` logo após a compra é uma etapa do pedido. A pessoa já decidiu comprar o Mapa Astral Completo; portanto, não deve encontrar cabeçalho, menu, rodapé, catálogo ou retorno sugerido à navegação pública nesse momento. O mesmo produto continua com sua página pública de descoberta em `/produtos/life-atlas`, com copy própria. A página contextual não pode compartilhar essa moldura nem tratar visita à URL como compra.

O percurso pretendido, quando houver checkout aprovado, é:

1. Checkout do Mapa Astral Completo confirma um pedido `APPROVED` do titular.
2. O servidor verifica titular, produto de origem, elegibilidade, estado do pedido e se a oferta ainda pode ser exibida; entrega uma sessão curta e vinculada àquele pedido.
3. A pessoa vê a proposta de Mapa Astral por Temas em uma tela isolada. Aceitar leva ao checkout específico dessa oferta; recusar ou pular leva ao acompanhamento do pedido na Minha Área. O retorno do segundo checkout também leva à Minha Área.
4. A Minha Área mostra o pedido e os direitos efetivamente conciliados. O onboarding coleta os dados necessários para a leitura, e a Biblioteca mostra o entregável quando houver direito ativo e entrega disponível.

O botão voltar do navegador não pode ser desativado como garantia de fluxo. Reabrir a URL após uma decisão, expiração ou perda de elegibilidade deve ser resolvido pela validação no servidor e conduzir ao estado correto do pedido. Eventos de checkout, pedido e direito precisam ser reconciliados antes de qualquer rótulo de compra ou acesso. A eventual tela de upsell só aparece uma vez por oportunidade elegível, segundo contrato ainda a definir.

## Estado implementado nesta revisão

- `/ofertas/[offerSlug]` usa `JourneyShell`, sem navegação pública, banner de consentimento, links para catálogo, produto de origem ou produto de destino. A única saída visível da prévia é `/dashboard`.
- Todas as rotas dessa família recebem `private, no-store`, `noindex, nofollow` e `no-referrer`. No domínio oficial, visitante sem autenticação e acesso interno recebe 404. A URL de prévia do PR (`codex-commercial-journeys-20.atuavidanosastros.pages.dev`) permite testar a apresentação e a saída para Minha Área sem uma compra; em desenvolvimento local, a prévia visual também continua acessível. Essa exceção é exclusiva da prévia e não concede compra nem direito de acesso.
- Como preço, condições e checkout ainda não foram aprovados, a tela identifica claramente o estado de prévia e não mostra botão de aceite ou cobrança fictícia.
- Home, menu, catálogos e rodapé do PR #38 foram integrados à frente comercial. A navegação pública separa Leituras digitais, Produtos físicos e ATV+; a oferta pós-compra fica fora dessa navegação.

## Verificação e liberação

`svelte-check` passou com zero erros e avisos. Playwright cobre a resposta 404 anônima no domínio oficial, a abertura da apresentação no host de prévia, a ausência de navegação pública e os caminhos recentes de home/menu. As telas da oferta foram inspecionadas em 1440 e 390 px, sem desvio visual identificado. A atualização comercial segue em PR de prévia; não autoriza publicação como oferta ativa.

Para ativar a etapa comercial ainda faltam contrato J01 (preço, termos, checkout, direito/prazo e política de estorno), retorno autenticado do checkout, conciliação do pedido e do direito, guarda de oportunidade por pedido, decisão de aceitar/recusar, saída para onboarding conforme o estado e validação hospedada completa. As migrações comerciais preparadas continuam sem aplicação hospedada. Fontes: `COMMERCIAL_IMPLEMENTATION_2026-10-19.md`, `FUNNEL_SOURCE_RECONCILIATION_2026-10-19.md`, `docs/contracts/architecture-offers-20261015.md` e o plano comercial externo.
