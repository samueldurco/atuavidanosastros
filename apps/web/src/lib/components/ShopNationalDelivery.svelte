<script lang="ts">
	import { reviewedDestination, shopDelivery } from '$lib/data/shop-commerce';
	let {
		variantId,
		price,
		postalCode = $bindable(''),
		fallbackBuy,
		submitting = false,
		mug
	}: {
		variantId: string;
		price: number | undefined;
		postalCode: string;
		fallbackBuy: () => Promise<void>;
		submitting: boolean;
		mug: boolean;
	} = $props();
	type Quote = {
		token?: string;
		checkoutReady: boolean;
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
	let paying = $state(false);
	let failed = $state(false);
	let message = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let address1 = $state('');
	let address2 = $state('');
	const postal = $derived(postalCode.trim().replace('-', ''));
	const fallback = $derived(reviewedDestination(postalCode));
	const money = (value: number) =>
		new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	let generation = 0;
	$effect(() => {
		void postal;
		void variantId;
		generation++;
		quote = null;
		quoting = false;
		paying = false;
		failed = false;
		message = '';
		address1 = '';
		address2 = '';
	});
	async function calculate(event: SubmitEvent) {
		event.preventDefault();
		if (quoting || paying || !variantId || !/^\d{8}$/.test(postal)) return;
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
	async function openPayment(event: SubmitEvent) {
		event.preventDefault();
		if (!quote?.checkoutReady || !quote.token || paying) return;
		const current = generation;
		paying = true;
		message = '';
		try {
			const res = await fetch('/api/shop/delivery/checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					token: quote.token,
					address: {
						firstName: firstName.trim(),
						lastName: lastName.trim(),
						address1: address1.trim(),
						address2: address2.trim(),
						postalCode: postal,
						city: quote.city,
						provinceCode: quote.provinceCode
					}
				})
			});
			if (current !== generation) return;
			if (res.status === 409) {
				const error = (await res.json()) as { code?: string };
				if (current !== generation) return;
				if (error.code === 'checkout_pending') {
					message =
						'Seu checkout está sendo preparado. Aguarde alguns instantes e tente abrir o mesmo pagamento novamente.';
					return;
				}
				quote = null;
				message = 'A cotação mudou ou expirou. Calcule novamente o frete para continuar.';
				return;
			}
			if (res.status === 422) {
				message = 'Confira o nome, o endereço e o número antes de continuar.';
				return;
			}
			if (!res.ok) throw new Error();
			const data = (await res.json()) as { ok?: boolean; checkoutUrl?: string };
			if (current !== generation) return;
			if (!data.checkoutUrl) throw new Error();
			const url = new URL(data.checkoutUrl);
			if (!data.ok || url.protocol !== 'https:' || url.username || url.password) throw new Error();
			window.location.assign(url.href);
		} catch {
			if (current === generation)
				message = 'Não foi possível abrir o pagamento. Tente novamente. Nenhum valor foi cobrado.';
		} finally {
			if (current === generation) paying = false;
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
			pattern="[0-9]{5}-?[0-9]{3}"
			maxlength="9"
			placeholder="00000-000"
			required
			disabled={paying || submitting}
		/>
		<p>Consulte um CEP brasileiro para ver o frete e o prazo até seu endereço.</p>
		<button
			class="button secondary"
			disabled={!price || !variantId || !/^\d{8}$/.test(postal) || quoting || paying || submitting}
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
			<form onsubmit={openPayment} aria-label="Endereço para pagamento">
				<fieldset disabled={paying}>
					<legend>Quem vai receber?</legend>
					<label
						>Nome<input
							bind:value={firstName}
							autocomplete="given-name"
							maxlength="80"
							required
						/></label
					>
					<label
						>Sobrenome<input
							bind:value={lastName}
							autocomplete="family-name"
							maxlength="80"
							required
						/></label
					>
					<label
						>Rua, número e bairro<input
							bind:value={address1}
							autocomplete="address-line1"
							maxlength="200"
							required
						/></label
					>
					<label
						>Complemento (opcional)<input
							bind:value={address2}
							autocomplete="address-line2"
							maxlength="100"
						/></label
					>
					<p>Confira o endereço. A entrega será vinculada a ele no pagamento.</p>
					<button class="button" type="submit"
						>{paying ? 'Abrindo pagamento…' : 'Comprar agora'}</button
					>
				</fieldset>
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
			)} e prazo de até {mug ? fallback.deliveryBusinessDays : fallback.bagDeliveryBusinessDays} dias
			úteis.
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
	fieldset,
	label {
		display: grid;
		gap: 0.65rem;
	}
	.delivery {
		margin-top: 1rem;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		margin-bottom: 0.75rem;
		font-weight: 600;
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
