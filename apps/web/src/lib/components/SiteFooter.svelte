<script lang="ts">
	import { navigationGroups } from '$lib/data/public-navigation';
	import { shopPolicyLinks } from '$lib/data/shop-policies';
	import BrandLogo from './BrandLogo.svelte';
	import SocialPresence from './SocialPresence.svelte';
</script>

<footer class="site-footer" data-stitch="SH-01">
	<div class="container footer-main">
		<div class="footer-brand">
			<BrandLogo compact onDark={false} />
			<p>Astrologia para conhecer você.</p>
			<a href="/fale-conosco">Fale com a ATVNA <span aria-hidden="true">↗</span></a>
		</div>
		{#each navigationGroups as group (group.id)}
			<nav class="footer-links" aria-label={group.label}>
				<p class="eyebrow">{group.label}</p>
				{#each group.links as item (item.href)}<a href={item.href}>{item.label}</a>{/each}
			</nav>
		{/each}
		<nav class="footer-links" aria-label="Informações e atendimento">
			<p class="eyebrow">Sobre a ATVNA</p>
			<a href="/metodo">Nosso método</a>
			<a href="/canais-oficiais">Canais oficiais</a>
			<a href="/fale-conosco">Fale conosco</a>
			<a href="/biblioteca">Minhas leituras</a>
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
	<div class="container footer-social">
		<div>
			<p class="eyebrow">Nos encontre também</p>
			<p>Escolha a rede que faz parte do seu dia.</p>
		</div>
		<SocialPresence compact />
	</div>
	<div class="container footer-bottom">
		<p>A Tua Vida nos Astros</p>
		<a href="/temas">Conheça os seis universos <span aria-hidden="true">↗</span></a>
	</div>
</footer>

<style>
	.footer-main {
		display: grid;
		grid-template-columns: 1.15fr 1fr 1fr 1fr;
		gap: 2.5rem;
		padding-block: 3.5rem 2rem;
	}
	.footer-brand p {
		margin-block: 1rem 1.2rem;
	}
	.site-footer .footer-links {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
	}
	.footer-links .eyebrow {
		margin: 0 0 0.5rem;
	}
	.site-footer .footer-links a,
	.site-footer .footer-links button,
	.footer-brand > a,
	.footer-bottom a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.site-footer .footer-links button {
		padding: 0;
		border: 0;
		color: inherit;
		background: transparent;
		font: inherit;
		cursor: pointer;
		text-align: left;
	}
	.footer-social {
		display: grid;
		grid-template-columns: 0.85fr 2fr;
		gap: 3rem;
		padding-block: 2rem;
		border-top: 1px solid var(--atv-border);
	}
	.footer-social p {
		margin-top: 0;
	}
	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding-block: 1rem;
		border-top: 1px solid var(--atv-border);
		font-size: 0.85rem;
	}
	a:hover,
	button:hover {
		text-decoration: underline;
	}
	@media (max-width: 1000px) {
		.footer-main {
			grid-template-columns: 1fr 1fr;
			gap: 2rem;
		}
		.footer-brand {
			grid-column: 1 / -1;
		}
		.footer-social {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}
	@media (max-width: 420px) {
		.footer-main {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.footer-bottom {
			align-items: flex-start;
			flex-direction: column;
			gap: 0;
		}
	}
</style>
