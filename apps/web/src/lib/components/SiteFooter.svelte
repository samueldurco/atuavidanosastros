<script lang="ts">
	import { page } from '$app/state';
	import { primaryNavigation } from '$lib/data/public-navigation';
	import { visualContext } from '$lib/data/visual-v4';
	import BrandLogo from './BrandLogo.svelte';
	const universe = $derived(
		visualContext(
			page.url.pathname,
			page.url.search,
			page.data.product?.id || page.data.saved?.product_id || page.data.run?.productId
		).universe
	);
</script>

<footer class="site-footer" data-stitch="SH-01">
	<div class="container footer-grid">
		<div class="footer-brand">
			<BrandLogo compact onDark={!universe || universe === 'meu-ceu'} />
			<p>Astrologia para conhecer você.</p>
		</div>
		<nav aria-label="Rodapé">
			{#each primaryNavigation as item (item.href)}<a href={item.href}>{item.label}</a>{/each}
			<a href="/metodo">Nosso método</a><a href="/loja">Loja dos Signos</a><a href="/termos"
				>Termos de uso</a
			><a href="/privacidade">Privacidade</a><button
				type="button"
				onclick={() => window.dispatchEvent(new Event('atv-cookie-preferences'))}
				>Preferências de cookies</button
			><a href="/suporte">Suporte</a>
		</nav>
		<div class="fineprint">
			<p>Mapa astral, previsões, amor, carreira, Tarot e sonhos.</p>
			<a href="/temas">Conheça os temas <span aria-hidden="true">↗</span></a>
		</div>
	</div>
</footer>

<style>
	a:hover,
	button:hover {
		text-decoration: underline;
	}
</style>
