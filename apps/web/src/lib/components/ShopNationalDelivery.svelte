<script lang="ts">
	import { reviewedDestination, shopDelivery } from '$lib/data/shop-commerce';
	const postalCodePattern = '[0-9]{5}-?[0-9]{3}';
	let {
		slug,
		variantId,
		price,
		postalCode = $bindable(''),
		fallbackBuy,
		submitting = false,
		allowFixedRate
	}: {
		slug: string;
		variantId: string;
		price: number | undefined;
		postalCode: string;
		fallbackBuy: () => Promise<void>;
		submitting: boolean;
		allowFixedRate: boolean;
	} = $props();
	type Quote = {
		token?: string;
		checkoutReady: boolean;
		factoryAddress?: boolean;
		variantId: string;
		postalCode: string;
		unitPriceBrl: number;
		shippingBrl: number;
		totalBrl: number;
		deliveryBusinessDays: number;
		service: string;
		city: string;
		provinceCode: string;
	};
	let quote = $state<Quote | null>(null);
	let quoting = $state(false);
	let failed = $state(false);
	let message = $state('');
	const postal = $derived(postalCode.trim().replace('-', ''));
	const fallback = $derived(allowFixedRate ? reviewedDestination(postalCode) : undefined);
	const money = (value: number) =>
		new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	let generation = 0;
	$effect(() => {
		void postal;
		void variantId;
		generation++;
		quote = null;
		quoting = false;
		failed = false;
		message = '';
	});
	async function calculate(event: SubmitEvent) {
		event.preventDefault();
		if (quoting || !variantId || !/^\d{8}$/.test(postal)) return;
		const current = ++generation;
		quote = null;
		quoting = true;
		failed = false;
		message = '';
		try {
			const res = await fetch('/api/shop/delivery/quote', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ variantId, quantity: 1, postalCode: postal })
			});
			if (current !== generation) return;
			if (!res.ok) {
				failed = res.status >= 500;
				message =
					res.status === 422
						? 'A transportadora não confirmou uma entrega para esta peça e CEP.'
						: res.status === 429
							? 'Aguarde um momento antes de consultar novamente.'
							: 'Não foi possível calcular a entrega agora. Tente novamente.';
				return;
			}
			const data = (await res.json()) as { ok?: boolean; quote?: Quote };
			if (current !== generation) return;
			const q = data.quote;
			if (
				!data.ok ||
				!q ||
				typeof q.checkoutReady !== 'boolean' ||
				(q.checkoutReady && !q.token) ||
				q.variantId !== variantId ||
				q.postalCode.replace('-', '') !== postal ||
				q.unitPriceBrl !== price ||
				!Number.isFinite(q.totalBrl) ||
				!Number.isFinite(q.shippingBrl) ||
				q.shippingBrl < 0 ||
				Math.round(q.totalBrl * 100) !==
					Math.round(q.unitPriceBrl * 100) + Math.round(q.shippingBrl * 100) ||
				!q.city ||
				!q.provinceCode
			)
				throw new Error();
			quote = q;
		} catch {
			if (current === generation) {
				failed = true;
				message = 'A consulta de frete está temporariamente indisponível. Tente novamente.';
			}
		} finally {
			if (current === generation) quoting = false;
		}
	}
</script>

<div class="delivery">
	<form onsubmit={calculate} aria-label="Calcular entrega">
		<label for="shop-postal-code">CEP de entrega</label>
		<input
			id="shop-postal-code"
			bind:value={postalCode}
			inputmode="numeric"
			autocomplete="postal-code"
			pattern={postalCodePattern}
			maxlength="9"
			placeholder="00000-000"
			required
			disabled={submitting}
		/>
		<p>Consulte um CEP brasileiro para ver o frete e o prazo até seu endereço.</p>
		<button
			class="button secondary"
			disabled={!price || !variantId || !/^\d{8}$/.test(postal) || quoting || submitting}
			>{quoting ? 'Consultando…' : 'Calcular frete'}</button
		>
	</form>
	{#if message}<p role="status">{message}</p>{/if}
	{#if quote}
		<p aria-live="polite">
			Entrega em {quote.city} ({quote.provinceCode}) em até {quote.deliveryBusinessDays} dias úteis após
			a aprovação do pagamento. Frete de {money(quote.shippingBrl)} por {quote.service}.
		</p>
		<p class="total"><strong>Total com frete: {money(quote.totalBrl)}</strong></p>
		{#if quote.checkoutReady}
			<form method="POST" action={'/loja/checkout/' + slug} aria-label="Continuar para checkout">
				<input type="hidden" name="token" value={quote.token} />
				<button type="submit" class="button">Comprar agora</button>
			</form>
		{:else}
			<p>
				A transportadora atende este CEP. O pagamento com o frete desta cotação ainda não está
				disponível.
			</p>
		{/if}
	{/if}
	{#if (failed || (quote && !quote.checkoutReady)) && fallback && price && variantId}
		<p>
			Também há entrega com tarifa fixa para {fallback.city} ({fallback.provinceCode}). Frete de {money(
				shopDelivery.priceBrl
			)} e prazo de até {fallback.deliveryBusinessDays} dias úteis.
		</p>
		<p><strong>Total com frete: {money(price + shopDelivery.priceBrl)}</strong></p>
		<button type="button" class="button" disabled={submitting} onclick={fallbackBuy}
			>{submitting ? 'Abrindo pagamento…' : 'Comprar com frete fixo'}</button
		>
	{/if}
</div>

<style>
	.delivery,
	form,
	label {
		display: grid;
		gap: 0.65rem;
	}
	.delivery {
		margin-top: 1rem;
	}
	input {
		padding: 0.65rem;
		font: inherit;
		color: inherit;
		border: 1px solid var(--atv-border);
		background: var(--atv-paper, #f8f5ed);
		min-height: 44px;
		width: 100%;
		box-sizing: border-box;
	}
	#shop-postal-code {
		max-width: 10rem;
	}
	p {
		margin: 0.25rem 0;
	}
	.total {
		font-size: 1.15rem;
	}
	button:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}
</style>
