<script lang="ts">
	import Intake from '../[productId]/+page.svelte';
	import Result from '../leituras/[id]/+page.svelte';
	import Club from '../atv-plus/+page.svelte';
	import Catalog from '../../produtos/[slug]/+page.svelte';
	import Index from '../+page.svelte';
	import TrialLibrary from '$lib/components/TrialLibrary.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Prova local dos testes — A Tua Vida nos Astros</title>
</svelte:head>

<p class="fixture">Prova local sintética. Não concede acesso nem salva dados.</p>
{#if data.view === 'catalog'}<Catalog data={{ ...data, ...data.catalog }} />
{:else if data.view === 'index'}<Index data={{ ...data, ...data.index }} />
{:else if data.view === 'library'}<TrialLibrary library={data.library} />
{:else if data.view === 'intake'}<Intake
		data={{ ...data, ...data.intake }}
	/>{:else if data.view === 'club'}<Club data={{ ...data, ...data.club }} />{:else}<Result
		data={{ ...data, ...data.result }}
	/>{/if}

<style>
	.fixture {
		padding: 1rem;
		background: #fff4cd;
		color: #202c2c;
		margin: 0;
	}
</style>
