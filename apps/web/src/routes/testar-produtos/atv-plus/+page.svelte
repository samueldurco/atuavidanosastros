<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { trialResponse } from '$lib/trials/response';
	import TrialLibrary from '$lib/components/TrialLibrary.svelte';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	let { data } = $props();
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	let comment = $state(''),
		message = $state(''),
		busy = $state(false);
	const universes = [
		['meu-ceu', 'Mapa e identidade'],
		['ciclos-tempo', 'Ciclos e datas'],
		['amor-relacoes', 'Vínculos'],
		['tarot-arcanos', 'Tarot'],
		['proposito-prosperidade', 'Direção e trabalho'],
		['sonhos-simbolos', 'Sonhos']
	];
	async function decide(decision: 'approved' | 'rejected') {
		busy = true;
		message = '';
		try {
			const response = await fetch('/api/private-trials/club', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ decision, comment })
			});
			const body = await trialResponse<{ message?: string }>(response);
			if (!response.ok) throw Error(body.message ?? 'Não foi possível salvar.');
			await invalidateAll();
			message = 'Sua avaliação do ATV+ foi salva.';
		} catch (e) {
			message = e instanceof Error ? e.message : 'Não foi possível salvar.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>ATV+ — clube de teste gratuito</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<a href="/testar-produtos">← Testar produtos</a>
	<PageIntro
		eyebrow="ATV+ · teste privado gratuito"
		title="Um lugar para acompanhar suas leituras"
		description="Explore os seis universos, retome o que você salvou e acompanhe suas anotações. O acesso desta fase é gratuito, sem cobrança ou renovação."
	/>
	<section aria-labelledby="ritual">
		<h2 id="ritual">Seu ritmo de acompanhamento</h2>
		<p>
			Comece por uma leitura que tenha relação com seu momento. Escolha uma pergunta, registre um
			experimento pequeno e volte para anotar o que aconteceu. As leituras simbólicas ajudam a
			formular possibilidades; suas decisões continuam com você.
		</p>
		<ol>
			<li><a href="/testar-produtos/daily-card">Hoje: uma carta e uma observação</a></li>
			<li>
				<a href="/testar-produtos/week-reading"
					>Nesta semana: uma leitura e um registro do cotidiano</a
				>
			</li>
			<li>
				<a href="/testar-produtos/direction-journey"
					>Em 30 dias: acompanhe um objetivo e suas revisões</a
				>
			</li>
			<li>
				<a href="/testar-produtos/dream-journal"
					>Ao despertar: registre um sonho para sua biblioteca</a
				>
			</li>
		</ol>
	</section>
	{#each universes as [kind, label] (kind)}<section aria-label={label}>
			<h2>{label}</h2>
			<ul>
				{#each data.products.filter((p) => p.universe === kind) as product (product.id)}<li>
						<a href={`/testar-produtos/${product.id}`}>{product.name}</a>
					</li>{/each}
			</ul>
		</section>{/each}
	<TrialLibrary library={{ readings: data.readings, unavailable: false }} />
	<section aria-labelledby="decision">
		<h2 id="decision">Sua avaliação do ATV+</h2>
		{#if data.feedback}<p>
				Decisão atual: {data.feedback.decision === 'approved'
					? 'aprovado por você'
					: 'revisão solicitada'}.
			</p>{/if}<label
			>Comentário para a revisão<textarea bind:value={comment} maxlength="3000" rows="4"
			></textarea></label
		>
		<div class="actions">
			<button onclick={() => decide('approved')} disabled={!ready || busy}>Aprovar ATV+</button
			><button onclick={() => decide('rejected')} disabled={!ready || busy}
				>Solicitar revisão</button
			>
		</div>
		<p role="status">{message}</p>
	</section>
</ContentShell>

<style>
	section {
		max-width: 850px;
		margin: 2.5rem auto;
	}
	li,
	p {
		line-height: 1.8;
	}
	a {
		color: inherit;
		text-underline-offset: 0.2em;
	}
	label {
		display: grid;
		gap: 0.5rem;
	}
	textarea {
		font: inherit;
		box-sizing: border-box;
		width: 100%;
		border: 1px solid #85765f;
		background: #fff;
		color: #182c29;
		padding: 1rem;
		border-radius: 0.5rem;
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}
	button {
		font: inherit;
		border: 1px solid #243d39;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		background: #243d39;
		color: #fff;
	}
	button:disabled {
		opacity: 0.6;
	}
</style>
