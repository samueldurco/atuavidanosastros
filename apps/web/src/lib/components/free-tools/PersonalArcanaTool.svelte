<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { FreeTool } from '$lib/data/free-tools';
	import { calculatePersonalArcana } from '$lib/personal-arcana';
	import { trackHomeEvent } from '$lib/analytics/home-events';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import TarotCard from '$lib/components/TarotCard.svelte';

	let { tool, embedded = false }: { tool: FreeTool; embedded?: boolean } = $props();
	let birthDate = $state('');
	let today = $state('');
	let result = $state<ReturnType<typeof calculatePersonalArcana>>(null);
	let error = $state('');
	let resultHeading = $state<HTMLElement>();
	onMount(() => {
		today = new Intl.DateTimeFormat('sv-SE').format(new Date());
	});

	async function calculate(event: SubmitEvent) {
		event.preventDefault();
		const payload = { tool_id: tool.id, context: embedded ? 'home' : 'alias' };
		trackHomeEvent('tool_submit', { ...payload, state: 'initial' });
		result = calculatePersonalArcana(birthDate, today);
		if (!result) {
			error = 'Confira o dia, o mês e o ano. A data de nascimento deve ser válida e até hoje.';
			trackHomeEvent('tool_error', { ...payload, error_code: 'invalid_input' });
			return;
		}
		error = '';
		trackHomeEvent(
			'tool_result',
			{ ...payload, state: 'new' },
			{ operationId: globalThis.crypto?.randomUUID?.() }
		);
		await tick();
		resultHeading?.focus();
	}
</script>

<div class:embedded class="personal-arcana">
	<ContentShell kind="product">
		{#if !embedded}
			<nav class="trail" aria-label="Caminho da ferramenta">
				<a href="/ferramentas">Ferramentas grátis</a> / <a href="/temas/tarot">Tarot</a> /
				<span aria-current="page">Arcano pessoal</span>
			</nav>
			<PageIntro
				eyebrow="Tarot · ferramenta gratuita"
				title={tool.label}
				description={tool.description}
				identity="tarot"
			/>
		{/if}

		<form novalidate onsubmit={calculate}>
			<label>
				Data de nascimento
				<input
					type="date"
					required
					max={today || undefined}
					bind:value={birthDate}
					oninput={() => {
						error = '';
						result = null;
					}}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby="arcana-note"
				/>
			</label>
			<Button type="submit" disabled={!today}>{tool.action}</Button>
			<p id="arcana-note">A data fica apenas nesta página. Você pode calcular sem criar conta.</p>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
		</form>
		<noscript><p>Para usar a calculadora, ative o JavaScript ou siga a conta abaixo.</p></noscript>

		{#if result}
			<section class="arcana-result" aria-label="Resultado do cálculo">
				<div>
					<p class="eyebrow">Seu arcano pessoal</p>
					<svelte:element this={embedded ? 'h4' : 'h2'} bind:this={resultHeading} tabindex="-1"
						>{result.card.name}</svelte:element
					>
					<p>
						Número da soma: <strong>{result.number}</strong>. Número da carta:
						<strong>{result.cardNumber}</strong>.
					</p>
					<ol aria-label="Etapas da soma">
						{#each result.steps as step}
							<li>{step.digits.join(' + ')} = <strong>{step.total}</strong></li>
						{/each}
					</ol>
					{#if result.number === 22}<p>
							O total 22 corresponde à carta O Louco, de número 0 no baralho.
						</p>{/if}
					<p>
						Olhe a imagem da carta. Que detalhe você percebe primeiro? Anote o que ele lembra na sua
						vida hoje.
					</p>
				</div>
				<TarotCard
					cardId={result.card.id}
					name={result.card.name}
					caption="Arcano da sua data"
					showOrientation={false}
					compact
				/>
			</section>
		{/if}

		<section class="method">
			<svelte:element this={embedded ? 'h4' : 'h2'}>Como calcular o arcano pessoal?</svelte:element>
			<p>
				Some os algarismos do dia, do mês e do ano de nascimento. Se o total passar de 22, some os
				algarismos desse total outra vez. Pare ao chegar a um número de 1 a 22. Nesta calculadora, o
				22 corresponde à carta O Louco, de número 0.
			</p>
			<p>
				Por exemplo, para 29/09/2001 a primeira soma é 2 + 9 + 0 + 9 + 2 + 0 + 0 + 1 = 23. Como 23
				passa de 22, some 2 + 3 = 5. O arcano é O Hierofante, carta 5.
			</p>
			<p>
				A mesma data sempre leva à mesma carta. Para explorar as imagens do baralho, leia o <a
					href="/noticias/2026/10/arcanos-maiores-e-menores">guia dos arcanos maiores e menores</a
				>. Para experimentar uma tiragem, conheça a
				<a href="/ferramentas/carta-do-dia">Carta do Dia</a>.
			</p>
			{#if embedded}<p>
					<a href={tool.href}>Abrir a página da calculadora de arcano pessoal</a>
				</p>{/if}
		</section>
	</ContentShell>
</div>

<style>
	.embedded :global(.content-shell) {
		width: 100%;
		padding: 0;
	}
	.trail {
		font-size: 0.87rem;
		margin-bottom: 1.25rem;
	}
	form,
	.arcana-result {
		border: 1px solid var(--atv-border);
		padding: clamp(1.1rem, 3vw, 2rem);
		background: var(--atv-paper-light, #fff8e9);
	}
	form {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.85rem 1.25rem;
	}
	label {
		display: grid;
		gap: 0.45rem;
		font-weight: 600;
	}
	input {
		min-width: 0;
		max-width: 100%;
		min-height: 46px;
		padding: 0.55rem 0.85rem;
		border: 1px solid #6b6d61;
		border-radius: 0.2rem;
		font: inherit;
		color: inherit;
		background: #fffcf4;
	}
	form p {
		flex-basis: 100%;
		margin: 0;
		font-size: 0.9rem;
	}
	.error {
		color: #862d1d;
	}
	.arcana-result {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.5rem;
		margin-top: 1rem;
		border-top: 4px solid #92501f;
	}
	.arcana-result p,
	.method p {
		max-width: 65ch;
		line-height: 1.65;
	}
	ol {
		padding-left: 1.35rem;
		font-variant-numeric: tabular-nums;
	}
	li {
		padding-block: 0.18rem;
		overflow-wrap: anywhere;
	}
	h2,
	h4 {
		margin: 0.45rem 0 0.75rem;
		font: 500 clamp(1.65rem, 4vw, 2.6rem)/1.1 var(--atv-font-display);
	}
	.method {
		margin-top: 2rem;
	}
	a {
		text-underline-offset: 0.2em;
	}
	@media (max-width: 620px) {
		label,
		form :global(.button) {
			width: 100%;
		}
		.arcana-result {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
