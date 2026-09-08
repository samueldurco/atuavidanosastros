<script lang="ts">
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	let { data } = $props();
	let query = $state('');
	let universe = $state('all');
	let sort = $state('recent');
	const labels: Record<string, string> = {
		'proposito-prosperidade': 'Propósito',
		MEU_CEU: 'Meu Céu',
		CYCLES: 'Ciclos',
		CICLOS: 'Ciclos',
		LOVE: 'Amor',
		AMOR: 'Amor',
		TAROT: 'Tarot',
		PURPOSE: 'Propósito',
		PROPOSITO: 'Propósito',
		DREAMS: 'Sonhos',
		SONHOS: 'Sonhos'
	};
	const categories = $derived([...new Set<string>(data.items.map((item) => item.universe))]);
	const visible = $derived(
		data.items
			.filter(
				(item) =>
					(universe === 'all' || item.universe === universe) &&
					item.title.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))
			)
			.toSorted((a, b) =>
				sort === 'title'
					? a.title.localeCompare(b.title, 'pt-BR')
					: b.created_at.localeCompare(a.created_at)
			)
	);
	function clearFilters() {
		query = '';
		universe = 'all';
	}
</script>

<svelte:head
	><title>Biblioteca — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<div data-stitch="MEM-02">
	<PageIntro
		eyebrow="Seu arquivo pessoal"
		title="Biblioteca"
		description={data.preview
			? 'Uma prévia do lugar onde suas leituras ficam guardadas. Entre para acessar seu acervo.'
			: 'Leituras para reencontrar. Perguntas para continuar. Tudo o que você escolheu guardar no seu atlas.'}
	/>
	{#if data.libraryError}<StatePanel
			kind="error"
			title="Não foi possível carregar sua Biblioteca."
			description="Tente novamente em alguns instantes. Seus itens salvos não foram alterados."
			><Button href="/biblioteca" variant="secondary">Tentar novamente</Button></StatePanel
		>
	{:else if data.items.length}
		<section class="library-summary" aria-label="Resumo do acervo">
			<div>
				<p class="eyebrow">Continuidade</p>
				<h2>Seu caminho tem memória.</h2>
				<p>Os resultados salvos ficam aqui para consulta, com a data e o contexto disponíveis.</p>
			</div>
			<p class="item-count">
				<strong>{data.items.length}</strong><span
					>{data.items.length === 1 ? 'leitura salva' : 'leituras salvas'}</span
				>
			</p>
		</section>
		<div class="search-row">
			<Field id="library-query" label="Buscar na Biblioteca"
				>{#snippet children(describedBy)}<input
						id="library-query"
						type="search"
						bind:value={query}
						aria-describedby={describedBy}
						placeholder="Nome da leitura"
					/>{/snippet}</Field
			><Field id="library-sort" label="Ordenar por"
				>{#snippet children(describedBy)}<select
						id="library-sort"
						bind:value={sort}
						aria-describedby={describedBy}
						><option value="recent">Mais recentes</option><option value="title"
							>Ordem alfabética</option
						></select
					>{/snippet}</Field
			>
		</div>
		<div class="filters" role="group" aria-label="Filtrar por universo">
			<button class="chip" aria-pressed={universe === 'all'} onclick={() => (universe = 'all')}
				>Todas</button
			>{#each categories as category (category)}<button
					class="chip"
					aria-pressed={universe === category}
					onclick={() => (universe = category)}>{labels[category] ?? category}</button
				>{/each}
		</div>
		<p class="result-count" role="status">
			{visible.length}
			{visible.length === 1 ? 'leitura encontrada' : 'leituras encontradas'}
		</p>
		{#if visible.length}<div class="collection" aria-label="Itens salvos">
				{#each visible as item (item.id)}<article class="card item">
						<div class="item-cover" aria-hidden="true">
							<img src="/brand/logo/symbol/atv-symbol.svg" alt="" width="64" height="64" />
						</div>
						<div class="item-body">
							<p class="eyebrow">{labels[item.universe] ?? item.universe}</p>
							<h2>{item.title}</h2>
							<p>
								Salvo em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
									new Date(item.created_at)
								)}.
							</p>
							<span class="status">Na sua Biblioteca</span>
							<a
								class="read-link"
								href={`/biblioteca/${item.id}`}
								aria-label={`Abrir ${item.title}`}>Abrir resultado →</a
							>
						</div>
					</article>{/each}
			</div>
		{:else}<StatePanel
				title="Nenhuma leitura com esses filtros."
				description="Tente outro nome ou volte a ver todas as suas leituras."
				><Button onclick={clearFilters} variant="secondary">Limpar filtros</Button></StatePanel
			>{/if}
	{:else}
		<div class="empty-library">
			<img src="/brand/logo/monogram/atv-monogram.svg" alt="" width="80" height="80" />
			<p class="eyebrow">Um espaço para o que importa</p>
			<h2>Sua Biblioteca ainda está vazia.</h2>
			<p>
				Comece com uma pergunta. Quando você escolher salvar uma leitura, ela ganha um lugar aqui
				para acompanhar seu caminho.
			</p>
			<Button href="/bussola-de-carreira">Experimentar a Bússola de Carreira</Button><a
				class="explore-link"
				href="/#universos">Explorar os seis universos →</a
			>
		</div>
	{/if}
</div>

<style>
	.read-link {
		display: block;
		width: fit-content;
		padding-block: 0.75rem;
		margin-top: 0.75rem;
		font-size: 0.875rem;
	}
	.library-summary {
		display: flex;
		gap: 2rem;
		justify-content: space-between;
		align-items: center;
		padding: 2rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		margin-bottom: 2rem;
	}
	.library-summary h2 {
		font: 500 2rem var(--atv-font-display);
		margin: 0;
	}
	.library-summary p:not(.eyebrow) {
		color: var(--atv-text-secondary);
	}
	.item-count {
		display: grid;
		text-align: center;
		flex: 0 0 7rem;
	}
	.item-count strong {
		font: 500 3.5rem var(--atv-font-display);
		color: var(--atv-text-primary);
	}
	.item-count span {
		font-size: 0.8rem;
	}
	.search-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.35fr);
		gap: 1.5rem;
	}
	.filters {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1.5rem;
	}
	.result-count {
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
		margin-block: 1.5rem;
	}
	.collection {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.25rem;
	}
	.item {
		overflow: hidden;
		box-shadow: none;
	}
	.item-cover {
		display: grid;
		place-items: center;
		height: 9rem;
		background: var(--atv-surface-muted);
		border-bottom: 1px solid var(--atv-border);
	}
	.item-cover img {
		opacity: 0.8;
	}
	.item-body {
		padding: 1.5rem;
	}
	.item h2 {
		margin: 0.5rem 0;
		font: 500 1.6rem/1.2 var(--atv-font-display);
	}
	.item-body > p:not(.eyebrow) {
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
	}
	.empty-library {
		padding: clamp(2rem, 5vw, 4rem);
		border-block: 1px solid var(--atv-border);
		text-align: center;
		background: var(--atv-surface-card);
	}
	.empty-library img {
		margin-bottom: 1.5rem;
	}
	.empty-library h2 {
		font: 500 clamp(1.8rem, 3vw, 2.5rem) var(--atv-font-display);
		margin: 0;
	}
	.empty-library > p:not(.eyebrow) {
		max-width: 32rem;
		margin: 1.25rem auto 2rem;
		font: 400 1.1875rem/1.6 var(--atv-font-editorial);
		color: var(--atv-text-secondary);
	}
	.explore-link {
		display: block;
		width: fit-content;
		margin: 1.5rem auto 0;
		padding-block: 0.75rem;
		font-size: 0.85rem;
	}
	@media (max-width: 1100px) {
		.collection {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 767px) {
		.search-row,
		.collection {
			grid-template-columns: 1fr;
		}
		.library-summary {
			flex-direction: column;
			align-items: flex-start;
		}
		.item-count {
			display: flex;
			align-items: baseline;
			gap: 1rem;
			margin: 0;
			flex-basis: auto;
		}
	}
</style>
