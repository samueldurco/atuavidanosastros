<script lang="ts">
	import type { SavedTrial } from '$lib/trials/reading';
	import {
		DIRECTION_NOTE_VERSION,
		directionSteps,
		directionSynthesis,
		decisionLabels,
		parseDirectionNote,
		type DirectionStep,
		type DirectionNote,
		type DirectionSavedNote
	} from '$lib/trials/reconstruction/direction-check-ins';
	let {
		saved,
		notes,
		ready,
		busy,
		onSave
	}: {
		saved: SavedTrial;
		notes: DirectionSavedNote[];
		ready: boolean;
		busy: boolean;
		onSave: (step: number, text: string) => Promise<void>;
	} = $props();
	let step = $state<DirectionStep>(0),
		observation = $state(''),
		conditions = $state(''),
		counterevidence = $state(''),
		next = $state(''),
		decision = $state<DirectionNote['decision']>('undecided');
	let formError = $state('');
	const synthesis = $derived(directionSynthesis(notes));
	const current = $derived(notes.find((note) => note.step === step));
	const label = (day: number) => (day === 0 ? 'Ponto de partida' : `Dia ${day}`);
	$effect(() => {
		const note = current ? parseDirectionNote(current.text, step) : null;
		observation = note?.observation ?? current?.text ?? '';
		conditions = note?.conditions ?? '';
		counterevidence = note?.counterevidence ?? '';
		next = note?.next ?? '';
		decision = note?.decision ?? 'undecided';
		formError = '';
	});
	const prompts = $derived(
		step === 0
			? [
					'Que observação você espera encontrar?',
					'Que limite de tempo, esforço ou acesso precisa preservar?',
					'Que observação contrariaria sua expectativa?',
					'Qual experiência de custo zero você escolhe testar?'
				]
			: step === 7
				? [
						'O que você fez ou deixou de fazer? Descreva um exemplo.',
						'Que condição facilitou ou impediu a tentativa?',
						'O que contrariou sua expectativa? Se não encontrou, registre isso.',
						'Que ajuste pequeno fará antes do dia 14?'
					]
				: step === 14
					? [
							'O que mudou entre as tentativas? Descreva um exemplo.',
							'O esforço coube no limite? Que condição ainda falta?',
							'Que explicação alternativa existe? Se ainda não sabe, registre isso.',
							'Que variável você vai testar até o encerramento?'
						]
					: [
							'O que observou em comparação com a expectativa inicial?',
							'Que condição tornou a experiência viável ou inviável?',
							'Que evidência contraria sua primeira hipótese? Se não encontrou, registre isso.',
							'Qual próximo passo e qual condição para rever sua decisão?'
						]
	);
</script>

<section class="journey" aria-labelledby="journey-title" data-direction-journey>
	<h2 id="journey-title">Seu percurso de trinta dias</h2>
	<p>Objetivo desta edição: <strong>{saved.input.journey?.goal}</strong></p>
	<p>
		Datas orientam o percurso. Você pode responder depois; o registro conserva a data real em que
		foi salvo. Suas respostas ficam na Biblioteca privada.
	</p>
	<ol class="stages">
		{#each synthesis.stages as stage (stage.step)}
			<li>
				<strong>{label(stage.step)}</strong>
				<span
					>{stage.step === 0
						? saved.input.journey?.startDate
						: saved.calculation.facts
								.find((f) => f.id === `civil-check-in-day-${stage.step}`)
								?.display.split(': ')[1]}</span
				>
				<span
					>{stage.note
						? 'Registro salvo'
						: stage.saved
							? 'Anotação anterior: completar campos'
							: 'Pendente'}</span
				>
				{#if stage.saved}<small
						>Gravado em {new Date(stage.saved.updated_at).toLocaleString('pt-BR', {
							timeZone: 'America/Sao_Paulo'
						})}</small
					>{/if}
				<button
					type="button"
					disabled={!ready || busy}
					onclick={() => {
						step = stage.step;
					}}>{stage.saved ? 'Reabrir' : 'Preencher'} {label(stage.step).toLowerCase()}</button
				>
			</li>
		{/each}
	</ol>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			const note: DirectionNote = {
				version: DIRECTION_NOTE_VERSION,
				step,
				observation: observation.trim(),
				conditions: conditions.trim(),
				counterevidence: counterevidence.trim(),
				next: next.trim(),
				decision: step === 30 ? decision : 'undecided'
			};
			if (parseDirectionNote(JSON.stringify(note), step)) {
				formError = '';
				onSave(step, JSON.stringify(note));
			} else {
				formError = 'Preencha os quatro relatos com texto antes de salvar.';
			}
		}}
	>
		<h3>Registrar uma etapa</h3>
		<label
			>Etapa da Jornada<select bind:value={step}
				>{#each directionSteps as day (day)}<option value={day}>{label(day)}</option>{/each}</select
			></label
		>
		<p>
			Custo financeiro zero e até 45 minutos por experiência. Reduza, substitua ou pause se não
			couber no seu contexto.
		</p>
		<label
			>{prompts[0]}<textarea required maxlength="600" rows="3" bind:value={observation}
			></textarea></label
		>
		<label
			>{prompts[1]}<textarea required maxlength="600" rows="3" bind:value={conditions}
			></textarea></label
		>
		<label
			>{prompts[2]}<textarea required maxlength="600" rows="3" bind:value={counterevidence}
			></textarea></label
		>
		<label
			>{prompts[3]}<textarea required maxlength="600" rows="3" bind:value={next}></textarea></label
		>
		{#if step === 30}<label
				>Sua decisão<select required bind:value={decision}
					><option value="undecided" disabled>Escolha uma decisão</option
					>{#each ['continue', 'adjust', 'pause', 'finish'] as choice (choice)}<option
							value={choice}>{decisionLabels[choice as keyof typeof decisionLabels]}</option
						>{/each}</select
				></label
			>{/if}
		<p>
			Salvar novamente substitui a resposta desta etapa. O objetivo e o cronograma originais são
			preservados nesta edição.
		</p>
		{#if formError}<p role="alert">{formError}</p>{/if}
		<button disabled={!ready || busy || (step === 30 && decision === 'undecided')}
			>Salvar registro da Jornada</button
		>
	</form>
	<section aria-labelledby="direction-synthesis-title" data-direction-synthesis>
		<h3 id="direction-synthesis-title">Comparação e próximo caminho</h3>
		<p>
			{synthesis.complete
				? 'Quatro etapas registradas. Examine a comparação antes de escolher outra pergunta.'
				: synthesis.comparisonReady
					? 'Comparação inicial e final disponível; o percurso ainda tem etapas pendentes.'
					: 'A comparação precisa do ponto de partida e do dia 30.'}
		</p>
		{#if synthesis.missing.length}<p>
				Etapas pendentes: {synthesis.missing.map(label).join(', ')}.
			</p>{/if}
		<div class="comparison">
			<div>
				<h4>Expectativa inicial</h4>
				<p>{synthesis.baseline?.observation ?? 'Ponto de partida ainda não registrado.'}</p>
				<h4>Limites que você escolheu preservar</h4>
				<p>{synthesis.baseline?.conditions ?? 'Ainda não registrados.'}</p>
			</div>
			<div>
				<h4>Observação ao encerrar</h4>
				<p>{synthesis.final?.observation ?? 'Dia 30 ainda não registrado.'}</p>
				<h4>Condições observadas ao encerrar</h4>
				<p>{synthesis.final?.conditions ?? 'Ainda não registradas.'}</p>
			</div>
		</div>
		{#each synthesis.intermediate as stage (stage.step)}<div>
				<h4>{label(stage.step)}: observação e condições</h4>
				<p>{stage.note?.observation}</p>
				<p>{stage.note?.conditions}</p>
				<p>Evidência contrária: {stage.note?.counterevidence}</p>
				<p>Próximo passo registrado: {stage.note?.next}</p>
			</div>{/each}
		<h4>O que poderia contrariar a expectativa inicial</h4>
		<p>{synthesis.baseline?.counterevidence ?? 'Ainda não registrado.'}</p>
		<h4>Evidência contrária no encerramento</h4>
		<p>{synthesis.final?.counterevidence ?? 'Dia 30 ainda não registrado.'}</p>
		<h4>Sua decisão e próximo passo</h4>
		<p>{synthesis.final ? decisionLabels[synthesis.final.decision] : 'Decisão pendente.'}</p>
		<p>{synthesis.final?.next ?? 'Próximo passo ainda não registrado.'}</p>
		<p>
			Estes são os seus relatos, organizados para comparação. Que exemplo sustenta uma mudança? Que
			explicação alternativa existe? Condições inviáveis, falta de interesse ou falta de informação
			podem pedir decisões diferentes. Não há pontuação nem conclusão automática de sucesso.
		</p>
		<a href="/testar-produtos/atv-plus">Continuar no ATV+</a>
	</section>
</section>

<style>
	.journey {
		margin-block: 2rem;
		padding: clamp(1rem, 3vw, 2rem);
		border: 1px solid var(--border, #b8aa91);
		border-radius: 1rem;
	}
	.stages {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 1rem;
		padding: 0;
		list-style: none;
	}
	.stages li {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border: 1px solid var(--border, #b8aa91);
		border-radius: 0.75rem;
	}
	form {
		display: grid;
		gap: 1rem;
		margin-block: 2rem;
	}
	label {
		display: grid;
		gap: 0.5rem;
	}
	textarea,
	select {
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		font: inherit;
		padding: 0.75rem;
		color: inherit;
		background: var(--surface, #fffdf8);
		border: 1px solid #81745f;
		border-radius: 0.5rem;
	}
	button {
		padding: 0.65rem;
		min-height: 44px;
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
	}
	.comparison {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		gap: 1.5rem;
	}
	p {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.65;
	}
	small {
		font-size: 0.85rem;
	}
</style>
