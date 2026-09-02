<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head
	><title>Entrar — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<section class="section">
	<div class="reading login card">
		<img
			src="/brand/logo/primary/atv-logo-primary.svg"
			alt="A Tua Vida nos Astros"
			width="1200"
			height="760"
		/>
		<h1>Entre para guardar o seu caminho.</h1>
		<p>
			Use sua conta Google. O link mágico permanece protegido por feature flag até o domínio de
			e-mail ser validado.
		</p>
		<form method="POST" action="?/google">
			<button class="button" type="submit" disabled={!data.authConfigured}
				>Continuar com Google</button
			>
		</form>
		{#if form?.message}<p class="message" aria-live="polite">{form.message}</p>{/if}
		{#if !data.authConfigured}<small
				>Configuração pública do Supabase ausente neste ambiente; nenhum login fictício foi ativado.</small
			>{/if}
	</div>
</section>

<style>
	.login {
		padding: clamp(1.5rem, 5vw, 4rem);
		text-align: center;
	}
	.login img {
		width: min(18rem, 70%);
	}
	.login h1 {
		font: 500 2.4rem var(--atv-font-display);
	}
	.login small,
	.message {
		display: block;
		margin-top: 1rem;
		color: var(--atv-text-secondary);
	}
	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
