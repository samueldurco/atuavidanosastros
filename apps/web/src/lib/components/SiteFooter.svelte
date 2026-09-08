<script lang="ts">
	import BrandLogo from './BrandLogo.svelte';
</script>

<footer data-stitch="SH-01">
	<div class="container footer-grid">
		<div class="footer-brand">
			<BrandLogo />
			<p>Um atlas editorial para a vida.</p>
		</div>
		<nav aria-label="Rodapé">
			<a href="/metodo">Nosso método</a><a href="/caderno">Caderno</a><a href="/loja"
				>Loja dos Signos</a
			><a href="/privacidade">Privacidade</a><a href="/suporte">Suporte</a>
		</nav>
	</div>
	<div class="container fineprint">
		<p>Astrologia e símbolos com contexto, cuidado e espaço para escolha.</p>
		<a href="/#universos">Explore os seis universos <span aria-hidden="true">↗</span></a>
	</div>
</footer>

<style>
	footer {
		border-top: 1px solid var(--atv-border);
		padding-block: 3rem 1.5rem;
		background: var(--atv-surface-page);
	}
	.footer-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3rem;
		align-items: start;
	}
	.footer-brand p {
		font: 400 1.1875rem var(--atv-font-editorial);
		color: var(--atv-text-secondary);
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.5rem 1.5rem;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--atv-text-secondary);
		font-size: 0.8rem;
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
	.fineprint {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 2rem;
		border-top: 1px solid var(--atv-border);
		margin-top: 2rem;
		padding-top: 1rem;
		color: var(--atv-text-secondary);
		font-size: 0.75rem;
	}
	@media (max-width: 767px) {
		.footer-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		nav {
			justify-content: flex-start;
		}
	}
</style>
