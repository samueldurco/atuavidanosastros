<script lang="ts">
	import { offeredProductIds } from '@atv/domain';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { trialResponse } from '$lib/trials/response';
	import TrialLibrary from '$lib/components/TrialLibrary.svelte';
	import ClubContinuity from '$lib/components/ClubContinuity.svelte';
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
		['meu-ceu', 'Mapa Astral'],
		['ciclos-tempo', 'Previsões'],
		['amor-relacoes', 'Amor e Relacionamentos'],
		['tarot-arcanos', 'Tarot'],
		['proposito-prosperidade', 'Dinheiro e Carreira'],
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
			message = 'Sua avaliação desta área foi salva.';
		} catch (e) {
			message = e instanceof Error ? e.message : 'Não foi possível salvar.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>Leituras e anotações — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<a href="/testar-produtos">← Testar produtos</a>
	<PageIntro
		eyebrow="Sua área de leituras"
		title="Um lugar para acompanhar suas leituras"
		description="Retome suas leituras, acompanhe suas anotações e escolha o que deseja guardar para uma próxima conversa."
	/>
	<p>
		Conheça também os <a href="/atv-mais">três planos do ATV+</a>. Sua biblioteca e seus registros
		não dependem de assinatura.
	</p>
	{#if data.trialAccess}<section aria-labelledby="ritual">
			<h2 id="ritual">Seu ritmo de acompanhamento</h2>
			<p>
				Comece por uma leitura que tenha relação com seu momento. Escolha uma pergunta, registre um
				experimento pequeno e volte para anotar o que aconteceu. As leituras simbólicas ajudam a
				formular possibilidades; suas decisões continuam com você.
			</p>
			<ol>
				<li><a href="/ferramentas/carta-do-dia">Carta do Dia: um tema para observar</a></li>
				<li>
					<a href="/testar-produtos/week-reading"
						>Nesta semana: uma leitura e um registro do cotidiano</a
					>
				</li>
				<li>
					<a href="/testar-produtos/personal-calendar">Próximos 30 dias: acompanhe suas previsões</a
					>
				</li>
				<li>
					<a href="/testar-produtos/dream-atlas"
						>Ao despertar: registre seus sonhos ao longo de 30 dias</a
					>
				</li>
			</ol>
		</section>
		{#each universes as [kind, label] (kind)}<section aria-label={label}>
				<h2>{label}</h2>
				<ul>
					{#each data.products.filter((p) => p.universe === kind && offeredProductIds.some((id) => id === p.id)) as product (product.id)}<li
						>
							<a href={`/testar-produtos/${product.id}`}>{product.name}</a>
						</li>{/each}
				</ul>
			</section>{/each}
		<TrialLibrary library={{ readings: data.readings, unavailable: false }} />
	{:else}<p>
			Seu acesso aos testes está indisponível. Você ainda pode conferir e remover sua autorização de
			continuidade nesta conta.
		</p>{/if}
	<ClubContinuity initial={data.continuity ?? null} readings={data.continuityReadings ?? []} />
	{#if data.trialAccess}<section aria-labelledby="decision">
			<h2 id="decision">Sua avaliação desta área</h2>
			<p>
				Este parecer se refere à biblioteca, às anotações e à organização das leituras. Os testes
				dos planos ficam na página do ATV+.
			</p>
			{#if data.feedback}<p>
					Decisão atual: {data.feedback.decision === 'approved'
						? 'aprovado por você'
						: 'revisão solicitada'}.
				</p>{/if}<label
				>Comentário para a revisão<textarea bind:value={comment} maxlength="3000" rows="4"
				></textarea></label
			>
			<div class="actions">
				<button onclick={() => decide('approved')} disabled={!ready || busy}
					>Aprovar esta área</button
				><button onclick={() => decide('rejected')} disabled={!ready || busy}
					>Solicitar revisão</button
				>
			</div>
			<p role="status">{message}</p>
		</section>{/if}
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
