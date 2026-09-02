<script lang="ts">
	import BrandLogo from './BrandLogo.svelte';
	import { navigation } from '$lib/data/site';
	let open = $state(false);
</script>

<header class="site-header">
	<div class="header-inner">
		<a href="/" class="brand" aria-label="A Tua Vida nos Astros — início"
			><span class="desktop-logo"><BrandLogo /></span><span class="mobile-logo"
				><BrandLogo compact /></span
			></a
		><button
			class="menu-button"
			aria-expanded={open}
			aria-controls="primary-navigation"
			onclick={() => (open = !open)}
			><span>{open ? 'Fechar' : 'Menu'}</span><span aria-hidden="true">{open ? '×' : '☰'}</span
			></button
		>
		<nav id="primary-navigation" aria-label="Navegação principal" class:open>
			{#each navigation as item (item.href)}<a href={item.href} onclick={() => (open = false)}
					>{item.label}</a
				>{/each}<a class="account" href="/entrar">Entrar</a>
		</nav>
	</div>
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--atv-surface-page) 94%, transparent);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--atv-border);
	}
	.header-inner {
		max-width: 1440px;
		margin: auto;
		min-height: 5.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2rem;
		gap: 2rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.mobile-logo {
		display: none;
	}
	nav {
		display: flex;
		align-items: center;
		gap: clamp(0.8rem, 1.5vw, 1.5rem);
		font: 600 0.86rem var(--atv-font-ui);
	}
	nav a {
		text-decoration: none;
		color: var(--atv-text-primary);
		padding: 0.75rem 0.1rem;
		border-bottom: 1px solid transparent;
	}
	nav a:hover {
		border-color: var(--atv-action);
	}
	.account {
		border: 1px solid var(--atv-action) !important;
		border-radius: var(--atv-radius-pill);
		padding: 0.65rem 1rem !important;
	}
	.menu-button {
		display: none;
		min-width: 44px;
		min-height: 44px;
		border: 1px solid var(--atv-border);
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
		border-radius: var(--atv-radius-sm);
		font: 600 0.9rem var(--atv-font-ui);
		gap: 0.6rem;
		align-items: center;
	}
	@media (max-width: 900px) {
		.header-inner {
			padding: 0 1.25rem;
			min-height: 4.5rem;
		}
		.desktop-logo {
			display: none;
		}
		.mobile-logo,
		.menu-button {
			display: flex;
		}
		nav {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: var(--atv-surface-page);
			padding: 1rem 1.25rem 1.5rem;
			display: none;
			flex-direction: column;
			align-items: stretch;
			border-bottom: 1px solid var(--atv-border);
			box-shadow: var(--atv-shadow-1);
		}
		nav.open {
			display: flex;
		}
		nav a {
			padding: 0.8rem;
		}
		.account {
			text-align: center;
		}
	}
</style>
