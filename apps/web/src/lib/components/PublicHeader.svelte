<script lang="ts">
	import { page } from '$app/state';
	import { interestNavigation, secondaryNavigation } from '$lib/data/public-navigation';
	import BrandLogo from './BrandLogo.svelte';
	let open = $state(false);
	let expanded = $state<string | null>(null);
	let menuButton: HTMLButtonElement;
	let navigation: HTMLElement;
	function dismiss() {
		open = false;
		expanded = null;
	}
	function closeMenu(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			dismiss();
			menuButton.focus();
		}
	}
	function outsideMenu(event: MouseEvent) {
		if (
			open &&
			event.target instanceof Node &&
			!navigation.contains(event.target) &&
			!menuButton.contains(event.target)
		)
			dismiss();
	}
</script>

<svelte:window onkeydown={closeMenu} onclick={outsideMenu} />
<header class="site-header" data-stitch="SH-01">
	<div class="header-inner">
		<a href="/" class="brand" aria-label="A Tua Vida nos Astros — início" onclick={dismiss}>
			<span class="desktop-logo"><BrandLogo /></span><span class="mobile-logo"
				><BrandLogo compact /></span
			>
		</a>
		<button
			bind:this={menuButton}
			class="menu-button"
			aria-expanded={open}
			aria-controls="primary-navigation"
			onclick={() => {
				open = !open;
				expanded = null;
			}}
		>
			{open ? 'Fechar menu' : 'Menu'}
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				><path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'} /></svg
			>
		</button>
		<nav bind:this={navigation} id="primary-navigation" aria-label="Navegação principal" class:open>
			<p class="menu-title">O que você procura?</p>
			<a
				class="direct home"
				href="/"
				aria-current={page.url.pathname === '/' ? 'page' : undefined}
				onclick={dismiss}
			>
				<svg class="topic-icon" aria-hidden="true" viewBox="0 0 24 24"
					><path d="M3 11l9-8 9 8M5 10v11h14V10M10 21v-7h4v7" /></svg
				>Início
			</a>
			{#each interestNavigation as item (item.id)}
				<details open={expanded === item.id}>
					<summary
						onclick={(event) => {
							event.preventDefault();
							expanded = expanded === item.id ? null : item.id;
						}}
					>
						<svg class="topic-icon" aria-hidden="true" viewBox="0 0 24 24"
							><path d={item.icon} /></svg
						>
						<span>{item.label}</span>
						<svg class="chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"
							><path d="m6 9 6 6 6-6" /></svg
						>
					</summary>
					<div class="submenu">
						<a class="entry" href={item.href} onclick={dismiss}>
							<span class="entry-title">{item.action}</span>
							<span class="entry-note">{item.note}</span>
							<span class="availability" class:available={item.available}
								>{item.available ? 'Grátis' : 'Em preparação'}</span
							>
						</a>
						<a class="editorial" href={`/caderno?tema=${item.id}`} onclick={dismiss}
							>{item.editorial}<span aria-hidden="true"> →</span></a
						>
					</div>
				</details>
			{/each}
			<a class="direct shop" href="/loja" onclick={dismiss}
				><svg class="topic-icon" aria-hidden="true" viewBox="0 0 24 24"
					><path d="M4 8h16l1 13H3ZM8 8V6a4 4 0 018 0v2" /></svg
				>Loja dos Signos<span class="arrow" aria-hidden="true">→</span></a
			>
			<a class="account" href={page.data.user ? '/dashboard' : '/entrar'} onclick={dismiss}
				>Minha conta</a
			>
			<div class="secondary">
				{#each secondaryNavigation as item (item.href)}<a href={item.href} onclick={dismiss}
						>{item.label}</a
					>{/each}
			</div>
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
		position: relative;
		max-width: 1504px;
		margin: auto;
		min-height: 5.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--atv-page-margin);
		gap: 1rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.mobile-logo {
		display: none;
	}
	.menu-button {
		display: flex;
		min-width: 44px;
		min-height: 48px;
		border: 1px solid var(--atv-border);
		padding: 0.65rem 0.85rem;
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
		border-radius: var(--atv-radius-sm);
		gap: 0.75rem;
		align-items: center;
		cursor: pointer;
	}
	nav {
		position: absolute;
		top: 100%;
		right: var(--atv-page-margin);
		width: 440px;
		max-width: calc(100vw - 2 * var(--atv-page-margin));
		max-height: calc(100dvh - 5.5rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		background: var(--atv-surface-page);
		padding: 1.25rem 1.5rem 1rem;
		display: none;
		flex-direction: column;
		align-items: stretch;
		border: 1px solid var(--atv-border);
		box-shadow: var(--atv-shadow-1);
		font: 500 0.95rem var(--atv-font-ui);
	}
	nav.open {
		display: flex;
	}
	.menu-title {
		margin: 0 0 1rem;
		font: 500 1.7rem/1.15 var(--atv-font-display);
		color: var(--atv-text-primary);
	}
	nav a {
		text-decoration: none;
		color: var(--atv-text-primary);
	}
	.direct,
	summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 51px;
		padding: 0.5rem 0.6rem;
	}
	.home {
		background: var(--atv-surface-muted);
		border-radius: var(--atv-radius-sm);
		margin-bottom: 0.25rem;
	}
	.topic-icon {
		width: 21px;
		height: 21px;
		flex: 0 0 21px;
		fill: none;
		stroke: var(--atv-text-accent);
		stroke-width: 1.3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	details {
		border-bottom: 1px solid var(--atv-border);
	}
	summary {
		list-style: none;
		cursor: pointer;
		color: var(--atv-text-primary);
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.chevron {
		margin-left: auto;
		flex-shrink: 0;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		transition: transform 0.15s;
	}
	details[open] .chevron {
		transform: rotate(180deg);
	}
	.submenu {
		padding: 0.15rem 0.25rem 0.75rem 2.35rem;
	}
	.entry {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
		background: var(--atv-surface-muted);
		padding: 0.85rem;
		border-radius: var(--atv-radius-sm);
	}
	.entry-title {
		line-height: 1.4;
	}
	.entry-note {
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--atv-text-secondary);
	}
	.availability {
		font-size: 0.7rem;
		color: var(--atv-text-secondary);
	}
	.availability.available {
		color: var(--atv-text-primary);
		font-weight: 700;
	}
	.editorial {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		gap: 0.5rem;
		padding: 0.7rem 0.25rem;
		font-size: 0.82rem;
		line-height: 1.5;
	}
	.arrow {
		margin-left: auto;
	}
	.shop {
		margin-top: 0.35rem;
	}
	.account {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 48px;
		margin-top: 0.65rem;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		background: var(--atv-action);
		color: var(--atv-paper-0);
		font-weight: 700;
	}
	:global([data-theme='night']) .account {
		color: var(--atv-night-950);
	}
	.secondary {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		column-gap: 1rem;
		margin-top: 0.6rem;
	}
	.secondary a {
		display: flex;
		align-items: center;
		min-height: 44px;
		font-size: 0.72rem;
		color: var(--atv-text-secondary);
	}
	a:hover,
	summary:hover {
		text-decoration: underline;
	}
	.account:hover {
		background: var(--atv-action-hover);
		text-decoration: none;
	}
	@media (max-width: 599px) {
		.header-inner {
			min-height: 4.5rem;
		}
		.desktop-logo {
			display: none;
		}
		.mobile-logo {
			display: flex;
		}
		nav {
			left: 0;
			right: 0;
			width: auto;
			max-width: none;
			max-height: calc(100dvh - 4.5rem);
			padding: 1.1rem var(--atv-page-margin) 1rem;
			border-inline: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.chevron {
			transition: none;
		}
	}
</style>
