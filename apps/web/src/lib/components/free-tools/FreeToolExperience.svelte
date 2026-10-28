<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { beforeNavigate } from '$app/navigation';
	import { onMount, tick, untrack } from 'svelte';
	import { resolvedCivilInstant } from '$lib/city-location';
	import { emptyNatalForm, type NatalForm } from '$lib/natal-form';
	import type { FreeToolResult, FreeToolNatalInput, FreeToolResponse } from '$lib/free-tools';
	import { parseFreeToolResult } from '$lib/free-tool-result';
	import { freeToolReadingFacts } from '$lib/free-tool-result-presentation';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import AstrologicalChart from '$lib/components/AstrologicalChart.svelte';
	import TarotCard from '$lib/components/TarotCard.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import FreeBirthFields from '$lib/components/free-tools/FreeBirthFields.svelte';
	import HoroscopeTool from '$lib/components/free-tools/HoroscopeTool.svelte';
	import type { FreeTool } from '$lib/data/free-tools';
	import { customerProduct } from '$lib/data/product-copy';
	import { interestNavigation } from '$lib/data/public-navigation';
	import MvpProductArt from '$lib/components/MvpProductArt.svelte';
	import { freeToolContinuation } from './free-tool-design';
	import { parseFreeToolState, type FreeToolState, type FreeToolQuota } from '$lib/free-tool-state';
	import { trackHomeEvent } from '$lib/analytics/home-events';
	let {
		data,
		embedded = false,
		active = true
	}: {
		data: { tool: FreeTool };
		embedded?: boolean;
		active?: boolean;
	} = $props();
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});
	let birth = $state(emptyNatalForm());
	let partner = $state(emptyNatalForm());
	let pairConsent = $state(false);
	let samePair = $state(false);
	let focus = $state('');
	let dreamDate = $state('');
	let narrative = $state('');
	let emotions = $state('');
	let associations = $state('');
	let result = $state<FreeToolResult | null>(null);
	const readingFacts = $derived(freeToolReadingFacts(result));
	let receipt = $state<string | null>(null);
	let pending = $state(false);
	let error = $state('');
	let editing = $state(false);
	let resultHeading = $state<HTMLHeadingElement>();
	let formElement = $state<HTMLFormElement>();
	let quota = $state<FreeToolQuota | null>(null);
	let sharedProfile = $state<FreeToolState['profile']>(null);
	let serverReady = $state(false);
	let recovering = $state(false);
	let identityConflict = $state(false);
	let identityRequired = $state(false);
	let dreamHistory = $state<FreeToolState[]>([]);
	let dreamTarget = $state<string | null>(null);
	let linkedDream = $state(false);
	let dreamCursor = $state<string | null>(null);
	let historyPending = $state(false);
	let storageMessage = $state('');
	let owner = $state<string | null>(null);
	let requestEpoch = 0;
	let controller: AbortController | null = null;
	let observedIdentity: string | null | undefined;
	const draftLifetime = 30 * 60 * 1000;
	const tool = $derived(data.tool);
	const topic = $derived(interestNavigation.find((item) => item.id === tool.topicId));
	const isNatal = $derived(
		[
			'ascendente',
			'mapa-astral',
			'meio-do-ceu',
			'dinheiro-no-mapa',
			'combinacao-do-casal'
		].includes(tool.id)
	);
	const isTarot = $derived(['carta-do-dia', 'carta-do-amor', 'tarot-sim-ou-nao'].includes(tool.id));
	const nextOffer = $derived(customerProduct(tool.offerIds[0]));
	const continuation = $derived({
		href: `${nextOffer?.href ?? topic?.href ?? '/leituras'}?ferramenta=${encodeURIComponent(tool.id)}&origem=ferramenta${result ? `&resultado=${encodeURIComponent(result.id)}` : ''}`,
		title: nextOffer ? 'Conheça ' + nextOffer.name : 'Explore outras leituras',
		description:
			freeToolContinuation[tool.id] ?? nextOffer?.summary ?? 'Escolha o que deseja aprofundar.'
	});
	const storageKey = (id: string) => `atv-free-tool:${id}`;
	const toolReturnUrl = $derived(
		`/?ferramenta=${encodeURIComponent(tool.id)}${result?.id || dreamTarget ? `&resultado=${encodeURIComponent(dreamTarget ?? result!.id)}` : ''}#ferramentas`
	);
	function clearStorage() {
		try {
			sessionStorage.removeItem(storageKey(tool.id));
		} catch {
			/* Storage may be unavailable. */
		}
	}
	function clearAllToolStorage() {
		try {
			for (const key of Object.keys(sessionStorage))
				if (key.startsWith('atv-free-tool:')) sessionStorage.removeItem(key);
		} catch {
			/* Storage may be unavailable. */
		}
	}
	function reset() {
		dreamTarget = null;
		linkedDream = false;
		birth = emptyNatalForm();
		partner = emptyNatalForm();
		pairConsent = false;
		samePair = false;
		focus = '';
		dreamDate = '';
		narrative = '';
		emotions = '';
		associations = '';
		result = null;
		receipt = null;
		error = '';
		editing = false;
		storageMessage = '';
		quota = null;
		sharedProfile = null;
		dreamHistory = [];
		dreamCursor = null;
		owner = null;
		serverReady = false;
	}
	function discardPrivate(clearDraft = true) {
		requestEpoch += 1;
		controller?.abort();
		controller = null;
		if (clearDraft) clearStorage();
		reset();
		pending = false;
		recovering = false;
		historyPending = false;
	}
	function linkedTarget(id: string) {
		if (id !== 'registro-de-sonho') return;
		const query = new URL(window.location.href).searchParams;
		const requested = query.get('resultado');
		if (
			(!query.get('ferramenta') || query.get('ferramenta') === id) &&
			requested &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requested)
		) {
			dreamTarget = requested;
			linkedDream = true;
			editing = false;
		}
	}
	function restore(id: string, confirmedOwner: string, canonicalResultId: string | null) {
		try {
			const raw = sessionStorage.getItem(storageKey(id));
			if (!raw) return;
			if (raw.length > 200000) throw new Error('Invalid temporary result');
			const saved = JSON.parse(raw);
			const restoredResult = parseFreeToolResult(saved?.result);
			const validText = (value: unknown, max: number) =>
				typeof value === 'string' && value.length <= max;
			const validNatal = (value: unknown): value is NatalForm =>
				Boolean(
					value &&
					typeof value === 'object' &&
					Object.keys(emptyNatalForm()).every((key) =>
						validText((value as Record<string, unknown>)[key], 500)
					) &&
					['EXACT', 'APPROXIMATE', 'UNKNOWN'].includes((value as NatalForm).precision)
				);
			const draft = saved?.draft;
			if (
				saved.owner !== confirmedOwner ||
				!Number.isFinite(saved.expiresAt) ||
				saved.expiresAt <= Date.now() ||
				saved.expiresAt > Date.now() + draftLifetime ||
				(saved.result !== null && (!restoredResult || restoredResult.tool !== id)) ||
				!draft ||
				!validNatal(draft.birth) ||
				!validNatal(draft.partner) ||
				!validText(draft.focus, 400) ||
				!validText(draft.dreamDate, 10) ||
				!validText(draft.narrative, 6000) ||
				!validText(draft.emotions, 2000) ||
				!validText(draft.associations, 5000) ||
				(saved.receipt !== null && !validText(saved.receipt, 8192))
			) {
				sessionStorage.removeItem(storageKey(id));
				return;
			}
			// The browser never supplies the reading. Restore only a draft whose
			// owner was verified by this response, and whose result is still current.
			if (
				restoredResult &&
				restoredResult.id !== canonicalResultId &&
				!(id === 'registro-de-sonho' && saved.dreamTarget === restoredResult.id)
			) {
				clearStorage();
				return;
			}
			editing = saved.editing === true && !!restoredResult;
			dreamTarget =
				dreamTarget ??
				(id === 'registro-de-sonho' &&
				typeof saved.dreamTarget === 'string' &&
				saved.dreamTarget === restoredResult?.id
					? saved.dreamTarget
					: null);
			birth = draft.birth;
			partner = draft.partner;
			pairConsent = draft.pairConsent === true;
			focus = draft.focus;
			dreamDate = draft.dreamDate;
			narrative = draft.narrative;
			emotions = draft.emotions;
			associations = draft.associations;
			storageMessage = restoredResult
				? 'Seu resultado foi recuperado nesta aba, sem gerar um novo cálculo ou sorteio.'
				: 'Seu rascunho foi recuperado nesta aba.';
		} catch {
			clearStorage();
		}
	}
	$effect(() => {
		const id = data.tool.id;
		if (browser)
			untrack(() => {
				discardPrivate(false);
				linkedTarget(id);
			});
	});
	$effect.pre(() => {
		const identity = page.data.user?.id ?? null;
		if (!browser) return;
		untrack(() => {
			if (observedIdentity !== undefined && observedIdentity !== identity) {
				clearAllToolStorage();
				discardPrivate();
				linkedTarget(tool.id);
				if (active) void recover();
			}
			observedIdentity = identity;
		});
	});
	$effect(() => {
		// This browser store preserves form continuity; it never enforces a quota.
		const draft = JSON.stringify({
			birth,
			partner,
			pairConsent,
			focus,
			dreamDate,
			narrative,
			emotions,
			associations
		});
		if (!hydrated || !draft) return;
		const timer = setTimeout(() => untrack(remember), 300);
		return () => clearTimeout(timer);
	});
	function formFromFreeInput(value: unknown): NatalForm | null {
		if (!value || typeof value !== 'object') return null;
		const input = value as Partial<FreeToolNatalInput>;
		if (
			typeof input.localDateTime !== 'string' ||
			typeof input.utcInstant !== 'string' ||
			typeof input.timezone !== 'string' ||
			typeof input.locationSource !== 'string' ||
			!Number.isFinite(input.latitude) ||
			!Number.isFinite(input.longitude)
		)
			return null;
		const offset = (Date.parse(`${input.localDateTime}Z`) - Date.parse(input.utcInstant)) / 1000;
		if (!Number.isFinite(offset)) return null;
		const pad = (n: number) => String(n).padStart(2, '0');
		return {
			...emptyNatalForm(),
			date: input.localDateTime.slice(0, 10),
			time: input.localDateTime.slice(11, 16),
			precision: 'EXACT',
			location: `Coordenadas ${input.latitude}, ${input.longitude}`,
			latitude: String(input.latitude),
			longitude: String(input.longitude),
			timezone: input.timezone,
			source: input.locationSource,
			occurrence: input.utcInstant,
			offset: `${offset < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offset) / 3600))}:${pad(Math.floor((Math.abs(offset) % 3600) / 60))}`
		};
	}
	function applyInput(value: unknown, onlyEmpty = false) {
		if (!value || typeof value !== 'object') return;
		const input = value as Record<string, unknown>;
		if (tool.id === 'combinacao-do-casal') {
			if (!onlyEmpty || !birth.date) birth = formFromFreeInput(input.first) ?? birth;
			if (!onlyEmpty || !partner.date) partner = formFromFreeInput(input.second) ?? partner;
			pairConsent = input.consent === true;
		} else if (isNatal) {
			if (!onlyEmpty || !birth.date) birth = formFromFreeInput(input) ?? birth;
		} else if (isTarot && typeof input.focus === 'string') focus = input.focus;
		else if (tool.id === 'registro-de-sonho') {
			if (typeof input.date === 'string') dreamDate = input.date;
			if (typeof input.narrative === 'string') narrative = input.narrative;
			if (Array.isArray(input.emotions)) emotions = input.emotions.join(', ');
			if (Array.isArray(input.associations)) associations = input.associations.join(', ');
		}
	}
	const ledgerError = (code?: string) =>
		({
			quota_exceeded:
				'As duas correções gratuitas desta ferramenta já foram usadas nesta janela. Sua leitura continua disponível. Aguarde o horário indicado para corrigir novamente.',
			claim_conflict:
				'Há dados diferentes na sua conta e nesta visita. Mantenha o perfil da conta para continuar; depois, revise seus dados usando as correções disponíveis. As utilizações já feitas serão preservadas.',
			pair_confirmation_required:
				'Confirme que está corrigindo os dados das mesmas duas pessoas. A gratuidade inclui um único casal.',
			subject_claimed:
				'Esta leitura foi associada à sua conta. Entre novamente para recuperá-la com segurança.',
			quota_unavailable:
				'Não foi possível conferir suas leituras agora. Tente novamente para recuperá-las com segurança.',
			session_changed: 'Sua identificação mudou. Recupere suas leituras antes de continuar.',
			profile_conflict:
				'Seu perfil foi alterado em outra sessão. Recarregue a leitura antes de continuar.',
			ascendant_unavailable:
				'O Ascendente não está disponível para estas coordenadas. Confira o local de nascimento.',
			houses_unavailable:
				'A Casa 2 não está disponível para estas coordenadas. Confira o local de nascimento.'
		})[code ?? ''] ?? 'Não foi possível preparar o resultado. Confira os dados e tente novamente.';
	async function recover() {
		if (recovering || pending || tool.id === 'horoscopo') return;
		if (serverReady) remember();
		const target = dreamTarget;
		const linked = linkedDream;
		discardPrivate(false);
		dreamTarget = target;
		linkedDream = linked;
		const epoch = requestEpoch;
		controller = new AbortController();
		const signal = controller.signal;
		const current = () => epoch === requestEpoch && !signal.aborted;
		recovering = true;
		try {
			const response = await fetch(`/api/free-tools/${tool.id}`, { signal, cache: 'no-store' });
			const answer = (await response.json()) as { code?: string };
			if (!current()) return;
			if (!response.ok) {
				identityConflict = answer.code === 'claim_conflict';
				identityRequired = answer.code === 'subject_claimed';
				throw new Error(ledgerError(answer.code));
			}
			let state = parseFreeToolState(answer);
			if (!state?.owner) throw new Error(ledgerError('quota_unavailable'));
			owner = state.owner;
			restore(tool.id, owner, state.result?.id ?? null);
			if (tool.id === 'registro-de-sonho') {
				await readDreamHistory(null, epoch, signal);
				if (!current()) return;
				if (dreamTarget) {
					const targetResponse = await fetch(
						`/api/free-tools/${tool.id}?historico=1&resultado=${encodeURIComponent(dreamTarget)}`,
						{ signal, cache: 'no-store' }
					);
					const targetAnswer = (await targetResponse.json()) as {
						history?: unknown[];
						owner?: string;
					};
					if (!current()) return;
					if (
						!targetResponse.ok ||
						targetAnswer.owner !== owner ||
						!Array.isArray(targetAnswer.history)
					)
						throw new Error(ledgerError('quota_unavailable'));
					const targetState = parseFreeToolState(targetAnswer.history[0]);
					if (targetState && targetState.owner !== owner)
						throw new Error(ledgerError('session_changed'));
					if (targetState?.result?.id === dreamTarget) state = targetState;
					else {
						dreamTarget = null;
						linkedDream = false;
						editing = false;
						dreamDate = narrative = emotions = associations = '';
						storageMessage = state.result
							? 'O registro solicitado não foi encontrado nesta identificação. A leitura abaixo é o registro de hoje.'
							: 'O registro solicitado não foi encontrado nesta identificação. Você pode consultar seu histórico ou registrar o sonho de hoje.';
					}
				}
			}
			quota = state.quota;
			sharedProfile = state.profile;
			identityConflict = false;
			identityRequired = false;
			if (state.result) {
				result = state.result;
				receipt = state.receipt;
				if (!editing) applyInput(state.input, true);
			} else if (isTarot || tool.id === 'registro-de-sonho') {
				result = null;
				receipt = null;
			} else if (!birth.date && state.profile) applyInput(state.profile.input, true);
			serverReady = true;
			error = '';
			recovering = false;
			remember();
			if (linkedDream && result?.id === dreamTarget) {
				linkedDream = false;
				await tick();
				resultHeading?.focus({ preventScroll: true });
			}
		} catch (issue) {
			if (!current()) return;
			const target = dreamTarget;
			clearStorage();
			reset();
			dreamTarget = target;
			error = issue instanceof Error ? issue.message : ledgerError('quota_unavailable');
		} finally {
			if (current()) recovering = false;
		}
	}
	async function readDreamHistory(
		before: string | null = null,
		epoch = requestEpoch,
		signal = controller?.signal
	) {
		const response = await fetch(
			`/api/free-tools/registro-de-sonho?historico=1${before ? `&antes=${encodeURIComponent(before)}` : ''}`,
			{ signal, cache: 'no-store' }
		);
		const answer = (await response.json()) as {
			history?: unknown[];
			nextCursor?: unknown;
			owner?: string;
		};
		if (epoch !== requestEpoch || signal?.aborted) return;
		if (
			!response.ok ||
			answer.owner !== owner ||
			!Array.isArray(answer.history) ||
			(answer.nextCursor !== null && typeof answer.nextCursor !== 'string')
		)
			throw new Error(ledgerError('quota_unavailable'));
		const entries = answer.history.map(parseFreeToolState);
		if (
			entries.some(
				(entry) => !entry || entry.owner !== owner || entry.result?.tool !== 'registro-de-sonho'
			)
		)
			throw new Error(ledgerError('quota_unavailable'));
		const merged = before
			? [...dreamHistory, ...(entries as FreeToolState[])]
			: (entries as FreeToolState[]);
		dreamHistory = [...new Map(merged.map((entry) => [entry.result!.id, entry])).values()];
		dreamCursor = answer.nextCursor as string | null;
	}
	async function moreDreams() {
		if (!dreamCursor || historyPending) return;
		historyPending = true;
		const epoch = requestEpoch;
		try {
			await readDreamHistory(dreamCursor);
		} catch (issue) {
			if (epoch !== requestEpoch) return;
			discardPrivate();
			error = issue instanceof Error ? issue.message : ledgerError('quota_unavailable');
		} finally {
			if (epoch === requestEpoch) historyPending = false;
		}
	}
	async function resolveIdentity(resolution: 'account') {
		const target = dreamTarget;
		const linked = linkedDream;
		discardPrivate();
		const epoch = requestEpoch;
		controller = new AbortController();
		const signal = controller.signal;
		recovering = true;
		try {
			const response = await fetch('/api/free-tools/claim', {
				signal,
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ resolution })
			});
			if (epoch !== requestEpoch || signal.aborted) return;
			if (!response.ok)
				throw new Error(ledgerError(((await response.json()) as { code?: string }).code));
			reset();
			dreamTarget = target;
			linkedDream = linked;
			linkedTarget(tool.id);
			recovering = false;
			await recover();
		} catch (issue) {
			if (epoch !== requestEpoch || signal.aborted) return;
			error = issue instanceof Error ? issue.message : ledgerError('quota_unavailable');
		} finally {
			if (epoch === requestEpoch) recovering = false;
		}
	}
	async function edit(useShared = false) {
		editing = useShared || !editing;
		if (useShared && sharedProfile) applyInput(sharedProfile.input);
		remember();
		await tick();
		if (editing) formElement?.querySelector<HTMLInputElement>('input')?.focus();
		else resultHeading?.focus({ preventScroll: true });
	}
	async function selectDream(id: string) {
		const state = dreamHistory.find((entry) => entry.result?.id === id);
		if (!state?.result) return;
		dreamTarget = id;
		result = state.result;
		receipt = state.receipt;
		quota = state.quota;
		applyInput(state.input);
		editing = false;
		remember();
		await tick();
		resultHeading?.focus({ preventScroll: true });
	}
	async function currentDream() {
		discardPrivate();
		await recover();
	}
	$effect(() => {
		if (browser && active && data.tool.id !== 'horoscopo')
			untrack(() => {
				void recover();
			});
	});
	onMount(() => {
		const refresh = (event?: Event) => {
			if (event instanceof CustomEvent && event.detail?.tool === tool.id) return;
			if (active) void recover();
		};
		const conceal = () => {
			if (serverReady) remember();
			discardPrivate(false);
		};
		const identityChanged = () => {
			clearAllToolStorage();
			discardPrivate();
		};
		const channel =
			typeof BroadcastChannel === 'function'
				? new BroadcastChannel('atv-free-tool-identity')
				: null;
		if (channel) channel.onmessage = identityChanged;
		const authSubmit = (event: Event) => {
			const form = event.target;
			if (
				form instanceof HTMLFormElement &&
				new URL(form.action, window.location.href).pathname === '/sair'
			) {
				identityChanged();
				channel?.postMessage('clear');
			}
		};
		const visibility = () => {
			if (document.hidden) conceal();
			else refresh();
		};
		const pageshow = (event: PageTransitionEvent) => {
			if (event.persisted) {
				conceal();
				refresh();
			}
		};
		window.addEventListener('focus', refresh);
		window.addEventListener('blur', conceal);
		window.addEventListener('pageshow', pageshow);
		document.addEventListener('visibilitychange', visibility);
		document.addEventListener('submit', authSubmit, true);
		window.addEventListener('atv:free-tool-profile-updated', refresh);
		return () => {
			discardPrivate(false);
			channel?.close();
			window.removeEventListener('focus', refresh);
			window.removeEventListener('blur', conceal);
			window.removeEventListener('pageshow', pageshow);
			document.removeEventListener('visibilitychange', visibility);
			document.removeEventListener('submit', authSubmit, true);
			window.removeEventListener('atv:free-tool-profile-updated', refresh);
		};
	});
	beforeNavigate(({ to }) => {
		if (to && /^\/(entrar|sair|cadastro)(\/|$)/.test(to.url.pathname)) {
			clearAllToolStorage();
			discardPrivate();
		}
	});
	function remember() {
		if (!browser || !owner || !serverReady || recovering) return;
		if (
			!result &&
			!birth.date &&
			!partner.date &&
			!focus &&
			!dreamDate &&
			!narrative &&
			!emotions &&
			!associations
		) {
			clearStorage();
			return;
		}
		try {
			sessionStorage.setItem(
				storageKey(tool.id),
				JSON.stringify({
					owner,
					expiresAt: Date.now() + draftLifetime,
					result,
					receipt,
					dreamTarget,
					editing,
					draft: {
						birth,
						partner,
						pairConsent,
						focus,
						dreamDate,
						narrative,
						emotions,
						associations
					}
				})
			);
		} catch {
			storageMessage =
				'Este navegador não permite guardar o resultado temporário. Mantenha esta página aberta para consultá-lo.';
		}
	}
	function natalInput(form: NatalForm): FreeToolNatalInput {
		if (!form.location || !form.source)
			throw new Error('Selecione a cidade de nascimento nos resultados da busca.');
		const resolved = resolvedCivilInstant(form.date, form.time, form.timezone, form.occurrence);
		return {
			localDateTime: `${form.date}T${form.time.length === 5 ? `${form.time}:00` : form.time}`,
			timezone: form.timezone,
			utcInstant: resolved.utcInstant,
			latitude: Number(form.latitude),
			longitude: Number(form.longitude),
			locationSource: form.source
		};
	}
	function splitEntries(value: string, maxLength: number): string[] {
		const entries = value
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
		if (entries.length > 8 || entries.some((entry) => entry.length > maxLength))
			throw new Error(`Use até oito itens, cada um com até ${maxLength} caracteres.`);
		return entries;
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!serverReady || !owner || recovering || pending) return;
		const submittedOwner = owner;
		const epoch = ++requestEpoch;
		controller?.abort();
		controller = new AbortController();
		const signal = controller.signal;
		const current = () => epoch === requestEpoch && !signal.aborted;
		let requestStarted = false;
		pending = true;
		error = '';
		storageMessage = '';
		try {
			if (tool.id === 'combinacao-do-casal' && result && !samePair)
				throw new Error(ledgerError('pair_confirmation_required'));
			const input =
				tool.id === 'combinacao-do-casal'
					? { first: natalInput(birth), second: natalInput(partner), consent: pairConsent }
					: isNatal
						? natalInput(birth)
						: isTarot
							? focus.trim()
								? { focus: focus.trim() }
								: {}
							: {
									date: dreamDate,
									narrative: narrative.trim(),
									emotions: splitEntries(emotions, 80),
									associations: splitEntries(associations, 200)
								};
			trackHomeEvent('tool_submit', {
				tool_id: tool.id,
				context: embedded ? 'home' : 'alias',
				state: result ? 'correction' : 'initial'
			});
			requestStarted = true;
			const response = await fetch(`/api/free-tools/${tool.id}`, {
				signal,
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-atv-owner': submittedOwner,
					...(samePair ? { 'x-atv-pair-correction': 'same-pair' } : {}),
					...(dreamTarget ? { 'x-atv-result-id': dreamTarget } : {})
				},
				body: JSON.stringify(input)
			});
			const answer = (await response.json()) as Partial<FreeToolResponse> & {
				error?: string;
				code?: string;
			};
			if (!current()) return;
			if (!response.ok) {
				clearStorage();
				reset();
				identityConflict = answer.code === 'claim_conflict';
				identityRequired = answer.code === 'subject_claimed';
				trackHomeEvent('tool_error', {
					tool_id: tool.id,
					context: embedded ? 'home' : 'alias',
					error_code:
						answer.code === 'quota_exceeded'
							? 'limit_reached'
							: answer.code === 'claim_conflict'
								? 'identity_conflict'
								: 'service_unavailable'
				});
				throw new Error(ledgerError(answer.code));
			}
			const preparedResult = parseFreeToolResult(answer.result);
			if (!preparedResult || preparedResult.tool !== tool.id)
				throw new Error('O resultado não pôde ser carregado. Tente novamente.');
			const state = parseFreeToolState(answer);
			if (!state || state.owner !== submittedOwner) {
				clearStorage();
				reset();
				throw new Error(ledgerError('session_changed'));
			}
			quota = state.quota;
			sharedProfile = state.profile;
			result = preparedResult;
			trackHomeEvent(
				'tool_result',
				{ tool_id: tool.id, context: embedded ? 'home' : 'alias', state: 'new' },
				{ operationId: preparedResult.id }
			);
			receipt = typeof answer.receipt === 'string' ? answer.receipt : null;
			editing = false;
			remember();
			pending = false;
			window.dispatchEvent(
				new CustomEvent('atv:free-tool-profile-updated', { detail: { tool: tool.id } })
			);
			await tick();
			resultHeading?.focus({ preventScroll: true });
			resultHeading?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
		} catch (issue) {
			if (!current()) return;
			if (requestStarted) {
				clearStorage();
				reset();
			}
			error =
				issue instanceof Error ? issue.message : 'Não foi possível preparar o resultado agora.';
		} finally {
			if (current()) pending = false;
		}
	}
	function clear() {
		const confirmedOwner = owner;
		const confirmedQuota = quota;
		const wasReady = serverReady;
		discardPrivate();
		owner = confirmedOwner;
		quota = confirmedQuota;
		serverReady = wasReady;
		storageMessage =
			'Os dados desta página foram limpos. As leituras e os limites guardados no servidor permanecem.';
	}
</script>

<div class="free-tool-page" class:embedded>
	{#if tool.id === 'horoscopo'}
		<HoroscopeTool {embedded} />
	{:else}
		<ContentShell kind="product">
			{#if !embedded}<nav class="breadcrumb" aria-label="Caminho da ferramenta">
					<a href="/ferramentas">Ferramentas grátis</a><span aria-hidden="true">
						/
					</span>{#if topic}<a href={topic.href}>{topic.label}</a><span aria-hidden="true">
							/
						</span>{/if}<span aria-current="page">{tool.label}</span>
				</nav>
				<PageIntro
					eyebrow="Ferramenta gratuita · resultado antes do cadastro"
					title={tool.label}
					description={tool.description}
				/>
			{/if}
			{#if recovering}<p class="quota-note" role="status">Conferindo suas leituras…</p>{/if}
			{#if quota}<aside class="quota-note" aria-label="Limite gratuito">
					{#if quota.mode === 'daily-draw'}Uma carta por dia nesta ferramenta. A Carta do Dia e a
						Carta do Amor têm sorteios independentes. Nova carta em {new Intl.DateTimeFormat(
							'pt-BR',
							{ timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }
						).format(new Date(quota.resetsAt))} (Brasília).
					{:else if quota.mode === 'daily-entry'}Um novo registro por dia. Você pode editar o
						registro de hoje sem criar outro.
					{:else}Uma leitura e até duas correções em 24 horas, por ferramenta. {result
							? `${quota.remainingCorrections ?? 2} correções restantes nesta janela.`
							: 'Suas duas correções estarão disponíveis após a primeira leitura.'}
						{tool.id === 'combinacao-do-casal'
							? 'As correções são para as mesmas duas pessoas.'
							: 'O perfil de nascimento é compartilhado entre suas quatro ferramentas natais.'}{/if}
					{#if quota.mode === 'corrections' && result}<span>
							Nova janela: {new Intl.DateTimeFormat('pt-BR', {
								timeZone: 'America/Sao_Paulo',
								dateStyle: 'short',
								timeStyle: 'short'
							}).format(new Date(quota.resetsAt))} (Brasília).</span
						>{/if}
				</aside>{/if}
			{#if quota?.stale && sharedProfile}<aside class="quota-note" role="status">
					Seu perfil foi atualizado em outra ferramenta. Esta leitura usa a versão anterior;
					recalcular consome uma correção desta ferramenta. <button
						type="button"
						onclick={() => edit(true)}
						disabled={pending}>Usar perfil atualizado</button
					>
				</aside>{/if}
			{#if identityConflict}<aside class="identity-choice" aria-label="Escolher perfil">
					<p>{ledgerError('claim_conflict')}</p>
					<button type="button" onclick={() => resolveIdentity('account')} disabled={recovering}
						>Manter perfil da conta</button
					>
				</aside>{/if}
			{#if identityRequired}<p class="quota-note">
					<a href={`/entrar?next=${encodeURIComponent(toolReturnUrl)}`}
						>Entrar para recuperar a leitura</a
					>
				</p>{/if}
			{#if !serverReady && !recovering && !identityConflict && !identityRequired}<button
					class="edit-result"
					type="button"
					onclick={recover}>Tentar recuperar leitura</button
				>{/if}
			{#if tool.id === 'registro-de-sonho' && dreamHistory.length > 0}<details class="quota-note">
					<summary>Consultar seus registros de sonhos</summary>
					<p>
						Você pode consultar e editar os registros existentes. Um novo registro fica disponível a
						cada dia, no horário de Brasília.
					</p>
					<div class="dream-history">
						{#each dreamHistory as entry (entry.result?.id)}{#if entry.result}<button
									type="button"
									disabled={pending || recovering}
									onclick={() => selectDream(entry.result!.id)}
									>{new Date(entry.result.createdAt).toLocaleDateString('pt-BR', {
										timeZone: 'America/Sao_Paulo'
									})} · {entry.result.title}</button
								>{/if}{/each}
					</div>
					{#if dreamCursor}<button
							type="button"
							disabled={pending || recovering || historyPending}
							onclick={moreDreams}
							>{historyPending ? 'Carregando registros…' : 'Carregar registros anteriores'}</button
						>{/if}
					{#if dreamTarget}<button
							type="button"
							disabled={pending || recovering}
							onclick={currentDream}>Voltar ao registro de hoje</button
						>{/if}
				</details>{/if}
			<div class="tool-grid" class:has-result={!!result}>
				{#if result && !isTarot}<div class="result-controls">
						<button type="button" class="edit-result" onclick={() => edit()} disabled={pending}
							>{editing ? 'Voltar à leitura' : 'Editar dados'}</button
						>
					</div>{/if}
				<form
					class="card tool-form"
					bind:this={formElement}
					data-hydrated={hydrated}
					hidden={!!result && !editing}
					onsubmit={submit}
				>
					<fieldset disabled={!hydrated || pending || !serverReady || recovering}>
						<legend class="sr-only">{tool.label}</legend>
						{#if isNatal}
							<FreeBirthFields
								id={tool.id + '-first-birth'}
								label={tool.id === 'combinacao-do-casal'
									? 'Primeira pessoa'
									: 'Seus dados de nascimento'}
								bind:form={birth}
							/>
							{#if tool.id === 'combinacao-do-casal'}
								<FreeBirthFields
									id={tool.id + '-second-birth'}
									label="Segunda pessoa"
									bind:form={partner}
								/>
								<label class="checkbox"
									><input type="checkbox" required bind:checked={pairConsent} /><span
										>Tenho autorização para usar os dados de nascimento das duas pessoas nesta
										comparação.</span
									></label
								>
								{#if result}<label class="checkbox"
										><input type="checkbox" required bind:checked={samePair} /><span
											>Esta correção é para as mesmas duas pessoas da leitura original. Trocar de
											parceiro não é uma correção gratuita.</span
										></label
									>{/if}
							{/if}
						{:else if isTarot}
							<h2>
								{tool.id === 'carta-do-dia'
									? 'Um símbolo para observar seu dia'
									: 'Uma pergunta para refletir'}
							</h2>
							<p>
								{tool.id === 'carta-do-dia'
									? 'A carta traz uma perspectiva simbólica e uma ação possível para hoje.'
									: tool.id === 'carta-do-amor'
										? 'Observe o que você deseja oferecer, pedir ou conversar em uma relação.'
										: 'Considere a pergunta, os limites da situação e o próximo passo que está ao seu alcance.'}
							</p>
							<Field
								id={tool.id + '-tarot-focus'}
								label={tool.id === 'carta-do-dia'
									? 'Foco para a leitura (opcional)'
									: tool.id === 'carta-do-amor'
										? 'Contexto da relação (opcional)'
										: 'Sua pergunta'}
								help="Conte somente o contexto que quiser compartilhar."
							>
								{#snippet children(describedBy)}<textarea
										id={tool.id + '-tarot-focus'}
										bind:value={focus}
										required={tool.id === 'tarot-sim-ou-nao'}
										maxlength="400"
										rows="4"
										aria-describedby={describedBy}></textarea>{/snippet}
							</Field>
							<p class="form-note">
								O sorteio acontece no servidor ao pedir a leitura. Voltar a este resultado mantém a
								mesma carta.
							</p>
						{:else}
							<h2>Registre o que você lembra</h2>
							<Field id={tool.id + '-dream-date'} label="Data do sonho"
								>{#snippet children(describedBy)}<input
										id={tool.id + '-dream-date'}
										type="date"
										min="1900-01-01"
										max="2099-12-31"
										required
										bind:value={dreamDate}
										aria-describedby={describedBy}
									/>{/snippet}</Field
							>
							<Field
								id={tool.id + '-dream-narrative'}
								label="Seu relato"
								help="Conte cenas, pessoas e acontecimentos com suas próprias palavras."
								>{#snippet children(describedBy)}<textarea
										id={tool.id + '-dream-narrative'}
										required
										minlength="10"
										maxlength="6000"
										rows="7"
										bind:value={narrative}
										aria-describedby={describedBy}></textarea>{/snippet}</Field
							>
							<Field
								id={tool.id + '-dream-emotions'}
								label="Emoções que ficaram (opcional)"
								help="Separe as palavras por vírgula, por exemplo: curiosidade, alívio."
								>{#snippet children(describedBy)}<input
										id={tool.id + '-dream-emotions'}
										maxlength="500"
										bind:value={emotions}
										aria-describedby={describedBy}
									/>{/snippet}</Field
							>
							<Field
								id={tool.id + '-dream-associations'}
								label="Suas associações (opcional)"
								help="O que as imagens do sonho lembram a você? Separe por vírgula."
								>{#snippet children(describedBy)}<textarea
										id={tool.id + '-dream-associations'}
										maxlength="1500"
										rows="3"
										bind:value={associations}
										aria-describedby={describedBy}></textarea>{/snippet}</Field
							>
						{/if}
					</fieldset>
					<Button type="submit" {pending} disabled={!hydrated || !serverReady || recovering}
						>{pending
							? 'Preparando resultado…'
							: result
								? 'Atualizar leitura'
								: tool.action}</Button
					>
					<p class="form-note">
						Não é preciso criar uma conta para ver o resultado. O rascunho fica nesta aba por até 30
						minutos; ao fechar a aba, a cópia local é descartada. A leitura concluída e seu controle
						de uso ficam associados a este navegador no servidor. Após a identificação, são
						vinculados à sua conta.
					</p>
				</form>
				<section class="result-column" aria-label="Seu resultado">
					{#if pending}<StatePanel
							kind="loading"
							title="Preparando seu resultado…"
							description={isTarot
								? 'Sorteando a carta e preparando a leitura curta.'
								: 'Conferindo os dados informados.'}
						/>
					{:else if error}<StatePanel
							kind="error"
							title="Não foi possível continuar"
							description={error}
						/>
					{/if}
					{#if result && !pending}
						<div class="card result-card" aria-live="polite">
							<p class="eyebrow">Seu resultado gratuito</p>
							<h2 bind:this={resultHeading} tabindex="-1">{result.title}</h2>
							<p class="lead">{result.summary}</p>
							{#if result.draw}<TarotCard
									cardId={result.draw.cardId}
									name={result.draw.name}
								/>{/if}
							{#if result.chart}
								<AstrologicalChart
									svg={result.chart.svg}
									positions={result.chart.positions}
									ascendant={result.chart.ascendant}
									midheaven={result.chart.midheaven}
									cusps={result.chart.cusps}
								/>
							{/if}
							{#if readingFacts.length}<dl class="facts">
									{#each readingFacts as fact (fact.id)}<div>
											<dt>{fact.label}</dt>
											<dd>{fact.value}</dd>
										</div>{/each}
								</dl>{/if}
							{#each result.sections as section (section.id)}<section class="result-section">
									<h3>{section.title}</h3>
									<p>{section.body}</p>
								</section>{/each}
							{#if result.limits.length}<details class="limits">
									<summary>Método e limites deste resultado</summary>
									<ul>
										{#each result.limits as limit (limit)}<li>{limit}</li>{/each}
									</ul>
								</details>{/if}
						</div>
						<section class="card continuation" data-free-offer={nextOffer?.id}>
							{#if nextOffer}<div class="continuation-art">
									<MvpProductArt productId={nextOffer.id} />
								</div>{/if}
							<div class="continuation-copy">
								<p class="eyebrow">Para aprofundar</p>
								<h2>{continuation.title}</h2>
								<p>{continuation.description}</p>
								<a
									class="button secondary"
									href={continuation.href}
									onclick={remember}
									data-atv-event="tool_product_click"
									data-atv-tool={tool.id}
									data-atv-product={nextOffer?.id}
									data-atv-universe={topic?.slug}
									data-atv-context="result"
									data-atv-cta="offer">Conhecer conteúdo e disponibilidade →</a
								>
							</div>
						</section>
					{:else if !embedded && !pending && !error}<StatePanel
							kind="empty"
							title="Seu resultado aparece aqui"
							description={isNatal
								? 'Informe data, hora e cidade de nascimento. Você verá o resultado antes do cadastro.'
								: isTarot
									? 'Peça a leitura para conhecer sua carta e a interpretação curta.'
									: 'Conte seu sonho para organizar o relato, as emoções e suas associações.'}
						/>{/if}
				</section>
			</div>
			{#if storageMessage}<p class="form-note" role="status">{storageMessage}</p>{/if}
			{#if result || narrative || birth.date || focus}<div class="clear-data">
					<button type="button" class="text-link" disabled={pending} onclick={clear}
						>Limpar dados e resultado desta página</button
					>
				</div>{/if}
		</ContentShell>
	{/if}
</div>

<style>
	.quota-note,
	.identity-choice {
		padding: 1rem 1.25rem;
		border: 1px solid var(--atv-border);
		background: var(--atv-surface);
		font-size: 0.9rem;
		line-height: 1.6;
		margin: 0 0 1rem;
	}
	.quota-note button,
	.identity-choice button {
		margin: 0.5rem 0.75rem 0 0;
		padding: 0.6rem 0.9rem;
		min-height: 44px;
		background: transparent;
		border: 1px solid currentColor;
		border-radius: 6px;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.tool-form[hidden] {
		display: none;
	}
	.result-controls {
		display: flex;
		justify-content: flex-end;
	}
	.edit-result {
		border: 1px solid #173c4d66;
		border-radius: 0.15rem;
		background: transparent;
		padding: 0.7rem 1rem;
		min-height: 44px;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.result-card h2 {
		scroll-margin-top: 7rem;
	}
	.result-card h2:focus {
		outline: none;
	}
	.continuation.card {
		grid-template-columns: minmax(140px, 0.65fr) minmax(0, 1fr);
		align-items: center;
		background: #e8ecdf;
		border: 1px solid #173c4d33;
		border-radius: 0.2rem;
		margin-top: 2rem;
	}
	.continuation-copy {
		display: grid;
		gap: 0.8rem;
	}
	.continuation-copy h2 {
		font-size: clamp(1.8rem, 3vw, 2.5rem);
	}
	.continuation-art {
		min-width: 0;
	}
	.form-note {
		color: #536055;
		font-size: 0.83rem;
		line-height: 1.65;
	}
	@media (max-width: 620px) {
		.continuation.card {
			grid-template-columns: 1fr;
		}
		.continuation-art {
			max-width: 19rem;
			margin-inline: auto;
		}
	}
	.embedded :global(.content-shell) {
		width: 100%;
		padding: 0;
	}
	.embedded .tool-grid {
		grid-template-columns: 1fr;
		gap: 1rem;
		margin: 0;
	}
	.embedded .tool-form {
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
	}
	.embedded .result-card {
		padding: 1.5rem 0 0;
		border: 0;
		border-top: 1px solid var(--atv-border, #c7bfac);
		border-radius: 0;
		background: transparent;
		box-shadow: none;
	}
	.embedded .result-column:empty {
		display: none;
	}
	.embedded :global(.card) {
		min-width: 0;
	}
	.embedded :global(input),
	.embedded :global(textarea) {
		scroll-margin-block: 6rem;
	}
	.breadcrumb {
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
		color: var(--universe-panel, var(--atv-text-primary));
	}
	.breadcrumb a {
		color: inherit;
	}
	.tool-grid {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		align-items: start;
		gap: 1.5rem;
		margin-top: 2rem;
	}
	.tool-grid.has-result {
		grid-template-columns: minmax(0, 1fr);
	}
	.result-column {
		min-width: 0;
	}
	.tool-form,
	.result-card,
	.continuation {
		padding: clamp(1.25rem, 3vw, 2rem);
	}
	.result-card {
		padding: 1.5rem 0 0;
		border: 0;
		border-top: 1px solid var(--atv-border, #c7bfac);
		border-radius: 0;
		background: transparent;
		box-shadow: none;
	}
	.tool-form,
	.result-card,
	.result-column,
	.continuation {
		display: grid;
		gap: 1.25rem;
	}
	fieldset {
		display: grid;
		gap: 1.75rem;
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	h2 {
		margin: 0;
		font: 500 clamp(1.5rem, 3vw, 2rem)/1.25 var(--atv-font-display);
	}
	h3 {
		font-family: var(--atv-font-display);
	}
	p {
		line-height: 1.65;
		margin-block: 0.5rem;
	}
	input:not([type='checkbox']),
	textarea {
		width: 100%;
		min-height: 48px;
		padding: 0.75rem;
		color: var(--atv-text-primary);
		background: var(--atv-surface);
		border: 1px solid var(--atv-border);
		border-radius: 8px;
		font: inherit;
	}
	textarea {
		resize: vertical;
	}
	.checkbox {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		line-height: 1.5;
		cursor: pointer;
	}
	.checkbox input {
		width: 1.25rem;
		height: 1.25rem;
		flex: 0 0 auto;
		margin-top: 0.15rem;
	}
	:global(.v4-experience #conteudo) .form-note {
		font-size: 0.875rem;
		font-family: var(--atv-font-ui);
		line-height: 1.65;
		color: var(--atv-text-secondary);
	}
	.facts {
		display: grid;
		gap: 0.75rem;
		margin-block: 1.5rem;
	}
	.facts div {
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: 1rem;
		border-bottom: 1px solid var(--atv-border);
		padding-bottom: 0.75rem;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
		white-space: pre-wrap;
	}
	.result-card .lead {
		font: 400 1.125rem/1.7 var(--atv-font-display);
		margin: 0;
	}
	.result-card .result-section h3 {
		margin: 0 0 0.65rem;
		font: 500 clamp(1.4rem, 3vw, 1.75rem)/1.2 var(--atv-font-display);
		letter-spacing: -0.02em;
	}
	.result-section + .result-section {
		padding-top: 1.25rem;
		border-top: 1px solid var(--atv-border, #c7bfac);
	}
	.result-section p {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font: 400 1rem/1.75 var(--atv-font-ui);
		margin: 0;
	}
	.limits {
		border-top: 1px solid var(--atv-border);
		margin-top: 1.5rem;
		padding-top: 1rem;
		font-size: 0.875rem;
	}
	.limits summary {
		cursor: pointer;
		font-weight: 600;
	}
	.limits li {
		margin-block: 0.75rem;
		line-height: 1.5;
	}
	.clear-data {
		margin-top: 2rem;
	}
	.clear-data button {
		background: transparent;
		border: 0;
		padding: 0;
		font: inherit;
		color: var(--universe-panel, var(--atv-text-primary));
		cursor: pointer;
	}
	.continuation :global(.button) {
		justify-self: start;
	}
	@media (max-width: 760px) {
		:global(.v4-experience #conteudo:has(.free-tool-page)) {
			padding-inline: 1rem;
		}
		.free-tool-page :global(.content-shell) {
			width: 100%;
		}
		.tool-grid {
			grid-template-columns: 1fr;
		}
		.facts div {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}
</style>
