<script lang="ts">
	import { onMount } from 'svelte';
	import ShopPolicyLinks from '$lib/components/ShopPolicyLinks.svelte';
	import ShopPurchase from '$lib/components/ShopPurchase.svelte';
	let { data } = $props();
	let interactive = $state(false);
	onMount(() => {
		interactive = true;
	});
	let colorIndex = $state(0);
	let imageIndex = $state(0);
	const color = $derived(data.piece.colors[colorIndex] ?? data.piece.colors[0]);
	const image = $derived(color.images[imageIndex] ?? color.images[0]);
	$effect(() => {
		void data.piece.slug;
		colorIndex = 0;
		imageIndex = 0;
	});
</script>

<svelte:head>
	<title>{data.piece.title} — Loja dos Signos</title>
	<meta name="description" content={data.piece.description} />
	<meta name="robots" content="noindex,follow" />
	<link rel="canonical" href={`https://atuavidanosastros.com.br/loja/peca/${data.piece.slug}`} />
</svelte:head>

<div class="container piece-page">
	<nav aria-label="Navegação da loja" class="breadcrumb">
		<a href="/loja">Loja dos Signos</a><span aria-hidden="true">/</span><span
			>{data.piece.title}</span
		>
	</nav>
	<div class="piece-layout">
		<section class="gallery" aria-label={`Imagens de ${data.piece.title}`}>
			<div class="main-image">
				<img
					src={image.src}
					alt={image.alt}
					width={data.piece.imageSize ?? 1200}
					height={data.piece.imageSize ?? 1200}
					fetchpriority="high"
				/>
			</div>
			{#if color.images.length > 1}
				<div class="thumbnails" role="group" aria-label="Escolher vista da peça">
					{#each color.images as photo, index (photo.src)}
						<button
							type="button"
							disabled={!interactive}
							aria-pressed={imageIndex === index}
							onclick={() => (imageIndex = index)}
							><img src={photo.src} alt="" width="120" height="120" /><span>{photo.label}</span
							></button
						>
					{/each}
				</div>
			{/if}
			<p class="image-note">
				Imagens de apresentação geradas pela {data.piece.provider} para a peça na cor {color.name}.
				A tonalidade pode variar conforme a tela e a impressão.
			</p>
		</section>
		<section class="piece-details" aria-labelledby="piece-title">
			<p class="eyebrow">Nova coleção · {data.piece.sign}</p>
			<h1 id="piece-title">{data.piece.title}</h1>
			<p class="description">{data.piece.description}</p>
			<div class="color-choice">
				<p id="color-label">Cor da prévia: <strong>{color.name}</strong></p>
				<div role="group" aria-labelledby="color-label">
					{#each data.piece.colors as option, index (option.name)}
						<button
							type="button"
							disabled={!interactive}
							aria-pressed={colorIndex === index}
							onclick={() => {
								colorIndex = index;
								imageIndex = 0;
							}}>{option.name}</button
						>
					{/each}
				</div>
			</div>
			<ShopPurchase slug={data.piece.slug} enabled={data.shopCommerceEnabled} />
			<dl>
				<div>
					<dt>Modelo da peça</dt>
					<dd>{data.piece.model}</dd>
				</div>
				<div>
					<dt>Material</dt>
					<dd>{data.piece.material}</dd>
				</div>
				<div>
					<dt>{data.piece.construction.label}</dt>
					<dd>{data.piece.construction.value}</dd>
				</div>
				<div>
					<dt>Estampa</dt>
					<dd>{data.piece.printDescription ?? 'Impressão direta no tecido, na frente da peça.'}</dd>
				</div>
				{#if data.piece.subjectKind === 'canonical_pair'}
					<div>
						<dt>Conteúdo da peça</dt>
						<dd>Uma peça com a composição dos dois signos.</dd>
					</div>
				{/if}
			</dl>
			<ShopPolicyLinks />
			<a class="button secondary" href="/loja"
				>Explorar a coleção <span aria-hidden="true">↗</span></a
			>
		</section>
	</div>
</div>

<style>
	.piece-page {
		padding-block: 2rem clamp(3rem, 6vw, 6rem);
	}
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		font-size: 0.85rem;
		margin-bottom: 2rem;
	}
	.breadcrumb a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.breadcrumb > span {
		align-self: center;
	}
	.piece-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: clamp(1.5rem, 5vw, 4rem);
		align-items: start;
	}
	.main-image {
		background: #fff;
		border: 1px solid var(--atv-border);
	}
	.main-image img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: contain;
	}
	.thumbnails {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.thumbnails button {
		flex: 0 1 112px;
		min-width: 0;
		width: 112px;
		padding: 0.3rem;
		background: transparent;
		color: inherit;
		border: 1px solid var(--atv-border);
		cursor: pointer;
		font: inherit;
		font-size: 0.75rem;
	}
	.thumbnails button[aria-pressed='true'] {
		outline: 2px solid #183746;
		outline-offset: 2px;
	}
	.thumbnails img {
		display: block;
		width: 100%;
		height: auto;
	}
	.thumbnails span {
		display: block;
		padding: 0.4rem 0;
	}
	.image-note {
		font-size: 0.8rem;
		line-height: 1.6;
	}
	.piece-details .eyebrow {
		margin-top: 0;
	}
	h1 {
		font: 500 clamp(2.4rem, 4.5vw, 4rem)/1.05 var(--atv-font-display);
		margin: 0 0 1.5rem;
		letter-spacing: -0.03em;
	}
	.description {
		font: 400 1.15rem/1.65 var(--atv-font-editorial);
	}
	.color-choice {
		margin-block: 1.5rem;
	}
	.color-choice p {
		font-size: 0.9rem;
	}
	.color-choice > div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.color-choice button {
		min-height: 44px;
		padding: 0.65rem 1rem;
		background: transparent;
		color: inherit;
		border: 1px solid var(--atv-border);
		font: inherit;
		cursor: pointer;
	}
	.color-choice button[aria-pressed='true'] {
		border: 2px solid #183746;
		padding: calc(0.65rem - 1px) calc(1rem - 1px);
		background: #d5d9c6;
	}
	dl {
		margin-bottom: 2rem;
	}
	dl > div {
		display: grid;
		grid-template-columns: 1fr 1.8fr;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--atv-border);
		font-size: 0.9rem;
		line-height: 1.6;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
	}
	@media (max-width: 760px) {
		.piece-layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.piece-details {
			padding-top: 1rem;
		}
	}
</style>
