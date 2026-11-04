<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		atvPlusPlans,
		atvPlusPlanFor,
		atvPlusSelectionAllowed,
		productTrialHref,
		productCatalog
	} from '@atv/domain';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import AtvPlusCommercial from '$lib/components/AtvPlusCommercial.svelte';
	let { data, form } = $props();
	let busy = $state(false);
	const current = $derived(
		data.cycles.find(
			(cycle) =>
				!cycle.cancelled_at &&
				Date.parse(cycle.started_at) <= data.serverNow &&
				Date.parse(cycle.ends_at) > data.serverNow
		)
	);
	const selectedPlan = $derived(current ? atvPlusPlanFor(current.plan_id) : undefined);
	const currentUses = $derived(
		current ? data.uses.filter((use) => use.cycle_id === current.id) : []
	);
	const includedIds = $derived(
		selectedPlan
			? [
					...new Set([
						...selectedPlan.forecastProductIds,
						...selectedPlan.readingOptions.flatMap((option) => option.productIds)
					])
				]
			: []
	);
	const availableIds = $derived(
		current
			? includedIds.filter((id) =>
					atvPlusSelectionAllowed(current.plan_id, [
						...currentUses.map((use) => use.product_id),
						id
					])
				)
			: []
	);
	const nameFor = (id: string) => productCatalog.find((product) => product.id === id)?.name ?? id;
	const date = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(
			new Date(value)
		);
	const enhanceForm = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			try {
				await update();
			} finally {
				busy = false;
			}
		};
	};
</script>

<svelte:head>
	<title>ATV+ · Assinatura de leituras digitais</title>
	<meta
		name="description"
		content="Conheça os planos ATV+ de 3, 6 e 12 meses. Próxima Revolução Solar na entrada e previsões pessoais programadas em PDF pelo WhatsApp."
	/>
</svelte:head>

<ContentShell kind="commercial">
	<AtvPlusCommercial
		membershipState={data.commercial}
		now={data.serverNow}
		message={form && 'commercialMessage' in form ? form.commercialMessage : ''}
	/>

	{#if data.ownerAccess}
		<details class="legacy-evaluation">
			<summary>Avaliação dos ciclos anteriores · conta proprietária</summary>
			<p>
				As opções de avaliação anteriores continuam disponíveis para preservar os testes e as
				leituras já entregues.
			</p>
			<div class="plans" aria-label="Planos de avaliação anteriores">
				{#each atvPlusPlans as plan, index (plan.id)}
					<article class:premium={plan.id === 'premium'}>
						<p class="eyebrow">0{index + 1} · ciclo de 30 dias</p>
						<h2>{plan.name}</h2>
						<p>{plan.description}</p>
						<ul>
							{#each plan.benefits as benefit (benefit)}<li>{benefit}</li>{/each}
						</ul>
						{#if data.ownerAccess}
							<form method="POST" action="?/start" use:enhance={enhanceForm}>
								<input type="hidden" name="planId" value={plan.id} />
								<input type="hidden" name="requestKey" value={data.requestKey} />
								<button class="button" disabled={busy}
									>{current?.plan_id === plan.id
										? 'Reiniciar este teste'
										: 'Testar este plano'}</button
								>
							</form>
						{:else}<p class="availability">Assinaturas em preparação</p>{/if}
					</article>
				{/each}
			</div>
			<p class="policy">
				Uma previsão por ciclo: escolha entre Calendário de Previsões e Previsões de Dinheiro e
				Carreira. No Premium, as duas leituras básicas e a leitura ampliada são alternativas. As
				utilizações pertencem ao ciclo de 30 dias e não se acumulam.
			</p>
			<section class="evaluation" aria-labelledby="evaluation-title">
				<p class="eyebrow">Avaliação da conta proprietária · sem cobrança</p>
				<h2 id="evaluation-title">Experimente cada plano</h2>
				<p>
					Começar ou reiniciar um plano encerra a simulação anterior e abre um ciclo de 30 dias. As
					leituras já entregues ficam na biblioteca.
				</p>
				<p>
					Seu <a href="/testar-produtos">acesso completo aos produtos para avaliação</a> continua livre,
					independentemente do plano escolhido.
				</p>
				{#if form?.message}<p class="feedback" role="status">{form.message}</p>{/if}
				{#if current && selectedPlan}
					<div class="cycle-heading">
						<div>
							<h3>{selectedPlan.name}</h3>
							<p>{date(current.started_at)} a {date(current.ends_at)}</p>
						</div>
						<form method="POST" action="?/cancel" use:enhance={enhanceForm}>
							<input type="hidden" name="cycleId" value={current.id} />
							<button disabled={busy}>Encerrar simulação</button>
						</form>
					</div>
					<h4>Escolha sua próxima leitura</h4>
					{#if availableIds.length}
						<div class="choices">
							{#each availableIds as id (id)}<a
									class="choice"
									href={`${productTrialHref(id)}?atvPlusCycle=${current.id}`}
									>{nameFor(id)} <span aria-hidden="true">↗</span></a
								>{/each}
						</div>
					{:else}<p>
							Você usou as opções deste ciclo. Reabra suas leituras abaixo ou escolha outro plano
							para testar.
						</p>{/if}
					<p class="small">
						A utilização é registrada somente depois que a leitura é concluída e salva. Uma
						tentativa que não gera leitura não consome o plano.
					</p>
					{#if currentUses.length}<h4>Leituras deste ciclo</h4>
						<ul class="readings">
							{#each currentUses as use (use)}<li>
									{#if use.reading_id}<a href={`/testar-produtos/leituras/${use.reading_id}`}
											>{nameFor(use.product_id)}</a
										>{:else}{nameFor(use.product_id)} · leitura removida{/if}
								</li>{/each}
						</ul>{/if}
				{:else}<p>Escolha um plano acima para começar.</p>{/if}
				{#if data.cycles.some((cycle) => cycle.id !== current?.id)}
					<details>
						<summary>Ciclos anteriores</summary
						>{#each data.cycles.filter((cycle) => cycle.id !== current?.id) as cycle (cycle.id)}<div
								class="past-cycle"
							>
								<h3>{atvPlusPlanFor(cycle.plan_id)?.name}</h3>
								<p>{date(cycle.started_at)} · {cycle.cancelled_at ? 'encerrado' : 'concluído'}</p>
								<ul>
									{#each data.uses.filter((use) => use.cycle_id === cycle.id) as use (use)}<li>
											{#if use.reading_id}<a href={`/testar-produtos/leituras/${use.reading_id}`}
													>{nameFor(use.product_id)}</a
												>{:else}{nameFor(use.product_id)} · leitura removida{/if}
										</li>{/each}
								</ul>
							</div>{/each}
					</details>
				{/if}
			</section>
		</details>
	{/if}

	<section class="separate" aria-labelledby="separate-title">
		<div>
			<p class="eyebrow">Quando quiser aprofundar</p>
			<h2 id="separate-title">Leituras para momentos específicos</h2>
			<p>
				Você também pode escolher mapas, leituras de relacionamentos, Tarot e sonhos com entregas
				próprias, sem assinar o ATV+.
			</p>
			<a href="/leituras">Ver o catálogo de leituras digitais avulsas ↗</a>
		</div>
	</section>
	<div class="closing">
		<p>Suas leituras entregues continuam na biblioteca ao encerrar um plano.</p>
		<p>
			As <a href="/ferramentas">ferramentas gratuitas</a> e seu histórico não dependem de assinatura.
		</p>
	</div>
</ContentShell>

<style>
	.plans {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.2rem;
	}
	.plans article {
		background: #f8f1e1;
		border: 1px solid #cbbb9d;
		border-top: 4px solid #a58d5f;
		padding: clamp(1.25rem, 2.5vw, 2rem);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.plans article.premium {
		border-top-color: #173f4e;
	}
	h2 {
		font: 400 clamp(1.7rem, 3vw, 2.1rem)/1.2 var(--atv-font-editorial);
		margin: 0.5rem 0 1rem;
	}
	.plans ul {
		padding-left: 1.15rem;
		flex: 1;
		margin: 0.5rem 0 1.5rem;
	}
	li + li {
		margin-top: 0.65rem;
	}
	.plans p {
		margin-top: 0;
	}
	.availability {
		font-size: 0.9rem;
		border-top: 1px solid #d6c8ae;
		padding-top: 1rem;
		width: 100%;
	}
	.policy,
	.small {
		font-size: 0.9rem;
		color: var(--atv-text-secondary);
		line-height: 1.65;
	}
	.policy {
		margin: 1.5rem 0;
	}

	.evaluation {
		padding: 2rem;
		border: 1px solid #aa9370;
		background: #efe7d5;
		margin: 3rem 0;
		scroll-margin-top: 6rem;
	}
	.cycle-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: center;
		border-block: 1px solid #cfbea1;
		margin-top: 1.5rem;
		padding: 1rem 0;
	}
	h3 {
		font: 400 1.5rem/1.3 var(--atv-font-editorial);
		margin: 0 0 0.5rem;
	}
	.cycle-heading p {
		margin: 0;
	}
	.choices {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.choice {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		background: #faf5e9;
		border: 1px solid #cbbb9d;
		text-decoration: none;
	}
	.choice:hover {
		background: #fffaf0;
	}
	.choice:focus-visible,
	button:focus-visible,
	summary:focus-visible {
		outline: 3px solid #9b683c;
		outline-offset: 3px;
	}
	button {
		cursor: pointer;
		padding: 0.7rem 1rem;
		border: 1px solid #173f4e;
		color: #173f4e;
		background: transparent;
		font: inherit;
	}
	button.button {
		color: #fff9ed;
		background: #173f4e;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.feedback {
		padding: 1rem;
		background: #fff9eb;
		border-left: 3px solid #976437;
	}
	.readings {
		padding-left: 1.2rem;
	}
	details {
		margin-top: 1.5rem;
	}
	summary {
		cursor: pointer;
		padding: 0.75rem 0;
	}
	.past-cycle {
		border-top: 1px solid #cfbea1;
		padding: 1.2rem 0;
	}
	.separate {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 3rem;
		padding: 3rem 0;
		border-top: 1px solid #cbbb9d;
	}

	.closing {
		padding-top: 1.5rem;
		border-top: 1px solid #cbbb9d;
	}
	@media (max-width: 850px) {
		.plans {
			grid-template-columns: 1fr;
		}

		.separate {
			gap: 1.5rem;
		}
	}
	@media (max-width: 580px) {
		.evaluation {
			padding: 1.25rem;
		}
		.choices,
		.separate {
			grid-template-columns: 1fr;
		}
	}
</style>
