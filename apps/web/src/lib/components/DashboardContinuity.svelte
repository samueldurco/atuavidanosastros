<script lang="ts">
	import type { ContinuitySummary } from '$lib/continuity-summary';
	let { summary }: { summary: ContinuitySummary } = $props();
</script>

<section class="continuity-summary" aria-labelledby="dashboard-continuity-title">
	<p class="eyebrow">Continuidade ATV+</p>
	<h2 id="dashboard-continuity-title">O que você escolheu guardar.</h2>
	{#if summary.state === 'PREVIEW'}
		<p>
			Entre para consultar suas escolhas de continuidade. Esta prévia não contém registros pessoais.
		</p>
		<a href="/entrar">Entrar para consultar →</a>
	{:else if summary.state === 'UNAVAILABLE'}
		<p>
			Não foi possível recuperar seu resumo de continuidade. Isso não significa que seus registros
			foram apagados.
		</p>
		<a href="/dashboard">Recuperar resumo de continuidade →</a>
		<a href="/biblioteca#continuity-heading">Consultar na Biblioteca →</a>
	{:else if summary.state === 'AVAILABLE'}
		{#if !summary.snapshot.enabled}
			<p>
				A continuidade está desativada. Seus registros existentes podem ser consultados ou excluídos
				na Biblioteca.
			</p>
		{/if}
		<p>
			{summary.snapshot.consentState === 'granted'
				? 'Você registrou consentimento para um escopo de leituras. Isso não libera o uso automático dos registros.'
				: 'Sem consentimento ativo para usar seus registros como contexto. Revogar não apaga o que você guardou.'}
		</p>
		{#if summary.snapshot.counts.total === 0}
			<p>Nenhum registro de continuidade guardado.</p>
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
		<a href="/biblioteca#continuity-heading">Gerenciar minhas escolhas →</a>
	{/if}
	<p class="limit">Este resumo não inicia uma interpretação. Nenhum modelo está homologado.</p>
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
