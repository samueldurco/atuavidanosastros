<script lang="ts">
	import type { ContinuitySummary } from '$lib/continuity-summary';
	let { summary }: { summary: ContinuitySummary } = $props();
</script>

<section class="continuity-summary" aria-labelledby="dashboard-continuity-title">
	<p class="eyebrow">Meus registros</p>
	<h2 id="dashboard-continuity-title">Registros salvos</h2>
	{#if summary.state === 'PREVIEW'}
		<p>Entre para consultar os registros salvos na sua conta.</p>
		<a href="/entrar?next=%2Fdashboard">Entrar para consultar →</a>
	{:else if summary.state === 'UNAVAILABLE'}
		<p>Não foi possível carregar seus registros. Tente novamente.</p>
		<a href="/dashboard">Tentar novamente →</a>
		<a href="/biblioteca#continuity-heading">Consultar na Biblioteca →</a>
	{:else if summary.state === 'AVAILABLE'}
		{#if !summary.snapshot.enabled}
			<p>
				O uso dos registros em outras leituras está desativado. Você pode consultar ou excluir os
				registros salvos na Biblioteca.
			</p>
		{/if}
		<p>
			{summary.snapshot.consentState === 'granted'
				? 'Você autorizou o uso dos registros nas leituras indicadas no consentimento. O uso automático ainda está indisponível.'
				: 'Você não autorizou o uso dos registros em outras leituras. Os registros salvos continuam na Biblioteca.'}
		</p>
		{#if summary.snapshot.counts.total === 0}
			<p>Você ainda não tem registros salvos.</p>
		{:else}
			<dl aria-label="Registros de continuidade">
				<div>
					<dt>Guardados</dt>
					<dd>{summary.snapshot.counts.total}</dd>
				</div>
				<div>
					<dt>Marcados como relevantes</dt>
					<dd>{summary.snapshot.counts.relevant}</dd>
				</div>
				<div>
					<dt>Marcados como não relevantes</dt>
					<dd>{summary.snapshot.counts.irrelevant}</dd>
				</div>
				<div>
					<dt>Ainda não revisados</dt>
					<dd>{summary.snapshot.counts.unreviewed}</dd>
				</div>
			</dl>
		{/if}
		<a href="/biblioteca#continuity-heading">Gerenciar meus registros →</a>
	{/if}
	<p class="limit">
		O uso automático desses registros em novas leituras ainda não está disponível.
	</p>
</section>

<style>
	.continuity-summary {
		margin-top: 2rem;
		padding: 1.5rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface-card);
	}
	h2 {
		margin: 0;
		font: 500 1.6rem/1.25 var(--atv-font-display);
	}
	p {
		color: var(--atv-text-secondary);
	}
	a {
		display: flex;
		align-items: center;
		min-height: 44px;
		width: fit-content;
	}
	dl {
		margin-block: 1.5rem;
	}
	dl div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 0.65rem;
		border-bottom: 1px solid var(--atv-border);
	}
	dt {
		min-width: 0;
	}
	dd {
		margin: 0;
		font-weight: 600;
	}
	.limit {
		font-size: 0.85rem;
		margin-bottom: 0;
	}
</style>
