<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import VisualHeading from '$lib/components/VisualHeading.svelte';
	import V4Artwork from '$lib/components/V4Artwork.svelte';
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
</script>

<section class="section">
	<div class="reading">
		<p class="eyebrow">Conheça a leitura</p>
		<div class="v4-title-group with-object">
			<V4Artwork identity={data.product.id} title eager />
			<VisualHeading title={data.product.name} identity={data.product.id} />
		</div>
		<p class="lead">{data.product.summary}</p>
		<h2>O que a leitura aborda</h2>
		<p>{data.details.scope}</p>
		<h2>O que você precisa informar</h2>
		<p>{data.details.input}</p>
		<h2>Formatos previstos</h2>
		<ul>
			{#each data.product.delivery as format (format)}<li>{formatLabels[format]}</li>{/each}
		</ul>
		{#if data.trialAccess}
			<div class="card trial-status">
				<h2>Teste gratuito disponível</h2>
				<p>Seu acesso está ativo. Gere a leitura, salve o resultado e registre sua avaliação.</p>
				<Button href={`/testar-produtos/${data.product.id}`}
					>Testar {data.product.name} grátis</Button
				>
			</div>
		{:else if data.product.state === 'ACTIVE' && data.product.personalized}
			<Button href={`/biblioteca/nova/${data.product.id}`}>{data.product.action}</Button>
		{:else}
			<div class="card status" role="status">
				<h2>{data.product.state === 'PAUSED' ? 'Disponibilidade' : 'Produto em preparação'}</h2>
				<p>
					{data.product.state === 'PAUSED'
						? 'Esta leitura está temporariamente indisponível.'
						: 'Esta leitura ainda não está disponível. O conteúdo, o preço e os formatos finais serão apresentados quando ela for liberada.'}
				</p>
			</div>
		{/if}
		{#if freeEntry}
			<div class="card free-entry">
				<h2>Comece gratuitamente</h2>
				<p>Conheça um resultado relacionado a esta leitura antes de criar sua conta.</p>
				<Button href={freeEntry.href}>{freeEntry.label}</Button>
			</div>
		{/if}
		<p class="back">
			<a href="/dashboard">Ver minhas leituras</a> · <a href="/metodo">Como fazemos as leituras</a>
		</p>
	</div>
</section>

<style>
	h2 {
		margin-top: 2rem;
	}
	.status,
	.trial-status,
	.free-entry {
		padding: 1.5rem;
		margin-block: 2rem;
	}
	.status h2,
	.trial-status h2,
	.free-entry h2 {
		margin-top: 0;
	}
	.trial-status {
		display: grid;
		gap: 1rem;
	}
	.trial-status p {
		margin: 0;
	}
	.trial-status :global(.button) {
		justify-self: start;
	}
	.back {
		margin-top: 2rem;
	}
</style>
