<script lang="ts">
	import Intake from '../[productId]/+page.svelte';
	import Result from '../leituras/[id]/+page.svelte';
	import Club from '../atv-plus/+page.svelte';
	let { data } = $props();
</script>

<p class="fixture">Prova local sintética. Não concede acesso nem salva dados.</p>
{#if data.view === 'intake'}<Intake
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
