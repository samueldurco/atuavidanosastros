<script lang="ts">
	import type { ShopCatalogProduct } from '$lib/server/shop/shopify-storefront';
	let { slug, enabled }: { slug: string; enabled: boolean } = $props();
	let product = $state<ShopCatalogProduct | null>(null);
	let purchaseState = $state<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
	let variantId = $state('');
	let quantity = $state(1);
	let submitting = $state(false);
	let errorMessage = $state('');
	let retry = $state(0);
	const variant = $derived(product?.variants.find((item) => item.id === variantId));
	const canBuy = $derived(
		enabled &&
			product?.availableForSale &&
			variant?.availableForSale &&
			variant.price.currencyCode === 'BRL' &&
			Number(variant.price.amount) > 0 &&
			Number.isInteger(quantity) &&
			quantity >= 1 &&
			quantity <= 10 &&
			!submitting
	);
	const money = (amount: number) =>
		new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
	const variantLabel = (item: ShopCatalogProduct['variants'][number]) =>
		item.selectedOptions
			.filter((option) => option.value !== 'Default Title')
			.map((option) => option.value)
			.join(' · ') || 'Opção única';

	$effect(() => {
		const currentSlug = slug;
		void retry;
		product = null;
		variantId = '';
		quantity = 1;
		errorMessage = '';
		submitting = false;
		purchaseState = 'loading';
		if (!enabled) return;
		const controller = new AbortController();
		fetch(`/api/shop/product/${encodeURIComponent(currentSlug)}`, { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error('unavailable');
				return response.json() as Promise<{ ok?: boolean; product?: ShopCatalogProduct | null }>;
			})
			.then((body) => {
				if (controller.signal.aborted) return;
				const result: ShopCatalogProduct | null = body.ok === true ? (body.product ?? null) : null;
				if (!result?.availableForSale || !result.variants.some((item) => item.availableForSale)) {
					purchaseState = 'unavailable';
					return;
				}
				product = result;
				purchaseState = 'ready';
				if (result.variants.length === 1) variantId = result.variants[0].id;
			})
			.catch(() => {
				if (!controller.signal.aborted) purchaseState = 'error';
			});
		return () => controller.abort();
	});

	async function buy(event: SubmitEvent) {
		event.preventDefault();
		if (!canBuy || !variant) return;
		submitting = true;
		errorMessage = '';
		const currentSlug = slug;
		try {
			const response = await fetch('/api/shop/cart', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ lines: [{ merchandiseId: variant.id, quantity }] })
			});
			const body = (await response.json()) as { ok?: boolean; checkoutUrl?: unknown };
			if (!response.ok || body.ok !== true || typeof body.checkoutUrl !== 'string') {
				throw new Error('checkout_unavailable');
			}
			const checkout = new URL(body.checkoutUrl);
			if (checkout.protocol !== 'https:' || checkout.username || checkout.password) {
				throw new Error('checkout_unavailable');
			}
			if (slug !== currentSlug) return;
			window.location.assign(checkout.href);
		} catch {
			if (slug === currentSlug) {
				errorMessage =
					'Não foi possível abrir o pagamento. Nenhum valor foi cobrado. Tente novamente.';
				submitting = false;
			}
		}
	}
</script>

<section class="purchase" aria-label="Disponibilidade e compra">
	{#if !enabled}
		<p class="eyebrow">Em preparação</p>
		<p>
			Esta peça ainda não está à venda. Preço e condições de entrega serão exibidos antes da
			abertura das compras.
		</p>
	{:else if purchaseState === 'loading'}
		<p role="status">Consultando preço e disponibilidade…</p>
	{:else if purchaseState === 'unavailable'}
		<p class="eyebrow">Indisponível para compra</p>
		<p>Esta peça não está disponível no momento. Explore as outras peças da coleção.</p>
	{:else if purchaseState === 'error'}
		<p role="status">Não foi possível consultar esta peça agora.</p>
		<button type="button" class="button secondary" onclick={() => retry++}>Tentar novamente</button>
	{:else if product}
		<form onsubmit={buy} aria-label="Comprar esta peça">
			<fieldset disabled={submitting}>
				<legend>Escolha sua peça</legend>
				<label for="shop-variant">Opção da peça (cor e tamanho, quando disponíveis)</label>
				<select id="shop-variant" bind:value={variantId} required>
					<option value="" disabled>Selecione uma opção</option>
					{#each product.variants as item (item.id)}
						<option value={item.id} disabled={!item.availableForSale}>
							{variantLabel(item)}{item.availableForSale ? '' : ' — indisponível'}
						</option>
					{/each}
				</select>
				<p class="preview-note">
					A escolha acima define a peça comprada. As cores da galeria são apenas prévias.
				</p>
				<label for="shop-quantity">Quantidade</label>
				<input
					id="shop-quantity"
					type="number"
					min="1"
					max="10"
					step="1"
					bind:value={quantity}
					required
				/>
				<div class="price" aria-live="polite">
					{#if variant}
						<p>{money(Number(variant.price.amount))} <span>por peça</span></p>
						{#if Number.isInteger(quantity) && quantity > 1 && quantity <= 10}
							<p class="subtotal">
								Subtotal: {money((Math.round(Number(variant.price.amount) * 100) * quantity) / 100)}
							</p>
						{/if}
					{/if}
				</div>
				<button class="button" type="submit" disabled={!canBuy}>
					{submitting ? 'Abrindo pagamento…' : 'Comprar agora'}
				</button>
			</fieldset>
			{#if errorMessage}<p class="error" role="alert">{errorMessage}</p>{/if}
			<p class="checkout-note">
				Revise o endereço, a entrega e o valor total antes de confirmar o pagamento.
			</p>
		</form>
	{/if}
</section>

<style>
	.purchase {
		background: #ece6d7;
		padding: 1.25rem;
		margin: 1.5rem 0;
	}
	.purchase > p:first-child {
		margin-top: 0;
	}
	.purchase > p:last-child {
		margin-bottom: 0;
		font-size: 0.9rem;
		line-height: 1.7;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
		display: grid;
		gap: 0.75rem;
	}
	legend {
		font-weight: 600;
		padding: 0;
		margin-bottom: 1rem;
	}
	label {
		font-size: 0.9rem;
		line-height: 1.5;
	}
	select,
	input {
		min-width: 0;
		width: 100%;
		box-sizing: border-box;
		min-height: 44px;
		padding: 0.75rem;
		color: inherit;
		background: var(--atv-paper, #f8f5ed);
		border: 1px solid var(--atv-border);
		font: inherit;
	}
	input {
		max-width: 7rem;
	}
	.price p {
		margin: 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 600;
	}
	.price span,
	.price .subtotal {
		font: 400 0.9rem/1.7 var(--atv-font-body);
	}
	.preview-note,
	.checkout-note,
	.error {
		font-size: 0.85rem;
		line-height: 1.7;
		margin: 0;
	}
	.checkout-note,
	.error {
		margin-top: 1rem;
	}
	.error {
		font-weight: 600;
	}
	button {
		min-height: 44px;
		white-space: normal;
	}
	button:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}
</style>
