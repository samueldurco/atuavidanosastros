<script lang="ts">
	import { visualProduct } from '$lib/data/visual-v3';
	import { onMount, untrack } from 'svelte';
	import type { SavedTrial } from '$lib/trials/reading';
	import type { ReaderState } from '$lib/trials/reader-state';
	import { experienceFor } from '$lib/trials/experience';
	import { trialResponse } from '$lib/trials/response';
	import { PAIR_VERSION } from '$lib/trials/reconstruction/pair-facts';
	import ReadingPairCharts from './ReadingPairCharts.svelte';
	import ReadingChart from './ReadingChart.svelte';
	import ReadingTarot from './ReadingTarot.svelte';
	import ReadingCalendar from './ReadingCalendar.svelte';
	import { tarotMethodFor } from '@atv/domain';
	let { saved, initial }: { saved: SavedTrial; initial: ReaderState } = $props();
	let chapter = $state(untrack(() => initial.chapter)),
		bookmarks = $state(untrack(() => [...initial.bookmarks]));
	let status = $state(''),
		saving = $state(false);
	let interactive = $state(false);
	onMount(() => {
		interactive = true;
	});
	const sections = $derived(saved.reading.sections);
	const tarotMethod = $derived(tarotMethodFor(saved.product_id));
	const chapters = $derived(
		sections
			.map((s, i) => ({ ...s, index: i }))
			.filter((s) => s.title !== 'Referências desta leitura')
	);
	const current = $derived(chapters.find((s) => s.index === chapter) ?? chapters[0]);
	const currentIndex = $derived(chapters.findIndex((s) => s.index === current.index));
	const contract = $derived(experienceFor(saved.product_id));
	const minutes = $derived(
		[
			'atv-private-three-pillars/5.0.0',
			'atv-private-birth-chart/5.0.0',
			'atv-private-career-compass/5.0.0',
			'atv-private-life-atlas/4.0.0',
			'atv-private-direction-journey/4.0.0',
			'atv-private-calendar-synthesis/4.0.0',
			'atv-private-purpose-synthesis/4.0.0'
		].includes(saved.calculation.version)
			? Math.max(
					1,
					Math.ceil(
						sections
							.map((s) => s.text)
							.join(' ')
							.split(/\s+/).length / 200
					)
				)
			: contract.minutes
	);
	const references = $derived(sections.find((s) => s.title === 'Referências desta leitura'));
	const hasChart = $derived(
		[
			'three-pillars',
			'birth-chart',
			'life-atlas',
			'ascendant',
			'career-compass',
			'purpose-career',
			'midheaven',
			'date-reading',
			'horoscope',
			'week-reading',
			'solar-return',
			'personal-calendar'
		].includes(saved.product_id) ||
			[
				'atv-private-synastry-synthesis/4.0.0',
				'atv-private-couple-dossier-synthesis/4.0.0'
			].includes(saved.calculation.version)
	);

	let pending: ReaderState | null = null;
	async function persist(next: number, marked: number[]) {
		chapter = next;
		bookmarks = [...marked];
		pending = { chapter: next, bookmarks: [...marked] };
		if (saving) return;
		saving = true;
		status = '';
		try {
			while (pending) {
				const update = pending;
				pending = null;
				await trialResponse(
					await fetch(`/api/private-trials/${saved.id}`, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ action: 'reader-state', ...update })
					})
				);
			}
			status = 'Posição e marcadores salvos.';
		} catch (e) {
			pending = null;
			status =
				e instanceof Error ? e.message : 'Não foi possível salvar. Sua leitura continua aberta.';
		} finally {
			saving = false;
		}
	}
	function open(index: number) {
		void persist(index, bookmarks);
	}
	function mark() {
		void persist(
			current.index,
			bookmarks.includes(current.index)
				? bookmarks.filter((n) => n !== current.index)
				: [...bookmarks, current.index]
		);
	}
</script>

<section class="experience" aria-label="Percorra sua leitura">
	<img
		class="v3-product-mark"
		src={visualProduct(saved.product_id)?.vignette}
		alt=""
		width="80"
		height="40"
	/>
	{#if saved.input.presentation?.name || saved.input.birth}
		<div class="identity">
			{#if saved.input.presentation?.name}<p>
					<strong>{saved.input.presentation.name}</strong>{saved.input.presentation.partnerName
						? ` e ${saved.input.presentation.partnerName}`
						: ''}
				</p>{/if}
			{#if saved.input.birth}<p>
					{saved.input.birth.localDateTime.replace('T', ' · ')} · {saved.input.presentation?.city ??
						'Local informado'} · {saved.input.birth.timezone}
				</p>{/if}
			{#if saved.input.partner}<p>
					{saved.input.partner.localDateTime.replace('T', ' · ')} · {saved.input.presentation
						?.partnerCity ?? 'Local da segunda pessoa'} · {saved.input.partner.timezone}
				</p>{/if}
		</div>
	{/if}
	{#if ['synastry', 'couple-dossier'].includes(saved.product_id) || (saved.product_id === 'pair-preview' && saved.calculation.version !== PAIR_VERSION)}<ReadingPairCharts
			{saved}
		/>{/if}
	{#if saved.product_id === 'three-pillars'}
		<div class="pillars" role="group" aria-label="Três funções do seu mapa">
			{#each [['position-sun', 'Sol · expressão'], ['position-moon', 'Lua · necessidades'], ['angle-ascendant', 'Ascendente · primeiro movimento']] as [id, label] (id)}
				{@const fact = saved.calculation.facts.find((f) => f.id === id)}
				{@const preferredRole =
					id === 'position-sun'
						? 'integrated-trio'
						: id === 'position-moon'
							? 'trio-rhythm'
							: 'asc-ruler'}
				{@const target =
					chapters.find((s) => saved.reading.editorial?.plan[s.index]?.role === preferredRole) ??
					chapters.find((s) => s.factIds.includes(id))}
				{#if fact && target}<button disabled={!interactive} onclick={() => open(target.index)}
						><strong>{label}</strong><span>{fact.display}</span></button
					>{/if}
			{/each}
		</div>
	{/if}
	{#if saved.calculation.version === 'atv-private-week-synthesis/4.0.0'}
		<nav class="week-timeline" aria-label="Linha do tempo da semana">
			<p>Sete datas · destaques e continuidade em UTC</p>
			<div>
				{#each saved.reading.editorial?.plan.filter( (p) => p.role.startsWith('week-day-') ) ?? [] as day (day.role)}
					{@const index = sections.findIndex((s) => s.title === day.title)}
					<button
						disabled={!interactive}
						aria-current={current.index === index ? 'date' : undefined}
						onclick={() => open(index)}>{day.title}</button
					>
				{/each}
			</div>
		</nav>
	{/if}
	<div class="reading-meta">
		<span>{minutes} min de leitura · {chapters.length} capítulos</span><span
			>Capítulo {currentIndex + 1} de {chapters.length}</span
		>
	</div>
	<progress value={currentIndex + 1} max={chapters.length} aria-label="Posição na leitura"
	></progress>
	{#if saved.calculation.version === 'atv-private-calendar-synthesis/4.0.0'}
		<ReadingCalendar {saved} chapter={current.index} {interactive} onopen={open} />
	{/if}
	{#if hasChart}
		<details class="map">
			<summary>Explore seu mapa e os capítulos relacionados</summary>
			<ReadingChart
				{saved}
				onselect={(id) => {
					const target = chapters.find((s) => s.factIds.includes(id));
					if (target) open(target.index);
				}}
			/>
		</details>
	{/if}
	{#if tarotMethod}
		<ReadingTarot
			{saved}
			{interactive}
			onselect={(id) => {
				const number = id.match(/^card-(\d+)$/)?.[1];
				const target = chapters.find((s) => number && s.title.startsWith(`${number}. `));
				if (target) open(target.index);
			}}
		/>
	{/if}
	<div class="reader-grid">
		<nav aria-label="Capítulos da leitura">
			<details open>
				<summary>Escolha um capítulo</summary>
				<ol>
					{#each chapters as item (item.index)}<li>
							<button
								disabled={!interactive}
								aria-current={item.index === current.index ? 'step' : undefined}
								onclick={() => open(item.index)}
								>{bookmarks.includes(item.index) ? '★ ' : ''}{item.title}</button
							>
						</li>{/each}
				</ol>
			</details>
		</nav>
		<article aria-label="Capítulo selecionado">
			<div class="chapter-heading">
				<p class="eyebrow">{String(currentIndex + 1).padStart(2, '0')} · Sua leitura</p>
				<button class="bookmark" aria-pressed={bookmarks.includes(current.index)} onclick={mark}
					>{bookmarks.includes(current.index) ? '★ Marcado' : '☆ Marcar capítulo'}</button
				>
			</div>
			<h2>{current.title}</h2>
			<p class="prose">{current.text}</p>
			<div class="chapter-navigation">
				<button disabled={currentIndex === 0} onclick={() => open(chapters[currentIndex - 1].index)}
					>← Anterior</button
				><button
					disabled={currentIndex === chapters.length - 1}
					onclick={() => open(chapters[currentIndex + 1].index)}>Próximo →</button
				>
			</div>
		</article>
	</div>
	<p class="save-status" role="status">
		{status ||
			'Sua posição é guardada ao escolher um capítulo. Os marcadores ficam na sua biblioteca privada.'}
	</p>
	{#if references}<details class="references">
			<summary>Referências calculadas e informadas</summary>
			<p class="prose">{references.text}</p>
		</details>{/if}
</section>

<style>
	.week-timeline {
		padding: 1rem;
		border: 1px solid #ad884c;
		border-radius: 1rem;
		margin: 1rem 0;
	}
	.week-timeline p {
		font-weight: 600;
		margin: 0 0 0.75rem;
	}
	.week-timeline div {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.week-timeline button {
		flex: 1 1 160px;
		text-align: left;
		border: 1px solid #ad884c;
		border-radius: 0.5rem;
		padding: 0.75rem;
		background: #faf6ed;
		color: #24374b;
	}
	.week-timeline button[aria-current] {
		background: #24374b;
		color: #faf6ed;
	}
	.identity {
		border-left: 3px solid #ad884c;
		padding: 0.25rem 1rem;
		margin: 1rem 0;
		font-size: 0.9rem;
		overflow-wrap: anywhere;
	}
	.pillars {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin: 1.5rem 0;
	}
	.pillars button {
		flex: 1 1 12rem;
		padding: 1.25rem;
		border: 1px solid #ded6c8;
		border-radius: 1rem;
		background: #f7f2e7;
		text-align: left;
	}
	.pillars span {
		display: block;
		margin-top: 0.6rem;
		font-size: 0.85rem;
	}
	.experience {
		margin: 2rem auto;
		max-width: 1120px;
		color: var(--atv-ink, #14263a);
	}
	.reading-meta,
	.chapter-heading,
	.chapter-navigation {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.reading-meta,
	.save-status {
		font-size: 0.85rem;
		line-height: 1.6;
	}
	progress {
		width: 100%;
		height: 5px;
		accent-color: #a77838;
		margin: 0.7rem 0 1.5rem;
	}
	.reader-grid {
		display: grid;
		align-items: start;
		grid-template-columns: minmax(190px, 260px) minmax(0, 1fr);
		gap: 2rem;
	}
	nav {
		border-right: 1px solid #ded6c8;
		padding-right: 1.2rem;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
		line-height: 1.6;
	}
	ol {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
	}
	li {
		margin: 0.3rem 0;
	}
	button {
		font: inherit;
		cursor: pointer;
		border: 1px solid #cdc2b0;
		border-radius: 0.6rem;
		background: #fff;
		color: #203c3a;
		padding: 0.7rem 0.9rem;
		text-align: left;
		line-height: 1.5;
	}
	nav button {
		border-color: transparent;
		width: 100%;
		background: transparent;
		font-size: 0.9rem;
	}
	nav button[aria-current] {
		border-color: #c8ad7c;
		background: #f5f0e6;
		font-weight: 600;
	}
	button:disabled {
		cursor: default;
		opacity: 0.5;
	}
	button:focus-visible,
	summary:focus-visible {
		outline: 3px solid #2b638c;
		outline-offset: 3px;
	}
	article {
		background: #fff;
		border: 1px solid #ded6c8;
		border-radius: 1.25rem;
		padding: clamp(1.25rem, 3vw, 2.5rem);
		min-width: 0;
	}
	h2 {
		font: 500 clamp(1.7rem, 3vw, 2.4rem)/1.2 var(--atv-font-display, Georgia);
		margin: 1rem 0 1.75rem;
		overflow-wrap: anywhere;
	}
	.prose {
		white-space: pre-wrap;
		line-height: 1.85;
		overflow-wrap: anywhere;
		max-width: 70ch;
	}
	.eyebrow {
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.bookmark {
		font-size: 0.8rem;
	}
	.chapter-navigation {
		border-top: 1px solid #ded6c8;
		margin-top: 2rem;
		padding-top: 1.5rem;
	}
	.map,
	.references {
		border: 1px solid #ded6c8;
		border-radius: 1rem;
		padding: 1rem 1.25rem;
		margin: 1.5rem 0;
		background: #f7f2e7;
	}
	.references .prose {
		font-size: 0.85rem;
	}
	@media (max-width: 740px) {
		.reader-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		nav {
			border: 0;
			padding: 0;
		}
		nav ol {
			max-height: 200px;
			overflow: auto;
		}
		article {
			border-radius: 0.8rem;
		}
		.reading-meta {
			font-size: 0.75rem;
		}
	}
</style>
