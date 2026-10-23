<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { trialResponse } from '$lib/trials/response';
	import { privateFormats } from '$lib/trials/experience';
	import { latestReadingVersion } from '$lib/trials/versions';
	import { readingCheckIns } from '$lib/trials/check-ins';
	import ReadingDirectionJourney from '$lib/components/ReadingDirectionJourney.svelte';
	import { DIRECTION_VERSION } from '$lib/trials/reconstruction/direction-facts';
	import ReadingExperience from '$lib/components/ReadingExperience.svelte';
	import ReadingShare from '$lib/components/ReadingShare.svelte';
	import { canShareReading } from '$lib/trials/sharing';
	import {
		careerCompassFactLabel,
		careerCompassFactValue
	} from '$lib/career-compass-fact-presentation';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	let { data } = $props();
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	let comment = $state(''),
		note = $state(''),
		step = $state(0),
		status = $state(''),
		busy = $state(false),
		speaking = $state(false);
	const checkIns = $derived(readingCheckIns(data.saved.product_id, data.saved.calculation.version));
	const reading = $derived(data.saved.reading);
	const careerCompass = $derived(data.saved.product_id === 'career-compass');
	const formats = $derived(privateFormats(data.saved.product_id, data.product.delivery));
	let refreshKey = '';
	async function refreshEdition() {
		busy = true;
		status = '';
		refreshKey ||= crypto.randomUUID();
		try {
			const response = await fetch(`/api/private-trials/${data.saved.id}/refresh`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ requestKey: refreshKey })
			});
			const value = await trialResponse<{ id: string; message?: string }>(response);
			await goto(`/testar-produtos/leituras/${value.id}`);
		} catch (e) {
			status = e instanceof Error ? e.message : 'Não foi possível atualizar a edição.';
		} finally {
			busy = false;
		}
	}
	$effect(() => {
		if (!data.saved.id) return;
		return () => {
			if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
		};
	});
	async function save(body: unknown) {
		const action = (body as { action?: string })?.action;
		if (
			(action === 'note' && data.optionalUnavailable?.notes) ||
			(action === 'feedback' && data.optionalUnavailable?.feedback)
		) {
			status = 'Recarregue para recuperar seus registros antes de editar.';
			return;
		}
		busy = true;
		status = '';
		try {
			const result = await fetch(`/api/private-trials/${data.saved.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			const value = await trialResponse<{ message?: string }>(result);
			if (!result.ok) throw Error(value.message ?? 'Não foi possível salvar.');
			status = 'Salvo na sua biblioteca privada.';
			await invalidateAll();
		} catch (e) {
			status = e instanceof Error ? e.message : 'Não foi possível salvar.';
		} finally {
			busy = false;
		}
	}
	function listen() {
		if (typeof speechSynthesis === 'undefined') {
			status = formats.includes('pdf')
				? 'Este navegador não oferece leitura em voz. Você pode abrir o PDF ou ler aqui.'
				: 'Este navegador não oferece leitura em voz. Você pode ler aqui ou guardar uma cópia em texto.';
			return;
		}
		speechSynthesis.cancel();
		if (speaking) {
			speaking = false;
			return;
		}
		const lines = [
			reading.title,
			reading.opening,
			...reading.sections
				.filter((s) => s.title !== 'Referências desta leitura')
				.flatMap((s) => [s.title, s.text]),
			'Perguntas para refletir',
			...reading.questions,
			reading.practice,
			...reading.limits
		];
		// Short chunks avoid browser speech engines silently truncating a long reading.
		const chunks = lines.flatMap((line) => line.match(/.{1,250}(?:\s|$)|.{1,250}/g) ?? [line]);
		speaking = true;
		for (const [index, chunk] of chunks.entries()) {
			const utterance = new SpeechSynthesisUtterance(chunk);
			utterance.lang = 'pt-BR';
			utterance.rate = 0.95;
			if (index === chunks.length - 1) utterance.onend = () => (speaking = false);
			utterance.onerror = () => {
				speaking = false;
				status = 'A leitura em voz foi interrompida. Você pode reiniciar.';
			};
			speechSynthesis.speak(utterance);
		}
	}
</script>

<svelte:head
	><title>{reading.title} — sua leitura de teste</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<div class={careerCompass ? 'career-trial' : ''}>
		<nav aria-label="Leitura de teste">
			<a href="/testar-produtos">← Produtos e biblioteca</a> ·
			<a href={`/testar-produtos/${data.saved.product_id}`}>Gerar outra leitura</a>
			·
			<a href={`/testar-produtos/${data.saved.product_id}?from=${data.saved.id}`}
				>Conferir ou corrigir dados</a
			>
		</nav>
		{#if careerCompass}
			<header class="career-hero">
				<div>
					<p class="career-kicker">Bússola de Carreira · leitura privada de teste</p>
					<h1>{reading.title}</h1>
					<p class="career-caption">Um primeiro ponto de orientação</p>
					<p class="career-opening">{reading.opening}</p>
				</div>
				<img src="/brand/mvp/assets/revisao/bussola-gravada.webp" alt="" width="210" height="210" />
			</header>
		{:else}
			<PageIntro
				identity={data.saved.product_id}
				productArtwork={data.saved.product_id === 'three-pillars'}
				eyebrow="Leitura privada · teste gratuito"
				title={reading.title}
				description={reading.opening}
			/>
		{/if}
		{#if reading.version !== latestReadingVersion(data.saved.product_id)}
			<div class="seal">
				<strong>Há uma nova edição desta leitura</strong>
				<p>
					A revisão organiza a síntese e os capítulos{formats.includes('pdf') ? ' e o PDF' : ''}.
					Ela usa os mesmos dados e cálculos; suas cartas, anotações e parecer anterior são
					preservados na leitura original.
				</p>
				<button disabled={!ready || busy} onclick={refreshEdition}
					>Criar edição revisada gratuita</button
				>
			</div>
		{/if}
		{#if data.saved.product_id === 'three-pillars'}
			<p class="delivery-note">
				Leia os capítulos nesta página. Você pode guardar o texto em TXT e o mapa calculado em SVG.
				A ilustração da capa é decorativa; o mapa apresenta os dados desta leitura.
			</p>
		{/if}
		<nav class="downloads" aria-label="Formatos da leitura">
			{#if formats.includes('pdf')}<a
					href={`/api/private-trials/${data.saved.id}/download?format=pdf`}
					>Guardar leitura em PDF</a
				>{/if}
			{#if formats.includes('svg')}<a
					href={`/api/private-trials/${data.saved.id}/download?format=svg`}
					>Baixar cartografia SVG</a
				>{/if}
			<a href={`/api/private-trials/${data.saved.id}/download?format=txt`}
				>Guardar uma cópia em texto</a
			>
			{#if data.product.delivery.includes('audio')}<button onclick={listen}
					>{speaking ? 'Parar leitura em voz' : 'Ouvir a leitura'}</button
				>
				<p>
					A voz é a síntese local do seu navegador. Mantenha esta página aberta durante a
					reprodução.
				</p>{/if}
		</nav>
		{#key `${data.saved.id}:${Boolean(data.optionalUnavailable?.readerState)}`}
			<ReadingExperience
				saved={data.saved}
				initial={data.readerState}
				persistenceUnavailable={data.optionalUnavailable?.readerState ?? false}
			/>
			{#if canShareReading(data.saved.product_id)}<ReadingShare id={data.saved.id} />{/if}
		{/key}
		<article aria-label="Sua leitura completa">
			{#if reading.questions.length || reading.practice.trim()}
				<section class="chapter">
					{#if reading.questions.length}
						<h2>Perguntas para levar com você</h2>
						<ol>
							{#each reading.questions as question (question)}<li>{question}</li>{/each}
						</ol>
					{/if}
					{#if reading.practice.trim()}
						<h3>
							{reading.version === 'atv-current-reading/1.0.0'
								? 'Para levar desta leitura'
								: 'Experimente'}
						</h3>
						<p>{reading.practice}</p>
					{/if}
				</section>
			{/if}
			<section class="chapter">
				<h2>Alcance e limites desta leitura</h2>
				<ul>
					{#each reading.limits as limit (limit)}<li>{limit}</li>{/each}
				</ul>
			</section>
		</article>
		{#if data.optionalUnavailable?.notes}
			<section class="workspace" aria-labelledby="notes-title">
				<h2 id="notes-title">Suas anotações e acompanhamento</h2>
				<p role="status">
					Não foi possível recuperar suas anotações. A edição fica pausada até elas serem
					carregadas.
				</p>
				<button onclick={() => location.reload()}>Tentar novamente</button>
			</section>
		{:else if data.saved.calculation.version === DIRECTION_VERSION}
			<ReadingDirectionJourney
				saved={data.saved}
				notes={data.notes}
				{ready}
				{busy}
				onSave={(step, text) => save({ action: 'note', step, text })}
			/>
		{:else}
			<section class="workspace" aria-labelledby="notes-title">
				<h2 id="notes-title">Suas anotações e acompanhamento</h2>
				<p>Este espaço é seu: guarde um trecho, uma lembrança ou algo que gostaria de retomar.</p>
				{#if checkIns.length > 1}<label
						>Etapa<select bind:value={step}
							>{#each checkIns as day (day)}<option value={day}
									>{day === 0 ? 'Ponto de partida' : `Dia ${day}`}</option
								>{/each}</select
						></label
					>{/if}
				{#each data.notes as savedNote (savedNote.step)}<div class="note">
						<h3>{savedNote.step === 0 ? 'Anotação inicial' : `Dia ${savedNote.step}`}</h3>
						<p class="prose">{savedNote.text}</p>
					</div>{/each}
				<form
					onsubmit={(event) => {
						event.preventDefault();
						save({ action: 'note', step, text: note });
					}}
				>
					<label
						>Sua anotação<textarea maxlength="3000" required rows="4" bind:value={note}
						></textarea></label
					><button disabled={!ready || busy}>Salvar anotação desta etapa</button>
				</form>
			</section>
		{/if}
		<section class="workspace" aria-labelledby="feedback-title">
			<h2 id="feedback-title">Seu parecer sobre este produto</h2>
			{#if data.optionalUnavailable?.feedback}
				<p role="status">
					Não foi possível recuperar seu parecer. Recarregue para consultá-lo e registrar uma nova
					avaliação.
				</p>
				<button onclick={() => location.reload()}>Tentar novamente</button>
			{:else}
				{#if data.feedback}<p>
						Seu último parecer: <strong
							>{data.feedback.decision === 'approved' ? 'aprovado' : 'revisão solicitada'}</strong
						>. {data.feedback.reading_id !== data.saved.id
							? 'O parecer foi registrado em outra leitura deste produto.'
							: ''}
					</p>
					<p class="prose">{data.feedback.comment}</p>{/if}
				<label
					>Comentário sobre a leitura (opcional)<textarea
						maxlength="3000"
						rows="4"
						bind:value={comment}></textarea></label
				>
				<div class="decisions">
					<button
						disabled={!ready || busy}
						onclick={() => save({ action: 'feedback', decision: 'approved', comment })}
						>Aprovar este produto</button
					><button
						class="secondary"
						disabled={!ready || busy}
						onclick={() => save({ action: 'feedback', decision: 'rejected', comment })}
						>Solicitar revisão</button
					>
				</div>
				<p>
					Seu parecer fica vinculado a esta leitura e versão. A revisão automática não substitui sua
					avaliação.
				</p>
			{/if}
		</section>
		{#if status}<p class="notice" role="status">{status}</p>{/if}
		<details>
			<summary>{careerCompass ? 'Dados usados nesta leitura' : 'Origem e versão'}</summary>
			{#if !careerCompass}
				<p>{reading.version} · {data.saved.approval.policy}</p>
				<p class="digest">Identificador da revisão: {data.saved.approval.digest}</p>
			{:else}
				<p>
					Os fatos abaixo vêm dos dados informados e do cálculo experimental. Os limites de precisão
					estão descritos na seção acima.
				</p>
			{/if}
			<ul>
				{#each data.saved.calculation.facts as fact (fact.id)}<li>
						{#if careerCompass}<strong
								>{careerCompassFactLabel(fact.id)}:
							</strong>{careerCompassFactValue(fact.id, fact.display)}{:else}<strong
								>{fact.display}</strong
							>
							— {fact.source}{/if}
					</li>{/each}
			</ul>
			<p>
				O selo comprova os critérios do teste privado; não certifica precisão integral do motor ou
				uma oferta comercial.
			</p>
		</details>
	</div>
</ContentShell>

<style>
	.career-trial {
		--atv-ink: #183746;
		--atv-font-display: Newsreader, Georgia, serif;
		color: #183746;
		background: #f6efdf;
		border-top: 6px solid #4d6231;
		padding: 1rem clamp(1rem, 4vw, 3rem) 4rem;
	}
	.career-trial > nav:first-child {
		max-width: 1120px;
		margin: 0 auto 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
	}
	.career-hero {
		max-width: 1120px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem);
		background: #fff8e9;
		border: 1px solid #c7bfac;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 210px;
		align-items: center;
		gap: 2rem;
	}
	.career-hero h1 {
		font:
			500 clamp(2.5rem, 5vw, 4.5rem) / 1.05 Newsreader,
			Georgia,
			serif;
		max-width: 18ch;
		margin: 0.75rem 0 1.25rem;
	}
	.career-hero img {
		width: 210px;
		height: 210px;
		object-fit: contain;
	}
	.career-kicker,
	.career-caption {
		font:
			700 0.8rem/1.5 Onest,
			Arial,
			sans-serif;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: #4d6231;
	}
	.career-opening {
		font:
			400 1.25rem/1.7 Newsreader,
			Georgia,
			serif;
		max-width: 68ch;
	}
	.career-trial :global(.experience .reader-grid > nav) {
		background: #e1e7cc;
		border: 1px solid #c7bfac;
		border-top: 4px solid #4d6231;
		padding: 1rem;
	}
	.career-trial :global(.experience .reader-grid > article) {
		background: #fff8e9;
		border-color: #c7bfac;
		border-top: 4px solid #ce9b45;
		border-radius: 0;
	}
	.career-trial :global(.experience nav button[aria-current]) {
		color: #183746;
		background: #fff8e9;
		border-color: #4d6231;
	}
	.career-trial :global(.experience progress) {
		accent-color: #4d6231;
	}
	.career-trial .downloads,
	.career-trial .workspace,
	.career-trial > article,
	.career-trial > details {
		background: #fff8e9;
		border: 1px solid #c7bfac;
		border-radius: 0;
		padding: 1.5rem;
	}
	@media (max-width: 740px) {
		.career-hero {
			grid-template-columns: 1fr;
		}
		.career-hero img {
			width: 144px;
			height: 144px;
			margin: 0 auto;
		}
	}
	article,
	.workspace,
	.seal,
	.downloads,
	details {
		max-width: 850px;
		margin: 2rem auto;
	}
	.seal,
	.workspace {
		border: 1px solid #cfc2aa;
		border-radius: 1rem;
		padding: 1.5rem;
		background: var(--paper, #fff);
	}
	.chapter {
		margin: 2.5rem 0;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #d7cfbd;
	}
	.chapter h2 {
		font-size: 1.45rem;
		overflow-wrap: anywhere;
	}
	.prose {
		white-space: pre-wrap;
		line-height: 1.8;
		overflow-wrap: anywhere;
	}
	li {
		line-height: 1.7;
		margin: 0.5rem 0;
	}
	.downloads,
	.decisions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.delivery-note {
		max-width: 68ch;
		margin: 1.5rem auto 0;
		padding: 0.9rem 1rem;
		border-left: 3px solid #397da2;
		background: #f6f0e4;
		color: #213b59;
		line-height: 1.6;
	}
	.downloads a,
	button {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
	}
	button {
		font: inherit;
		background: #193549;
		color: #fff;
		border: 1px solid #193549;
		cursor: pointer;
	}
	.secondary {
		background: #fff;
		color: #193549;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	label {
		display: grid;
		gap: 0.6rem;
		margin: 1rem 0;
	}
	textarea,
	select {
		font: inherit;
		background: #fff;
		color: #193549;
		border: 1px solid #8b7256;
		border-radius: 0.5rem;
		padding: 0.75rem;
		width: 100%;
		box-sizing: border-box;
	}
	.notice {
		padding: 1rem;
		border-left: 3px solid #193549;
	}
	.digest {
		overflow-wrap: anywhere;
		font-size: 0.85rem;
	}
	.note {
		border-left: 2px solid #bca373;
		padding-left: 1rem;
	}
	a {
		color: inherit;
		text-underline-offset: 0.2em;
	}
</style>
