<footer>
	<div class="footer-grid">
		<div>
			<img
				src="/brand/logo/horizontal/atv-logo-horizontal-on-dark.svg"
				alt="A Tua Vida nos Astros"
				width="1600"
				height="360"
			/>
			<p>Um atlas editorial para a vida.</p>
		</div>
		<nav aria-label="Rodapé">
			<a href="/metodo">Método</a><a href="/caderno">Caderno</a><a href="/loja">Loja dos Signos</a
			><a href="/privacidade">Privacidade</a><a href="/suporte">Suporte</a>
		</nav>
	</div>
	<p class="fineprint">
		Conteúdo interpretativo para autoconhecimento. Não substitui orientação médica, jurídica,
		financeira ou profissional.
	</p>
</footer>

<style>
	footer {
		background: var(--atv-night-950);
		color: var(--atv-frost-50);
		padding: 4rem max(1.25rem, calc((100vw - 1376px) / 2)) 2rem;
	}
	.footer-grid {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 4rem;
		align-items: start;
	}
	img {
		width: min(22rem, 100%);
		height: auto;
	}
	p {
		color: var(--atv-lunar-mist-300);
		font-family: var(--atv-font-editorial);
		font-size: 1.1rem;
	}
	nav {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	a {
		color: var(--atv-frost-50);
		text-decoration: none;
		font: 500 0.9rem var(--atv-font-ui);
	}
	a:hover {
		text-decoration: underline;
	}
	.fineprint {
		font: 400 0.75rem var(--atv-font-ui);
		border-top: 1px solid rgb(174 191 220 / 22%);
		margin-top: 3rem;
		padding-top: 1.5rem;
	}
	@media (max-width: 700px) {
		.footer-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
	}
</style>
