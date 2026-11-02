<script lang="ts">
	import type { ShopSellerIdentity } from '$lib/server/shop/seller-identity';
	let { seller }: { seller: ShopSellerIdentity } = $props();
</script>

<section class="shop-seller" aria-labelledby="shop-seller-title">
	<h2 id="shop-seller-title">Quem vende e atende</h2>
	<p><strong>ATVNA — A Tua Vida nos Astros</strong></p>
	<p>Responsável pelas vendas: {seller.name}.</p>
	{#if seller.document}
		<p>Identificação: {seller.document}</p>
	{/if}
	<address>
		<p>{seller.address}</p>
		<p><a href={`mailto:${seller.email}`}>{seller.email}</a></p>
	</address>
	<p>
		Atendimento por e-mail ou <a href="/fale-conosco?assunto=loja">formulário</a>, em até 2 dias
		úteis.
	</p>
	<p>
		Para devolver um produto, <a href="/loja/devolucoes">consulte a política de devoluções</a> e entre
		em contato para receber as instruções de envio.
	</p>
</section>

<style>
	.shop-seller {
		max-width: 76ch;
		padding-top: 2rem;
		border-top: 1px solid var(--atv-border);
		overflow-wrap: anywhere;
	}
	h2 {
		font: 500 clamp(1.35rem, 3vw, 1.8rem)/1.2 var(--atv-font-display);
	}
	p {
		line-height: 1.7;
	}
	address {
		font-style: normal;
	}
</style>
