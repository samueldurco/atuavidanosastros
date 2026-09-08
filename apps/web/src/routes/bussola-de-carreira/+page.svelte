<script lang="ts">
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	let { data } = $props();
	let city = $state('');
	let date = $state('');
	let time = $state('');
	let latitude = $state('');
	let longitude = $state('');
	let utcOffset = $state('-03:00');
	let pending = $state(false);
	let savePending = $state(false);
	let saveMessage = $state('');
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
		try {
			const localDateTime = `${date}T${time}:00`;
			const input = {
				localDateTime,
				timezone: `UTC${utcOffset}`,
				utcInstant: new Date(`${localDateTime}${utcOffset}`).toISOString(),
				latitude: Number(latitude),
				longitude: Number(longitude),
				locationSource: 'user-provided-coordinates'
			};
			const response = await fetch('/api/astrology/midheaven', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(input)
			});
			if (!response.ok) throw new Error();
			result = await response.json();
			submittedInput = input;
		} catch {
			error = 'Não foi possível calcular com esses dados. Revise data, hora, fuso e coordenadas.';
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
			if (!response.ok) throw new Error();
			saveMessage = 'Sua Bússola foi salva na Biblioteca.';
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
		content="Descubra as perguntas do seu Meio do Céu com uma ferramenta gratuita e linguagem profissional responsável."
	/><link
		rel="canonical"
		href="https://atuavidanosastros.com.br/bussola-de-carreira"
	/></svelte:head
>
<ContentShell kind="product">
	<div data-stitch="P0-01 VRT-05">
		<nav aria-label="Caminho da Bússola" class="breadcrumb">
			<a href="/proposito">Propósito</a><span aria-hidden="true">/</span><span aria-current="page"
				>Bússola de Carreira</span
			>
		</nav>
		<PageIntro
			eyebrow="Ferramenta gratuita · direção e contribuição"
			title="Bússola de Carreira"
			description="Seu Meio do Céu como ponto de partida para uma boa pergunta sobre o trabalho. O cálculo acontece sem cadastro."
		/>
		<div class="tool-grid">
			<form class="card natal-form" onsubmit={submit}>
				<div class="form-heading">
					<p class="eyebrow">01 · Seus dados</p>
					<h2>Um ponto no tempo e no espaço.</h2>
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
					<Field
						id="birth-city"
						label="Cidade de nascimento"
						help="A cidade serve como referência. Informe as coordenadas correspondentes abaixo."
						>{#snippet children(describedBy)}<input
								id="birth-city"
								bind:value={city}
								type="text"
								required
								autocomplete="address-level2"
								placeholder="Cidade, estado, país"
								aria-describedby={describedBy}
							/>{/snippet}</Field
					>
					<div class="field-pair">
						<Field id="birth-latitude" label="Latitude"
							>{#snippet children(describedBy)}<input
									id="birth-latitude"
									bind:value={latitude}
									type="number"
									min="-90"
									max="90"
									step="any"
									required
									placeholder="-23.5505"
									aria-describedby={describedBy}
								/>{/snippet}</Field
						><Field id="birth-longitude" label="Longitude"
							>{#snippet children(describedBy)}<input
									id="birth-longitude"
									bind:value={longitude}
									type="number"
									min="-180"
									max="180"
									step="any"
									required
									placeholder="-46.6333"
									aria-describedby={describedBy}
								/>{/snippet}</Field
						>
					</div>
					<p class="input-note">Use coordenadas decimais. Leste é positivo; oeste é negativo.</p>
					<Field
						id="birth-offset"
						label="Deslocamento UTC"
						help="Exemplo: −03:00. Confirme o fuso histórico e o horário de verão da data."
						>{#snippet children(describedBy)}<input
								id="birth-offset"
								bind:value={utcOffset}
								type="text"
								pattern="[+-][0-2][0-9]:[0-5][0-9]"
								required
								aria-describedby={describedBy}
							/>{/snippet}</Field
					>
				</fieldset>
				<Button type="submit" {pending} disabled={savePending}
					>{pending ? 'Calculando…' : 'Calcular minha bússola'}</Button
				>
				<p class="input-note">Seus dados de nascimento não são salvos neste cálculo.</p>
			</form>
			<section class="result-column" aria-label="Resultado da Bússola">
				{#if pending}<StatePanel
						kind="loading"
						title="Situando seu Meio do Céu…"
						description="Estamos calculando a posição a partir dos dados informados."
					/>
				{:else if error}<StatePanel
						kind="error"
						title="Vamos conferir os dados?"
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
								Use este ponto como pergunta sobre contribuição pública, direção e ofício — não como
								uma sentença sobre sua carreira.
							</p>
							{#if result.warning}<p class="warning">{result.warning}</p>{/if}
							<div class="result-actions">
								{#if data.canSave}<Button variant="secondary" onclick={save} pending={savePending}
										>{savePending ? 'Salvando…' : 'Salvar na Biblioteca'}</Button
									>{:else}<Button href="/entrar" variant="secondary"
										>Entrar para salvar na Biblioteca</Button
									>{/if}
							</div></Card
						>
					</div>
					<div class="method-note">
						<p class="eyebrow">Método e contexto</p>
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
							>{#if !saveFailed}<Button href="/biblioteca" variant="tertiary"
									>Abrir Biblioteca</Button
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
							Coordenadas e fuso precisam corresponder ao local e à data de nascimento. Uma
							informação aproximada pede uma leitura mais cautelosa.
						</p>
						<a href="/meio-do-ceu">Entender o Meio do Céu →</a></Card
					>{/if}
			</section>
		</div>
		<section class="continuity">
			<p class="eyebrow">Direção não é destino</p>
			<h2>O contexto da sua vida também faz parte da leitura.</h2>
			<p>
				Formação, oportunidade, território e escolhas não cabem em um único ponto do mapa. Use o
				resultado para explorar possibilidades e formular perguntas melhores.
			</p>
			<a href="/mapa-de-proposito">Conhecer o Mapa de Propósito &amp; Carreira →</a>
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
