<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		interestNavigation,
		navigationGroups,
		primaryNavigation,
		secondaryNavigation
	} from '$lib/data/public-navigation';
	import BrandLogo from './BrandLogo.svelte';
	let open = $state(false);
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	let menuButton: HTMLButtonElement;
	let navigation: HTMLElement;
	function dismiss() {
		open = false;
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
			<BrandLogo />
		</a>
		<div class="header-actions">
			<nav class="intent-links" aria-label="Atalhos principais">
				{#each primaryNavigation as item (item.href)}
					<a
						href={item.href}
						aria-current={page.url.pathname === item.href ||
						page.url.pathname.startsWith(`${item.href}/`)
							? 'page'
							: undefined}
						onclick={dismiss}>{item.label}</a
					>
				{/each}
			</nav>
			<a class="header-account" href={page.data.user ? '/dashboard' : '/entrar'}
				>{page.data.user ? 'Minha área' : 'Entrar'}</a
			>
			<button
				bind:this={menuButton}
				class="menu-button"
				disabled={!ready}
				aria-expanded={open}
				aria-controls="primary-navigation"
				onclick={() => {
					open = !open;
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
		</div>
		<nav bind:this={navigation} id="primary-navigation" aria-label="Navegação principal" class:open>
			<p class="menu-title">Encontre seu caminho</p>
			<div class="navigation-groups">
				{#each navigationGroups as group (group.id)}
					<section aria-labelledby={'menu-' + group.id}>
						<h2 class="navigation-heading" id={'menu-' + group.id}>{group.label}</h2>
						{#each group.links as item (item.href)}
							<a
								class="navigation-choice"
								href={item.href}
								onclick={dismiss}
								aria-current={page.url.pathname === item.href ||
								page.url.pathname.startsWith(`${item.href}/`)
									? 'page'
									: undefined}
							>
								<span class="choice-label">{item.label}<span aria-hidden="true">↗</span></span>
								<span class="choice-description">{item.description}</span>
							</a>
						{/each}
					</section>
				{/each}
			</div>
			<h2 class="navigation-heading topic-title">Explore por assunto</h2>
			<div class="nav-interests">
				{#each interestNavigation as item (item.id)}
					<a class="topic-link" href={item.href} onclick={dismiss}>
						<svg class="topic-icon" aria-hidden="true" viewBox="0 0 24 24"
							><path d={item.icon} /></svg
						>
						{item.label}<span aria-hidden="true">→</span>
					</a>
				{/each}
			</div>
			<div class="nav-secondary">
				<a href={page.data.user ? '/dashboard' : '/entrar'} onclick={dismiss}
					>{page.data.user ? 'Minha área' : 'Entrar na minha conta'}</a
				>
				<a href="/biblioteca" onclick={dismiss}>Minhas leituras</a>
				{#each secondaryNavigation as item (item.href)}<a href={item.href} onclick={dismiss}
						>{item.label}</a
					>{/each}
			</div>
		</nav>
	</div>
</header>

<style>
	.site-header {
		container: public-header / inline-size;
	}
	.topic-icon {
		width: 21px;
		height: 21px;
		flex: 0 0 21px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
	}
	.topic-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 48px;
		border-bottom: 1px solid rgb(247 233 206 / 16%);
		text-decoration: none;
	}
	.topic-link span {
		margin-left: auto;
	}
	.topic-title {
		margin: 1.5rem 0 0;
		color: inherit;
	}
	.intent-links {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.intent-links a {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		text-decoration: none;
	}
	.intent-links a[aria-current='page'] {
		text-decoration: underline;
		text-underline-offset: 0.3em;
	}
	@media (max-width: 1399px) {
		.intent-links {
			display: none;
		}
	}
	@container public-header (max-width: 1399px) {
		.intent-links {
			display: none;
		}
	}
	.menu-title {
		font: 500 1.7rem/1.15 var(--atv-font-display);
		margin: 0 0 1rem;
	}
	.navigation-groups {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2rem;
	}
	.navigation-heading {
		font: 600 0.8rem/1.4 var(--atv-font-ui);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin: 0 0 0.5rem;
		color: #e6c294;
	}
	.topic-title {
		margin-top: 1.5rem;
	}
	.navigation-choice {
		display: block;
		padding: 0.85rem 0;
		border-bottom: 1px solid rgb(247 233 206 / 16%);
		text-decoration: none;
	}
	.choice-label {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-weight: 600;
	}
	.choice-description {
		display: block;
		font-size: 0.85rem;
		line-height: 1.5;
		margin-top: 0.25rem;
		color: #e1d9c9;
	}
	.navigation-choice:hover .choice-label,
	.navigation-choice[aria-current='page'] .choice-label {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
	@media (max-width: 680px) {
		.navigation-groups {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}
</style>
