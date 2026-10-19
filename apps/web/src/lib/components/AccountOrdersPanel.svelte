<script lang="ts">
	import { customerProduct } from '$lib/data/product-copy';
	import type { AccountOrderState, AccountOrders } from '$lib/account-orders';

	let { orders, compact = false }: { orders: AccountOrders; compact?: boolean } = $props();
	const shown = $derived(compact ? orders.items.slice(0, 2) : orders.items);

	function stateLabel(state: AccountOrderState) {
		switch (state) {
			case 'PENDING':
				return 'Confirmação pendente';
			case 'APPROVED':
				return 'Compra confirmada';
			case 'CANCELLED':
				return 'Pedido cancelado';
			case 'REFUNDED':
				return 'Pedido estornado';
			case 'CHARGEDBACK':
				return 'Pagamento contestado';
		}
	}

	function stateMessage(state: AccountOrderState) {
		if (state === 'APPROVED')
			return 'O pedido está confirmado, mas ainda não há acesso registrado para esta leitura.';
		if (state === 'PENDING')
			return 'A confirmação do pedido está pendente. Nenhum acesso foi liberado.';
		return 'Este pedido não libera acesso à leitura.';
	}

	function dateLabel(value: string) {
		return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
	}
</script>

{#if orders.status === 'error' || orders.items.length}
	<section class="account-orders" id="seus-pedidos" aria-labelledby="orders-title">
		<div class="orders-heading">
			<div>
				<p class="eyebrow">Acompanhamento</p>
				<h2 id="orders-title">Pedidos sem acesso registrado</h2>
				<p>
					O registro de um pedido não libera a leitura. Seus acessos aparecem acima, em seção
					própria.
				</p>
			</div>
			{#if compact}<a href="/biblioteca#seus-pedidos">Ver pedidos na Biblioteca →</a>{/if}
		</div>
		{#if orders.status === 'error'}
			<div class="order-message" role="status">
				<strong>Não foi possível consultar seus pedidos agora.</strong>
				<p>
					Tente novamente em alguns instantes. Seus acessos e leituras salvas aparecem
					separadamente.
				</p>
			</div>
		{:else}
			<ul class="order-list">
				{#each shown as order, index (`${order.productId}:${order.createdAt}:${index}`)}
					<li class="order-card">
						<span class="order-state">{stateLabel(order.state)}</span>
						<h3>{customerProduct(order.productId)?.name ?? 'Produto da sua conta'}</h3>
						<p class="order-date">Pedido de {dateLabel(order.createdAt)}</p>
						<p>{stateMessage(order.state)}</p>
					</li>
				{/each}
			</ul>
			{#if compact && orders.items.length > shown.length}
				<p class="remaining">
					Mais {orders.items.length - shown.length}
					{orders.items.length - shown.length === 1 ? 'pedido' : 'pedidos'} na Biblioteca.
				</p>
			{/if}
		{/if}
	</section>
{/if}

<style>
	.account-orders {
		margin-block: 1rem 2.75rem;
		padding: clamp(1.25rem, 2.5vw, 2rem);
		background:
			var(--private-grain) center / 1000px auto,
			#f5f3ea;
		border: 1px solid var(--private-line, var(--atv-border));
		border-top: 4px solid #809391;
	}
	.orders-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}
	.orders-heading h2 {
		margin: 0;
		font: 500 clamp(1.7rem, 3vw, 2.2rem)/1.15 var(--atv-font-display);
	}
	.orders-heading p:last-child,
	.order-card p,
	.order-message p,
	.remaining {
		color: var(--atv-text-secondary);
		font-size: 0.825rem;
		line-height: 1.55;
	}
	.orders-heading > a {
		color: var(--private-ink, var(--atv-text-primary));
		font-size: 0.875rem;
		font-weight: 600;
		text-underline-offset: 0.3em;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		white-space: nowrap;
	}
	.order-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: 0.875rem;
	}
	.order-card,
	.order-message {
		padding: 1.25rem;
		border: 1px solid var(--private-line, var(--atv-border));
		background: #fffaf0;
	}
	.order-state {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border: 1px solid #b8a78a;
		color: #594a38;
		font-size: 0.72rem;
	}
	.order-card h3 {
		margin: 0.9rem 0 0.25rem;
		font: 500 1.35rem/1.2 var(--atv-font-display);
	}
	.order-card .order-date {
		margin: 0;
	}
	.order-message strong {
		font: 500 1.2rem var(--atv-font-display);
	}
	.remaining {
		margin: 1rem 0 0;
	}
	@media (max-width: 640px) {
		.orders-heading {
			display: block;
		}
	}
</style>
