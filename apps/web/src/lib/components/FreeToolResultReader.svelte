<script lang="ts">
	import type { FreeToolResult } from '$lib/free-tools';
	import { freeToolById } from '$lib/data/free-tools';
	let { result }: { result: FreeToolResult } = $props();
	const date = (value: string) =>
		new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
</script>

<section class="section">
	<div class="container reader">
		<a href="/biblioteca">← Biblioteca</a>
		<p class="eyebrow">Resultado gratuito salvo · {date(result.createdAt)}</p>
		<h1 class="h1">{result.title}</h1>
		<p class="lead">{result.summary}</p>
		{#if result.chart}<img
				class="mandala"
				src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.chart.svg)}`}
				alt="Mandala do seu mapa natal"
			/>{/if}
		<dl class="facts">
			{#each result.facts as fact (fact.id)}<div>
					<dt>{fact.label}</dt>
					<dd>{fact.value}</dd>
				</div>{/each}
		</dl>
		{#each result.sections as section (section.id)}<section class="card">
				<h2>{section.title}</h2>
				<p class="body">{section.body}</p>
			</section>{/each}
		{#if result.limits.length}<aside class="limits">
				<h2>Como usar este resultado</h2>
				<ul>
					{#each result.limits as limit, index (index)}<li>{limit}</li>{/each}
				</ul>
			</aside>{/if}
		<a class="btn btn-primary" href={freeToolById(result.tool)?.href ?? '/ferramentas'}
			>Voltar à ferramenta</a
		>
	</div>
</section>

<style>
	.reader {
		max-width: 60rem;
	}
	.reader > section,
	.limits {
		margin-block: 1.5rem;
	}
	.body {
		white-space: pre-wrap;
	}
	.mandala {
		display: block;
		width: min(100%, 32rem);
		margin: 2rem auto;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1rem;
	}
	.facts div {
		padding: 1rem;
		background: var(--atv-surface-raised);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0.5rem 0 0;
		white-space: pre-wrap;
	}
	.limits {
		padding: 1.25rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
	}
	li {
		margin-block: 0.5rem;
	}
</style>
