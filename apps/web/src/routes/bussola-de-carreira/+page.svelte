<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, untrack } from 'svelte';
	import { loginHref } from '$lib/auth-return';
	import BirthCityFields from '$lib/components/BirthCityFields.svelte';
	import { emptyNatalForm } from '$lib/natal-form';
	import { resolvedCivilInstant } from '$lib/city-location';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { isUuid } from '$lib/library-result';
	let { data } = $props();
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});
	let date = $state('');
	let time = $state('');
	let birthForm = $state(emptyNatalForm());
	$effect(() => {
		birthForm.date = date;
		birthForm.time = time;
	});
	let pending = $state(false);
	let savePending = $state(false);
	let saveMessage = $state('');
	let savedItemId = $state<string | null>(null);
	let saveFailed = $state(false);
	let storageMessage = $state('');
	let error = $state('');
	let submittedInput = $state<Record<string, string | number> | null>(null);
	let result = $state<{
		sign: string;
		degree: number;
		midheaven: number;
		status: string;
		warning: string | null;
		provenance: { provider: string; providerVersion: string };
	} | null>(null);
	const storageKey = 'atv-free-tool:bussola-de-carreira';
	const draftLifetime = 30 * 60 * 1000;
	function clearStorage() {
		try {
			sessionStorage.removeItem(storageKey);
		} catch {
			/* Storage may be unavailable. */
		}
	}
	function clear() {
		clearStorage();
		date = '';
		time = '';
		birthForm = emptyNatalForm();
		result = null;
		submittedInput = null;
		error = '';
		saveMessage = '';
		savedItemId = null;
		saveFailed = false;
		storageMessage = '';
	}
	function remember() {
		if (!result || !submittedInput) return;
		try {
			sessionStorage.setItem(
				storageKey,
				JSON.stringify({
					expiresAt: Date.now() + draftLifetime,
					draft: birthForm,
					input: submittedInput,
					result
				})
			);
		} catch {
			storageMessage =
				'Este navegador não permite guardar o resultado temporário. Mantenha esta página aberta para consultá-lo.';
		}
	}
	function restore() {
		try {
			const raw = sessionStorage.getItem(storageKey);
			if (!raw) return;
			if (raw.length > 16000) throw new Error('invalid draft');
			const saved = JSON.parse(raw);
			const form = saved.draft;
			const input = saved.input;
			const value = saved.result;
			if (
				!Number.isFinite(saved.expiresAt) ||
				saved.expiresAt <= Date.now() ||
				saved.expiresAt > Date.now() + draftLifetime ||
				!form ||
				!input ||
				!value ||
				Object.keys(emptyNatalForm()).some(
					(key) => typeof form[key] !== 'string' || form[key].length > 250
				) ||
				!/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
				!/^\d{2}:\d{2}$/.test(form.time) ||
				typeof value.sign !== 'string' ||
				value.sign.length > 40 ||
				!Number.isFinite(value.degree) ||
				value.degree < 0 ||
				value.degree >= 30 ||
				!Number.isFinite(value.midheaven) ||
				value.midheaven < 0 ||
				value.midheaven >= 360 ||
				typeof value.status !== 'string' ||
				(value.warning !== null && typeof value.warning !== 'string') ||
				!value.provenance ||
				typeof value.provenance.provider !== 'string' ||
				typeof value.provenance.providerVersion !== 'string'
			)
				throw new Error('invalid draft');
			const resolved = resolvedCivilInstant(form.date, form.time, form.timezone, form.occurrence);
			if (
				input.localDateTime !== `${form.date}T${form.time}:00` ||
				input.timezone !== form.timezone ||
				input.utcInstant !== resolved.utcInstant ||
				input.latitude !== Number(form.latitude) ||
				input.longitude !== Number(form.longitude) ||
				input.locationSource !== form.source ||
				!Number.isFinite(input.latitude) ||
				Math.abs(input.latitude) > 90 ||
				!Number.isFinite(input.longitude) ||
				Math.abs(input.longitude) > 180
			)
				throw new Error('invalid draft');
			birthForm = form;
			date = form.date;
			time = form.time;
			submittedInput = input;
			result = value;
			storageMessage =
				'Seu cálculo foi recuperado nesta aba. Você pode salvar o mesmo resultado depois de entrar.';
		} catch {
			clearStorage();
		}
	}
	$effect(() => {
		if (browser) untrack(restore);
	});
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		error = '';
		result = null;
		submittedInput = null;
		saveMessage = '';
		savedItemId = null;
		storageMessage = '';
		clearStorage();
		try {
			const localDateTime = `${date}T${time}:00`;
			if (!birthForm.location) throw new Error('Selecione sua cidade nos resultados da busca.');
			const resolved = resolvedCivilInstant(date, time, birthForm.timezone, birthForm.occurrence);
			const input = {
				localDateTime,
				timezone: birthForm.timezone,
				utcInstant: resolved.utcInstant,
				latitude: Number(birthForm.latitude),
				longitude: Number(birthForm.longitude),
				locationSource: birthForm.source
			};
			const response = await fetch('/api/astrology/midheaven', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(input)
			});
			if (!response.ok)
				throw new Error('Não foi possível calcular. Confira a data, a hora e a cidade.');
			result = await response.json();
			submittedInput = input;
			remember();
		} catch (issue) {
			error =
				issue instanceof Error && issue.message
					? issue.message
					: 'Não foi possível calcular. Confira a data, a hora e a cidade.';
		} finally {
			pending = false;
		}
	}
	async function save() {
		if (!result || !submittedInput) return;
		savePending = true;
		saveMessage = '';
		saveFailed = false;
		try {
			const response = await fetch('/api/library/compass', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(submittedInput)
			});
			if (!response.ok)
				throw new Error('Não foi possível calcular. Confira a data, a hora e a cidade.');
			saveMessage = 'Seu cálculo do Meio do Céu foi salvo na Biblioteca.';
			clearStorage();
			const saved = await response.json();
			savedItemId =
				saved &&
				typeof saved === 'object' &&
				'libraryItemId' in saved &&
				typeof saved.libraryItemId === 'string' &&
				isUuid(saved.libraryItemId)
					? saved.libraryItemId
					: null;
		} catch {
			saveFailed = true;
			saveMessage =
				'Não foi possível salvar agora. Seu resultado continua disponível nesta página.';
		} finally {
			savePending = false;
		}
	}
</script>

<ContentShell kind="product">
	<div class="compass-tool" data-stitch="P0-01 VRT-05 F06">
		<nav aria-label="Caminho da Bússola" class="breadcrumb">
			<a href="/temas/carreira">Carreira e propósito</a><span aria-hidden="true">/</span><span
				aria-current="page">Bússola de Carreira</span
			>
		</nav>
		<header class="tool-hero">
			<div class="hero-copy">
				<p class="eyebrow">Ferramenta gratuita · Meio do Céu</p>
				<h1>Bússola de Carreira</h1>
				<p class="hero-lead">Um primeiro ponto de orientação para sua vida profissional.</p>
				<p class="hero-scope">
					Com seus dados de nascimento, veja o signo e o grau do Meio do Céu. Este cálculo é um
					ponto do mapa; a leitura personalizada da Bússola está em preparação.
				</p>
			</div>
			<img
				class="hero-engraving"
				src="/brand/mvp/assets/revisao/bussola-gravada.webp"
				alt=""
				width="240"
				height="240"
				fetchpriority="high"
			/>
		</header>
		<div class="tool-grid">
			<form class="card natal-form" data-hydrated={hydrated} onsubmit={submit}>
				<div class="form-heading">
					<p class="eyebrow">01 · Seus dados</p>
					<h2>Seus dados de nascimento</h2>
					<p>Preencha os dados de nascimento com a maior precisão que tiver.</p>
				</div>
				<fieldset disabled={!hydrated || pending || savePending}>
					<legend class="sr-only">Dados de nascimento</legend>
					<div class="field-pair">
						<Field id="birth-date" label="Data de nascimento"
							>{#snippet children(describedBy)}<input
									id="birth-date"
									bind:value={date}
									type="date"
									required
									autocomplete="bday"
									aria-describedby={describedBy}
								/>{/snippet}</Field
						><Field
							id="birth-time"
							label="Hora de nascimento"
							help="A hora influencia o Meio do Céu. Confira seu registro de nascimento."
							>{#snippet children(describedBy)}<input
									id="birth-time"
									bind:value={time}
									type="time"
									required
									aria-describedby={describedBy}
								/>{/snippet}</Field
						>
					</div>
					<BirthCityFields id="birth-city" label="Cidade de nascimento" bind:form={birthForm} />
				</fieldset>
				<Button type="submit" {pending} disabled={!hydrated || savePending}
					>{pending ? 'Calculando…' : 'Calcular meu Meio do Céu'}</Button
				>
				<p class="input-note">
					O resultado aparece antes do cadastro. Ele pode ser retomado nesta aba por 30 minutos; ao
					fechar a aba, o registro local é descartado.
				</p>
			</form>
			<section class="result-column" aria-label="Resultado do cálculo do Meio do Céu">
				{#if pending}<StatePanel
						kind="loading"
						title="Calculando seu Meio do Céu…"
						description="Estamos calculando a posição a partir dos dados informados."
					/>
				{:else if error}<StatePanel
						kind="error"
						title="Confira os dados de nascimento"
						description={error}
					/>
				{:else if result}<div class="calculated-result" role="status">
						<Card
							variant="result"
							eyebrow="02 · Cálculo do Meio do Céu"
							title={`Meio do Céu em ${result.sign}`}
							><p class="result-degree">{result.degree.toFixed(2)}°</p>
							<p class="sr-only">
								Seu Meio do Céu está em {result.sign}, a {result.degree.toFixed(2)}°.
							</p>
							<p class="result-reading">
								Este é o signo e o grau do seu Meio do Céu, um dos fatores considerados em uma
								leitura de carreira. O cálculo isolado não equivale à leitura personalizada.
							</p>
							{#if result.warning}<p class="warning">{result.warning}</p>{/if}
							<div class="result-actions">
								{#if data.canSave}<Button variant="secondary" onclick={save} pending={savePending}
										>{savePending ? 'Salvando…' : 'Salvar na Biblioteca'}</Button
									>{:else}<Button
										href={loginHref('/bussola-de-carreira')}
										onclick={remember}
										variant="secondary">Entrar para guardar meus cálculos</Button
									>{/if}
							</div>
							{#if !data.canSave}<p class="muted">
									Entre para guardar este resultado na Biblioteca. Você pode retomá-lo nesta aba por
									30 minutos.
								</p>{/if}</Card
						>
					</div>
					<div class="method-note">
						<p class="eyebrow">Detalhes do cálculo</p>
						<p>
							O Meio do Céu foi calculado no zodíaco tropical a partir da data, hora e cidade
							informadas.
						</p>
						<details>
							<summary>Ver origem técnica do cálculo</summary>
							<p>
								Provedor: {result.provenance.provider}. Versão: {result.provenance.providerVersion}.
							</p>
						</details>
						<p>
							A retomada nesta aba vale por 30 minutos. Ao fechar a aba, o registro local é
							descartado. Ao salvar, apenas o resultado e seu método entram na Biblioteca.
						</p>
						<p>
							O resultado corresponde ao último cálculo concluído. Se alterar os campos, calcule
							novamente antes de comparar.
						</p>
					</div>
					{#if saveMessage}<StatePanel kind={saveFailed ? 'error' : 'success'} title={saveMessage}
							>{#if !saveFailed}<Button
									href={savedItemId ? `/biblioteca/${savedItemId}` : '/biblioteca'}
									variant="tertiary"
									>{savedItemId ? 'Abrir resultado salvo' : 'Abrir Biblioteca'}</Button
								>{/if}</StatePanel
						>{/if}
				{:else}<div class="result-empty">
						<img src="/brand/mvp/assets/marca-clara.svg" alt="" width="80" height="80" />
						<p class="eyebrow">02 · Um lugar para a sua pergunta</p>
						<h2>Seu Meio do Céu aparece aqui.</h2>
						<p>
							Depois do cálculo, você verá o signo, o grau e o método usado para situar esse ponto
							do mapa.
						</p>
					</div>
					<Card variant="data" title="Antes de começar"
						><p>
							Confira a cidade, a data e a hora de nascimento. A localização e o fuso são definidos
							automaticamente. Uma hora aproximada pede uma leitura mais cautelosa.
						</p>
						<a href="/meio-do-ceu">Entender o Meio do Céu →</a></Card
					>{/if}
			</section>
		</div>
		{#if storageMessage}<p role="status" class="input-note">{storageMessage}</p>{/if}
		{#if result || date || time || birthForm.location}<div class="clear-data">
				<Button variant="tertiary" onclick={clear} disabled={pending || savePending}
					>Limpar dados e resultado desta aba</Button
				>
			</div>{/if}
		<section class="reading-bridge" aria-labelledby="reading-bridge-title">
			<div class="bridge-index" aria-hidden="true">03</div>
			<div>
				<p class="eyebrow">Da descoberta à leitura</p>
				<h2 id="reading-bridge-title">A leitura personalizada da Bússola</h2>
				<p>
					A leitura da Bússola relaciona o Meio do Céu ao contexto profissional que você informa
					para organizar direção pública, ambientes e tensões possíveis, com três perguntas
					práticas. Quando estiver disponível, uma leitura solicitada será entregue na Biblioteca.
				</p>
				<p class="availability">Leitura personalizada em preparação</p>
			</div>
		</section>
		<section class="continuity">
			<p class="eyebrow">Outra proposta de carreira</p>
			<h2>Mapa de Carreira</h2>
			<p>
				Explore a proposta de uma leitura sobre vocação, trabalho e sua relação com dinheiro. Veja o
				que ela aborda e os dados necessários para começar.
			</p>
			<a href="/produtos/mapa-proposito-carreira">Conhecer o Mapa de Carreira →</a>
		</section>
	</div>
</ContentShell>

<style>
	.compass-tool {
		--atv-font-display: Newsreader, Georgia, serif;
		--atv-font-editorial: Newsreader, Georgia, serif;
		--atv-font-ui: Onest, Arial, sans-serif;
		--atv-text-primary: #183746;
		--atv-text-secondary: #596365;
		--atv-text-accent: #385240;
		--atv-surface-card: #fff8e9;
		--atv-surface-muted: #e7ebcf;
		--atv-action: #385240;
		--atv-action-hover: #273e2f;
		--atv-border: #c7bfac;
		--atv-focus: #183746;
		color: #183746;
		background: #f6efdf;
		padding: clamp(1.25rem, 3vw, 3rem);
		font-family: var(--atv-font-ui);
	}
	.compass-tool :global(.atv-card) {
		background: #fff8e9;
		border-color: #c7bfac;
		color: #183746;
	}
	.compass-tool :global(.atv-card.data) {
		background: #e7ebcf;
	}
	.tool-hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(12rem, 15rem);
		gap: clamp(1.5rem, 4vw, 4rem);
		align-items: center;
		padding: clamp(1.5rem, 4vw, 3.5rem);
		margin-bottom: clamp(1.5rem, 3vw, 2.5rem);
		background: #fff8e9;
		border: 1px solid #c7bfac;
	}
	.hero-copy h1 {
		font: 500 clamp(2.75rem, 6vw, 5rem)/0.98 var(--atv-font-display);
		letter-spacing: -0.035em;
		margin: 0 0 1rem;
		max-width: 12ch;
	}
	.hero-lead {
		font: 400 clamp(1.25rem, 2.4vw, 1.75rem)/1.35 var(--atv-font-editorial);
		color: #385240;
		margin: 0 0 1rem;
	}
	.hero-scope {
		font: 400 clamp(1.05rem, 1.7vw, 1.25rem)/1.55 var(--atv-font-editorial);
		color: #596365;
		max-width: 55ch;
		margin: 0;
	}
	.hero-engraving {
		display: block;
		width: min(100%, 15rem);
		height: auto;
		justify-self: center;
	}
	.clear-data {
		margin-top: 2rem;
	}
	.breadcrumb {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
	}
	.breadcrumb a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.tool-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		gap: clamp(1.25rem, 3vw, 2rem);
		align-items: start;
	}
	.natal-form {
		padding: clamp(1.25rem, 3vw, 2rem);
		display: grid;
		gap: 1.5rem;
		box-shadow: none;
		background: #fff8e9;
		border-radius: 0;
	}
	.form-heading {
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--atv-border);
	}
	.form-heading h2 {
		margin: 0;
		font: 500 1.8rem/1.2 var(--atv-font-display);
	}
	.form-heading > p:last-child {
		margin-bottom: 0;
		color: var(--atv-text-secondary);
		font-size: 0.875rem;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
		display: grid;
		gap: 1.5rem;
	}
	.field-pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.input-note {
		margin: 0;
		color: var(--atv-text-secondary);
		font-size: 0.8rem;
	}
	.result-column {
		display: grid;
		gap: 1.5rem;
		min-width: 0;
	}
	.result-empty {
		padding: 2.5rem 2rem;
		border: 1px solid var(--atv-border);
		border-radius: 0;
		background: var(--atv-surface-muted);
		text-align: center;
		min-height: 23rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.result-empty img {
		margin-bottom: 1.5rem;
		width: 7rem;
		height: auto;
	}
	.result-empty h2 {
		font: 500 2rem/1.2 var(--atv-font-display);
	}
	.result-empty p:last-child {
		color: var(--atv-text-secondary);
		font: 400 1.1875rem/1.6 var(--atv-font-editorial);
	}
	.result-degree {
		font: 500 4rem/1 var(--atv-font-display);
		margin: 1.5rem 0;
		font-variant-numeric: tabular-nums;
	}
	.result-reading {
		font: 400 1.1875rem/1.6 var(--atv-font-editorial);
	}
	.result-actions {
		margin-top: 2rem;
	}
	.warning {
		border-left: 2px solid #a36632;
		padding-left: 1rem;
	}
	.method-note {
		padding: 1.5rem;
		border-block: 1px solid var(--atv-border);
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
	}
	.method-note summary {
		width: fit-content;
		color: var(--atv-link, #385240);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.method-note summary:focus-visible {
		outline: 3px solid #183746;
		outline-offset: 4px;
		box-shadow: 0 0 0 4px #fff8e9;
	}
	.reading-bridge {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: clamp(1rem, 3vw, 2rem);
		max-width: 62rem;
		margin: clamp(3rem, 6vw, 5rem) auto 0;
		padding: clamp(1.5rem, 4vw, 3rem);
		background: #d5d9c6;
		border: 1px solid #9da994;
	}
	.bridge-index {
		font: 400 clamp(2rem, 4vw, 3rem)/1 var(--atv-font-display);
		color: #385240;
	}
	.reading-bridge h2 {
		font: 500 clamp(2rem, 4vw, 3rem)/1.1 var(--atv-font-display);
		margin: 0 0 1rem;
	}
	.reading-bridge p:not(.eyebrow):not(.availability) {
		max-width: 55ch;
		font: 400 1.1875rem/1.55 var(--atv-font-editorial);
		margin: 0;
	}
	.availability {
		display: inline-flex;
		align-items: center;
		min-height: 2.5rem;
		padding: 0.45rem 0.9rem;
		margin: 1.5rem 0 0;
		background: #fff8e9;
		border: 1px solid #9da994;
		color: #385240;
		font: 700 0.8rem/1.3 var(--atv-font-ui);
		letter-spacing: 0.03em;
	}
	.continuity {
		max-width: 45rem;
		margin: clamp(2.5rem, 5vw, 4rem) auto 0;
		padding-top: 2rem;
		border-top: 1px solid var(--atv-border);
	}
	.continuity h2 {
		font: 500 2rem/1.2 var(--atv-font-display);
	}
	.continuity > p:not(.eyebrow) {
		font: 400 1.1875rem/1.6 var(--atv-font-editorial);
		color: var(--atv-text-secondary);
	}
	@media (max-width: 900px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 640px) {
		:global(.v4-internal #conteudo:has(.compass-tool)) {
			padding-inline: 1.125rem;
		}
		:global(.v4-internal #conteudo:has(.compass-tool)::before) {
			inset-inline: 0.625rem;
		}
		:global(.v4-internal #conteudo .content-shell.product:has(.compass-tool)) {
			width: 100%;
		}
		.compass-tool {
			padding: 0;
		}
		.tool-hero {
			grid-template-columns: 1fr;
			padding: 1.25rem;
		}
		.hero-engraving {
			width: min(12.25rem, 100%);
			justify-self: start;
		}
		.reading-bridge {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 450px) {
		.field-pair {
			grid-template-columns: 1fr;
		}
		.hero-copy h1 {
			font-size: 2.5rem;
		}
	}
	/* The site-wide internal page typography targets every paragraph. Keep this tool's
	   editorial hierarchy legible at narrow widths. */
	:global(.v4-internal #conteudo) .compass-tool p {
		font-size: 1.0625rem;
		line-height: 1.5;
	}
	:global(.v4-internal #conteudo) .compass-tool .eyebrow {
		font-size: 0.625rem;
	}
	:global(.v4-internal #conteudo) .compass-tool .hero-lead {
		font-size: clamp(1.25rem, 2.4vw, 1.75rem);
		line-height: 1.35;
	}
	:global(.v4-internal #conteudo) .compass-tool .hero-scope {
		font-size: clamp(1.05rem, 1.7vw, 1.25rem);
		line-height: 1.55;
	}
	:global(.v4-internal #conteudo) .compass-tool :is(h1, h2) {
		font-family: var(--atv-font-display);
	}
	:global(.v4-internal #conteudo) .compass-tool .hero-copy h1 {
		font-size: clamp(2.625rem, 6vw, 4.875rem);
		line-height: 0.98;
	}
	:global(
		.v4-internal
			#conteudo
			.compass-tool
			:is(a, button, input, select, textarea, summary):focus-visible
	) {
		outline: 3px solid #183746;
		outline-offset: 4px;
		box-shadow: 0 0 0 4px #fff8e9;
	}
	:global(.v4-internal #conteudo) .compass-tool .form-heading > p:last-child {
		font-size: 0.875rem;
	}
	:global(.v4-internal #conteudo) .compass-tool .input-note,
	:global(.v4-internal #conteudo) .compass-tool .method-note p {
		font-size: 0.8rem;
	}
	:global(.v4-internal #conteudo) .compass-tool .result-empty p:last-child,
	:global(.v4-internal #conteudo) .compass-tool .result-reading,
	:global(.v4-internal #conteudo) .compass-tool .reading-bridge p:not(.eyebrow):not(.availability),
	:global(.v4-internal #conteudo) .compass-tool .continuity > p:not(.eyebrow) {
		font-size: 1.1875rem;
	}
	:global(.v4-internal #conteudo) .compass-tool .result-degree {
		font-size: 4rem;
	}
	:global(.v4-internal #conteudo) .compass-tool .availability {
		font-size: 0.8rem;
	}
</style>
