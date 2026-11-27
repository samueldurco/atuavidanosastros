<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Quote, Order } from '$lib/server/livraria/domain';
	let { kind, bookId, title }: { kind: 'book' | 'club'; bookId?: string; title: string } = $props();
	let cep = $state('');
	let tier = $state('none');
	let condition = $state('none');
	let cycle = $state('quarterly');
	let method = $state('card');
	let outcome = $state('approved');
	let renewal = $state(false);
	let quote = $state<Quote | null>(null);
	let order = $state<Order | null>(null);
	let message = $state('');
	let busy = $state(false);
	let requestKey = $state('');
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});
	const money = (cents: number) =>
		(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	async function send<T>(body: object): Promise<T> {
		const response = await fetch('/api/livraria/previa', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const result: unknown = await response.json();
		if (!result || typeof result !== 'object') throw new Error('Resposta de teste inválida.');
		const failure = result as { message?: unknown; error?: unknown };
		if (!response.ok)
			throw new Error(
				typeof failure.message === 'string'
					? failure.message
					: typeof failure.error === 'string'
						? failure.error
						: 'Não foi possível concluir o teste.'
			);
		return result as T;
	}
	async function calculate(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		message = '';
		quote = null;
		order = null;
		try {
			const result = await send<{ quote: Quote }>({
				action: 'quote',
				input: { kind, bookId, quantity: 1, cycle, cep, tier, condition }
			});
			quote = result.quote;
			requestKey = crypto.randomUUID();
		} catch (error) {
			message = error instanceof Error ? error.message : 'Falha ao calcular a simulação.';
		} finally {
			busy = false;
		}
	}
	async function confirm() {
		if (!quote) return;
		busy = true;
		message = '';
		try {
			const result = await send<{ order: Order; duplicate: boolean }>({
				action: 'checkout',
				quoteId: quote.id,
				requestKey,
				method: kind === 'club' ? 'card' : method,
				paymentOutcome: outcome,
				renewalAuthorized: kind === 'club' && renewal
			});
			order = result.order;
			await invalidateAll();
			message = result.duplicate
				? 'Pedido de teste já registrado. A repetição não criou outra cobrança ou remessa.'
				: 'Pedido de teste registrado. Nenhuma cobrança real foi feita.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Falha ao registrar o teste.';
		} finally {
			busy = false;
		}
	}
</script>

<section class="preview-form" aria-label={`Simulação de ${title}`}>
	<h2>{kind === 'club' ? 'Simular o ciclo' : 'Simular pedido avulso'}</h2>
	<p>
		Preços e frete abaixo são valores fictícios de teste. O valor de venda será definido no
		lançamento.
	</p>
	<form
		onsubmit={calculate}
		oninput={() => {
			quote = null;
			order = null;
			message = '';
		}}
		onchange={() => {
			quote = null;
			order = null;
			message = '';
		}}
	>
		<fieldset disabled={busy || !hydrated}>
			{#if kind === 'club'}<label
					>Ciclo<select bind:value={cycle}
						><option value="quarterly">Trimestral · 3 edições mensais</option><option value="annual"
							>Anual · 12 edições mensais</option
						></select
					></label
				>{/if}
			<label
				>CEP para a simulação<input
					bind:value={cep}
					inputmode="numeric"
					autocomplete="off"
					placeholder="00000-000"
					maxlength="9"
					required
					aria-describedby="cep-fixture"
				/></label
			>
			<label
				>Cenário ATV+<select bind:value={tier}
					><option value="none">Sem assinatura</option><option value="essencial"
						>Essencial · 10% em livro avulso</option
					><option value="ampliado">Ampliado · 15% em livro avulso</option><option value="premium"
						>Premium · 20% em livro avulso</option
					></select
				></label
			>
			<label
				>Outra condição de teste<select bind:value={condition}
					><option value="none">Sem promoção ou cupom</option><option value="promotion15"
						>Promoção de 15%</option
					><option value="coupon12">Cupom de 12%</option></select
				></label
			>
		</fieldset>
		<p id="cep-fixture">
			Tabela de frete simulada por faixa de CEP. Prazo fictício após a expedição; não é cotação de
			transportadora. CEP 99999-999 representa ausência de cobertura.
		</p>
		<button type="submit" disabled={busy || !hydrated}
			>{busy ? 'Processando…' : 'Calcular total de teste'}</button
		>
	</form>
	{#if quote}
		<div class="preview-summary" aria-live="polite">
			<h3>Confira antes de simular o pagamento</h3>
			<dl>
				<dt>{kind === 'club' ? 'Valor por edição' : 'Preço regular de teste'}</dt>
				<dd>{money(quote.regularUnitCents)}</dd>
				<dt>Valor aplicado por {kind === 'club' ? 'edição' : 'livro'}</dt>
				<dd>{money(quote.unitCents)}</dd>
				<dt>{kind === 'club' ? `${quote.cycleMonths} edições` : 'Livro · 1 unidade'}</dt>
				<dd>{money(quote.itemsCents)}</dd>
				<dt>Frete por envio</dt>
				<dd>{money(quote.shippingPerDeliveryCents)}</dd>
				<dt>
					Frete · {quote.shippingDeliveries}
					{quote.shippingDeliveries === 1 ? 'envio' : 'envios mensais'}
				</dt>
				<dd>{money(quote.shippingCents)}</dd>
				<dt><strong>Total do teste</strong></dt>
				<dd><strong>{money(quote.totalCents)}</strong></dd>
			</dl>
			<p>
				Condição aplicada: {quote.priceSource === 'member'
					? 'benefício ATV+ simulado'
					: quote.priceSource === 'regular'
						? 'preço regular'
						: 'melhor condição elegível'}. Descontos não se acumulam. Frete e assinatura do clube
				não recebem desconto ATV+.
			</p>
			<p>
				Origem do frete: <strong>tabela fictícia local</strong>. Prazo simulado de {quote.deliveryBusinessDays}
				dias úteis por envio. Cotação de teste válida por quinze minutos.
			</p>
			<fieldset disabled={busy || !!order}>
				<label
					>Meio de pagamento simulado<select bind:value={method} disabled={kind === 'club'}
						>{#if kind !== 'club'}<option value="pix">Pix de teste</option>{/if}<option value="card"
							>Cartão de teste</option
						></select
					></label
				>
				<label
					>Resultado que deseja testar<select bind:value={outcome}
						><option value="approved">Aprovado</option><option value="failed">Recusado</option
						><option value="pending">Pendente</option></select
					></label
				>
			</fieldset>
			{#if kind === 'club'}<p>
					O cartão simula o pagamento integral de {quote.cycleMonths} meses: {quote.shippingDeliveries}
					livros, um por mês, e respectivos fretes. Não há parcelamento ou renovação real.
				</p>
				<label class="preview-check"
					><input type="checkbox" bind:checked={renewal} disabled={!!order} /> Quero testar a autorização
					de renovação ao fim deste ciclo. Posso desligá-la em Minha área de teste.</label
				>{/if}
			<div class="preview-actions">
				<button type="button" onclick={confirm} disabled={busy || !!order}
					>Confirmar somente a simulação</button
				>
			</div>
		</div>
	{/if}
	{#if message}<p class="preview-status" role="status">{message}</p>{/if}
	{#if order}<p>
			Identificador do pedido sintético: <code>{order.id}</code>.
			<a href="/loja/livraria/previa/minha-area"
				>Acompanhar pagamento e remessas em Minha área de teste</a
			>.
		</p>{/if}
</section>
