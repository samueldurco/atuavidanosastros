<script lang="ts">
	let city = $state('');
	let date = $state('');
	let time = $state('');
	let submitted = $state(false);
	function submit(event: SubmitEvent) {
		event.preventDefault();
		submitted = true;
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
<section class="section">
	<div class="container tool-grid">
		<div>
			<p class="eyebrow">Ferramenta gratuita</p>
			<h1 class="h1">Bússola de Carreira</h1>
			<p class="lead">
				Uma orientação inicial sobre contribuição, ambientes de trabalho e tensões a observar. O
				resultado completo aparecerá antes de qualquer pedido de cadastro quando o motor validado
				entrar em operação.
			</p>
		</div>
		<form class="card" onsubmit={submit}>
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
			><button class="button" type="submit">Calcular minha bússola</button>{#if submitted}<div
					class="result"
					role="status"
				>
					<strong>Seus dados foram validados apenas neste navegador.</strong>
					<p>
						O motor astrológico gratuito ainda está no gauntlet de precisão. Nenhum resultado
						aproximado será inventado; avisaremos quando o cálculo reproduzível estiver liberado.
					</p>
				</div>{/if}
		</form>
	</div>
</section>

<style>
	.tool-grid {
		display: grid;
		grid-template-columns: 1fr minmax(20rem, 0.8fr);
		gap: clamp(2rem, 6vw, 6rem);
		align-items: start;
	}
	form {
		padding: 1.5rem;
		display: grid;
		gap: 1rem;
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
	@media (max-width: 800px) {
		.tool-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
