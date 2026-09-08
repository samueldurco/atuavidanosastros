<script lang="ts">
	import { page } from '$app/state';
	import BrandLogo from './BrandLogo.svelte';
	let open = $state(false);
	let menuButton: HTMLButtonElement;
	const navigation = [
		{ href: '/#universos', label: 'Universos' },
		{ href: '/bussola-de-carreira', label: 'Ferramentas' },
		{ href: '/caderno', label: 'Caderno' },
		{ href: '/metodo', label: 'Método' },
		{ href: '/loja', label: 'Loja' }
	];
	function closeMenu(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			open = false;
			menuButton.focus();
		}
	}
</script>

<svelte:window onkeydown={closeMenu} />
<header class="site-header" data-stitch="SH-01">
	<div class="header-inner">
		<a href="/" class="brand" aria-label="A Tua Vida nos Astros — início"
			><span class="desktop-logo"><BrandLogo /></span><span class="mobile-logo"
				><BrandLogo compact /></span
			></a
		>
		<button
			bind:this={menuButton}
			class="menu-button"
			aria-expanded={open}
			aria-controls="primary-navigation"
			onclick={() => (open = !open)}
			>{open ? 'Fechar menu' : 'Menu'}<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				><path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'} /></svg
			></button
		>
		<nav id="primary-navigation" aria-label="Navegação principal" class:open>
			{#each navigation as item (item.href)}<a
					href={item.href}
					aria-current={page.url.pathname === item.href ? 'page' : undefined}
					onclick={() => (open = false)}>{item.label}</a
				>{/each}
			<a
				class="button account"
				href={page.data.user ? '/dashboard' : '/entrar'}
				onclick={() => (open = false)}>{page.data.user ? 'Meu atlas' : 'Entrar no meu atlas'}</a
			>
		</nav>
	</div>
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 40;
		background: var(--atv-surface-page);
		border-bottom: 1px solid var(--atv-border);
	}
	.header-inner {
		max-width: 1504px;
		margin: auto;
		min-height: 5.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--atv-page-margin);
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
		gap: clamp(0.75rem, 1.4vw, 1.5rem);
		font: 500 0.85rem var(--atv-font-ui);
	}
	nav > a:not(.button) {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		text-decoration: none;
		color: var(--atv-text-primary);
		border-bottom: 1px solid transparent;
	}
	nav > a:hover,
	nav > a[aria-current='page'] {
		border-bottom-color: var(--atv-action);
	}
	.account {
		white-space: nowrap;
		font-size: 0.8rem;
	}
	.menu-button {
		display: none;
		min-width: 44px;
		min-height: 48px;
		border: 1px solid var(--atv-border);
		padding: 0.65rem 0.85rem;
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
		border-radius: var(--atv-radius-sm);
		gap: 0.75rem;
		align-items: center;
	}
	@media (max-width: 1100px) {
		.header-inner {
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
			max-height: calc(100dvh - 4.5rem);
			overflow-y: auto;
			background: var(--atv-surface-page);
			padding: 1rem var(--atv-page-margin) 1.5rem;
			display: none;
			flex-direction: column;
			align-items: stretch;
			border-bottom: 1px solid var(--atv-border);
		}
		nav.open {
			display: flex;
		}
		nav > a:not(.button) {
			padding: 0.5rem;
		}
	}
</style>
