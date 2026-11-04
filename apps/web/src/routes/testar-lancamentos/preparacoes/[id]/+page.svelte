<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import LaunchReadingReader from '$lib/components/LaunchReadingReader.svelte';
	import LaunchReadingFeedback from '$lib/components/LaunchReadingFeedback.svelte';
	import '$lib/styles/mvp-product-art.css';
	let { data } = $props();
	let busy = $state(false),
		message = $state('');
	let reasons = $state<string[]>([]);
	async function progress(step: 'calculate' | 'reading') {
		if (busy) return;
		busy = true;
		message = '';
		reasons = [];
		try {
			const response = await fetch(`/api/launch-preparations/${data.preparation.id}/${step}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}'
			});
			const result = (await response.json()) as { message?: unknown; reasons?: unknown };
			if (!response.ok) {
				if (Array.isArray(result.reasons))
					reasons = result.reasons.filter((value): value is string => typeof value === 'string');
				throw new Error(
					typeof result.message === 'string'
						? result.message
						: 'Não foi possível concluir esta etapa.'
				);
			}
			await invalidateAll();
		} catch (cause) {
			message = cause instanceof Error ? cause.message : 'Não foi possível concluir esta etapa.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>{data.product.name} — preparação salva | ATVNA</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
{#if data.savedReading}
	<LaunchReadingReader reading={data.savedReading.reading} productId={data.product.id} />
	<LaunchReadingFeedback
		preparationId={data.preparation.id}
		history={data.feedback}
		historyAvailable={data.feedbackHistoryAvailable}
	/>
{:else}
	<ContentShell kind="reading">
		<a href="/testar-lancamentos">← Minhas preparações</a>
		<PageIntro
			eyebrow="Homologação privada"
			title={data.product.name}
			description="Acompanhe a preparação da sua leitura de teste."
			identity={data.product.id}
			productArtwork
		/>
		<p role="status">
			{data.preparation.status === 'AWAITING_CALCULATION'
				? 'Dados salvos. Aguardando cálculo.'
				: 'Fatos calculados e salvos. Aguardando comparação, interpretação e aprovação.'}
		</p>
		{#if data.preparation.status === 'AWAITING_CALCULATION' && data.canCalculate}<button
				disabled={busy}
				onclick={() => progress('calculate')}
				>{busy ? 'Calculando…' : 'Calcular fatos para revisão'}</button
			>{/if}
		{#if data.preparation.status === 'FACTS_READY_AWAITING_REVIEW' && data.canCompose}<button
				disabled={busy}
				onclick={() => progress('reading')}
				>{busy ? 'Preparando…' : 'Gerar e revisar leitura de teste'}</button
			>{/if}
		{#if message}<p role="alert">{message}</p>{/if}
		{#if reasons.length}<ul aria-label="Pendências da revisão">
				{#each reasons as reason (reason)}<li>{reason}</li>{/each}
			</ul>{/if}
		<h2>Dados e fatos registrados</h2>
		<p>
			O conteúdo abaixo é evidência de homologação. O método e o conteúdo final ainda precisam de
			revisão própria antes da entrega da leitura.
		</p>
		<details>
			<summary>Consultar evidência salva</summary>
			<pre>{JSON.stringify(data.preparation.evidence, null, 2)}</pre>
		</details>
		<a href={`/produtos/${data.product.slug}`}>Consultar a ficha do produto</a>
	</ContentShell>
{/if}

<style>
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		max-height: 40rem;
		overflow: auto;
		padding: 1rem;
		background: #fff8e9;
		border: 1px solid #18374640;
		font-size: 0.8rem;
	}
	button {
		font: inherit;
		color: #fff8e9;
		background: #183746;
		border: 0;
		padding: 0.85rem 1.2rem;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.65;
		cursor: wait;
	}
	summary {
		cursor: pointer;
		padding-block: 1rem;
	}
	a {
		display: inline-block;
		margin-block: 1rem;
	}
</style>
