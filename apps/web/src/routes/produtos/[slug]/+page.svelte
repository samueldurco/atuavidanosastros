<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import MvpProductArt from '$lib/components/MvpProductArt.svelte';
	import { mvpProductDesign, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	import { formatLabels } from '$lib/data/product-details';
	let { data } = $props();
	const freeEntryByProduct: Record<string, { href: string; label: string }> = {
		ascendant: { href: '/ferramentas/ascendente', label: 'Calcular meu Ascendente grátis' },
		'three-pillars': {
			href: '/ferramentas/mapa-astral',
			label: 'Ver Sol, Lua e Ascendente grátis'
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
					<p class="eyebrow">Conheça a leitura</p>
					{#if design}<p class="product-offer-caption">{design.caption}</p>{/if}
					<h1>{data.product.name}</h1>
					<p class="lead">{data.product.summary}</p>
					<div class="product-offer-actions">
						<a class="button product-primary" href="#disponibilidade"
							>Ver disponibilidade <span aria-hidden="true">↗</span></a
						><a class="text-link" href="#conteudo">Conhecer o conteúdo</a>
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
						<p>Conheça um resultado relacionado a esta leitura antes de criar sua conta.</p>
						<Button href={freeEntry.href}>{freeEntry.label}</Button>
					</div>{/if}
				<p class="back">
					<a href="/dashboard">Ver minhas leituras</a> ·
					<a href="/metodo">Como fazemos as leituras</a>
				</p>
			</aside>
		</div>
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
	#conteudo {
		scroll-margin-top: 2rem;
	}
	@media (max-width: 800px) {
		.product-offer-details {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
