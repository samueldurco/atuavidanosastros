<script lang="ts">
	import { shopPreviews } from '$lib/data/shop-products';

	let {
		toolActive = false
	}: {
		toolActive?: boolean;
	} = $props();

	const scenes = [
		{
			id: 'wear',
			category: 'Roupas · no corpo',
			title: 'Seu signo, no seu ritmo.',
			copy: 'Aquarelas e símbolos encontram o caimento do algodão, entre o cropped e a camiseta ampla.',
			alt: 'Cena ilustrativa de duas pessoas em um ateliê: Cropped Aries e Camiseta Oversized Taurus em algodão claro, com suas estampas zodiacais.',
			products: ['cropped-aries', 'camiseta-oversized-taurus']
		},
		{
			id: 'mugs',
			category: 'Canecas · à mesa',
			title: 'Uma pausa com seu signo.',
			copy: 'O desenho de Aries acompanha os pequenos rituais: uma mesa, uma conversa, um tempo para você.',
			alt: 'Cena ilustrativa de uma mesa junto à janela, com a Caneca Aries branca em destaque e sua estampa de carneiro vermelho.',
			products: ['caneca-aries']
		},
		{
			id: 'carry',
			category: 'Acessórios · pelo caminho',
			title: 'Para levar consigo.',
			copy: 'Ecobags e garrafas dão outra presença à arte da coleção, nos objetos que seguem com você.',
			alt: 'Cena ilustrativa de uma pessoa com a Ecobag Taurus de algodão cru, ao lado da Garrafa Aries branca em um banco de jardim.',
			products: ['ecobag-taurus', 'garrafa-aries']
		},
		{
			id: 'space',
			category: 'Decoração e papelaria · em casa',
			title: 'Um espaço que diz de você.',
			copy: 'No papel e nos cantos da casa, os símbolos ganham tempo para ser vistos e sentidos.',
			alt: 'Cena ilustrativa de uma mesa de madeira, com o Pôster Virgo sem moldura e o Caderno Aries de espiral, preservando as artes da coleção.',
			products: ['poster-virgem', 'caderno-aries']
		}
	].map((scene) => ({
		...scene,
		image: `/brand/home-v2/shop-${scene.id}.webp`,
		pieces: scene.products.flatMap((slug) => {
			const product = shopPreviews.find((item) => item.slug === slug);
			return product ? [{ title: product.title, href: `/loja/peca/${product.slug}` }] : [];
		})
	}));

	let track: HTMLDivElement;
	let active = $state(0);

	function syncActive() {
		if (!track) return;
		const slides = track.querySelectorAll<HTMLElement>('.shop-scene');
		const step = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : 0;
		if (step)
			active = Math.min(scenes.length - 1, Math.max(0, Math.round(track.scrollLeft / step)));
	}

	function showScene(index: number) {
		const slide = track?.querySelectorAll<HTMLElement>('.shop-scene')[index];
		if (!slide) return;
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		track.scrollTo({
			left: slide.offsetLeft,
			behavior: reduceMotion || toolActive ? 'instant' : 'smooth'
		});
	}
</script>

<section
	class="shop-editorial"
	aria-label="A coleção no cotidiano"
	aria-roledescription="carrossel"
>
	<div class="shop-navigation">
		<p class="shop-intro">Quatro encontros com a coleção</p>
		<div class="shop-controls">
			<p class="shop-counter" aria-live="polite" aria-atomic="true">
				<span class="sr-only">Cena </span>{String(active + 1).padStart(2, '0')}<span
					aria-hidden="true"
				>
					/
				</span><span class="sr-only"> de </span>04
			</p>
			<button
				type="button"
				aria-label="Ver cena anterior da loja"
				disabled={active === 0}
				onclick={() => showScene(active - 1)}
			>
				<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"
					><path d="M19 12H5m6-6-6 6 6 6" /></svg
				>
			</button>
			<button
				type="button"
				aria-label="Ver próxima cena da loja"
				disabled={active === scenes.length - 1}
				onclick={() => showScene(active + 1)}
			>
				<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"
					><path d="M5 12h14m-6-6 6 6-6 6" /></svg
				>
			</button>
		</div>
	</div>
	<div class="shop-track" bind:this={track} onscroll={syncActive}>
		{#each scenes as scene, index (scene.id)}
			<article
				class="shop-scene"
				aria-roledescription="slide"
				aria-label={`${index + 1} de ${scenes.length}: ${scene.category}`}
			>
				<div class="scene-image">
					<img src={scene.image} alt={scene.alt} width="1536" height="1024" loading="lazy" />
				</div>
				<div class="scene-copy">
					<div class="scene-heading">
						<p class="eyebrow">{scene.category}</p>
						<h3>{scene.title}</h3>
					</div>
					<div class="scene-detail">
						<p class="scene-description">{scene.copy}</p>
						<div class="scene-pieces">
							{#each scene.pieces as piece (piece.href)}
								<a href={piece.href}>{piece.title}<span aria-hidden="true">↗</span></a>
							{/each}
						</div>
					</div>
				</div>
			</article>
		{/each}
	</div>
	<div class="shop-bottom">
		<div class="scene-selectors" role="group" aria-label="Escolher cena da coleção">
			{#each scenes as scene, index (scene.id)}
				<button
					type="button"
					aria-label={`Ver ${scene.category.toLowerCase()}`}
					aria-current={active === index ? 'true' : undefined}
					onclick={() => showScene(index)}><span></span></button
				>
			{/each}
		</div>
		<a class="shop-all" href="/loja">Explorar a Loja dos Signos <span aria-hidden="true">↗</span></a
		>
	</div>
	<p class="shop-note">
		Cenas ilustrativas com as artes da coleção. Consulte os materiais, formatos e detalhes na página
		de cada peça.
	</p>
</section>

<style>
	.shop-editorial {
		color: #183746;
		min-width: 0;
	}
	.shop-navigation,
	.shop-controls,
	.shop-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.shop-navigation {
		margin-bottom: 1rem;
	}
	.shop-intro {
		margin: 0;
		font: 400 0.85rem/1.5 var(--atv-font-ui, 'Onest', sans-serif);
		color: #596365;
	}
	.shop-controls {
		justify-content: flex-end;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	.shop-counter {
		margin: 0 0.65rem 0 0;
		font: 400 0.75rem/1.5 var(--atv-font-ui, 'Onest', sans-serif);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.08em;
	}
	.shop-controls button {
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		padding: 0;
		border: 1px solid #acafa2;
		border-radius: 50%;
		color: inherit;
		background: transparent;
		cursor: pointer;
	}
	.shop-controls button:hover:not(:disabled) {
		background: #183746;
		border-color: #183746;
		color: #fffdf7;
	}
	.shop-controls button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.shop-controls svg {
		width: 21px;
		height: 21px;
		stroke: currentColor;
		stroke-width: 1.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.shop-track {
		position: relative;
		display: flex;
		gap: clamp(1rem, 2.5vw, 2rem);
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		padding-bottom: 1px;
	}
	.shop-track::-webkit-scrollbar {
		display: none;
	}
	.shop-track::after {
		content: '';
		flex: 0 0 calc(16% - clamp(1rem, 2.5vw, 2rem));
	}
	.shop-scene {
		flex: 0 0 84%;
		min-width: 0;
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}
	.scene-image {
		aspect-ratio: 3 / 2;
		overflow: hidden;
		background: #e9e2d2;
	}
	.scene-image img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.scene-copy {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1.5rem;
		padding: 1.5rem 0 0;
	}
	.eyebrow {
		margin: 0 0 0.65rem;
		font: 500 0.68rem/1.5 var(--atv-font-ui, 'Onest', sans-serif);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h3 {
		margin: 0;
		max-width: 18ch;
		font: 400 clamp(1.9rem, 3.4vw, 3rem)/1.08 var(--atv-font-display, 'Newsreader', serif);
		text-wrap: balance;
	}
	.scene-description {
		margin: 0;
		max-width: 42ch;
		font: 400 0.9rem/1.65 var(--atv-font-ui, 'Onest', sans-serif);
		color: #4c5d5c;
	}
	.scene-pieces {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.25rem;
		margin-top: 0.65rem;
	}
	.scene-pieces a,
	.shop-all {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 44px;
		color: inherit;
		font: 500 0.8rem/1.5 var(--atv-font-ui, 'Onest', sans-serif);
		text-underline-offset: 0.3em;
	}
	.shop-bottom {
		border-top: 1px solid #c7bfac;
		margin-top: 1.75rem;
		padding-top: 0.55rem;
	}
	.scene-selectors {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}
	.scene-selectors button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		background: transparent;
		border: 0;
		cursor: pointer;
	}
	.scene-selectors span {
		width: 24px;
		height: 2px;
		background: #b4b7aa;
	}
	.scene-selectors button[aria-current='true'] span {
		background: #183746;
		height: 3px;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #183746;
		outline-offset: 4px;
	}
	.shop-note {
		margin: 0.35rem 0 0;
		color: #66706a;
		font: 400 0.7rem/1.6 var(--atv-font-ui, 'Onest', sans-serif);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	@media (max-width: 700px) {
		.shop-navigation {
			gap: 0.5rem;
		}
		.shop-intro {
			max-width: 17ch;
			font-size: 0.75rem;
		}
		.shop-controls button {
			width: 44px;
			height: 44px;
		}
		.shop-counter {
			margin-right: 0.3rem;
		}
		.shop-scene {
			flex-basis: 90%;
		}
		.shop-track::after {
			flex-basis: calc(10% - 1rem);
		}
		.scene-copy {
			grid-template-columns: 1fr;
			gap: 0.85rem;
			padding-top: 1.15rem;
		}
		h3 {
			font-size: clamp(1.7rem, 7vw, 2.2rem);
			max-width: none;
		}
		.scene-description {
			font-size: 0.83rem;
		}
		.eyebrow {
			font-size: 0.6rem;
		}
		.shop-bottom {
			flex-wrap: wrap;
			gap: 0 1rem;
			margin-top: 1.25rem;
		}
		.scene-selectors {
			gap: 0;
		}
		.scene-selectors button {
			width: 36px;
		}
		.shop-all {
			font-size: 0.75rem;
		}
	}
</style>
