<script lang="ts">
	import BirthCityFields from '$lib/components/BirthCityFields.svelte';
	import { emptyNatalForm } from '$lib/natal-form';
	import { resolvedCivilInstant } from '$lib/city-location';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import VisualMotif from '$lib/components/VisualMotif.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { isUuid } from '$lib/library-result';
	let { data } = $props();
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
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		error = '';
		result = null;
		submittedInput = null;
		saveMessage = '';
		savedItemId = null;
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
			saveMessage = 'Sua Bússola foi salva na Biblioteca.';
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

<svelte:head
	><title>Bússola de Carreira grátis — A Tua Vida nos Astros</title><meta
		name="description"
		content="Calcule seu Meio do Céu gratuitamente com sua data, hora e local de nascimento. Conheça esse ponto do mapa ligado à carreira."
	/><link
		rel="canonical"
		href="https://atuavidanosastros.com.br/bussola-de-carreira"
	/></svelte:head
>
<ContentShell kind="product">
	<div data-stitch="P0-01 VRT-05">
		<nav aria-label="Caminho da Bússola" class="breadcrumb">
			<a href="/proposito">Carreira e dinheiro</a><span aria-hidden="true">/</span><span
				aria-current="page">Bússola de Carreira</span
			>
		</nav>
		<VisualMotif identity="career-compass" eager />
		<PageIntro
			eyebrow="Cálculo gratuito · carreira"
			title="Bússola de Carreira"
			description="Descubra o signo do seu Meio do Céu. Informe seus dados de nascimento para fazer o cálculo gratuito."
		/>
		<div class="tool-grid">
			<form class="card natal-form" onsubmit={submit}>
				<div class="form-heading">
					<p class="eyebrow">01 · Seus dados</p>
					<h2>Seus dados de nascimento</h2>
					<p>Preencha os dados de nascimento com a maior precisão que tiver.</p>
				</div>
				<fieldset disabled={pending || savePending}>
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
				<Button type="submit" {pending} disabled={savePending}
					>{pending ? 'Calculando…' : 'Calcular meu Meio do Céu'}</Button
				>
				<p class="input-note">Seus dados de nascimento não são salvos neste cálculo.</p>
			</form>
			<section class="result-column" aria-label="Resultado da Bússola">
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
							eyebrow="02 · Seu resultado"
							title={`Meio do Céu em ${result.sign}`}
							><p class="result-degree">{result.degree.toFixed(2)}°</p>
							<p class="sr-only">
								Seu Meio do Céu está em {result.sign}, a {result.degree.toFixed(2)}°.
							</p>
							<p class="result-reading">
								Este é o signo do seu Meio do Céu, um dos fatores usados na leitura de carreira do
								mapa astral.
							</p>
							{#if result.warning}<p class="warning">{result.warning}</p>{/if}
							<div class="result-actions">
								{#if data.canSave}<Button variant="secondary" onclick={save} pending={savePending}
										>{savePending ? 'Salvando…' : 'Salvar na Biblioteca'}</Button
									>{:else}<Button href="/entrar?next=%2Fbussola-de-carreira" variant="secondary"
										>Entrar para guardar meus cálculos</Button
									>{/if}
							</div>
							{#if !data.canSave}<p class="muted">
									Após entrar, preencha os dados novamente para calcular e salvar o resultado.
								</p>{/if}</Card
						>
					</div>
					<div class="method-note">
						<p class="eyebrow">Detalhes do cálculo</p>
						<p>
							Cálculo tropical/Placidus: {result.provenance.provider}
							{result.provenance.providerVersion}.
						</p>
						<p>
							Dados de nascimento não são armazenados; ao salvar, apenas o resultado e seu método
							entram na Biblioteca.
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
						<img src="/brand/logo/symbol/atv-symbol.svg" alt="" width="80" height="80" />
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
		<section class="continuity">
			<p class="eyebrow">Carreira no mapa astral</p>
			<h2>Quer conhecer outros fatores do seu mapa?</h2>
			<p>
				Conheça a leitura sobre vocação, trabalho e sua relação com dinheiro. Veja o que ela aborda
				e os dados necessários para começar.
			</p>
			<a href="/produtos/mapa-proposito-carreira">Conhecer o Mapa de Carreira →</a>
		</section>
	</div>
</ContentShell>

<style>
	.breadcrumb {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 2rem;
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
		gap: 2rem;
		align-items: start;
	}
	.natal-form {
		padding: clamp(1.25rem, 3vw, 2rem);
		display: grid;
		gap: 1.5rem;
		box-shadow: none;
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
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface-muted);
		text-align: center;
		min-height: 23rem;
	}
	.result-empty img {
		margin-bottom: 1.5rem;
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
		border-left: 2px solid var(--atv-gold-500);
		padding-left: 1rem;
	}
	.method-note {
		padding: 1.5rem;
		border-block: 1px solid var(--atv-border);
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
	}
	.continuity {
		max-width: 45rem;
		margin: 4rem auto 0;
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
	@media (max-width: 767px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 450px) {
		.field-pair {
			grid-template-columns: 1fr;
		}
	}
</style>
