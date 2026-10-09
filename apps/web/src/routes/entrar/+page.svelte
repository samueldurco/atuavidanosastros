<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	let { data, form } = $props();
</script>

<svelte:head
	><title>Entrar — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<div data-stitch="ID-01">
		<PageIntro
			eyebrow="Minha conta"
			title="Entre para acessar suas leituras"
			description="Use sua conta para acessar a Biblioteca e continuar a leitura que você escolheu."
		/>
		<div class="access-grid">
			<section class="card login" aria-labelledby="access-title">
				<img
					src="/brand/v4/MARCA/KIT_A_V001/vetores/atvna-simbolo-claro.svg"
					alt=""
					width="64"
					height="64"
				/>
				<p class="eyebrow">Acesso à sua conta</p>
				<h2 id="access-title">Acesse sua conta</h2>
				<p>Continue com sua conta Google. Depois do login, você voltará à página que escolheu.</p>
				<form method="POST" action={`?/google&next=${encodeURIComponent(data.next)}`}>
					<Button type="submit" disabled={!data.authConfigured}>Continuar com Google</Button>
				</form>
				{#if form?.message}<StatePanel
						kind="error"
						title="Não foi possível entrar"
						description={form.message}
					/>{/if}{#if !data.authConfigured}<StatePanel
						kind="info"
						title="Acesso temporariamente indisponível"
						description="Você pode continuar explorando as ferramentas gratuitas e tentar entrar mais tarde."
					/>{/if}
				<p class="privacy-note">
					Ao continuar, consulte como cuidamos dos seus dados na <a href="/privacidade"
						>política de privacidade</a
					>.
				</p>
			</section>
			<aside class="access-context">
				<p class="eyebrow">Sua Biblioteca</p>
				<h2>Suas leituras em um só lugar</h2>
				<ol>
					<li>
						<strong>Guardar</strong>
						<p>Salve os resultados que você escolher manter.</p>
					</li>
					<li>
						<strong>Consultar</strong>
						<p>Consulte suas leituras pela Biblioteca pessoal.</p>
					</li>
					<li>
						<strong>Continuar</strong>
						<p>Abra suas leituras quando quiser.</p>
					</li>
				</ol>
				<a href="/suporte">Precisa de ajuda para acessar?</a>
			</aside>
		</div>
	</div>
</ContentShell>

<style>
	.access-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.75fr);
		gap: clamp(2rem, 6vw, 6rem);
		align-items: start;
	}
	.login {
		padding: clamp(1.5rem, 4vw, 3rem);
		box-shadow: none;
	}
	.login > img {
		margin-bottom: 1.5rem;
	}
	h2 {
		margin: 0;
		font: 500 clamp(1.8rem, 3vw, 2.4rem)/1.2 var(--atv-font-display);
	}
	p {
		color: var(--atv-text-secondary);
	}
	form {
		margin-block: 2rem;
	}
	.privacy-note {
		border-top: 1px solid var(--atv-border);
		padding-top: 1.5rem;
		margin-top: 2rem;
		font-size: 0.8rem;
	}
	.access-context {
		padding-top: 1rem;
	}
	ol {
		list-style: decimal-leading-zero;
		padding-left: 2rem;
		margin-block: 2rem;
	}
	li {
		padding: 1rem 0 1rem 0.5rem;
		border-bottom: 1px solid var(--atv-border);
	}
	li::marker {
		color: var(--atv-text-accent);
		font-size: 0.85rem;
	}
	li p {
		margin: 0.5rem 0;
	}
	@media (max-width: 767px) {
		.access-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
