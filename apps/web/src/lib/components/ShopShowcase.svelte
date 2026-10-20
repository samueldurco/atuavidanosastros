<script lang="ts">
	let { showLink = true, headingLevel = 'h2' }: { showLink?: boolean; headingLevel?: 'h1' | 'h2' } =
		$props();
	const pieces = [
		{
			id: 'P04-CICLO-A001',
			title: 'Percurso dos doze',
			image: '/brand/shop/p04/percurso-dos-doze.png',
			description: 'Os doze signos reunidos em uma composição para a parede.',
			alt: 'Prévia da arte Percurso dos doze: símbolos dos doze signos ligados por um percurso sobre fundo claro.'
		},
		{
			id: 'P04-CICLO-A003',
			title: 'Ciclo lunar',
			image: '/brand/shop/p04/ciclo-lunar.png',
			description: 'Uma composição inspirada nas fases da Lua e no zodíaco.',
			alt: 'Prévia da arte Ciclo lunar: fases da Lua na parte superior e símbolos dos doze signos abaixo.'
		}
	];
</script>

<section class="shop-showcase" aria-labelledby="shop-showcase-title">
	<div class="shop-heading">
		<div>
			<p class="eyebrow">Produtos físicos · coleção em preparação</p>
			<svelte:element this={headingLevel} id="shop-showcase-title">Loja dos Signos</svelte:element>
		</div>
		<p>
			Produtos físicos inspirados na astrologia para o seu espaço. Conheça as primeiras artes da
			nossa coleção de pôsteres.
		</p>
	</div>
	<div class="shop-pieces">
		{#each pieces as piece (piece.id)}
			<figure>
				<div class="art-proof">
					<img src={piece.image} alt={piece.alt} width="600" height="800" loading="lazy" />
				</div>
				<figcaption>
					<p class="eyebrow">Prévia de pôster</p>
					<svelte:element this={headingLevel === 'h1' ? 'h2' : 'h3'}>{piece.title}</svelte:element>
					<p>{piece.description}</p>
				</figcaption>
			</figure>
		{/each}
	</div>
	<div class="shop-end">
		<p>Estas são prévias das artes. A coleção ainda não está à venda.</p>
		{#if showLink}<a class="button secondary" href="/loja"
				>Conhecer os produtos físicos <span aria-hidden="true">↗</span></a
			>{:else}<a class="button secondary" href="/fale-conosco?assunto=loja"
				>Falar sobre a coleção <span aria-hidden="true">↗</span></a
			>{/if}
	</div>
</section>

<style>
	.shop-showcase {
		padding-block: clamp(2rem, 5vw, 4rem);
	}
	.shop-heading {
		display: grid;
		grid-template-columns: 1fr 0.85fr;
		gap: 2rem;
		align-items: end;
		margin-bottom: 2rem;
	}
	.shop-heading :is(h1, h2) {
		font: 500 clamp(2.6rem, 6vw, 5.5rem)/0.98 var(--atv-font-display);
		margin: 0;
		letter-spacing: -0.04em;
	}
	.shop-heading > p {
		max-width: 34rem;
		font: 400 1.2rem/1.6 var(--atv-font-editorial);
		margin: 0;
	}
	.shop-pieces {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(1rem, 3vw, 3rem);
	}
	figure {
		margin: 0;
		min-width: 0;
	}
	.art-proof {
		padding: clamp(1rem, 3vw, 2.5rem);
		background: #ddd7c8;
	}
	.art-proof img {
		display: block;
		width: 100%;
		max-width: 350px;
		height: auto;
		margin-inline: auto;
		box-shadow: 0 7px 18px #173b4020;
	}
	figcaption {
		padding: 1.3rem 0;
	}
	figcaption .eyebrow {
		margin: 0 0 0.5rem;
	}
	figcaption :is(h2, h3) {
		font: 500 clamp(1.5rem, 3vw, 2rem)/1.15 var(--atv-font-display);
		margin: 0;
	}
	figcaption > p:last-child {
		max-width: 33rem;
		margin-bottom: 0;
	}
	.shop-end {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--atv-border);
	}
	.shop-end p {
		max-width: 30rem;
		font-size: 0.95rem;
	}
	@media (max-width: 650px) {
		.shop-heading {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.shop-pieces {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.shop-end {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.5rem;
		}
		.art-proof img {
			max-width: 280px;
		}
	}
</style>
