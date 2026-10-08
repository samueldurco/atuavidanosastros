<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { WORKFLOW_VERSION, tarotMethodFor, type WorkflowInput } from '@atv/domain';
	import { trialResponse } from '$lib/trials/response';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import TrialBirthFields from '$lib/components/TrialBirthFields.svelte';
	import BirthCityFields from '$lib/components/BirthCityFields.svelte';
	import { resolvedCivilInstant } from '$lib/city-location';
	let { data } = $props();
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	const blankBirth = () => ({
		name: '',
		date: '',
		time: '',
		location: '',
		country: '',
		latitude: '',
		longitude: '',
		timezone: '',
		source: '',
		occurrence: ''
	});
	let birth = $state(blankBirth()),
		partner = $state(blankBirth()),
		returnCity = $state(blankBirth());
	let context = $state(''),
		storage = $state(false),
		partnerConsent = $state(false),
		historyConsent = $state(false);
	let targetDate = $state(new Date().toISOString().slice(0, 10)),
		month = $state(new Date().toISOString().slice(0, 7));
	let returnYear = $state(new Date().getFullYear());
	const tarotMethod = $derived(tarotMethodFor(data.product.id));
	let focus = $state(''),
		goal = $state(''),
		startDate = $state(new Date().toISOString().slice(0, 10));
	let priorities = $state(['Autocuidado', 'Vínculos', 'Trabalho', 'Aprendizado']);
	const priorityOptions = [
		'Autocuidado',
		'Vínculos',
		'Trabalho',
		'Aprendizado',
		'Família',
		'Criatividade',
		'Organização financeira',
		'Vida cotidiana',
		'Propósito',
		'Descanso'
	];
	let narrative = $state(''),
		emotions = $state(''),
		associations = $state(''),
		sourceIds = $state<string[]>([]);
	let busy = $state(false),
		message = $state(''),
		requestKey = $state(''),
		lastPayload = '';
	let birthConfirmed = $state(false);
	$effect(() => {
		JSON.stringify(birth);
		JSON.stringify(partner);
		birthConfirmed = false;
	});
	onMount(() => {
		const old = data.previous?.input;
		if (!old) return;
		const prefill = (value: WorkflowInput['birth'], name?: string, city?: string) =>
			value
				? {
						...blankBirth(),
						name: name ?? '',
						date: value.localDateTime.slice(0, 10),
						time: value.localDateTime.slice(11, 16),
						location: city ?? 'Local da leitura anterior',
						latitude: String(value.latitude),
						longitude: String(value.longitude),
						timezone: value.timezone,
						source: value.locationSource
					}
				: blankBirth();
		birth = prefill(old.birth, old.presentation?.name, old.presentation?.city);
		partner = prefill(old.partner, old.presentation?.partnerName, old.presentation?.partnerCity);
		context = old.context ?? '';
		if (old.atlas) priorities = [...old.atlas.priorities];
		if (old.targetDate) {
			targetDate = old.targetDate;
			month = old.targetDate.slice(0, 7);
		}
		if (old.returnYear) returnYear = old.returnYear;
		if (old.returnLocation)
			returnCity = {
				...blankBirth(),
				location: old.returnLocation.city,
				timezone: old.returnLocation.timezone,
				latitude: String(old.returnLocation.latitude),
				longitude: String(old.returnLocation.longitude),
				source: old.returnLocation.locationSource
			};
		focus = old.focus ?? '';
		if (old.journey) {
			goal = old.journey.goal;
			startDate = old.journey.startDate;
		}
		if (old.tarotJourney) goal = old.tarotJourney.goal;
		if (old.dreamAtlas) startDate = old.dreamAtlas.startDate;
		if (old.dream) {
			targetDate = old.dream.date;
			narrative = old.dream.narrative;
			emotions = old.dream.emotions.join(', ');
			associations = old.dream.associations.join(', ');
		}
	});
	const needsBirth = $derived(
		['natal', 'cycles', 'relationship', 'purpose'].includes(data.product.kind) &&
			data.product.id !== 'direction-journey'
	);
	const isHistory = $derived(['dream-dossier', 'dream-atlas'].includes(data.product.id));
	function birthValue(form: ReturnType<typeof blankBirth>) {
		if (!form.source || !form.location) throw Error('Selecione a cidade de nascimento na busca.');
		return {
			localDateTime: `${form.date}T${form.time}:00`,
			utcInstant: resolvedCivilInstant(form.date, form.time, form.timezone, form.occurrence)
				.utcInstant,
			timezone: form.timezone,
			latitude: Number(form.latitude),
			longitude: Number(form.longitude),
			locationSource: form.source
		};
	}
	function reviewBirth(form: ReturnType<typeof blankBirth>) {
		if (!form.date || !form.time || !form.timezone)
			return 'Preencha data, hora e selecione a cidade para conferir.';
		try {
			const instant = birthValue(form).utcInstant;
			return `${form.name || 'Nascimento'} · ${form.date.split('-').reverse().join('/')} às ${form.time} · ${form.location}. Fuso local: ${form.timezone}. Corresponde a ${instant.replace('T', ' ').replace('.000Z', ' UTC')}.`;
		} catch {
			return 'Confira a cidade e escolha a ocorrência da hora, quando solicitada.';
		}
	}
	async function generate(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		message = '';
		try {
			if (!storage) throw Error('Autorize o salvamento privado para gerar sua leitura.');
			const input: WorkflowInput = {
				version: WORKFLOW_VERSION,
				productId: data.product.id,
				consent: {
					storage: true,
					policyVersion: 'atv-input-consent/1',
					partner: data.product.kind === 'relationship' && partnerConsent,
					continuity: data.product.id === 'dream-dossier' && historyConsent
				}
			};
			if (needsBirth) input.birth = birthValue(birth);
			if (data.product.kind === 'relationship') input.partner = birthValue(partner);
			if (needsBirth) {
				if (!birthConfirmed) throw Error('Confira os dados e confirme antes de gerar.');
				input.presentation = {
					version: 'atv-reading-identity/1',
					city: birth.location,
					...(birth.name.trim() ? { name: birth.name.trim() } : {}),
					...(data.product.kind === 'relationship'
						? {
								partnerCity: partner.location,
								...(partner.name.trim() ? { partnerName: partner.name.trim() } : {})
							}
						: {})
				};
			}
			if (data.product.kind === 'cycles')
				input.targetDate = data.product.id === 'personal-calendar' ? month + '-01' : targetDate;
			if (data.product.id === 'solar-return') {
				if (!returnCity.source)
					throw Error('Selecione a cidade onde deseja calcular a revolução solar.');
				input.returnYear = Number(returnYear);
				const birthday = input.birth!.localDateTime.slice(5, 10);
				input.targetDate = `${returnYear}-${birthday === '02-29' && !((returnYear % 4 === 0 && returnYear % 100 !== 0) || returnYear % 400 === 0) ? '02-28' : birthday}`;
				input.returnLocation = {
					city: returnCity.location,
					timezone: returnCity.timezone,
					latitude: Number(returnCity.latitude),
					longitude: Number(returnCity.longitude),
					locationSource: returnCity.source
				};
			}
			if (data.product.id === 'direction-journey') input.journey = { goal, startDate };
			if (data.product.id === 'tarot-journey') input.tarotJourney = { goal };
			if (data.product.id === 'life-atlas') {
				if (new Set(priorities).size !== 4) throw Error('Escolha quatro prioridades diferentes.');
				input.atlas = { priorities: priorities as [string, string, string, string] };
			}
			if (data.product.id === 'dream-atlas') input.dreamAtlas = { startDate };
			if (tarotMethod && focus.trim()) input.focus = focus.trim();
			if (data.product.kind === 'dream' && data.product.id !== 'dream-atlas')
				input.dream = {
					date: targetDate,
					narrative,
					emotions: emotions
						.split(',')
						.map((v) => v.trim())
						.filter(Boolean),
					associations: associations
						.split(',')
						.map((v) => v.trim())
						.filter(Boolean)
				};
			if (context.trim()) input.context = context.trim();
			const payload = JSON.stringify({ input, sourceIds });
			if (payload !== lastPayload) {
				requestKey = crypto.randomUUID();
				lastPayload = payload;
			}
			busy = true;
			const result = await fetch('/api/private-trials', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ input, sourceIds, requestKey })
			});
			const value = await trialResponse<{ message?: string; id?: string }>(result);
			if (!value.id) throw Error('Não foi possível recuperar a leitura salva.');
			await goto(`/testar-produtos/leituras/${value.id}`);
		} catch (e) {
			message = e instanceof Error ? e.message : 'Não foi possível gerar. Tente novamente.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>{data.product.name} — teste gratuito</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<a href="/testar-produtos">← Todos os produtos e sua biblioteca</a>
	<PageIntro
		eyebrow="Teste privado · gratuito"
		title={data.product.name}
		description="Crie uma leitura com seus dados. A revisão automática verifica os critérios antes de salvar; depois você pode aprovar ou rejeitar o produto."
	/>
	<form onsubmit={generate} aria-busy={busy}>
		<fieldset class="intake-fields" disabled={!ready || busy}>
			{#if data.previous}<p>
					Correção da leitura anterior: confira e ajuste os dados abaixo. A nova leitura será salva
					separadamente; a anterior continuará na biblioteca.
				</p>{/if}
			{#if needsBirth}<TrialBirthFields id="birth" label="Seu nascimento" bind:form={birth} />{/if}
			{#if data.product.kind === 'relationship'}
				<TrialBirthFields id="partner" label="Nascimento da outra pessoa" bind:form={partner} />
				<label class="check"
					><input type="checkbox" required bind:checked={partnerConsent} />Confirmo que tenho
					autorização para usar e salvar os dados dessa pessoa nesta leitura privada.</label
				>
			{/if}
			{#if data.product.kind === 'cycles'}
				{#if data.product.id === 'personal-calendar'}<label
						>Mês do calendário<input
							type="month"
							min="1900-01"
							max="2099-12"
							required
							bind:value={month}
						/></label
					>
				{:else if data.product.id === 'solar-return'}<label
						>Ano da revolução solar<input
							type="number"
							min="1901"
							max="2099"
							required
							bind:value={returnYear}
						/></label
					>
					<p>
						A referência usa o aniversário no ano escolhido. Para nascimento em 29 de fevereiro, usa
						28 de fevereiro nos anos sem esse dia.
					</p>
				{:else}<label
						>Data de referência<input
							type="date"
							min="1900-01-01"
							max="2099-12-31"
							required
							bind:value={targetDate}
						/></label
					>{/if}
				{#if data.product.id === 'solar-return'}<BirthCityFields
						id="return-city"
						label="Cidade de referência para a revolução solar"
						bind:form={returnCity}
					/>{/if}
			{/if}
			{#if ['direction-journey', 'tarot-journey'].includes(data.product.id)}<label
					>Objetivo que você quer explorar<textarea maxlength="400" required bind:value={goal}
					></textarea></label
				>{/if}
			{#if ['direction-journey', 'dream-atlas'].includes(data.product.id)}<label
					>Início do período de 30 dias<input
						type="date"
						min="1900-01-01"
						max="2099-12-02"
						required
						bind:value={startDate}
					/></label
				>{/if}
			{#if data.product.id === 'life-atlas'}
				<fieldset>
					<legend>Suas quatro prioridades, em ordem</legend>
					<p>Escolha temas distintos. Essa ordem é sua, e pode ser revista.</p>
					{#each [0, 1, 2, 3] as i (i)}<label
							>Prioridade {i + 1}<select required bind:value={priorities[i]}>
								{#each priorityOptions as option (option)}<option
										value={option}
										disabled={priorities.some((v, index) => index !== i && v === option)}
										>{option}</option
									>{/each}
							</select></label
						>{/each}
				</fieldset>
			{/if}
			{#if tarotMethod}
				<p>
					{tarotMethod.description} São {tarotMethod.positions.length}
					{tarotMethod.positions.length === 1
						? 'carta, com uma posição definida'
						: 'cartas, cada uma com uma função definida'}.
				</p>
				<label
					>Foco da consulta (opcional)<textarea
						maxlength="400"
						bind:value={focus}
						aria-describedby="tarot-focus-help"></textarea></label
				>
				<p id="tarot-focus-help">
					Você pode indicar uma situação ou assunto. Se deixar em branco, receberá a leitura
					completa conforme as posições deste método.
				</p>
			{/if}
			{#if data.product.kind === 'dream' && data.product.id !== 'dream-atlas'}
				<label
					>Data do sonho<input
						type="date"
						min="1900-01-01"
						max="2099-12-31"
						required
						bind:value={targetDate}
					/></label
				>
				<label
					>Seu relato<textarea rows="7" maxlength="6000" required bind:value={narrative}
					></textarea></label
				>
				<label
					>Emoções percebidas (até oito, separadas por vírgula)<input
						maxlength="640"
						bind:value={emotions}
					/></label
				>
				<label
					>Suas associações pessoais (até oito, separadas por vírgula)<textarea
						maxlength="1600"
						bind:value={associations}></textarea></label
				>
			{/if}
			{#if isHistory}
				<fieldset>
					<legend>Registros do seu diário que você deseja incluir</legend>
					<p>
						Somente os registros selecionados serão usados. <a href="/testar-produtos/dream-journal"
							>Adicionar um sonho ao diário</a
						>.
					</p>
					{#if !data.dreams.length}<p>
							Seu diário ainda está vazio. Salve um primeiro sonho para usar o Atlas de Sonhos.
						</p>{/if}
					{#each data.dreams as dream (dream.id)}<label class="check"
							><input type="checkbox" value={dream.id} bind:group={sourceIds} />{dream.date} — {dream.preview}</label
						>{/each}
				</fieldset>
				{#if data.product.id === 'dream-dossier'}<label class="check"
						><input type="checkbox" bind:checked={historyConsent} />Autorizo usar os registros
						selecionados nesta síntese.</label
					>{/if}
			{/if}
			{#if needsBirth}
				<aside aria-label="Confira os dados usados no cálculo">
					<h2>Confira antes de gerar</h2>
					<p>{reviewBirth(birth)}</p>
					{#if data.product.kind === 'relationship'}<p>{reviewBirth(partner)}</p>{/if}<label
						><input type="checkbox" required bind:checked={birthConfirmed} />Conferi a cidade, a
						data e a hora de cada pessoa.</label
					>
				</aside>
			{/if}
			<label
				>Contexto que deseja trazer (opcional)<textarea
					maxlength="1200"
					rows="3"
					bind:value={context}></textarea></label
			>
			<p>
				Conteúdo original gerado com IA e revisado editorialmente, combinado com os fatos desta
				leitura. Seus dados ficam na biblioteca privada; esta geração não envia seu relato a um
				modelo externo.
			</p>
			<label class="check"
				><input type="checkbox" required bind:checked={storage} />Autorizo salvar os dados e o
				resultado na minha biblioteca privada para testar e avaliar este produto.</label
			>
			{#if message}<p class="message" role="alert">{message}</p>{/if}
			<button type="submit" disabled={busy}
				>{busy ? 'Calculando, revisando e salvando…' : 'Gerar leitura gratuita'}</button
			>
			<p>Você poderá reabrir a leitura e registrar sua aprovação ou rejeição. Não há cobrança.</p>
		</fieldset>
	</form>
</ContentShell>

<style>
	form {
		max-width: 800px;
		margin: 2rem auto;
	}
	.intake-fields {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	label {
		display: grid;
		gap: 0.5rem;
		margin: 1.25rem 0;
	}
	input,
	textarea,
	button {
		font: inherit;
	}
	input:not([type='checkbox']),
	textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #817866;
		border-radius: 0.5rem;
		padding: 0.75rem;
		background: var(--paper, #fff);
		color: inherit;
	}
	textarea {
		resize: vertical;
	}
	.check {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		line-height: 1.5;
	}
	.check input {
		margin-top: 0.3rem;
		flex-shrink: 0;
	}
	fieldset {
		padding: 1rem;
		border: 1px solid #b4aa96;
		border-radius: 1rem;
		margin: 1.5rem 0;
	}
	button {
		background: #243d39;
		color: #fff;
		border: 0;
		border-radius: 0.5rem;
		padding: 1rem 1.5rem;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.65;
		cursor: wait;
	}
	.message {
		border-left: 3px solid #984d33;
		padding: 1rem;
		background: #f7eee7;
	}
	a {
		color: inherit;
		text-underline-offset: 0.2em;
	}
</style>
