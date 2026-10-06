<script lang="ts">
	import { onMount } from 'svelte';
	import { signs, signNames } from '$lib/data/site';
	import {
		filterShopDirections,
		shopAudiences,
		shopDirections,
		shopFormats,
		shopTechniques
	} from '$lib/data/shop-preparation';
	let query = $state('');
	let collection = $state('');
	let format = $state('');
	let technique = $state('');
	let audience = $state('');
	let sign = $state('');
	let page = $state(1);
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	const perPage = 6;
	const results = $derived(
		filterShopDirections({ query, collection, format, technique, audience, sign })
	);
	const pageCount = $derived(Math.max(1, Math.ceil(results.length / perPage)));
	const currentPage = $derived(Math.min(page, pageCount));
	const visible = $derived(results.slice((currentPage - 1) * perPage, currentPage * perPage));
	function changed() {
		page = 1;
	}
	function clear() {
		query = '';
		collection = '';
		format = '';
		technique = '';
		audience = '';
		sign = '';
		page = 1;
	}
</script>

<section
	class="section shop-preparation"
	id="colecoes"
	aria-labelledby="collections-title"
	data-hydrated={ready}
>
	<div class="container">
		<div class="intro">
			<div>
				<p class="eyebrow">O próximo capítulo</p>
				<h2 class="h2" id="collections-title">Coleções em preparação</h2>
			</div>
			<p>
				Explore as direções que estamos estudando. Os formatos são possibilidades de criação, não
				produtos disponíveis. As artes, os materiais e os fornecedores ainda serão validados.
			</p>
		</div>
		<form
			class="filters"
			aria-label="Explorar coleções em preparação"
			onsubmit={(event) => event.preventDefault()}
		>
			<label class="search"
				>Buscar uma direção<input
					type="search"
					bind:value={query}
					oninput={changed}
					placeholder="Bordado, casa, canecas…"
				/></label
			>
			<label
				>Coleção<select aria-label="Coleção" bind:value={collection} onchange={changed}
					><option value="">Todas as coleções</option
					>{#each shopDirections as item (item.id)}<option value={item.id}>{item.title}</option
						>{/each}</select
				></label
			>
			<label
				>Formato em estudo<select
					aria-label="Formato em estudo"
					bind:value={format}
					onchange={changed}
					><option value="">Todos os formatos</option
					>{#each Object.entries(shopFormats) as [id, label] (id)}<option value={id}>{label}</option
						>{/each}</select
				></label
			>
			<label
				>Técnica em estudo<select
					aria-label="Técnica em estudo"
					bind:value={technique}
					onchange={changed}
					><option value="">Todas as técnicas</option
					>{#each Object.entries(shopTechniques) as [id, label] (id)}<option value={id}
							>{label}</option
						>{/each}</select
				></label
			>
			<label
				>Para quem<select aria-label="Para quem" bind:value={audience} onchange={changed}
					><option value="">Todos os públicos</option
					>{#each Object.entries(shopAudiences) as [id, label] (id)}<option value={id}
							>{label}</option
						>{/each}</select
				></label
			>
			<label
				>Signo<select aria-label="Signo" bind:value={sign} onchange={changed}
					><option value="">Todos os temas</option>{#each signs as id (id)}<option value={id}
							>{signNames[id]}</option
						>{/each}</select
				></label
			>
			<button class="clear" type="button" onclick={clear}>Limpar filtros</button>
		</form>
		<div class="results-bar">
			<p role="status" aria-live="polite">
				{results.length}
				{results.length === 1 ? 'direção em preparação' : 'direções em preparação'}{sign
					? ` · tema ${signNames[sign as keyof typeof signNames]}`
					: ''}
			</p>
			<span>Sem ofertas publicadas</span>
		</div>
		{#if results.length}
			<div class="direction-grid">
				{#each visible as item (item.id)}
					<article class="direction-card" data-testid="shop-direction">
						<div class="card-top">
							<span class="card-label">Linha em estudo</span><span aria-hidden="true">✦</span>
						</div>
						<h3>{item.title}</h3>
						<p>{item.summary}</p>
						<ul aria-label={`Formatos em estudo para ${item.title}`}>
							{#each item.formats as id (id)}<li>{shopFormats[id]}</li>{/each}
						</ul>
						<details>
							<summary>Conhecer a direção</summary>
							<p>{item.artDirection}</p>
							<p class="qualification">
								Cada combinação de peça, técnica, tamanho e destino será avaliada. A lista não
								confirma disponibilidade nem combinação entre todos os formatos e técnicas.
							</p>
						</details>
					</article>
				{/each}
			</div>
			<nav class="pagination" aria-label="Páginas das coleções">
				<button
					type="button"
					disabled={!ready || currentPage === 1}
					onclick={() => {
						page = currentPage - 1;
					}}>Anterior</button
				>
				<span>Página {currentPage} de {pageCount}</span>
				<button
					type="button"
					disabled={!ready || currentPage === pageCount}
					onclick={() => {
						page = currentPage + 1;
					}}>Próxima</button
				>
			</nav>
		{:else}
			<div class="empty">
				<h3>Nenhuma direção com esses filtros</h3>
				<p>Experimente outro formato ou limpe a seleção para explorar as coleções.</p>
				<button type="button" onclick={clear}>Ver todas as direções</button>
			</div>
		{/if}
		<p class="footnote">
			O filtro de signo seleciona linhas com proposta zodiacal. Não indica que já exista uma arte
			pronta para esse signo. Nenhum cadastro, pagamento ou dado de personalização é solicitado
			nesta etapa.
		</p>
	</div>
</section>

<style>
	.shop-preparation {
		border-bottom: 1px solid var(--atv-border);
	}
	.intro {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: end;
		margin-bottom: 2rem;
	}
	.intro p:last-child,
	.footnote,
	.qualification {
		color: var(--atv-text-secondary);
	}
	.filters {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		padding: 1.5rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		background: var(--atv-surface-card);
	}
	label {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
		font-size: 0.875rem;
	}
	input,
	select {
		width: 100%;
		min-width: 0;
		min-height: 2.75rem;
		border: 1px solid var(--atv-border);
		border-radius: 0.5rem;
		padding: 0.65rem;
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
		font: inherit;
	}
	button {
		min-height: 2.75rem;
		border: 1px solid var(--atv-border);
		border-radius: 0.5rem;
		padding: 0.6rem 1rem;
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.clear {
		justify-self: start;
	}
	.results-bar {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin: 1.5rem 0;
		color: var(--atv-text-secondary);
		font-size: 0.875rem;
	}
	.results-bar p {
		margin: 0;
	}
	.direction-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}
	.direction-card {
		min-width: 0;
		padding: 1.5rem;
		background: var(--atv-surface-card);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
	}
	.card-top {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		color: var(--atv-text-accent);
	}
	.card-label {
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	h3 {
		margin: 1.25rem 0 0.75rem;
		font: 500 1.65rem/1.15 var(--atv-font-display);
		overflow-wrap: anywhere;
	}
	.direction-card p {
		color: var(--atv-text-secondary);
	}
	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		list-style: none;
		padding: 0;
		margin: 1.25rem 0;
	}
	li {
		font-size: 0.75rem;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--atv-border);
		border-radius: 0.35rem;
	}
	details {
		margin-top: 1.5rem;
		border-top: 1px solid var(--atv-border);
		padding-top: 1rem;
	}
	summary {
		cursor: pointer;
		font-size: 0.875rem;
		min-height: 2rem;
	}
	.qualification,
	.footnote {
		font-size: 0.8rem;
		line-height: 1.6;
	}
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 2rem;
	}
	.empty {
		text-align: center;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		padding: 2rem;
	}
	.footnote {
		max-width: 65rem;
		margin: 2rem 0 0;
	}
	:where(input, select, button, summary):focus-visible {
		outline: 2px solid var(--atv-gold-500);
		outline-offset: 3px;
	}
	@media (max-width: 900px) {
		.direction-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.filters {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 620px) {
		.intro,
		.direction-grid,
		.filters {
			grid-template-columns: minmax(0, 1fr);
		}
		.filters,
		.direction-card {
			padding: 1.1rem;
		}
	}
</style>
