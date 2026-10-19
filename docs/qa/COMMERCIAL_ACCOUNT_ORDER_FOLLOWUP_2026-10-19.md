# Minha Área — pedidos sem direito e intenção de jornada

Atualização local de 19/10/2026. Esta entrega prepara leitura privada de pedidos; não ativa cobrança, entrega ou novas concessões comerciais.

## Incrementos

- `apps/web/src/lib/server/account-orders.ts` consulta até 101 compras do titular autenticado para projetar no máximo 100. A consulta usa `user_id` explícito e RLS de `purchases`; cada lote consulta `entitlements` do mesmo titular e resolve o produto da oferta pelo RPC `owned_purchase_offers`, que também exige `auth.uid()`. Qualquer falha, linha inválida ou limite excedido resulta em `status: error` e lista vazia. A projeção pública ao componente contém somente produto, estado do pedido e data. Não contém ID da compra, referência transacional, preço nem dados do comprador.
- `apps/web/src/lib/components/AccountOrdersPanel.svelte` mostra pedidos sem entitlement em seção distinta de `Seus acessos`, no Dashboard e na Biblioteca. Uma compra `APPROVED` sem entitlement é mostrada como compra confirmada com acesso ainda não registrado; `PENDING` informa que confirmação e acesso seguem pendentes. Não há botão de consumo ou concessão derivado desse painel. Compra cancelada, estornada ou contestada também não libera ação.
- `apps/web/src/routes/biblioteca/nova/[productId]/+page.server.ts` mantém o caminho normal escolhido explicitamente pelo titular mesmo se ele tiver a permissão privada de testes. `/testar-produtos/:id` continua sendo a entrada explícita de teste. A rota normal consulta `read_product_request_access` e recebe apenas estado mínimo (`AVAILABLE`, `UNRELEASED`, `ACCESS_REQUIRED` ou falha fechada), sem inferir compra ou liberação pela URL.
- `horoscope` passou a ser aceito na allowlist da projeção de acesso de `apps/web/src/lib/server/symbolic-intake.ts`. Já havia formulário `NatalIntake`, API `/api/workflows/horoscope` e RPC de pedido; o estado comercial e o gate SQL seguem dominando a liberação. A inclusão não publica o produto nem concede direito.

## Verificação

- Vitest focal: `account-orders.spec.ts`, `trial-access.spec.ts`, `symbolic-intake.spec.ts` — 70 testes passaram. Cobrem compras `APPROVED` e `PENDING` sem entitlement, exclusão de pedido já vinculado a entitlement, isolamento por titular, falha fechada, limite de consulta, intenção normal com trial ativo e horóscopo pela consulta de acesso.
- Prettier e ESLint focais passaram. A checagem Svelte integrada fica para o fechamento consolidado da branch.
- Inspeção visual dos previews: Biblioteca a 390 px e Dashboard a 1440 px, com pedidos separados de direitos e cartões legíveis, sem transbordamento aparente. Capturas locais: `C:/Users/samue/AppData/Local/Temp/atvna-account-orders-mobile.png` e `C:/Users/samue/AppData/Local/Temp/atvna-account-orders-desktop.png`.

## Limites restantes

- Não há contrato verificável para distinguir a origem comercial ATV+ ou benefício de um entitlement. A tela mantém rótulos neutros; não classifica compras como avulsas/assinaturas pela presença de `purchase_id`.
- A escolha de origem quando mais de um direito ativo cobre o mesmo produto (#3) depende de um vínculo formal de origem e de regras de consumo da oferta. Hoje a interface bloqueia a ação automática para esse caso. Nenhum seletor de origem foi criado com fontes inferidas.
- Para mais de 100 compras retornadas, a seção de pedidos apresenta indisponibilidade em vez de lista parcial. Paginação por cursor e conciliação automática de compra aprovada sem entitlement ficam para contrato posterior. Esta projeção não modifica os gates de autorização nem o webhook.
