<script lang="ts">
	import PaymentMarks from './PaymentMarks.svelte';
	let { provider = 'shopify', pending = false } = $props<{
		provider?: 'shopify' | 'hotmart';
		pending?: boolean;
	}>();
</script>

<div class="checkout-assurance" data-checkout-assurance={provider}>
	<div class="assurance-heading">
		{#if provider === 'shopify'}
			<a
				href="https://www.shopify.com/"
				rel="noopener noreferrer"
				aria-label="Shopify · plataforma do checkout"
				><img
					src="/brand/commerce/shopify.svg"
					alt="Shopify"
					width="92"
					height="26"
					loading="lazy"
				/></a
			>
		{:else}<strong class="hotmart">Hotmart</strong>{/if}
		<span
			>{pending
				? 'Pagamento em preparação'
				: provider === 'shopify'
					? 'Checkout da loja física'
					: 'Pagamento pela Hotmart'}</span
		>
	</div>
	<PaymentMarks compact />
	<p>
		{pending
			? 'Meios previstos para as vendas futuras. Os testes gratuitos continuam sem cobrança.'
			: 'Meios previstos. Confira as opções disponíveis, o total e o parcelamento antes de pagar.'}
	</p>
	<a class="security-link" href="#footer-security-title"
		>Segurança e selos do site <span aria-hidden="true">↓</span></a
	>
</div>

<style>
	.checkout-assurance {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid #c7bfac;
		color: #183746;
		text-align: left;
	}
	.assurance-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin-bottom: 12px;
	}
	.assurance-heading a {
		display: inline-flex;
	}
	.assurance-heading img {
		display: block;
		object-fit: contain;
	}
	.assurance-heading span {
		font-size: 11px;
		line-height: 1.5;
	}
	.hotmart {
		color: #a82e1c;
		font-size: 19px;
	}
	p {
		max-width: 55ch;
		margin: 9px 0 6px;
		font-size: 11px;
		line-height: 1.65;
		color: #46554f;
	}
	.security-link {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 32px;
		color: #183746;
		font-size: 11px;
		text-underline-offset: 3px;
	}
	a:focus-visible {
		outline: 2px solid #183746;
		outline-offset: 3px;
	}
</style>
