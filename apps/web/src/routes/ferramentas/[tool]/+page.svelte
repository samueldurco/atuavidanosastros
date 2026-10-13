<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, untrack } from 'svelte';
	import { loginHref } from '$lib/auth-return';
	import { resolvedCivilInstant } from '$lib/city-location';
	import { emptyNatalForm, type NatalForm } from '$lib/natal-form';
	import type { FreeToolResult, FreeToolNatalInput, FreeToolResponse } from '$lib/free-tools';
	import { parseFreeToolResult } from '$lib/free-tool-result';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import FreeBirthFields from '$lib/components/free-tools/FreeBirthFields.svelte';
	import { signs, signNames } from '$lib/data/site';
	import { interestNavigation } from '$lib/data/public-navigation';
	let { data } = $props();
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});
	let birth = $state(emptyNatalForm());
	let partner = $state(emptyNatalForm());
	let pairConsent = $state(false);
	let focus = $state('');
	let dreamDate = $state('');
	let narrative = $state('');
	let emotions = $state('');
	let associations = $state('');
	let result = $state<FreeToolResult | null>(null);
	let receipt = $state<string | null>(null);
	let pending = $state(false);
	let error = $state('');
	let saveConsent = $state(false);
	let savePending = $state(false);
	let saveMessage = $state('');
	let savedHref = $state<string | null>(null);
	let storageMessage = $state('');
	const draftLifetime = 30 * 60 * 1000;
	const tool = $derived(data.tool);
	const topic = $derived(interestNavigation.find((item) => item.id === tool.topicId));
	const isNatal = $derived(['ascendente', 'mapa-astral', 'combinacao-do-casal'].includes(tool.id));
	const isTarot = $derived(['carta-do-dia', 'tarot-sim-ou-nao'].includes(tool.id));
	const continuation = $derived(
		tool.id === 'ascendente'
			? {
					href: '/produtos/tres-pilares',
					title: 'Conheça seus Três Pilares',
					description:
						'Veja como Sol, Lua e Ascendente se relacionam em uma leitura mais completa.',
					alternative: '/ferramentas/mapa-astral',
					alternativeLabel: 'Ver o preview gratuito do mapa'
				}
			: tool.id === 'mapa-astral'
				? {
						href: '/produtos/mapa-astral',
						title: 'Aprofunde seu mapa astral',
						description:
							'Conheça a leitura dos planetas, das casas e dos aspectos do mapa completo.',
						alternative: '/temas/mapa-astral',
						alternativeLabel: 'Explorar artigos de mapa astral'
					}
				: tool.id === 'combinacao-do-casal'
					? {
							href: '/produtos/sinastria',
							title: 'Conheça a Sinastria',
							description: 'Compare mais fatores dos dois mapas em uma leitura de relacionamento.',
							alternative: '/temas/amor',
							alternativeLabel: 'Explorar amor e relacionamentos'
						}
					: tool.id === 'registro-de-sonho'
						? {
								href: '/produtos/leitura-essencial-sonhos',
								title: 'Explore seu sonho com mais contexto',
								description:
									'Conheça a proposta de interpretação e acompanhamento dos seus sonhos.',
								alternative: '/temas/sonhos',
								alternativeLabel: 'Explorar conteúdos sobre sonhos'
							}
						: {
								href: '/temas/tarot',
								title: 'Escolha uma leitura de Tarot',
								description:
									'Compare o foco e a estrutura de cada método para escolher o que deseja aprofundar.',
								alternative: '/revista?tema=tarot',
								alternativeLabel: 'Ler artigos sobre Tarot'
							}
	);
	const storageKey = (id: string) => `atv-free-tool:${id}`;
	function clearStorage() {
		try {
			sessionStorage.removeItem(storageKey(tool.id));
		} catch {
			/* Storage may be unavailable. */
		}
	}
	function reset() {
		birth = emptyNatalForm();
		partner = emptyNatalForm();
		pairConsent = false;
		focus = '';
		dreamDate = '';
		narrative = '';
		emotions = '';
		associations = '';
		result = null;
		receipt = null;
		error = '';
		saveConsent = false;
		saveMessage = '';
		savedHref = null;
		storageMessage = '';
	}
	function restore(id: string) {
		reset();
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
				!Number.isFinite(saved.expiresAt) ||
				saved.expiresAt <= Date.now() ||
				saved.expiresAt > Date.now() + draftLifetime ||
				!restoredResult ||
				restoredResult.tool !== id ||
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
			result = restoredResult;
			receipt = typeof saved.receipt === 'string' ? saved.receipt : null;
			birth = draft.birth;
			partner = draft.partner;
			pairConsent = draft.pairConsent === true;
			focus = draft.focus;
			dreamDate = draft.dreamDate;
			narrative = draft.narrative;
			emotions = draft.emotions;
			associations = draft.associations;
			storageMessage =
				'Seu resultado foi recuperado nesta aba. Entrar não gera um novo cálculo ou sorteio.';
		} catch {
			clearStorage();
		}
	}
	$effect(() => {
		const id = data.tool.id;
		if (browser) untrack(() => restore(id));
	});
	function remember() {
		if (!result) return;
		try {
			sessionStorage.setItem(
				storageKey(tool.id),
				JSON.stringify({
					expiresAt: Date.now() + draftLifetime,
					result,
					receipt,
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
		pending = true;
		error = '';
		result = null;
		receipt = null;
		saveMessage = '';
		savedHref = null;
		saveConsent = false;
		storageMessage = '';
		clearStorage();
		try {
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
			const response = await fetch(`/api/free-tools/${tool.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(input)
			});
			const answer = (await response.json()) as Partial<FreeToolResponse> & { error?: string };
			if (!response.ok)
				throw new Error(
					typeof answer.error === 'string'
						? answer.error
						: 'Não foi possível preparar o resultado. Confira os dados e tente novamente.'
				);
			const preparedResult = parseFreeToolResult(answer.result);
			if (!preparedResult || preparedResult.tool !== tool.id)
				throw new Error('O resultado não pôde ser carregado. Tente novamente.');
			result = preparedResult;
			receipt = typeof answer.receipt === 'string' ? answer.receipt : null;
			remember();
		} catch (issue) {
			error =
				issue instanceof Error ? issue.message : 'Não foi possível preparar o resultado agora.';
		} finally {
			pending = false;
		}
	}
	async function save() {
		if (!result || !receipt || !saveConsent) return;
		savePending = true;
		saveMessage = '';
		try {
			const response = await fetch('/api/free-tools/save', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ result, receipt })
			});
			const saved = (await response.json()) as { error?: string; href?: string };
			if (!response.ok)
				throw new Error(
					typeof saved.error === 'string'
						? saved.error
						: 'Não foi possível salvar agora. O resultado continua nesta página.'
				);
			savedHref =
				typeof saved.href === 'string' && /^\/biblioteca\/[a-z0-9/-]+$/i.test(saved.href)
					? saved.href
					: '/biblioteca';
			saveMessage = 'Resultado salvo na sua Biblioteca.';
			clearStorage();
		} catch (issue) {
			saveMessage = issue instanceof Error ? issue.message : 'Não foi possível salvar agora.';
		} finally {
			savePending = false;
		}
	}
	function clear() {
		clearStorage();
		reset();
	}
</script>

<div class="free-tool-page">
	{#if tool.id === 'horoscopo'}
		<ContentShell kind="product">
			<nav class="breadcrumb" aria-label="Caminho da ferramenta">
				<a href="/ferramentas">Ferramentas grátis</a><span aria-hidden="true"> / </span><span
					aria-current="page">Horóscopo</span
				>
			</nav>
			<PageIntro
				eyebrow="Ferramenta gratuita · previsões"
				title="Horóscopo por signo"
				description="Escolha seu signo para consultar as leituras publicadas e o histórico. Cada leitura informa o período a que se refere."
			/>
			<StatePanel
				kind="info"
				title="Seu mapa acrescenta uma perspectiva pessoal"
				description="Conheça Sol, Lua e Ascendente no preview gratuito do mapa. O preview de previsões personalizadas será apresentado quando houver uma leitura datada aprovada."
			>
				<Button href="/ferramentas/mapa-astral">Ver meu preview do mapa grátis</Button>
			</StatePanel>
			<section class="signs" aria-labelledby="sign-heading">
				<h2 id="sign-heading">Escolha seu signo</h2>
				<div class="sign-grid">
					{#each signs as sign (sign)}
						<a class="card sign-card" href={`/horoscopo/${sign}`}
							><h3>{signNames[sign]}</h3>
							<span>Ver leituras e histórico →</span></a
						>
					{/each}
				</div>
				{#if !data.horoscope?.entries.length}<p class="form-note">
						As leituras datadas aparecerão aqui depois de publicadas. Ainda não há previsões
						publicadas para consulta.
					</p>{/if}
				<p><a href="/horoscopo">Consultar o arquivo por período e ano</a></p>
			</section>
		</ContentShell>
	{:else}
		<ContentShell kind="product">
			<nav class="breadcrumb" aria-label="Caminho da ferramenta">
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
			<div class="tool-grid">
				<form class="card tool-form" data-hydrated={hydrated} onsubmit={submit}>
					<fieldset disabled={!hydrated || pending || savePending}>
						<legend class="sr-only">{tool.label}</legend>
						{#if isNatal}
							<FreeBirthFields
								id="first-birth"
								label={tool.id === 'combinacao-do-casal'
									? 'Primeira pessoa'
									: 'Seus dados de nascimento'}
								bind:form={birth}
							/>
							{#if tool.id === 'combinacao-do-casal'}
								<FreeBirthFields id="second-birth" label="Segunda pessoa" bind:form={partner} />
								<label class="checkbox"
									><input type="checkbox" required bind:checked={pairConsent} /><span
										>Tenho autorização para usar os dados de nascimento das duas pessoas nesta
										comparação.</span
									></label
								>
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
									: 'A leitura curta explora possibilidades e limites da sua pergunta. A carta não determina o que vai acontecer.'}
							</p>
							<Field
								id="tarot-focus"
								label={tool.id === 'carta-do-dia'
									? 'Foco para a leitura (opcional)'
									: 'Pergunta ou foco'}
								help="Conte somente o contexto que quiser compartilhar."
							>
								{#snippet children(describedBy)}<textarea
										id="tarot-focus"
										bind:value={focus}
										required={tool.id === 'tarot-sim-ou-nao'}
										maxlength="400"
										rows="4"
										aria-describedby={describedBy}></textarea>{/snippet}
							</Field>
							<p class="form-note">
								O sorteio acontece ao pedir a leitura. Entrar ou salvar mantém a mesma carta.
							</p>
						{:else}
							<h2>Registre o que você lembra</h2>
							<Field id="dream-date" label="Data do sonho"
								>{#snippet children(describedBy)}<input
										id="dream-date"
										type="date"
										min="1900-01-01"
										max="2099-12-31"
										required
										bind:value={dreamDate}
										aria-describedby={describedBy}
									/>{/snippet}</Field
							>
							<Field
								id="dream-narrative"
								label="Seu relato"
								help="Conte cenas, pessoas e acontecimentos com suas próprias palavras."
								>{#snippet children(describedBy)}<textarea
										id="dream-narrative"
										required
										minlength="10"
										maxlength="6000"
										rows="7"
										bind:value={narrative}
										aria-describedby={describedBy}></textarea>{/snippet}</Field
							>
							<Field
								id="dream-emotions"
								label="Emoções que ficaram (opcional)"
								help="Separe as palavras por vírgula, por exemplo: curiosidade, alívio."
								>{#snippet children(describedBy)}<input
										id="dream-emotions"
										maxlength="500"
										bind:value={emotions}
										aria-describedby={describedBy}
									/>{/snippet}</Field
							>
							<Field
								id="dream-associations"
								label="Suas associações (opcional)"
								help="O que as imagens do sonho lembram a você? Separe por vírgula."
								>{#snippet children(describedBy)}<textarea
										id="dream-associations"
										maxlength="1500"
										rows="3"
										bind:value={associations}
										aria-describedby={describedBy}></textarea>{/snippet}</Field
							>
						{/if}
					</fieldset>
					<Button type="submit" {pending} disabled={!hydrated || savePending}
						>{pending
							? 'Preparando resultado…'
							: result
								? isTarot
									? 'Fazer um novo sorteio'
									: 'Gerar um novo resultado'
								: tool.action}</Button
					>
					<p class="form-note">
						Não é preciso criar uma conta para ver o resultado. Ele pode ser retomado nesta aba por
						30 minutos; ao fechar a aba, o registro local é descartado.
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
					{:else if result}
						<div class="card result-card" aria-live="polite">
							<p class="eyebrow">Seu resultado gratuito</p>
							<h2>{result.title}</h2>
							<p class="lead">{result.summary}</p>
							{#if result.chart}
								<img
									class="chart"
									src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.chart.svg)}`}
									alt="Mandala do mapa calculado com as posições e casas indicadas no resultado."
									width="600"
									height="600"
								/>
							{/if}
							{#if result.facts.length}<dl class="facts">
									{#each result.facts as fact (fact.id)}<div>
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
						<div class="card save-card">
							<h2>Guarde para continuar depois</h2>
							{#if savedHref}<p role="status">{saveMessage}</p>
								<Button variant="secondary" href={savedHref}>Abrir resultado na Biblioteca</Button>
							{:else if data.canSave && receipt}
								<label class="checkbox"
									><input type="checkbox" bind:checked={saveConsent} /><span
										>Quero guardar este resultado na minha Biblioteca.</span
									></label
								>
								<Button
									variant="secondary"
									onclick={save}
									pending={savePending}
									disabled={!saveConsent}>{savePending ? 'Salvando…' : 'Salvar resultado'}</Button
								>
							{:else if receipt && !data.hasAccount}
								<p>
									Crie sua conta ou entre para salvar este resultado. Sua conta é opcional para usar
									a ferramenta.
								</p>
								<a class="button secondary" href={loginHref(tool.href)} onclick={remember}
									>Entrar para salvar e continuar</a
								>
							{:else}<p>
									O salvamento não está disponível neste momento. Seu resultado continua nesta
									página.
								</p>{/if}
							{#if saveMessage && !savedHref}<p role="status">{saveMessage}</p>{/if}
							{#if storageMessage}<p class="form-note" role="status">{storageMessage}</p>{/if}
						</div>
						<section class="card continuation">
							<p class="eyebrow">Para aprofundar</p>
							<h2>{continuation.title}</h2>
							<p>{continuation.description}</p>
							<a class="button secondary" href={continuation.href}
								>Conhecer conteúdo e disponibilidade</a
							><a class="text-link" href={continuation.alternative}
								>{continuation.alternativeLabel} →</a
							>
						</section>
					{:else}<StatePanel
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
			{#if result || narrative || birth.date || focus}<div class="clear-data">
					<button type="button" class="text-link" disabled={pending || savePending} onclick={clear}
						>Limpar dados e resultado desta página</button
					>
				</div>{/if}
		</ContentShell>
	{/if}
</div>

<style>
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
	.tool-form,
	.result-card,
	.save-card,
	.continuation {
		padding: clamp(1.25rem, 3vw, 2rem);
	}
	.tool-form,
	.result-column,
	.save-card,
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
		font-family: var(--atv-font-body);
		line-height: 1.65;
		color: var(--atv-text-secondary);
	}
	.chart {
		display: block;
		width: min(100%, 520px);
		height: auto;
		margin: 1.5rem auto;
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
	.result-section p {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
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
	.signs {
		margin-top: 2rem;
	}
	.signs > p,
	.signs > p a,
	:global(.v4-experience #conteudo) .signs > .form-note {
		color: var(--universe-panel, var(--atv-text-primary));
	}
	.sign-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}
	.sign-card {
		display: grid;
		gap: 0.75rem;
		padding: 1.25rem;
		text-decoration: none;
	}
	.sign-card h3 {
		margin: 0;
	}
	.sign-card span {
		font-size: 0.875rem;
	}
	.continuation :global(.button),
	.save-card :global(.button) {
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
