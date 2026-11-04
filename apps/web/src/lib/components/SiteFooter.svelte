<script lang="ts">
	import { shopPolicyLinks } from '$lib/data/shop-policies';
	import { publicChannels } from '$lib/data/public-channels';
	import BrandLogo from './BrandLogo.svelte';
	import SocialIcon from './SocialIcon.svelte';
</script>

<footer class="site-footer" data-stitch="SH-01">
	<div class="container footer-main">
		<div class="footer-brand">
			<BrandLogo compact />
		</div>
		<nav class="footer-links" aria-label="Informações e atendimento">
			<a href="/explorar">Explorar</a>
			<a href="/temas">Por temas</a>
			<a href="/signos">Por signos</a>
			<a href="/leituras">Produtos digitais</a>
			<a href="/loja">Produtos físicos</a>
			<a href="/atv-mais">ATV+ · Assinatura</a>
			<a href="/metodo">Nosso método</a>
			<a href="/fale-conosco">Fale conosco</a>
			<a href="/canais-oficiais">Canais oficiais</a>
			<a href="/biblioteca">Minhas leituras</a>
		</nav>
	</div>
	<div class="container footer-details">
		<nav class="footer-legal" aria-label="Termos e políticas">
			<a href="/termos">Termos de uso</a>
			<a href="/privacidade">Privacidade</a>
			{#each shopPolicyLinks as policy (policy.href)}
				<a href={policy.href}>{policy.label}</a>
			{/each}
			<button
				type="button"
				onclick={() => window.dispatchEvent(new Event('atv-cookie-preferences'))}
				>Preferências de cookies</button
			>
		</nav>
	</div>
	<div class="container footer-bottom">
		<p>A Tua Vida nos Astros</p>
		<nav class="footer-social" aria-label="ATVNA nas redes">
			{#each publicChannels as channel (channel.id)}
				<a
					href={channel.href}
					rel="me noopener noreferrer"
					aria-label={`ATVNA no ${channel.name}`}
					title={channel.name}
				>
					<SocialIcon name={channel.id} />
				</a>
			{/each}
		</nav>
	</div>
</footer>

<style>
	:global(.mvp-experience) .site-footer {
		background: #103344;
		color: #f4e9d2;
		padding: 28px 0 16px;
		--atv-border: #e4d3b536;
		--atv-text-primary: #f4e9d2;
		--atv-surface-card: #1c4658;
	}
	.site-footer :global(a),
	.site-footer :global(button) {
		color: inherit;
	}
	.footer-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px 36px;
		padding-block: 0 18px;
	}
	.footer-brand {
		flex: 0 0 auto;
	}
	.footer-brand :global(.mvp-brand) {
		gap: 9px;
	}
	.footer-brand :global(.mvp-brand img) {
		width: 32px;
		height: 32px;
		flex-basis: 32px;
	}
	.footer-brand :global(.mvp-wordmark small) {
		font-size: 8px;
	}
	.footer-brand :global(.mvp-wordmark > span) {
		font-size: 24px;
	}
	.site-footer .footer-links,
	.site-footer .footer-legal {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px 20px;
	}
	.site-footer .footer-links {
		justify-content: flex-end;
	}
	.site-footer .footer-links a,
	.site-footer .footer-legal a,
	.site-footer .footer-legal button {
		min-height: 28px;
		padding: 2px 0;
		display: inline-flex;
		align-items: center;
		font-size: 12px;
		line-height: 1.5;
	}
	.footer-details {
		padding-block: 12px;
		border-top: 1px solid var(--atv-border);
	}
	.site-footer .footer-legal {
		gap: 0 20px;
		color: #c8c5b9;
	}
	.site-footer .footer-legal a,
	.site-footer .footer-legal button {
		font-size: 11px;
	}
	.site-footer .footer-legal button {
		padding: 0;
		border: 0;
		color: inherit;
		background: transparent;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}
	.site-footer .footer-social {
		display: flex;
		flex-wrap: wrap;
		max-width: 100%;
		gap: 4px;
		align-items: center;
	}
	.site-footer .footer-social a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		min-height: 32px;
		padding: 0;
		color: #c8c5b9;
		border-radius: 2px;
		transition:
			color 160ms ease,
			background-color 160ms ease;
	}
	.site-footer .footer-social :global(svg) {
		width: 17px;
		height: 17px;
	}
	.site-footer .footer-social a:hover {
		color: #fff8e9;
		background: #ffffff12;
	}
	.site-footer .footer-social a:focus-visible {
		outline: 2px solid #f4e9d2;
		outline-offset: 3px;
	}
	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px 24px;
		margin: 0 auto;
		padding-block: 0;
		border: 0;
		font-size: 10px;
		color: #c8c5b9;
	}
	.footer-bottom p {
		margin: 0;
	}
	a:hover,
	button:hover {
		text-decoration: underline;
	}
	@media (max-width: 900px) {
		.footer-main {
			align-items: flex-start;
			flex-direction: column;
			gap: 14px;
		}
		.site-footer .footer-links {
			justify-content: flex-start;
		}
		.footer-bottom {
			flex-wrap: wrap;
		}
	}
	@media (max-width: 480px) {
		:global(.mvp-experience) .site-footer {
			padding-block: 24px 18px;
		}
		.site-footer .footer-links {
			gap: 2px 16px;
		}
		.site-footer .footer-legal {
			gap: 0 16px;
		}
		.footer-bottom {
			align-items: flex-start;
			flex-direction: column;
			gap: 8px;
		}
		.site-footer .footer-social {
			gap: 2px;
		}
		.site-footer .footer-social a {
			width: 28px;
			min-height: 28px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.site-footer .footer-social a {
			transition: none;
		}
	}
</style>
