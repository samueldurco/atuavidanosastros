<script lang="ts">
	import { productCatalog } from '@atv/domain';
	import type { TrialLibraryData } from '$lib/trials/library';
	import { experienceFor } from '$lib/trials/experience';
	import { CONTENT_VERSION } from '$lib/trials/versions';
	import { editorialTopicPaths } from '$lib/data/editorial-topics';
	import Button from './ui/Button.svelte';
	import MvpProductArt from './MvpProductArt.svelte';
	import '$lib/styles/mvp-private.css';
	let { library }: { library: TrialLibraryData } = $props();
	const topics: Record<string, string> = {
		'meu-ceu': 'meu-ceu',
		'ciclos-tempo': 'ciclos',
		'amor-relacoes': 'amor',
		'tarot-arcanos': 'tarot',
		'proposito-prosperidade': 'proposito',
		'sonhos-simbolos': 'sonhos'
	};
</script>

<section
	class="card trials mvp-private"
	data-mvp-private="trials"
	aria-labelledby="free-trials-heading"
>
	<p class="eyebrow">Seu acesso gratuito está ativo</p>
	<h2 id="free-trials-heading">Suas leituras de teste</h2>
	<p>
		Reabra suas leituras e escolha a próxima oferta para avaliar. Seu acesso de teste é independente
		dos planos do ATV+.
	</p>
	<div class="actions">
		<Button href="/testar-produtos">Escolher produto para testar</Button>
		<Button href="/atv-mais" variant="secondary">Conhecer os planos do ATV+</Button>
		<Button href="/testar-produtos/atv-plus" variant="secondary">Leituras e anotações</Button>
	</div>
	{#if library.unavailable}
		<p role="alert">
			Não foi possível recuperar suas leituras de teste agora. Recarregue a página para tentar
			novamente.
		</p>
	{:else if !library.readings.length}
		<p>Depois de gerar uma leitura, ela aparecerá aqui para você reabrir e avaliar.</p>
	{:else}
		<div class="editions">
			{#each library.readings as reading (reading.id)}
				{@const product = productCatalog.find((p) => p.id === reading.product_id)}
				{@const experience = experienceFor(reading.product_id)}
				{@const topicPath = product && editorialTopicPaths[topics[product.universe]]?.[0]}
				<article class="edition">
					<a class="cover" href={`/testar-produtos/leituras/${reading.id}`}>
						<div class="edition-art" aria-hidden="true">
							<MvpProductArt productId={reading.product_id} />
						</div>
						<span class="eyebrow">A Tua Vida nos Astros</span>
						<h3>{product?.name ?? reading.product_id}</h3>
						<span
							>{new Date(reading.created_at).toLocaleDateString('pt-BR', {
								timeZone: 'America/Sao_Paulo'
							})}</span
						>
					</a>
					<p>{experience.benefit}</p>
					{#if reading.version && reading.version !== CONTENT_VERSION}<p class="previous">
							Edição anterior preservada. Você pode gerar uma nova edição com seus dados.
						</p>{/if}
					<div class="edition-actions">
						<a href={`/testar-produtos/leituras/${reading.id}`}>Continuar leitura</a>
						{#if experience.pdf}<a href={`/testar-produtos/leituras/${reading.id}/baixar`}
								>Baixar PDF</a
							>{/if}
						<a href={`/testar-produtos/${reading.product_id}?from=${reading.id}`}
							>Corrigir dados · nova edição</a
						>
						{#if topicPath}<a href={topicPath}>Aprofundar este tema</a>{/if}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>

<style>
	.trials {
		padding: clamp(1.25rem, 3vw, 2rem);
		margin-block: 1.5rem 2rem;
	}
	h2 {
		font: 500 clamp(1.5rem, 2.5vw, 2rem)/1.2 var(--atv-font-display);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.editions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
		gap: 1.5rem;
		margin-top: 2rem;
	}
	.edition {
		min-width: 0;
		border: 1px solid #ded5c7;
		border-radius: 0.75rem;
		overflow: hidden;
		background: #fffdf9;
	}
	.cover {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 14rem;
		padding: 1.5rem;
		background: #172e40;
		color: #fff8e8;
		text-align: center;
		text-decoration: none;
	}
	.cover .eyebrow {
		color: #dcc695;
	}
	h3 {
		font: 500 1.6rem/1.25 var(--atv-font-display);
		margin: 0;
	}
	.edition p,
	.edition-actions {
		margin: 1.25rem;
	}
	.previous {
		font-size: 0.9rem;
	}
	.edition-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}
	.edition-actions a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
</style>
