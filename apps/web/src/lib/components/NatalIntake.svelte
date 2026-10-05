<script lang="ts">
	import { customerProduct } from '$lib/data/product-copy';
	import { onMount, tick } from 'svelte';
	import { validAtlasPriorities, validDate, workflowFor } from '@atv/domain';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import {
		NATAL_REQUEST_VERSION,
		CAREER_REQUEST_VERSION,
		PURPOSE_CAREER_REQUEST_VERSION,
		LIFE_ATLAS_REQUEST_VERSION
	} from '$lib/natal-request';
	import { DATE_CONTEXT_REQUEST_VERSION } from '$lib/date-request';
	import { HOROSCOPE_REQUEST_VERSION } from '$lib/horoscope-request';
	import {
		WEEK_PREFERENCES_REQUEST_VERSION,
		WEEK_CONTEXT_LIMIT,
		WEEK_THEMES,
		validWeekTimezone,
		validWeekTheme
	} from '$lib/week-request';
	import {
		SOLAR_RETURN_REQUEST_VERSION,
		SOLAR_IMPORTANT_DATES_AUTHORIZATION,
		solarTargetDate,
		validSolarCity,
		validSolarCoordinateText,
		validSolarImportantDates
	} from '$lib/solar-return-request';
	import {
		PERSONAL_CALENDAR_REQUEST_VERSION,
		PERSONAL_CALENDAR_MARKS_AUTHORIZATION,
		validCalendarMarks
	} from '$lib/personal-calendar-request';
	import { REPORTED_CONTEXT_LIMIT, validReportedContext } from '$lib/reported-context';
	import {
		PAIR_REQUEST_VERSION,
		SYNASTRY_REQUEST_VERSION,
		COUPLE_DOSSIER_REQUEST_VERSION
	} from '$lib/pair-request';
	import { emptyPartnerForm, partnerFormValue } from '$lib/partner-form';
	import PartnerBirthFields from './PartnerBirthFields.svelte';
	import CitySearch from './CitySearch.svelte';
	import type { CityLocation } from '$lib/city-location';
	import type { OnboardingSnapshot } from '$lib/onboarding';
	import { requestOnboarding } from '$lib/onboarding-client';
	import type { IntakeAccess } from '$lib/symbolic-intake';
	import { createWorkflowRequest, type WorkflowRequestState } from '$lib/workflow-request';
	let { ownerId, productId, access }: { ownerId: string; productId: string; access: IntakeAccess } =
		$props();
	let controller: ReturnType<typeof createWorkflowRequest> | undefined;
	let initialized = $state(false);
	let snapshot = $state<OnboardingSnapshot | null>(null);
	let profileMessage = $state('Consulte seu perfil para revisar os dados deste pedido.');
	let loading = $state(false);
	let busy = $state(false);
	let consent = $state(false);
	let targetDate = $state('');
	let weekCity = $state<CityLocation | null>(null);
	const weekTimezone = $derived(weekCity?.timezone ?? '');
	let weekTheme = $state('');
	let solarYear = $state('');
	let solarLocation = $state<CityLocation | null>(null);
	const solarCity = $derived(solarLocation?.label ?? '');
	const solarTimezone = $derived(solarLocation?.timezone ?? '');
	const solarLatitude = $derived(solarLocation ? String(solarLocation.latitude) : '');
	const solarLongitude = $derived(solarLocation ? String(solarLocation.longitude) : '');
	let solarImportantDates = $state([
		{ date: '', label: '' },
		{ date: '', label: '' },
		{ date: '', label: '' }
	]);
	let solarDatesAuthorized = $state(false);
	let calendarMonth = $state('');
	let calendarMarks = $state(Array.from({ length: 5 }, () => ({ date: '', label: '' })));
	let calendarMarksAuthorized = $state(false);
	let reportedContext = $state('');
	let atlasPriorities = $state(['', '', '', '']);
	let partnerForm = $state(emptyPartnerForm());
	let partnerConsent = $state(false);
	let feedback: HTMLParagraphElement | undefined = $state();
	let outcome = $state<WorkflowRequestState>({
		mode: 'blocked',
		message: 'Preparando recuperação segura nesta aba.'
	});
	const product = $derived(workflowFor(productId));
	const isDate = $derived(productId === 'date-reading');
	const isHoroscope = $derived(productId === 'horoscope');
	const isWeek = $derived(productId === 'week-reading');
	const isSolar = $derived(productId === 'solar-return');
	const isCalendar = $derived(productId === 'personal-calendar');
	const isTemporal = $derived(isDate || isHoroscope || isWeek);
	const isCycle = $derived(isTemporal || isSolar || isCalendar);
	const isSynastry = $derived(productId === 'synastry');
	const isDossier = $derived(productId === 'couple-dossier');
	const isContextualPair = $derived(isSynastry || isDossier);
	const isPair = $derived(productId === 'pair-preview' || isContextualPair);
	const isPurposeCareer = $derived(productId === 'purpose-career');
	const isCareer = $derived(productId === 'career-compass' || isPurposeCareer);
	const isLifeAtlas = $derived(productId === 'life-atlas');
	const acceptsContext = $derived(isCareer || isCycle || isContextualPair || isLifeAtlas);
	const contextId = $derived(
		isDossier
			? 'couple-dossier-context'
			: isSynastry
				? 'synastry-context'
				: isCycle
					? isCalendar
						? 'calendar-context'
						: isSolar
							? 'solar-context'
							: isWeek
								? 'week-context'
								: isHoroscope
									? 'horoscope-context'
									: 'date-context'
					: isLifeAtlas
						? 'atlas-context'
						: 'career-context'
	);
	const atlasValid = $derived(!isLifeAtlas || validAtlasPriorities(atlasPriorities));
	const contextValid = $derived(
		!acceptsContext ||
			reportedContext === '' ||
			(validReportedContext(reportedContext) &&
				(!isWeek || reportedContext.length <= WEEK_CONTEXT_LIMIT))
	);
	const contextLimit = $derived(isWeek ? WEEK_CONTEXT_LIMIT : REPORTED_CONTEXT_LIMIT);
	const weekPreferencesValid = $derived(
		!isWeek || (validWeekTimezone(weekTimezone) && validWeekTheme(weekTheme))
	);
	const solarDate = $derived(
		/^\d{4}$/.test(solarYear) && snapshot?.natal
			? solarTargetDate(snapshot.natal.localDateTime, Number(solarYear))
			: null
	);
	const solarDateEntries = $derived(
		solarImportantDates.filter((entry) => entry.date || entry.label)
	);
	const solarValid = $derived(
		!isSolar ||
			(solarDate !== null &&
				Number(solarYear) >= Math.max(1901, Number(snapshot?.natal?.localDateTime.slice(0, 4))) &&
				Number(solarYear) <= 2099 &&
				validSolarCity(solarCity) &&
				validWeekTimezone(solarTimezone) &&
				validSolarCoordinateText(solarLatitude, 90) &&
				validSolarCoordinateText(solarLongitude, 180) &&
				(solarDateEntries.length === 0 ||
					(solarDatesAuthorized && validSolarImportantDates(solarDateEntries, solarDate))))
	);
	const calendarDate = $derived(
		/^\d{4}-(?:0[1-9]|1[0-2])$/.test(calendarMonth) ? `${calendarMonth}-01` : null
	);
	const calendarMarkEntries = $derived(calendarMarks.filter((entry) => entry.date || entry.label));
	const calendarValid = $derived(
		!isCalendar ||
			(calendarDate !== null &&
				validDate(calendarDate) &&
				(calendarMarkEntries.length === 0 ||
					(calendarMarksAuthorized && validCalendarMarks(calendarMarkEntries, calendarDate))))
	);
	const partnerValue = $derived(partnerFormValue(partnerForm));
	const pairValid = $derived(!isPair || (!!partnerValue.partner && partnerConsent));
	function resetConsents() {
		consent = false;
		partnerConsent = false;
		calendarMarksAuthorized = false;
	}
	const dateValid = $derived(
		!isTemporal || (validDate(targetDate) && (!isWeek || targetDate <= '2099-12-25'))
	);
	const canEnter = $derived(
		access === 'AVAILABLE' &&
			outcome.mode === 'new' &&
			snapshot?.state === 'COMPLETE' &&
			snapshot.natal?.timePrecision === 'EXACT' &&
			!loading &&
			!busy
	);
	const accessMessage = $derived(
		access === 'AVAILABLE'
			? 'Você pode enviar um pedido. Acompanhe o andamento na Biblioteca.'
			: access === 'UNRELEASED'
				? 'Este produto está em preparação. Novos pedidos ainda não estão disponíveis. Você pode consultar pedidos anteriores na Biblioteca.'
				: access === 'ACCESS_REQUIRED'
					? 'Seu acesso não permite criar este pedido agora. A consulta de pedidos anteriores continua disponível.'
					: 'Não foi possível confirmar a disponibilidade. Nenhum novo pedido será enviado.'
	);
	onMount(() => {
		try {
			controller = createWorkflowRequest({
				operation: {
					kind: isPair
						? 'create-pair'
						: isSolar
							? 'create-solar-return'
							: isCalendar
								? 'create-personal-calendar'
								: isWeek
									? 'create-week'
									: isHoroscope
										? 'create-horoscope'
										: isTemporal
											? 'create-date'
											: 'create-natal',
					ownerId
				},
				productId,
				storage: sessionStorage,
				fetch,
				randomUUID: () => crypto.randomUUID()
			});
			outcome = controller.inspect();
		} catch {
			outcome = {
				mode: 'blocked',
				message:
					'Esta aba não conseguiu guardar o acompanhamento do pedido. Confira sua Biblioteca.'
			};
		}
		initialized = true;
	});
	async function readProfile() {
		if (loading || busy) return;
		loading = true;
		resetConsents();
		snapshot = null;
		profileMessage = 'Consultando perfil salvo…';
		try {
			const response = await requestOnboarding(fetch, { intake: true });
			if (!response.ok) throw new Error('unavailable');
			const value = response.snapshot;
			snapshot = value;
			profileMessage = !value.natal
				? 'Complete e consinta o armazenamento do perfil natal antes de criar este pedido.'
				: value.natal.timePrecision !== 'EXACT'
					? 'Seu horário está registrado como aproximado. Este produto exige horário exato; não transforme uma estimativa em certeza.'
					: 'Perfil consultado. Confira os dados e autorize este pedido separadamente.';
		} catch {
			profileMessage =
				'Não foi possível consultar seu perfil. Nenhum dado foi alterado. Tente novamente ou entre na sua conta.';
		} finally {
			loading = false;
		}
	}
	async function focusFeedback() {
		await tick();
		feedback?.focus();
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (
			!controller ||
			!canEnter ||
			!consent ||
			!snapshot ||
			!dateValid ||
			!pairValid ||
			!weekPreferencesValid ||
			!solarValid ||
			!calendarValid ||
			!atlasValid ||
			!contextValid
		)
			return;
		busy = true;
		const input = {
			version: isCalendar
				? PERSONAL_CALENDAR_REQUEST_VERSION
				: isSolar
					? SOLAR_RETURN_REQUEST_VERSION
					: isPair
						? isDossier
							? COUPLE_DOSSIER_REQUEST_VERSION
							: isSynastry
								? SYNASTRY_REQUEST_VERSION
								: PAIR_REQUEST_VERSION
						: isTemporal
							? isWeek
								? WEEK_PREFERENCES_REQUEST_VERSION
								: isHoroscope
									? HOROSCOPE_REQUEST_VERSION
									: DATE_CONTEXT_REQUEST_VERSION
							: isLifeAtlas
								? LIFE_ATLAS_REQUEST_VERSION
								: isPurposeCareer
									? PURPOSE_CAREER_REQUEST_VERSION
									: isCareer
										? CAREER_REQUEST_VERSION
										: NATAL_REQUEST_VERSION,
			productId,
			expectedRevision: snapshot.revision,
			...(acceptsContext && reportedContext !== '' ? { context: reportedContext } : {}),
			...(isLifeAtlas ? { atlas: { priorities: atlasPriorities } } : {}),
			...(isTemporal ? { targetDate } : {}),
			...(isCalendar
				? {
						targetDate: calendarDate,
						...(calendarMarkEntries.length > 0
							? {
									calendarMarks: {
										authorization: PERSONAL_CALENDAR_MARKS_AUTHORIZATION,
										entries: calendarMarkEntries
									}
								}
							: {})
					}
				: {}),
			...(isSolar
				? {
						returnYear: Number(solarYear),
						targetDate: solarDate,
						returnLocation: {
							city: solarCity,
							timezone: solarTimezone,
							latitude: Number(solarLatitude),
							longitude: Number(solarLongitude)
						},
						...(solarDateEntries.length > 0
							? {
									importantDates: {
										authorization: SOLAR_IMPORTANT_DATES_AUTHORIZATION,
										entries: solarDateEntries
									}
								}
							: {})
					}
				: {}),
			...(isWeek ? { timezone: weekTimezone, theme: weekTheme } : {}),
			...(isPair
				? {
						partner: partnerValue.partner,
						partnerConsent: {
							storage: true,
							policyVersion: 'atv-partner-storage/1',
							permissionDeclared: true,
							sharing: false
						}
					}
				: {}),
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: isPair,
				continuity: false
			}
		};
		outcome = await controller.perform(true, input);
		reportedContext = '';
		atlasPriorities = ['', '', '', ''];
		targetDate = '';
		calendarMonth = '';
		calendarMarks = Array.from({ length: 5 }, () => ({ date: '', label: '' }));
		calendarMarksAuthorized = false;
		weekCity = null;
		weekTheme = '';
		solarYear = '';
		solarLocation = null;
		partnerForm = emptyPartnerForm();
		resetConsents();
		snapshot = null;
		profileMessage =
			'Para preparar outro envio, consulte novamente o perfil e revise o consentimento.';
		busy = false;
		await focusFeedback();
	}
	async function recover() {
		if (!controller || busy || loading) return;
		busy = true;
		outcome = await controller.perform(false);
		busy = false;
		await focusFeedback();
	}
	function another() {
		if (!controller || busy || loading) return;
		outcome = controller.startAnother();
		reportedContext = '';
		targetDate = '';
		calendarMonth = '';
		calendarMarks = Array.from({ length: 5 }, () => ({ date: '', label: '' }));
		calendarMarksAuthorized = false;
		weekCity = null;
		weekTheme = '';
		solarYear = '';
		solarLocation = null;
		partnerForm = emptyPartnerForm();
		resetConsents();
		snapshot = null;
	}
</script>

<section
	class="intake"
	data-stitch={isCycle || isPair ? 'ID-02 CMP-02 SH-02' : 'ID-02 SH-02'}
	aria-labelledby="natal-product-title"
>
	<header>
		<p class="eyebrow">
			{isPair
				? 'Amor e relacionamentos'
				: isCycle
					? 'Previsões'
					: isLifeAtlas
						? 'Mapa astral'
						: isCareer
							? 'Carreira e dinheiro'
							: 'Mapa astral'} · novo pedido
		</p>
		<h1 id="natal-product-title">{product?.name}</h1>
		<p class="lead">
			{customerProduct(productId)?.summary}
		</p>
		<p class="access-note">{accessMessage}</p>
	</header>
	<div class="workspace">
		<div>
			<section aria-labelledby="profile-title" class="profile">
				<h2 id="profile-title">1. Confira seu perfil natal</h2>
				<p role="status">{profileMessage}</p>
				{#if snapshot?.natal}
					<dl>
						<div>
							<dt>Data e hora local</dt>
							<dd>{snapshot.natal.localDateTime.replace('T', ' · ')}</dd>
						</div>
						<div>
							<dt>Precisão informada</dt>
							<dd>{snapshot.natal.timePrecision === 'EXACT' ? 'Exata' : 'Aproximada'}</dd>
						</div>
						<div>
							<dt>Local de nascimento</dt>
							<dd>{snapshot.natal.locationLabel} · {snapshot.natal.countryCode}</dd>
						</div>
						<div>
							<dt>Revisão consultada</dt>
							<dd>{snapshot.revision}</dd>
						</div>
					</dl>
				{/if}
				<div class="actions">
					<Button
						variant="secondary"
						pending={loading}
						disabled={!initialized || busy}
						onclick={readProfile}>Consultar perfil salvo</Button
					><a href="/conta/nascimento">Revisar dados de nascimento</a>
				</div>
			</section>
			<form method="POST" onsubmit={submit}>
				<fieldset disabled={!canEnter}>
					<legend
						>{isPair
							? '2. Dados da outra pessoa e autorizações'
							: isCycle
								? isSolar
									? '2. Ano, cidade do aniversário e autorização'
									: isCalendar
										? '2. Mês, marcos pessoais e autorização'
										: '2. Escolha a data e autorize'
								: isCareer
									? '2. Seu contexto e sua autorização'
									: '2. Autorize este pedido'}</legend
					>
					{#if isPair}
						<PartnerBirthFields
							bind:form={partnerForm}
							onchange={resetConsents}
							error={partnerValue.error}
						/>
						<label class="consent"
							><input
								type="checkbox"
								required
								bind:checked={partnerConsent}
								aria-describedby="partner-privacy"
							/>Declaro ter permissão da outra pessoa para armazenar e processar seus dados de
							nascimento neste pedido.</label
						>
						<p id="partner-privacy" class="privacy">
							Esta é a sua declaração; não é consentimento bilateral verificado. Não autoriza
							contato, e-mail, publicação ou compartilhamento com a outra pessoa. Ao alterar os
							dados, confirme novamente as duas autorizações.
						</p>
					{/if}
					{#if isTemporal}
						<Field
							id="target-date"
							label={isWeek ? 'Data inicial da semana' : 'Data da leitura'}
							help={isWeek
								? 'De 01/01/1900 a 25/12/2099. A base atual usa sete amostras geocêntricas consecutivas às 12h UTC. Elas não representam sete dias inteiros no seu fuso e não identificam eventos ou horários favoráveis.'
								: isHoroscope
									? 'De 01/01/1900 a 31/12/2099. O cálculo atual usa uma única amostra geocêntrica às 12h UTC nessa data, não o dia inteiro no seu fuso. Os pares com a base natal são nominais: precisão não certificada e estabilidade desconhecida. Não indica acontecimentos ou horários favoráveis.'
									: 'De 01/01/1900 a 31/12/2099. O cálculo atual usa uma única amostra geocêntrica às 12h UTC nessa data, não o dia inteiro no seu fuso. Não calcula aspectos, eventos nem horários favoráveis.'}
							error={targetDate && !dateValid
								? 'Escolha uma data válida dentro do intervalo informado.'
								: undefined}
						>
							{#snippet children(describedBy)}
								<input
									id="target-date"
									type="date"
									required
									min="1900-01-01"
									max={isWeek ? '2099-12-25' : '2099-12-31'}
									autocomplete="off"
									bind:value={targetDate}
									oninput={() => {
										consent = false;
									}}
									aria-describedby={describedBy}
									aria-invalid={!!targetDate && !dateValid}
								/>
							{/snippet}
						</Field>
					{/if}
					{#if isCalendar}
						<Field
							id="calendar-month"
							label="Mês do calendário"
							help="Escolha um mês entre janeiro de 1900 e dezembro de 2099. A grade usa dias civis UTC; não calcula eventos, trânsitos diários nem horários favoráveis."
							error={calendarMonth && !calendarValid
								? 'Revise o mês e os marcos informados.'
								: undefined}
						>
							{#snippet children(describedBy)}
								<input
									id="calendar-month"
									type="month"
									required
									min="1900-01"
									max="2099-12"
									autocomplete="off"
									bind:value={calendarMonth}
									oninput={resetConsents}
									aria-describedby={describedBy}
									aria-invalid={!!calendarMonth && !calendarValid}
								/>
							{/snippet}
						</Field>
						<fieldset class="solar-dates">
							<legend>Marcos pessoais deste mês (opcional)</legend>
							<p class="privacy">
								Informe até cinco datas distintas do mês, com uma descrição curta para cada uma.
								Estes são relatos seus, não eventos previstos. Evite dados de terceiros.
							</p>
							{#each calendarMarks as entry, index (index)}
								<Field id={`calendar-mark-date-${index}`} label={`Data do marco ${index + 1}`}>
									{#snippet children(describedBy)}
										<input
											id={`calendar-mark-date-${index}`}
											type="date"
											min={calendarDate ?? undefined}
											max={calendarDate
												? new Date(
														Date.UTC(
															Number(calendarDate.slice(0, 4)),
															Number(calendarDate.slice(5, 7)),
															0
														)
													)
														.toISOString()
														.slice(0, 10)
												: undefined}
											bind:value={entry.date}
											oninput={resetConsents}
											aria-describedby={describedBy}
										/>
									{/snippet}
								</Field>
								<Field
									id={`calendar-mark-label-${index}`}
									label={`Descrição do marco ${index + 1}`}
								>
									{#snippet children(describedBy)}
										<input
											id={`calendar-mark-label-${index}`}
											type="text"
											maxlength="80"
											autocomplete="off"
											bind:value={entry.label}
											oninput={resetConsents}
											aria-describedby={describedBy}
										/>
									{/snippet}
								</Field>
							{/each}
							<label class="consent"
								><input
									type="checkbox"
									bind:checked={calendarMarksAuthorized}
									onchange={() => {
										consent = false;
									}}
								/>Autorizo usar e guardar os marcos que informei somente neste pedido.</label
							>
						</fieldset>
					{/if}
					{#if isSolar}
						<Field
							id="solar-year"
							label="Ano da revolução solar"
							help="De 1901 a 2099, sem anteceder seu nascimento. A data de referência será derivada do aniversário civil do perfil conferido; em ano não bissexto, 29/02 usa 28/02."
							error={solarYear && !solarValid ? 'Revise o ano e os dados da cidade.' : undefined}
						>
							{#snippet children(describedBy)}
								<input
									id="solar-year"
									type="text"
									inputmode="numeric"
									pattern={'[0-9]{4}'}
									required
									maxlength="4"
									autocomplete="off"
									bind:value={solarYear}
									oninput={resetConsents}
									aria-describedby={describedBy}
								/>
							{/snippet}
						</Field>
						{#if solarDate}<p class="privacy">Data de referência derivada: {solarDate}.</p>{/if}
						<CitySearch
							id="solar-city"
							label="Cidade do aniversário"
							bind:value={solarLocation}
							onchange={resetConsents}
						/>
						<fieldset class="solar-dates">
							<legend>Datas importantes deste ciclo (opcional)</legend>
							<p class="privacy">
								Informe até três datas e uma descrição curta para cada uma. São relatos seus, não
								eventos previstos. Use datas entre a referência do aniversário e o mesmo dia do ano
								seguinte; datas repetidas não são aceitas.
							</p>
							{#each solarImportantDates as entry, index (index)}
								<Field id={`solar-important-date-${index}`} label={`Data importante ${index + 1}`}>
									{#snippet children(describedBy)}
										<input
											id={`solar-important-date-${index}`}
											type="date"
											min={solarDate ?? undefined}
											max={solarDate
												? `${Number(solarDate.slice(0, 4)) + 1}-${solarDate.slice(5)}`
												: undefined}
											bind:value={entry.date}
											oninput={resetConsents}
											aria-describedby={describedBy}
										/>
									{/snippet}
								</Field>
								<Field
									id={`solar-important-label-${index}`}
									label={`Descrição da data ${index + 1}`}
								>
									{#snippet children(describedBy)}
										<input
											id={`solar-important-label-${index}`}
											type="text"
											maxlength="80"
											autocomplete="off"
											bind:value={entry.label}
											oninput={resetConsents}
											aria-describedby={describedBy}
										/>
									{/snippet}
								</Field>
							{/each}
							<label class="consent">
								<input
									type="checkbox"
									bind:checked={solarDatesAuthorized}
									onchange={resetConsents}
								/>
								Autorizo usar e guardar as datas e descrições que informei somente neste pedido.
							</label>
						</fieldset>
						<p class="privacy">
							A base local de cálculo é experimental. A cidade selecionada é a cidade em que você
							estará no aniversário. Nenhuma leitura ou PDF está liberado.
						</p>
					{/if}
					{#if isWeek}
						<CitySearch
							id="week-city"
							label="Cidade em que você está nesta semana"
							bind:value={weekCity}
							onchange={resetConsents}
						/>
						<p class="privacy">
							O fuso da cidade será usado como contexto deste pedido. A base atual permanece às 12h
							UTC e não calcula dias locais completos.
						</p>
						<Field
							id="week-theme"
							label="Tema da semana"
							help="Escolha o foco da reflexão. O tema será declarado neste pedido e não altera os cálculos nem determina acontecimentos."
						>
							{#snippet children(describedBy)}
								<select
									id="week-theme"
									required
									bind:value={weekTheme}
									onchange={resetConsents}
									aria-describedby={describedBy}
								>
									<option value="">Escolha um tema</option>
									{#each Object.entries(WEEK_THEMES) as [value, label] (value)}
										<option {value}>{label}</option>
									{/each}
								</select>
							{/snippet}
						</Field>
					{/if}
					{#if isLifeAtlas}
						<fieldset class="extra-fields">
							<legend>Quatro prioridades para este pedido</legend>
							<p class="privacy">
								Escolha quatro áreas distintas da sua vida. Estes nomes são suas escolhas, não
								conclusões do mapa. Cada campo aceita até 120 caracteres.
							</p>
							{#each atlasPriorities as priority, index (index)}
								<Field
									id={'atlas-priority-' + index}
									label={'Prioridade ' + (index + 1)}
									error={priority && !atlasValid
										? 'Informe quatro prioridades distintas e válidas.'
										: undefined}
								>
									{#snippet children(describedBy)}
										<input
											id={'atlas-priority-' + index}
											type="text"
											required
											maxlength="120"
											autocomplete="off"
											bind:value={atlasPriorities[index]}
											oninput={resetConsents}
											aria-describedby={describedBy}
											aria-invalid={!atlasValid && priority !== ''}
										/>
									{/snippet}
								</Field>
							{/each}
						</fieldset>
					{/if}
					{#if acceptsContext}
						<Field
							id={contextId}
							label={isContextualPair
								? 'Contexto do vínculo (opcional)'
								: isCycle
									? 'Contexto da consulta (opcional)'
									: isLifeAtlas
										? 'Contexto das prioridades (opcional)'
										: 'Contexto profissional (opcional)'}
							help="Conte o que deseja explorar neste momento, sem nomes de terceiros, contatos ou dados sensíveis. Este é um relato seu, não uma conclusão astrológica. Pode deixar vazio."
							error={!contextValid
								? `Escreva até ${contextLimit.toLocaleString('pt-BR')} caracteres válidos ou deixe o campo vazio.`
								: undefined}
						>
							{#snippet children(describedBy)}
								<textarea
									id={contextId}
									rows="5"
									maxlength={contextLimit}
									autocomplete="off"
									bind:value={reportedContext}
									oninput={resetConsents}
									aria-describedby={describedBy + ' ' + contextId + '-count'}
									aria-invalid={!contextValid}></textarea>
							{/snippet}
						</Field>
						<p id={contextId + '-count'} class="privacy">
							{reportedContext.length} / {contextLimit.toLocaleString('pt-BR')} caracteres. O relato será
							guardado somente neste pedido; não atualiza o perfil natal nem autoriza memória ATV+.
						</p>
					{/if}
					<label class="consent"
						><input
							type="checkbox"
							required
							bind:checked={consent}
							aria-describedby="natal-retention"
						/>{isContextualPair
							? 'Autorizo guardar as cópias dos dados natais conferidos de ambas as pessoas, o contexto que escolhi informar e os resultados deste pedido na minha conta.'
							: isPair
								? 'Autorizo guardar as cópias dos dados natais conferidos de ambas as pessoas e os resultados deste pedido na minha conta.'
								: isWeek
									? 'Autorizo guardar uma cópia dos dados natais conferidos, da data escolhida, do fuso da cidade selecionada e tema que declarei, do contexto que escolhi informar e dos resultados deste pedido na minha conta.'
									: isSolar
										? 'Autorizo guardar uma cópia dos dados natais conferidos, do ano, da cidade selecionada para o aniversário e da localização calculada automaticamente, das datas importantes autorizadas, do contexto opcional e dos resultados deste pedido na minha conta.'
										: isTemporal
											? 'Autorizo guardar uma cópia dos dados natais conferidos, da data escolhida, do contexto que escolhi informar e dos resultados deste pedido na minha conta.'
											: isCalendar
												? 'Autorizo guardar uma cópia dos dados natais conferidos, do mês escolhido, dos marcos pessoais autorizados, do contexto opcional e dos resultados deste pedido na minha conta.'
												: isLifeAtlas
													? 'Autorizo guardar uma cópia dos dados natais conferidos, as quatro prioridades e o contexto opcional que declarei, e os resultados deste pedido na minha conta.'
													: isCareer
														? 'Autorizo guardar uma cópia dos dados natais conferidos, do contexto profissional que escolhi informar e dos resultados deste pedido na minha conta.'
														: 'Autorizo guardar uma cópia dos dados natais conferidos e os resultados deste pedido na minha conta.'}</label
					>
					<p id="natal-retention" class="privacy">
						Apagar o perfil natal não apaga a cópia já vinculada a um pedido. O pedido e seu
						histórico são gerenciados separadamente na Biblioteca. Esta autorização não inclui
						marketing nem continuidade automática ATV+.
					</p>
					<Button
						type="submit"
						pending={busy}
						disabled={!canEnter ||
							!consent ||
							!dateValid ||
							!pairValid ||
							!contextValid ||
							!solarValid ||
							!calendarValid ||
							!atlasValid ||
							!weekPreferencesValid}>Solicitar leitura</Button
					>
				</fieldset>
			</form>
			<div class="recovery">
				{#if outcome.message}<p bind:this={feedback} role="status" tabindex="-1">
						{outcome.message}
					</p>{/if}
				{#if outcome.mode === 'recover'}<Button
						variant="secondary"
						pending={busy}
						disabled={loading}
						onclick={recover}>Consultar pedido</Button
					>{/if}
				{#if outcome.href}<div class="actions">
						<Button href={outcome.href}>Acompanhar na Biblioteca</Button><Button
							variant="secondary"
							disabled={busy || loading || access !== 'AVAILABLE'}
							onclick={another}>Iniciar outra leitura</Button
						>
					</div>{/if}
			</div>
		</div>
		<aside aria-label="Método e continuidade">
			<p class="eyebrow">Como funciona</p>
			<h2>Dos seus dados à leitura</h2>
			<p>
				O horário de nascimento influencia o Ascendente e as casas. Por isso, esta leitura precisa
				dos dados indicados no formulário.
			</p>
			<ol>
				<li>
					O pedido usa os dados de nascimento conferidos{isPair
						? ' e dos dados da outra pessoa'
						: isCycle
							? isSolar
								? ' e da cidade do aniversário declarada'
								: ' e da data escolhida'
							: ''}.
				</li>
				<li>Os dados são conferidos e o mapa é calculado.</li>
				<li>A leitura é revisada antes de aparecer na Biblioteca.</li>
			</ol>
			{#if isDossier}<p>
					O Dossiê do Casal está em preparação. A proposta é aprofundar comunicação, desejo e
					convivência a partir dos dois mapas.
				</p>{:else if isSynastry}<p>
					A Sinastria está em preparação. Ela compara os dois mapas para explorar afinidades e
					diferenças no relacionamento.
				</p>{:else if isPair}<p>
					Nesta versão de teste, a comparação usa as posições de Lua, Vênus e Marte de cada pessoa.
					Os aspectos entre os dois mapas ainda não são calculados.
				</p>{/if}
			{#if isWeek}<p>
					As Previsões da Semana estão em preparação. A base de teste usa sete momentos
					consecutivos; a cobertura de cada dia ainda precisa ser validada. O fuso atual e o tema
					escolhido ajudam a situar seu pedido.
				</p>{/if}
			{#if isSolar}<p>
					A Revolução Solar está em preparação. Ela usa seu mapa natal e a cidade onde você estará
					no aniversário. As datas importantes que você informar ficam neste pedido; o
					acompanhamento anual ainda não está disponível.
				</p>{/if}
			{#if isHoroscope}<p>
					O Horóscopo Personalizado está em preparação. As previsões diárias, semanais e mensais
					ainda precisam ser validadas antes da liberação.
				</p>{/if}
			{#if isTemporal && !isWeek}<p>
					A versão de teste analisa momentos específicos. Informe seu fuso atual quando solicitado,
					mesmo que seja diferente do local de nascimento.
				</p>{/if}
			{#if isCareer}<p>
					A base de teste usa uma parte do mapa. A leitura completa sobre carreira e dinheiro ainda
					está em preparação.
				</p>{/if}
			<p>
				Acompanhe o andamento na Biblioteca. O resultado e seus downloads aparecem quando estiverem
				liberados.
			</p>
			<a href="/biblioteca">Voltar à Biblioteca →</a>
		</aside>
	</div>
</section>

<style>
	.intake {
		max-width: 1280px;
		margin: 0 auto;
		color: var(--atv-text-primary);
	}
	header {
		border-bottom: 1px solid var(--atv-border);
		padding-bottom: 2rem;
		margin-bottom: 2rem;
	}
	h1 {
		font-family: var(--atv-font-display);
		font-size: clamp(2rem, 4vw, 3.5rem);
		line-height: 1.12;
		margin: 0.7rem 0 1rem;
	}
	h2,
	legend {
		font-family: var(--atv-font-display);
		font-size: 1.6rem;
		line-height: 1.25;
	}
	.lead {
		font-family: var(--atv-font-editorial);
		font-size: 1.25rem;
		max-width: 42rem;
	}
	.access-note {
		border-left: 3px solid #bf9153;
		padding: 0.8rem 1rem;
		margin-top: 1.5rem;
		max-width: 48rem;
	}
	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(230px, 1fr);
		gap: 2.5rem;
		align-items: start;
	}
	.workspace > div {
		min-width: 0;
	}
	.profile {
		border-bottom: 1px solid var(--atv-border);
		padding-bottom: 2rem;
		margin-bottom: 2rem;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	dt {
		font-size: 0.8rem;
		margin-bottom: 0.35rem;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
		font-variant-numeric: tabular-nums;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		margin-bottom: 1rem;
	}
	.consent {
		display: flex;
		align-items: flex-start;
		gap: 0.8rem;
		min-height: 44px;
		line-height: 1.6;
		margin-top: 1rem;
	}
	input[type='date'],
	#week-theme,
	#solar-year {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		min-height: 44px;
	}
	.consent input {
		flex: 0 0 auto;
		margin-top: 0.3rem;
	}
	.privacy {
		font-size: 0.875rem;
		line-height: 1.6;
		margin: 1rem 0 1.5rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}
	.recovery {
		margin-top: 1.5rem;
	}
	aside {
		border-left: 1px solid var(--atv-border);
		padding-left: 2rem;
		line-height: 1.75;
	}
	ol {
		padding-left: 1.25rem;
	}
	li {
		margin-bottom: 0.9rem;
	}
	a {
		text-underline-offset: 0.2em;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	@media (max-width: 767px) {
		.workspace {
			grid-template-columns: minmax(0, 1fr);
			gap: 2rem;
		}
		aside {
			border-left: 0;
			border-top: 1px solid var(--atv-border);
			padding: 1.5rem 0 0;
		}
		dl {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
