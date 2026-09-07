<script lang="ts">
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
	let error = $state('');
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
		saveMessage = '';
		try {
			const localDateTime = `${date}T${time}:00`;
			const response = await fetch('/api/astrology/midheaven', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					localDateTime,
					timezone: `UTC${utcOffset}`,
					utcInstant: new Date(`${localDateTime}${utcOffset}`).toISOString(),
					latitude: Number(latitude),
					longitude: Number(longitude),
					locationSource: 'user-provided-coordinates'
				})
			});
			if (!response.ok) throw new Error();
			result = await response.json();
		} catch {
			error = 'Não foi possível calcular com esses dados. Revise data, hora, fuso e coordenadas.';
		} finally {
			pending = false;
		}
	}
	async function save() {
		if (!result) return;
		savePending = true;
		saveMessage = '';
		try {
			const localDateTime = `${date}T${time}:00`;
			const response = await fetch('/api/library/compass', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					localDateTime,
					timezone: `UTC${utcOffset}`,
					utcInstant: new Date(`${localDateTime}${utcOffset}`).toISOString(),
					latitude: Number(latitude),
					longitude: Number(longitude),
					locationSource: 'user-provided-coordinates'
				})
			});
			if (!response.ok) throw new Error();
			saveMessage = 'Sua Bússola foi salva na Biblioteca.';
		} catch {
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

<section class="section tool-section">
	<div class="container">
		<div class="tool-grid">
			<div>
				<p class="eyebrow">Ferramenta gratuita</p>
				<h1 class="h1">Bússola de Carreira</h1>
				<p class="lead">
					Uma orientação inicial sobre contribuição, ambientes de trabalho e tensões a observar. O
					cálculo acontece sem cadastro e sem persistir seus dados de nascimento.
				</p>
				<p class="data-note">Seus dados não são salvos neste cálculo.</p>
			</div>
			<form class="card" onsubmit={submit}>
				<div class="form-heading">
					<h2>Seus dados de nascimento</h2>
					<p>Preencha com a maior precisão que tiver.</p>
				</div>
				<label
					>Data de nascimento<input
						bind:value={date}
						type="date"
						required
						autocomplete="bday"
					/></label
				><label
					>Hora de nascimento<input
						bind:value={time}
						type="time"
						required
						aria-describedby="time-help"
					/></label
				><small id="time-help"
					>A hora influencia o Meio do Céu. Se for aproximada, o resultado será marcado como
					provisório.</small
				><label
					>Cidade de nascimento<input
						bind:value={city}
						type="text"
						required
						autocomplete="address-level2"
						placeholder="Cidade, estado, país"
					/></label
				>
				<div class="coordinates">
					<label
						>Latitude<input
							bind:value={latitude}
							type="number"
							min="-90"
							max="90"
							step="any"
							required
							placeholder="-23.5505"
						/></label
					><label
						>Longitude<input
							bind:value={longitude}
							type="number"
							min="-180"
							max="180"
							step="any"
							required
							placeholder="-46.6333"
						/></label
					>
				</div>
				<small
					>Use coordenadas decimais; leste é positivo e oeste é negativo. Fonte: coordenadas
					informadas por você.</small
				>
				<label
					>Deslocamento UTC<input
						bind:value={utcOffset}
						type="text"
						pattern="[+-][0-2][0-9]:[0-5][0-9]"
						required
						aria-describedby="offset-help"
					/></label
				>
				<small id="offset-help"
					>Exemplo: Brasília costuma usar −03:00. Confirme o fuso histórico da data.</small
				>
				<button class="button" type="submit" disabled={pending}
					>{pending ? 'Calculando…' : 'Calcular minha bússola'}</button
				>
				{#if error}<p class="result error" role="alert">{error}</p>{/if}
				{#if result}<div class="result" role="status">
						<strong>Seu Meio do Céu está em {result.sign}, a {result.degree.toFixed(2)}°.</strong>
						<p>
							Use este ponto como pergunta sobre contribuição pública, direção e ofício — não como
							uma sentença sobre sua carreira.
						</p>
						{#if result.warning}<p>{result.warning}</p>{/if}
						<small
							>Cálculo tropical/Placidus: {result.provenance.provider}
							{result.provenance.providerVersion}. Dados de nascimento não são armazenados; ao
							salvar, apenas o resultado e seu método entram na Biblioteca.</small
						>
						{#if data.canSave}
							<button class="button secondary" type="button" onclick={save} disabled={savePending}
								>{savePending ? 'Salvando…' : 'Salvar na Biblioteca'}</button
							>
						{:else}
							<a class="button secondary" href="/entrar">Entrar para salvar na Biblioteca</a>
						{/if}
						{#if saveMessage}<p class="save-message" role="status">{saveMessage}</p>{/if}
					</div>{/if}
			</form>
		</div>
		<div class="method-grid" aria-label="Como a ferramenta funciona">
			<div><span>ACESSO</span><strong>Valor antes do cadastro</strong></div>
			<div><span>SISTEMA</span><strong>Tropical · Placidus</strong></div>
			<div><span>FORMATO</span><strong>Leitura interpretativa</strong></div>
		</div>
		{#if !result}<section class="result-preview" aria-label="Prévia do resultado">
				<p class="eyebrow">Após o cálculo</p>
				<h2>Seu Meio do Céu aparece aqui.</h2>
				<div class="preview-lines" aria-hidden="true"><span></span><span></span><span></span></div>
				<p>Direção pública, ambientes possíveis e perguntas práticas para continuar a reflexão.</p>
			</section>{/if}
	</div>
</section>

<style>
	.tool-section {
		background: linear-gradient(180deg, var(--atv-ivory-25), var(--atv-frost-50));
	}
	.tool-grid {
		display: grid;
		grid-template-columns: 1fr minmax(20rem, 0.8fr);
		gap: clamp(2rem, 6vw, 6rem);
		align-items: start;
	}
	form {
		padding: clamp(1.35rem, 3vw, 2rem);
		display: grid;
		gap: 1rem;
	}
	.form-heading {
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--atv-border);
	}
	.form-heading h2 {
		margin: 0;
		font: 500 1.7rem/1.1 var(--atv-font-display);
	}
	.form-heading p,
	.data-note {
		color: var(--atv-text-secondary);
		font: 500 0.8rem var(--atv-font-ui);
	}
	.form-heading p {
		margin: 0.45rem 0 0;
	}
	.data-note {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--atv-border);
	}
	label {
		display: grid;
		gap: 0.4rem;
		font-weight: 650;
	}
	input {
		min-height: 48px;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-sm);
		padding: 0.7rem;
		background: var(--atv-surface-page);
		color: var(--atv-text-primary);
	}
	.coordinates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.error {
		border-left-color: #a12b2b;
	}
	small {
		color: var(--atv-text-secondary);
	}
	.result {
		border-left: 3px solid var(--atv-gold-500);
		padding: 1rem;
		background: var(--atv-surface-muted);
	}
	.result p {
		margin-bottom: 0;
	}
	.result .button {
		margin-top: 1rem;
	}
	.save-message {
		font: 600 0.84rem var(--atv-font-ui);
		color: var(--atv-text-secondary);
	}
	.method-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-top: 3rem;
		padding: 1.25rem 0;
		border-block: 1px solid var(--atv-border);
	}
	.method-grid div {
		display: grid;
		gap: 0.32rem;
	}
	.method-grid span {
		font: 700 0.68rem var(--atv-font-ui);
		letter-spacing: 0.12em;
		color: var(--atv-gold-700);
	}
	.method-grid strong {
		font: 600 0.9rem var(--atv-font-ui);
	}
	.result-preview {
		width: min(100%, 44rem);
		margin: 3rem auto 0;
		padding: clamp(1.35rem, 3vw, 2rem);
		border: 1px solid color-mix(in srgb, var(--atv-action) 35%, var(--atv-border));
		border-radius: var(--atv-radius-lg);
		background: var(--atv-surface-card);
	}
	.result-preview .eyebrow {
		margin-bottom: 0.45rem;
	}
	.result-preview h2 {
		margin: 0;
		font: 500 clamp(1.8rem, 4vw, 2.4rem)/1.05 var(--atv-font-display);
	}
	.result-preview > p:last-child {
		color: var(--atv-text-secondary);
		font-family: var(--atv-font-editorial);
	}
	.preview-lines {
		display: grid;
		gap: 0.65rem;
		margin: 1.5rem 0;
	}
	.preview-lines span {
		height: 0.65rem;
		border-radius: var(--atv-radius-pill);
		background: var(--atv-cloud-100);
	}
	.preview-lines span:nth-child(2) {
		width: 83%;
	}
	.preview-lines span:nth-child(3) {
		width: 63%;
	}
	@media (max-width: 800px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}
		.method-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
