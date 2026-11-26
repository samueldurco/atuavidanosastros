<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	let { data } = $props();
	let busy = $state(false);
	let message = $state('');
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});
	const money = (cents: number) =>
		(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	const date = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
	const status: Record<string, string> = {
		pending: 'Pagamento de teste pendente',
		paid: 'Pagamento de teste aprovado',
		failed: 'Pagamento de teste recusado',
		expired: 'Ciclo de teste encerrado',
		scheduled: 'Aguardando corte simulado',
		address_invalid: 'Endereço sintético inválido',
		edition_missing: 'Edição indisponível no teste',
		ready: 'Pronta para expedição simulada',
		shipped: 'Expedida em simulação',
		delivered: 'Entregue em simulação'
	};
	async function act(body: Record<string, unknown>) {
		busy = true;
		message = '';
		try {
			const response = await fetch('/api/livraria/previa', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...body, eventKey: crypto.randomUUID() })
			});
			const result = (await response.json()) as { message?: string; error?: string };
			if (!response.ok)
				throw new Error(result.message ?? result.error ?? 'Não foi possível executar o cenário.');
			message = 'Cenário de teste atualizado. Nenhum fornecedor foi acionado.';
			await invalidateAll();
		} catch (error) {
			message = error instanceof Error ? error.message : 'Falha no teste.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Minha área de teste · Livraria ATVNA</title></svelte:head>
<p class="preview-kicker">Acompanhamento privado · Dados sintéticos da sua conta</p>
<h1>Minha área de teste</h1>
<p>
	Acompanhe pagamentos, ciclos e remessas simulados. Os controles abaixo permitem ensaiar falhas e
	recuperação. Os rastreios com prefixo SIM não pertencem a transportadoras.
</p>
<p><a href="/conta">Ir para Minha área ATVNA</a> · <a href="/contato">Atendimento oficial</a></p>
{#if message}<p role="status" class="preview-status">{message}</p>{/if}
{#if !data.preview.account.orders.length}<div class="preview-empty">
		<h2>Ainda não há pedidos de teste.</h2>
		<p>Escolha um livro ou ciclo do clube para começar a simulação.</p>
		<a href="/loja/livraria/previa">Explorar a estante</a>
	</div>{/if}
{#each data.preview.account.orders as order (order.id)}<article class="preview-order">
		<p class="preview-kicker">
			{order.kind === 'club' ? 'Clube · ' + order.cycleMonths + ' meses' : 'Livro avulso'} · {date(
				order.createdAt
			)}
		</p>
		<h2>{order.itemTitle}</h2>
		<p>
			<strong>{status[order.effectiveStatus] ?? order.effectiveStatus}</strong> · {money(
				order.quote.totalCents
			)} de teste · {order.paymentMethod === 'pix' ? 'Pix' : 'Cartão'} simulado
		</p>
		<p>Pedido <code>{order.id}</code></p>
		{#if order.status === 'pending'}<div class="preview-actions">
				<button
					disabled={busy || !hydrated}
					onclick={() => act({ action: 'payment', orderId: order.id, outcome: 'approved' })}
					>Simular aprovação pendente</button
				><button
					disabled={busy || !hydrated}
					onclick={() => act({ action: 'payment', orderId: order.id, outcome: 'failed' })}
					>Simular recusa pendente</button
				>
			</div>{/if}
		{#if order.kind === 'club'}<p>
				Vigência simulada: {date(order.startsAt)} a {date(order.endsAt)}. Renovação {order.renewalEnabled
					? 'autorizada no teste'
					: 'desligada'}. Sem cobrança automática real.
			</p>
			<div class="preview-actions">
				<button
					disabled={busy || !hydrated || order.effectiveStatus !== 'paid'}
					onclick={() =>
						act({ action: 'renewal', orderId: order.id, enabled: !order.renewalEnabled })}
					>{order.renewalEnabled
						? 'Desligar renovação de teste'
						: 'Autorizar renovação de teste'}</button
				>
			</div>{/if}
		{#each data.preview.account.shipments.filter((shipment) => shipment.orderId === order.id) as shipment (shipment.id)}<section
				class="preview-order"
				aria-label={`Remessa ${shipment.competence}`}
			>
				<h3>{shipment.competence} · {shipment.editionTitle}</h3>
				<p>
					{status[shipment.status] ?? shipment.status} · Corte: {date(shipment.cutoffAt)} · Tentativas:
					{shipment.attempts}
				</p>
				{#if shipment.tracking}<p>
						Rastreio fictício: <code>{shipment.tracking}</code>
					</p>{/if}{#if shipment.replacementTracking}<p>
						Reposição fictícia: <code>{shipment.replacementTracking}</code>
					</p>{/if}
				<div class="preview-actions">
					{#if !['shipped', 'delivered'].includes(shipment.status)}<button
							disabled={busy || !hydrated || order.effectiveStatus !== 'paid'}
							onclick={() =>
								act({
									action: 'fulfillment',
									orderId: order.id,
									competence: shipment.competence,
									operation: 'cutoff',
									addressValid: false,
									editionReady: true
								})}>Testar endereço inválido</button
						><button
							disabled={busy || !hydrated || order.effectiveStatus !== 'paid'}
							onclick={() =>
								act({
									action: 'fulfillment',
									orderId: order.id,
									competence: shipment.competence,
									operation: 'cutoff',
									addressValid: true,
									editionReady: false
								})}>Testar edição indisponível</button
						><button
							disabled={busy || !hydrated || order.effectiveStatus !== 'paid'}
							onclick={() =>
								act({
									action: 'fulfillment',
									orderId: order.id,
									competence: shipment.competence,
									operation: 'cutoff',
									addressValid: true,
									editionReady: true
								})}>Validar corte e reprocessar</button
						>{/if}{#if shipment.status === 'ready'}<button
							disabled={busy || !hydrated || order.effectiveStatus !== 'paid'}
							onclick={() =>
								act({
									action: 'fulfillment',
									orderId: order.id,
									competence: shipment.competence,
									operation: 'ship'
								})}>Simular expedição</button
						>{/if}{#if shipment.status === 'shipped'}<button
							disabled={busy || !hydrated || order.effectiveStatus !== 'paid'}
							onclick={() =>
								act({
									action: 'fulfillment',
									orderId: order.id,
									competence: shipment.competence,
									operation: 'deliver'
								})}>Simular entrega</button
						>{/if}{#if ['shipped', 'delivered'].includes(shipment.status) && !shipment.replacementCount}<button
							disabled={busy || !hydrated || order.effectiveStatus !== 'paid'}
							onclick={() =>
								act({
									action: 'fulfillment',
									orderId: order.id,
									competence: shipment.competence,
									operation: 'replace'
								})}>Simular uma reposição</button
						>{/if}
				</div>
			</section>{/each}
	</article>{/each}
