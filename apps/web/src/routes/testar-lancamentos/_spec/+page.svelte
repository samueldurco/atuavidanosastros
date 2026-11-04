<script lang="ts">
	import Intake from '../[productId]/+page.svelte';
	import Saved from '../preparacoes/[id]/+page.svelte';
	import LaunchReadingReader from '$lib/components/LaunchReadingReader.svelte';
	let { data } = $props();
</script>

<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>
<p class="fixture">Prova local sintética. Não concede acesso nem salva dados.</p>
{#if data.view === 'reader'}
	<p class="fixture">Candidata editorial: {data.readingReview?.status ?? 'ainda indisponível'}.</p>
	{#if data.reader}<LaunchReadingReader reading={data.reader} productId={data.product.id} />{/if}
{:else if data.view === 'saved'}<Saved {data} />{:else}<Intake {data} />{/if}

<style>
	.fixture {
		margin: 0;
		padding: 1rem;
		color: #183746;
		background: #fff4cd;
	}
</style>
