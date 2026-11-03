<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let pending = $state(false);
	let refresh = $state(false);
	let message = $state('');
	const money = (cents: number) =>
		(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	async function pay(event: SubmitEvent) {
		event.preventDefault();
		const q = data.checkout;
		if (!q || pending) return;
		const fields = new FormData(event.currentTarget as HTMLFormElement);
		const field = (name: string) => String(fields.get(name) ?? '').trim();
		pending = true;
		message = '';
		try {
			const res = await fetch('/api/shop/delivery/checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					token: q.token,
					email: field('email'),
					address: {
						firstName: field('firstName'),
						lastName: field('lastName'),
						address1: q.factoryAddress
							? [field('street'), field('number'), field('district')].join(', ')
							: field('street'),
						address2: field('address2'),
						postalCode: q.postalCode,
						city: q.city,
						provinceCode: q.provinceCode
					}
				})
			});
			const out = (await res.json()) as { code?: string; ok?: boolean; checkoutUrl?: unknown };
			if (res.status === 409 && out.code === 'checkout_pending') {
				message = 'Seu pagamento está sendo preparado. Aguarde um instante e tente novamente.';
			} else if (res.status === 409) {
				refresh = true;
			} else if (res.status === 422) {
				message = 'Confira o e-mail, o nome e o endereço de entrega antes de continuar.';
			} else if (res.ok && out.ok && typeof out.checkoutUrl === 'string') {
				const url = new URL(out.checkoutUrl);
				if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
				window.location.assign(url.href);
			} else {
				throw new Error();
			}
		} catch {
			message = 'Não foi possível abrir o pagamento. Tente novamente. Nenhum valor foi cobrado.';
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head
	><title>Finalizar compra | ATVNA</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<div class="container checkout">
	<a href={'/loja/peca/' + data.slug}>Voltar à peça</a>
	<p class="eyebrow">Loja dos Signos</p>
	<h1>Finalizar compra</h1>
	{#if data.checkout && !form?.unavailable && !refresh}
		{@const q = data.checkout}
		<div class="columns">
			<section class="summary" aria-label="Resumo da compra">
				<h2>Seu pedido</h2>
				<p>
					<strong>{data.title}</strong>{#if q.variant}<br />{q.variant}{/if}
				</p>
				<dl>
					<div>
						<dt>1 peça</dt>
						<dd>{money(q.unit)}</dd>
					</div>
					<div>
						<dt>Frete</dt>
						<dd>{money(q.shipping)}</dd>
					</div>
					<div class="total">
						<dt>Total</dt>
						<dd>{money(q.unit + q.shipping)}</dd>
					</div>
				</dl>
				<p>
					{q.service} para {q.city} ({q.provinceCode}), CEP {q.postalCode.slice(
						0,
						5
					)}-{q.postalCode.slice(5)}. Entrega em até {q.days} dias úteis após a aprovação do pagamento.
				</p>
				<a href={'/loja/peca/' + data.slug}>Alterar peça ou CEP</a>
			</section>
			<form onsubmit={pay} aria-label="Endereço para pagamento">
				<fieldset disabled={pending}>
					<legend>Contato</legend>
					<label
						>E-mail<input
							name="email"
							type="email"
							autocomplete="email"
							maxlength="254"
							required
						/></label
					>
				</fieldset>
				<fieldset disabled={pending}>
					<legend>Quem vai receber?</legend>
					<label
						>Nome<input name="firstName" autocomplete="given-name" maxlength="64" required /></label
					>
					<label
						>Sobrenome<input
							name="lastName"
							autocomplete="family-name"
							maxlength="64"
							required
						/></label
					>
					<label
						>{q.factoryAddress ? 'Rua ou avenida' : 'Rua, número e bairro'}<input
							name="street"
							autocomplete="address-line1"
							maxlength={q.factoryAddress ? 110 : 200}
							required
						/></label
					>
					{#if q.factoryAddress}
						<label>Número (ou S/N)<input name="number" maxlength="16" required /></label>
						<label>Bairro ou localidade<input name="district" maxlength="80" required /></label>
					{/if}
					<label
						>Complemento (opcional)<input
							name="address2"
							autocomplete="address-line2"
							maxlength="100"
						/></label
					>
				</fieldset>
				{#if message}<p role="status">{message}</p>{/if}
				<button type="submit" class="button" disabled={pending}
					>{pending ? 'Abrindo pagamento…' : 'Continuar para pagamento'}</button
				>
			</form>
		</div>
	{:else}
		<p role="status">
			A cotação expirou ou não está disponível. Calcule o frete novamente para continuar.
		</p>
		<a class="button" href={'/loja/peca/' + data.slug}>Recalcular frete</a>
	{/if}
</div>

<style>
	.checkout {
		padding-block: clamp(2rem, 6vw, 5rem);
	}
	.eyebrow {
		margin-top: 2rem;
	}
	h1 {
		margin: 0 0 1.6rem;
	}
	h2,
	legend {
		font-size: 1.4rem;
		margin: 0;
	}
	.columns {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		align-items: start;
		gap: clamp(1.5rem, 5vw, 4rem);
		max-width: 58rem;
	}
	.summary {
		background: #ece6d7;
		padding: clamp(1rem, 3vw, 2rem);
	}
	dl > div {
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		padding: 0.4rem 0;
	}
	dd {
		margin: 0;
	}
	.total {
		border-top: 1px solid var(--atv-border);
		font-weight: 700;
	}
	form,
	fieldset,
	label {
		display: grid;
		gap: 0.55rem;
	}
	form {
		gap: 1.4rem;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		margin-bottom: 0.8rem;
	}
	input {
		box-sizing: border-box;
		width: 100%;
		min-height: 44px;
		padding: 0.6rem;
		font: inherit;
		color: inherit;
		background: var(--atv-paper, #f8f5ed);
		border: 1px solid var(--atv-border);
	}
	@media (max-width: 640px) {
		.columns {
			grid-template-columns: 1fr;
		}
	}
</style>
