<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import MvpProductArt from '$lib/components/MvpProductArt.svelte';
	import { mvpProductDesign, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	import { formatLabels } from '$lib/data/product-details';
	import { productLandingFor } from '$lib/data/product-landing';
	let { data } = $props();
	const freeEntryByProduct: Record<string, { href: string; label: string }> = {
		ascendant: { href: '/ferramentas/ascendente', label: 'Calcular meu Ascendente grátis' },
		'three-pillars': {
			href: '/ferramentas/ascendente',
			label: 'Calcular meu Ascendente grátis'
		},
		'birth-chart': { href: '/ferramentas/mapa-astral', label: 'Ver o preview gratuito do mapa' },
		'life-atlas': {
			href: '/ferramentas/mapa-astral',
			label: 'Começar pelo preview gratuito do mapa'
		},
		horoscope: { href: '/ferramentas/horoscopo', label: 'Explorar o horóscopo gratuito' },
		'date-reading': { href: '/ferramentas/horoscopo', label: 'Explorar o horóscopo gratuito' },
		'pair-preview': {
			href: '/ferramentas/combinacao-do-casal',
			label: 'Ver a combinação gratuita do casal'
		},
		synastry: {
			href: '/ferramentas/combinacao-do-casal',
			label: 'Ver a combinação gratuita do casal'
		},
		'couple-dossier': {
			href: '/ferramentas/combinacao-do-casal',
			label: 'Começar pela combinação gratuita'
		},
		'career-compass': { href: '/bussola-de-carreira', label: 'Calcular meu Meio do Céu grátis' },
		'purpose-career': {
			href: '/ferramentas/dinheiro-no-mapa',
			label: 'Explorar dinheiro no meu mapa grátis'
		},
		'career-forecast-30d': {
			href: '/ferramentas/dinheiro-no-mapa',
			label: 'Explorar dinheiro no meu mapa grátis'
		},
		'tarot-aphrodite-temple': {
			href: '/ferramentas/carta-do-amor',
			label: 'Tirar minha Carta do Amor grátis'
		},
		'tarot-single-card': {
			href: '/ferramentas/carta-do-dia',
			label: 'Começar com a Carta do Dia grátis'
		},
		'dream-reading': {
			href: '/ferramentas/registro-de-sonho',
			label: 'Registrar meu sonho grátis'
		},
		'dream-journal': {
			href: '/ferramentas/registro-de-sonho',
			label: 'Registrar meu sonho grátis'
		},
		'dream-dossier': {
			href: '/ferramentas/registro-de-sonho',
			label: 'Registrar meu sonho grátis'
		},
		'dream-atlas': { href: '/ferramentas/registro-de-sonho', label: 'Registrar meu sonho grátis' }
	};
	const freeEntryByUniverse: Record<string, { href: string; label: string }> = {
		'meu-ceu': { href: '/ferramentas/mapa-astral', label: 'Ver o preview gratuito do mapa' },
		'ciclos-tempo': { href: '/ferramentas/horoscopo', label: 'Explorar o horóscopo gratuito' },
		'amor-relacoes': {
			href: '/ferramentas/combinacao-do-casal',
			label: 'Ver a combinação gratuita do casal'
		},
		'proposito-prosperidade': {
			href: '/bussola-de-carreira',
			label: 'Calcular meu Meio do Céu grátis'
		},
		'tarot-arcanos': {
			href: '/ferramentas/carta-do-dia',
			label: 'Tirar minha Carta do Dia grátis'
		},
		'sonhos-simbolos': {
			href: '/ferramentas/registro-de-sonho',
			label: 'Registrar meu sonho grátis'
		}
	};
	const freeEntry = $derived(
		freeEntryByProduct[data.product.id] ?? freeEntryByUniverse[data.product.universe]
	);

	const design = $derived(mvpProductDesign(data.product.id));
	const theme = $derived(design?.theme ?? mvpTheme(data.product.universe));
	const colors = $derived(design ?? mvpThemes[theme]);
	const productJourneys: Record<
		string,
		{
			intro: string;
			free: { title: string; description: string; href: string; action: string };
			related: { title: string; description: string; href: string; action: string };
		}
	> = {
		'purpose-career': {
			intro:
				'A ferramenta gratuita mostra um recorte do mapa. Esta leitura propõe olhar para recursos, trabalho e carreira a partir do nascimento. Para perguntas sobre os próximos 30 dias, há uma leitura de período distinta.',
			free: {
				title: 'Dinheiro no Seu Mapa Astral',
				description:
					'Um primeiro contato gratuito com elementos do seu mapa ligados a recursos e dinheiro.',
				href: '/ferramentas/dinheiro-no-mapa',
				action: 'Explorar a ferramenta'
			},
			related: {
				title: 'Previsões de Dinheiro e Carreira — Próximos 30 Dias',
				description: 'Outra proposta, voltada a um período específico em vez da leitura natal.',
				href: '/produtos/previsoes-dinheiro-carreira-30-dias',
				action: 'Conhecer a proposta'
			}
		}
	};
	const journey = $derived(productJourneys[data.product.id]);
	const landing = $derived(productLandingFor(data.product.id));
	const hasSpecificCopy = $derived(Boolean(journey || landing));
</script>

<div class="mvp-public">
	<div
		class="product-offer-page theme-{theme} product-layout-{design?.layout ?? 'sheet'}"
		style:--product-ink={colors.ink}
		style:--product-accent={colors.accent}
		style:--product-tint={colors.tint}
	>
		<section class="product-offer-hero">
			<div class="wrap product-offer-hero-inner">
				<div class="product-offer-copy">
					<a class="back-link" href="/leituras"
						>Todas as leituras <span aria-hidden="true">↗</span></a
					>
					<p class="eyebrow">
						{journey
							? 'Dinheiro e carreira · Mapa natal'
							: (landing?.eyebrow ?? 'Conheça a leitura')}
					</p>
					{#if design}<p class="product-offer-caption">{design.caption}</p>{/if}
					<h1>{data.product.name}</h1>
					<p class="lead">{data.product.summary}</p>
					<div class="product-offer-actions">
						<a
							class="button product-primary"
							href={hasSpecificCopy ? '#conteudo' : '#disponibilidade'}
							>{hasSpecificCopy ? 'Conhecer a proposta' : 'Ver disponibilidade'}
							<span aria-hidden="true">↗</span></a
						><a class="text-link" href={hasSpecificCopy ? '#disponibilidade' : '#conteudo'}
							>{hasSpecificCopy ? 'Ver disponibilidade' : 'Conhecer o conteúdo'}</a
						>
						{#if hasSpecificCopy && data.product.state === 'PREPARING' && !data.trialAccess}<span
								class="badge">Em preparação</span
							>{/if}
					</div>
				</div>
				<div class="product-offer-art">
					<MvpProductArt productId={data.product.id} mode="hero" />
				</div>
			</div>
		</section>
		<div class="wrap section product-offer-details" id="conteudo">
			<div class="product-explanation">
				<section>
					<p class="eyebrow">O conteúdo</p>
					<h2>O que a leitura aborda</h2>
					<p>{data.details.scope}</p>
				</section>
				<section>
					<p class="eyebrow">Para começar</p>
					<h2>O que você precisa informar</h2>
					<p>{data.details.input}</p>
				</section>
				<section>
					<p class="eyebrow">A entrega</p>
					<h2>Formatos previstos</h2>
					<ul class="product-formats">
						{#each data.product.delivery as format (format)}<li>{formatLabels[format]}</li>{/each}
					</ul>
				</section>
			</div>
			<aside
				class="product-availability"
				id="disponibilidade"
				aria-label="Disponibilidade e acesso"
			>
				{#if data.trialAccess}
					<div class="trial-status">
						<h2>Teste gratuito disponível</h2>
						<p>
							Seu acesso está ativo. Gere a leitura, salve o resultado e registre sua avaliação.
						</p>
						<Button href={'/testar-produtos/' + data.product.id}
							>Testar {data.product.name} grátis</Button
						>
					</div>
				{:else if data.product.state === 'ACTIVE' && data.product.personalized}
					<h2>Comece sua leitura</h2>
					<Button href={'/biblioteca/nova/' + data.product.id}>{data.product.action}</Button>
				{:else}
					<div class="availability-state" role="status">
						<h2>{data.product.state === 'PAUSED' ? 'Disponibilidade' : 'Produto em preparação'}</h2>
						<p>
							{data.product.state === 'PAUSED'
								? 'Esta leitura está temporariamente indisponível.'
								: 'Esta leitura ainda não está disponível. O conteúdo, o preço e os formatos finais serão apresentados quando ela for liberada.'}
						</p>
					</div>
				{/if}
				{#if freeEntry}<div class="free-entry">
						<h3>Comece gratuitamente</h3>
						<p>Explore uma ferramenta gratuita relacionada a esta leitura.</p>
						<Button href={freeEntry.href}>{freeEntry.label}</Button>
					</div>{/if}
				<p class="back">
					<a href="/dashboard">Ver minhas leituras</a> ·
					<a href="/metodo">Como fazemos as leituras</a>
				</p>
			</aside>
		</div>
		{#if landing}
			<section class="wrap section product-story" id="enfoque" aria-labelledby="story-title">
				<div class="product-story-heading">
					<p class="eyebrow">O recorte desta leitura</p>
					<h2 id="story-title">{landing.question}</h2>
				</div>
				<div class="product-story-body">
					<div class="product-story-panel">
						<p class="product-story-index">01 / A proposta</p>
						<p>{landing.focus}</p>
					</div>
					<div class="product-story-panel">
						<p class="product-story-index">02 / Para escolher com clareza</p>
						<p>{landing.distinction}</p>
					</div>
				</div>
			</section>
		{/if}
		{#if journey}
			<section class="wrap section product-journey" id="caminhos" aria-labelledby="journey-title">
				<div class="product-journey-intro">
					<p class="eyebrow">Escolha por sua pergunta</p>
					<h2 id="journey-title">Três formas de explorar o mesmo tema</h2>
					<p>{journey.intro}</p>
				</div>
				<div class="product-journey-grid">
					<article class="product-journey-card">
						<p class="product-journey-index">01 / Comece gratuitamente</p>
						<h3>{journey.free.title}</h3>
						<p>{journey.free.description}</p>
						<a class="text-link" href={journey.free.href}
							>{journey.free.action} <span aria-hidden="true">↗</span></a
						>
					</article>
					<article class="product-journey-card product-journey-card-current">
						<p class="product-journey-index">02 / Leitura do mapa natal</p>
						<h3>{data.product.name}</h3>
						<p>{data.details.scope}</p>
						<a class="text-link" href="#disponibilidade"
							>Consultar acesso à leitura <span aria-hidden="true">↗</span></a
						>
					</article>
					<article class="product-journey-card">
						<p class="product-journey-index">03 / Olhe para um período</p>
						<h3>{journey.related.title}</h3>
						<p>{journey.related.description}</p>
						<a class="text-link" href={journey.related.href}
							>{journey.related.action} <span aria-hidden="true">↗</span></a
						>
					</article>
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.product-offer-details {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
	}
	.product-explanation,
	.product-availability {
		min-width: 0;
	}
	.product-explanation > section {
		margin-bottom: 2.75rem;
	}
	.product-explanation > section:last-child {
		margin-bottom: 0;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
		font-size: 0.8rem;
		margin-bottom: 1.25rem;
	}
	.product-availability h2 {
		font-size: 1.75rem;
		margin-top: 0;
	}
	.free-entry {
		margin-top: 2rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--atv-border);
	}
	.free-entry h3 {
		font-size: 1.5rem;
	}
	.back {
		margin: 2rem 0 0;
		font-size: 0.85rem;
	}
	.back a {
		display: inline-block;
		padding-block: 0.65rem;
	}
	#disponibilidade,
	#conteudo,
	#enfoque,
	#caminhos {
		scroll-margin-top: 2rem;
	}
	.product-story {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		gap: clamp(2rem, 5vw, 6rem);
		padding-top: 0;
	}
	.product-story-heading h2 {
		font-size: clamp(2rem, 3.2vw, 3.4rem);
		line-height: 1.12;
		margin: 0.8rem 0 0;
	}
	.product-story-body {
		border-top: 1px solid color-mix(in srgb, var(--product-ink) 27%, transparent);
	}
	.product-story-panel {
		padding: 1.5rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--product-ink) 27%, transparent);
	}
	.product-story-panel p:last-child {
		font-size: 1.05rem;
		line-height: 1.65;
		margin: 0;
	}
	.product-story-index {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--product-ink);
		margin: 0 0 0.7rem;
	}
	.product-journey {
		padding-top: 0;
	}
	.product-journey-intro {
		max-width: 72ch;
		margin-bottom: 2rem;
	}
	.product-journey-intro h2 {
		font-size: clamp(2rem, 3vw, 3rem);
		margin: 0 0 0.75rem;
	}
	.product-journey-intro > p:last-child {
		font-size: 1.05rem;
		line-height: 1.65;
	}
	.product-journey-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}
	.product-journey-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 1.75rem;
		border: 1px solid color-mix(in srgb, var(--product-ink) 19%, transparent);
		background: #faf4e9;
	}
	.product-journey-card-current {
		border-top: 4px solid var(--product-accent);
		padding-top: calc(1.75rem - 3px);
		background: var(--product-tint);
	}
	.product-journey-index {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--product-ink);
	}
	.product-journey-card h3 {
		font-size: 1.6rem;
		line-height: 1.18;
		margin: 0.75rem 0;
	}
	.product-journey-card > p:not(.product-journey-index) {
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}
	.product-journey-card .text-link {
		align-self: flex-start;
		margin-top: auto;
	}
	@media (max-width: 800px) {
		.product-offer-details {
			grid-template-columns: minmax(0, 1fr);
		}
		.product-story {
			grid-template-columns: minmax(0, 1fr);
		}
		.product-journey-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
