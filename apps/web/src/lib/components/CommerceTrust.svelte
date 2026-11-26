<script lang="ts">
	import { pendingTrustSeals, siteSecurityLinks } from '$lib/data/commerce-trust';
	import PaymentMarks from './PaymentMarks.svelte';
</script>

<div class="commerce-trust" data-commerce-trust>
	<section class="payment-section" aria-labelledby="footer-payments-title">
		<h2 id="footer-payments-title">Formas de pagamento</h2>
		<PaymentMarks />
		<p class="payment-caption">
			Meios previstos. As opções disponíveis e o parcelamento são confirmados no checkout de cada
			oferta.
		</p>
		<div class="providers" aria-label="Plataformas de pagamento">
			<a class="provider" href="https://www.shopify.com/" rel="noopener noreferrer">
				<img
					src="/brand/commerce/shopify.svg"
					alt="Shopify"
					width="98"
					height="28"
					loading="lazy"
				/>
				<span>Checkout da loja física</span>
			</a>
			<div class="provider pending">
				<strong>Hotmart</strong><span>Digitais · em preparação</span>
			</div>
			<div class="provider pending">
				<img
					src="/brand/commerce/mercadopago.svg"
					alt="Mercado Pago"
					width="54"
					height="30"
					loading="lazy"
				/><span>Em preparação</span>
			</div>
			<div class="provider pending">
				<img
					src="/brand/commerce/nubank.svg"
					alt="Nubank"
					width="54"
					height="30"
					loading="lazy"
				/><span>Em preparação</span>
			</div>
			<div class="provider pending">
				<img
					src="/brand/commerce/two-cards.svg"
					alt="Dois cartões"
					width="48"
					height="30"
					loading="lazy"
				/><span>Em preparação</span>
			</div>
		</div>
	</section>
	<section class="security-section" aria-labelledby="footer-security-title">
		<h2 id="footer-security-title">Segurança e confiança</h2>
		<div class="security-links">
			{#each siteSecurityLinks as service (service.id)}
				<a class="trust-mark" href={service.href} rel="noopener noreferrer">
					<span class="trust-image"
						><img
							src={'/brand/commerce/' + service.image}
							alt={service.name}
							width="98"
							height="28"
							loading="lazy"
						/>{#if service.id === 'cloudflare'}<strong class="cloudflare-name" aria-hidden="true"
								>Cloudflare</strong
							>{/if}</span
					>
					<span>{service.detail}</span>
				</a>
			{/each}
		</div>
		<p class="pending-heading">Próximos selos <span>· integração em preparação</span></p>
		<div class="pending-seals" aria-label="Selos com integração em preparação">
			{#each pendingTrustSeals as seal (seal.id)}
				<div class="trust-mark pending" data-pending-seal={seal.id}>
					<span class="trust-image"
						><img
							src={'/brand/commerce/' + seal.image}
							alt={seal.name}
							width="110"
							height="30"
							loading="lazy"
						/></span
					>
					<span>Em preparação</span>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.commerce-trust {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 28px 52px;
		padding-block: 24px;
		border-top: 1px solid #e4d3b536;
		color: #f4e9d2;
	}
	h2 {
		margin: 0 0 16px;
		color: inherit;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
	}
	.payment-caption {
		max-width: 49ch;
		margin: 10px 0 18px;
		color: #d4d4c9;
		font-size: 11px;
		line-height: 1.65;
	}
	.providers {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.provider,
	.trust-mark {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 7px;
		min-width: 0;
		color: #183746;
		background: #fffdf7;
		border: 1px solid #e1d9c8;
		border-radius: 4px;
		text-decoration: none;
	}
	.provider {
		flex: 0 1 auto;
		padding: 10px;
	}
	.provider img {
		object-fit: contain;
		max-width: 100%;
	}
	.provider strong {
		display: flex;
		align-items: center;
		height: 30px;
		color: #bb3724;
		font-size: 19px;
	}
	.provider span,
	.trust-mark > span:last-child {
		color: #46554f;
		font-size: 10px;
		line-height: 1.45;
		text-align: center;
	}
	.security-links,
	.pending-seals {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	.trust-mark {
		padding: 12px 6px 10px;
	}
	.trust-image {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 34px;
	}
	.trust-image img {
		display: block;
		width: auto;
		max-width: 100%;
		max-height: 30px;
		object-fit: contain;
	}
	.trust-image:has(.cloudflare-name) {
		gap: 4px;
	}
	.trust-image:has(.cloudflare-name) img {
		width: 24px;
	}
	.cloudflare-name {
		color: #183746;
		font-size: 10px;
	}
	.pending {
		border-style: dashed;
	}
	.pending-heading {
		margin: 17px 0 9px;
		color: #f4e9d2;
		font-size: 11px;
		line-height: 1.6;
	}
	.pending-heading span {
		color: #d4d4c9;
	}
	a:hover {
		box-shadow: 0 0 0 1px #d8c7a5;
	}
	a:focus-visible {
		outline: 2px solid #f4e9d2;
		outline-offset: 4px;
	}
	@media (max-width: 900px) {
		.commerce-trust {
			grid-template-columns: 1fr;
			gap: 28px;
		}
	}
	@media (max-width: 380px) {
		.security-links,
		.pending-seals {
			gap: 5px;
		}
		.trust-mark {
			padding-inline: 4px;
		}
		.trust-mark > span:last-child {
			font-size: 9px;
		}
	}
</style>
