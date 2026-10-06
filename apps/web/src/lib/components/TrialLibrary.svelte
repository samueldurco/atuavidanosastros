<script lang="ts">
	import { productCatalog } from '@atv/domain';
	import type { TrialLibraryData } from '$lib/trials/library';
	import Button from './ui/Button.svelte';
	let { library }: { library: TrialLibraryData } = $props();
</script>

<section class="card trials" aria-labelledby="free-trials-heading">
	<p class="eyebrow">Seu acesso gratuito está ativo</p>
	<h2 id="free-trials-heading">Suas leituras de teste</h2>
	<p>Os 25 produtos e o ATV+ estão disponíveis para você testar e avaliar.</p>
	<div class="actions">
		<Button href="/testar-produtos">Escolher produto para testar</Button>
		<Button href="/testar-produtos/atv-plus" variant="secondary">Entrar no ATV+ gratuito</Button>
	</div>
	{#if library.unavailable}
		<p role="alert">
			Não foi possível recuperar suas leituras de teste agora. Recarregue a página para tentar
			novamente.
		</p>
	{:else if !library.readings.length}
		<p>Depois de gerar uma leitura, ela aparecerá aqui para você reabrir e avaliar.</p>
	{:else}
		<ul>
			{#each library.readings as reading (reading.id)}
				<li>
					<a href={`/testar-produtos/leituras/${reading.id}`}
						>{productCatalog.find((product) => product.id === reading.product_id)?.name ??
							reading.product_id}</a
					>
					— {new Date(reading.created_at).toLocaleDateString('pt-BR', {
						timeZone: 'America/Sao_Paulo'
					})}
				</li>
			{/each}
		</ul>
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
	li {
		margin-block: 0.75rem;
	}
</style>
