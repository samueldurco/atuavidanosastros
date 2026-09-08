<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import BrandLogo from '../BrandLogo.svelte';
	import { navigation } from '$lib/data/site';
	let { children }: { children: Snippet } = $props();
	let expanded = $state(false);
	const primary = [
		{ href: '/dashboard', label: 'Visão geral' },
		{ href: '/biblioteca', label: 'Biblioteca' }
	];
</script>

<div class="member-shell" data-stitch="SH-02">
	<header class="member-header">
		<a href="/" aria-label="A Tua Vida nos Astros — início"
			><span class="full-logo"><BrandLogo /></span><span class="symbol-logo"
				><BrandLogo compact /></span
			></a
		>
		<div class="header-actions">
			<a href="/bussola-de-carreira">Explorar ferramentas</a><a
				class="chip"
				href={page.data.user ? '/dashboard' : '/entrar'}
				>{page.data.user ? 'Minha conta' : 'Entrar'}</a
			>
		</div>
	</header>
	<div class="member-layout">
		<aside class="sidebar">
			<p class="eyebrow">Meu atlas</p>
			<nav aria-label="Área pessoal">
				{#each primary as item (item.href)}<a
						href={item.href}
						aria-current={page.url.pathname === item.href ||
						page.url.pathname.startsWith(`${item.href}/`)
							? 'page'
							: undefined}>{item.label}</a
					>{/each}
			</nav>
			<div class="universe-menu">
				<p class="eyebrow">Seis universos</p>
				<nav aria-label="Universos do atlas">
					{#each navigation as item (item.href)}<a href={item.href}>{item.label}</a>{/each}
				</nav>
			</div>
			<div class="sidebar-bottom">
				<a href="/privacidade">Privacidade e dados</a><a href="/suporte">Preciso de ajuda</a>
			</div>
		</aside>
		<div class="member-body">
			<nav class="compact-nav" aria-label="Área pessoal no celular">
				{#each primary as item (item.href)}<a
						href={item.href}
						aria-current={page.url.pathname.startsWith(item.href) ? 'page' : undefined}
						>{item.label}</a
					>{/each}<button
					class="chip"
					aria-expanded={expanded}
					aria-controls="member-universes"
					onclick={() => (expanded = !expanded)}>Universos</button
				>
			</nav>
			{#if expanded}<nav
					id="member-universes"
					class="compact-universes"
					aria-label="Universos no celular"
				>
					{#each navigation as item (item.href)}<a
							href={item.href}
							onclick={() => (expanded = false)}>{item.label}</a
						>{/each}
				</nav>{/if}
			<main id="conteudo" tabindex="-1">{@render children()}</main>
			<footer>
				<span>Seu atlas pessoal.</span><a href="/privacidade">Privacidade</a><a href="/suporte"
					>Suporte</a
				>
			</footer>
		</div>
	</div>
</div>

<style>
	.member-shell {
		min-height: 100dvh;
	}
	.member-header {
		min-height: 5.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem var(--atv-page-margin);
		border-bottom: 1px solid var(--atv-border);
		background: var(--atv-surface-page);
	}
	.symbol-logo {
		display: none;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		font-size: 0.85rem;
	}
	a {
		text-decoration: none;
	}
	.header-actions a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.member-layout {
		display: grid;
		grid-template-columns: 14rem minmax(0, 1fr);
		max-width: 1568px;
		margin-inline: auto;
	}
	.sidebar {
		padding: 2.5rem 1.25rem;
		border-right: 1px solid var(--atv-border);
	}
	nav {
		display: grid;
		gap: 0.25rem;
	}
	nav a,
	.sidebar-bottom a {
		min-height: 44px;
		display: flex;
		align-items: center;
		padding: 0.65rem 0.85rem;
		font-size: 0.875rem;
		color: var(--atv-text-secondary);
		border-radius: var(--atv-radius-sm);
	}
	nav a[aria-current='page'] {
		background: var(--atv-surface-card);
		color: var(--atv-action);
		font-weight: 600;
		box-shadow: inset 3px 0 var(--atv-gold-500);
	}
	nav a:hover {
		background: var(--atv-surface-muted);
	}
	.universe-menu {
		margin-top: 2.5rem;
	}
	.sidebar-bottom {
		border-top: 1px solid var(--atv-border);
		padding-top: 1rem;
		margin-top: 2rem;
	}
	.member-body {
		min-width: 0;
	}
	main {
		padding: 2.5rem var(--atv-page-margin) 4rem;
		max-width: var(--atv-container-member);
		margin-inline: auto;
		min-height: 65vh;
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem var(--atv-page-margin);
		border-top: 1px solid var(--atv-border);
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
	}
	footer span {
		margin-right: auto;
	}
	footer a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.compact-nav,
	.compact-universes {
		display: none;
	}
	@media (max-width: 1023px) {
		.member-layout {
			grid-template-columns: 1fr;
		}
		.sidebar {
			display: none;
		}
		.compact-nav {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			padding: 1rem var(--atv-page-margin);
			border-bottom: 1px solid var(--atv-border);
		}
		.compact-universes {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			padding: 1rem var(--atv-page-margin);
		}
		main {
			padding-top: 1.5rem;
		}
	}
	@media (max-width: 767px) {
		.full-logo {
			display: none;
		}
		.symbol-logo {
			display: block;
		}
		.member-header {
			min-height: 4.5rem;
		}
		.header-actions > a:first-child {
			display: none;
		}
	}
</style>
