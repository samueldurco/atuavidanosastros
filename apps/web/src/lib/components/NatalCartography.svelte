<script lang="ts">
	import { longitudePoint, type ProductCartography } from '$lib/product-cartography';
	import { productFactLabel } from '$lib/product-fact-label';
	let {
		geometry,
		facts
	}: {
		geometry: ProductCartography;
		facts: { id: string; display: string }[];
	} = $props();
	const signs = [
		'Áries',
		'Touro',
		'Gêmeos',
		'Câncer',
		'Leão',
		'Virgem',
		'Libra',
		'Escorpião',
		'Sagitário',
		'Capricórnio',
		'Aquário',
		'Peixes'
	];
	const point = (longitude: number, radius: number) => longitudePoint(longitude, radius, 340, 340);
	let enlarged = $state(false);
	const display = (id: string) =>
		facts.find((fact) => fact.id === id)?.display ?? 'Consulte a base preservada';
</script>

<section id="cartografia" aria-labelledby="cartography-heading">
	<p class="eyebrow">Coordenadas natais</p>
	<h2 id="cartography-heading">Seu mapa astral</h2>
	<p>
		Posições, ângulos e cúspides desta versão. A geometria é experimental; leia os limites antes de
		interpretar.
	</p>
	<div class="cartography-layout">
		<figure>
			<button
				type="button"
				class="chart-size"
				aria-pressed={enlarged}
				onclick={() => (enlarged = !enlarged)}
				>{enlarged ? 'Ajustar à tela' : 'Ampliar mapa'}</button
			>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (The enlarged scroll area needs keyboard focus for arrow-key navigation.) -->
			<div
				class="chart-viewport"
				class:enlarged
				role="region"
				aria-label="Área do mapa astral"
				tabindex={enlarged ? 0 : undefined}
			>
				<svg
					viewBox="0 0 680 680"
					role="img"
					aria-labelledby="natal-chart-title natal-chart-description"
				>
					<title id="natal-chart-title">Cartografia natal tropical experimental</title>
					<desc id="natal-chart-description"
						>Os dez números correspondem à lista de posições. Zero de Áries fica à esquerda e as
						longitudes crescem no sentido anti-horário. Trilhas radiais separam os marcadores; não
						representam distância. Linhas finas são cúspides, a linha contínua é o Ascendente e a
						tracejada é o Meio do Céu, quando disponíveis. Os valores completos estão na base e
						limites.</desc
					>
					<circle cx="340" cy="340" r="310" class="outer-ring" />
					<circle cx="340" cy="340" r="260" class="ring" />
					<circle cx="340" cy="340" r="230" class="ring" />
					{#each signs as sign, index (sign)}
						{@const a = point(index * 30, 230)}
						{@const b = point(index * 30, 310)}
						{@const label = point(index * 30 + 15, 283)}
						<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class="sign-divider" />
						<text x={label.x} y={label.y + 4} text-anchor="middle" class="sign-label">{sign}</text>
					{/each}
					{#each geometry.houses.cusps as cusp, index (index)}
						{@const a = point(cusp, 70)}
						{@const b = point(cusp, 230)}
						<line
							data-house={index + 1}
							data-longitude={cusp}
							x1={a.x}
							y1={a.y}
							x2={b.x}
							y2={b.y}
							class="cusp"
						/>
					{/each}
					{#each Object.entries(geometry.angles) as [name, angle] (name)}
						{#if angle !== null}
							{@const a = point(angle, 70)}
							{@const b = point(angle, 260)}
							<line
								data-angle={name}
								data-longitude={angle}
								x1={a.x}
								y1={a.y}
								x2={b.x}
								y2={b.y}
								class="angle"
								class:midheaven={name === 'midheaven'}
							/>
						{/if}
					{/each}
					{#each geometry.positions as position, index (position.body)}
						{@const marker = point(position.longitude, 250 - index * 19)}
						<g data-body={position.body} data-longitude={position.longitude}>
							<title
								>{productFactLabel('birth-chart', `position-${position.body}`)}: {display(
									`position-${position.body}`
								)}</title
							>
							<circle cx={marker.x} cy={marker.y} r="9" class="body" />
							<text x={marker.x} y={marker.y + 4} text-anchor="middle" class="body-number"
								>{index + 1}</text
							>
						</g>
					{/each}
					<text x="340" y="335" text-anchor="middle" class="center-label">Tropical</text>
					<text x="340" y="355" text-anchor="middle" class="center-note">Experimental</text>
				</svg>
			</div>
			{#if enlarged}<p class="note">
					Deslize para ver o mapa. Com teclado, foque a área e use as setas.
				</p>{/if}
			<figcaption>
				Trilhas radiais apenas organizam os marcadores. Não há aspectos ou trânsitos nesta mapa.
			</figcaption>
		</figure>
		<div class="positions">
			<h3>Posições desta versão</h3>
			<ol aria-label="Legenda das posições natais">
				{#each geometry.positions as position (position.body)}
					<li>
						<a href={`#fact-position-${position.body}`}
							><strong
								>{productFactLabel('birth-chart', `position-${position.body}`).split(
									' ('
								)[0]}</strong
							><span>{display(`position-${position.body}`)}</span></a
						>
					</li>
				{/each}
			</ol>
			<p class="angle-key">
				{#if geometry.angles.ascendant !== null}<a href="#fact-angle-ascendant"
						>Ascendente · linha contínua</a
					>{/if}{#if geometry.angles.midheaven !== null}<a href="#fact-angle-midheaven"
						>Meio do Céu · linha tracejada</a
					>{/if}
			</p>
			{#if geometry.houses.status === 'ok'}
				<p class="note">
					12 cúspides Placidus · linhas finas. <a href="#origem">Consultar cúspides e limites</a>
				</p>
			{:else}
				<p class="note">
					Casas e Ascendente indisponíveis para esta latitude. Nenhum sistema substituto foi
					aplicado.
				</p>
			{/if}
		</div>
	</div>
</section>

<style>
	section {
		container-type: inline-size;
		scroll-margin-top: 2rem;
		margin-bottom: 3rem;
		overflow-wrap: anywhere;
	}
	h2 {
		margin: 0 0 1rem;
	}
	.cartography-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
		padding: clamp(1rem, 3vw, 2rem);
		margin-top: 1.5rem;
		background: var(--atv-surface-card);
		border: 1px solid var(--atv-border);
	}
	figure {
		min-width: 0;
		margin: 0;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		color: var(--atv-text-primary);
	}
	.chart-viewport {
		max-width: 100%;
		overflow: auto;
		overscroll-behavior: contain;
	}
	.chart-viewport.enlarged svg {
		min-width: 680px;
	}
	.chart-size {
		min-height: 44px;
		padding: 0.65rem 1rem;
		margin-bottom: 1rem;
		border: 1px solid var(--atv-border);
		border-radius: 999px;
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
		font: inherit;
		cursor: pointer;
	}
	.outer-ring {
		fill: var(--atv-surface-card);
		stroke: var(--atv-border);
	}
	.ring,
	.sign-divider {
		fill: none;
		stroke: var(--atv-border);
	}
	.cusp {
		stroke: var(--atv-text-secondary);
		stroke-width: 0.6;
	}
	.angle {
		stroke: var(--atv-text-primary);
		stroke-width: 2;
	}
	.midheaven {
		stroke-dasharray: 7 5;
	}
	.sign-label {
		fill: var(--atv-text-primary);
		font-family: var(--atv-font-ui);
		font-size: 13px;
	}
	.body {
		fill: var(--atv-text-primary);
		stroke: var(--atv-surface-card);
		stroke-width: 1.5;
	}
	.body-number {
		fill: var(--atv-surface-card);
		font-family: var(--atv-font-ui);
		font-size: 12px;
	}
	.center-label {
		fill: var(--atv-text-primary);
		font-family: var(--atv-font-display);
		font-size: 23px;
	}
	.center-note {
		fill: var(--atv-text-secondary);
		font-family: var(--atv-font-ui);
		font-size: 12px;
	}
	figcaption,
	.note {
		font-size: 0.85rem;
		color: var(--atv-text-secondary);
	}
	figcaption {
		margin-top: 1rem;
	}
	h3 {
		margin-top: 0;
	}
	ol {
		padding-left: 1.25rem;
		margin-bottom: 1rem;
	}
	li {
		padding-left: 0.25rem;
	}
	li a {
		display: block;
		padding-block: 0.5rem;
		min-height: 44px;
		text-decoration: none;
	}
	li a:hover strong {
		text-decoration: underline;
	}
	li span {
		display: block;
		font-size: 0.85rem;
		color: var(--atv-text-secondary);
	}
	.angle-key a {
		display: block;
		padding-block: 0.65rem;
		font-size: 0.85rem;
	}
	@container (min-width: 800px) {
		.cartography-layout {
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
			align-items: center;
		}
	}
</style>
