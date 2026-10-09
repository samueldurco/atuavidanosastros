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
			<BrandLogo />
		</a>
		<div class="header-actions">
			<a class="header-readings" href="/leituras">Leituras e experiências</a>
			<a class="header-account" href={page.data.user ? '/dashboard' : '/entrar'}>Minha conta</a>
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
		</div>
		<nav bind:this={navigation} id="primary-navigation" aria-label="Navegação principal" class:open>
			<p class="menu-title">O que você procura?</p>
			<div class="nav-main">
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
				<a class="direct" href="/caderno" onclick={dismiss}>Revista ATVNA</a>
			</div>
			<div class="nav-interests">
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
			</div>
			<div class="nav-main">
				<a class="direct shop" href="/loja" onclick={dismiss}
					><svg class="topic-icon" aria-hidden="true" viewBox="0 0 24 24"
						><path d="M4 8h16l1 13H3ZM8 8V6a4 4 0 018 0v2" /></svg
					>Loja dos Signos<span class="arrow" aria-hidden="true">→</span></a
				>
				<a class="account" href={page.data.user ? '/dashboard' : '/entrar'} onclick={dismiss}
					>Minha conta</a
				>
			</div>
			<div class="nav-secondary">
				{#each secondaryNavigation as item (item.href)}<a href={item.href} onclick={dismiss}
						>{item.label}</a
					>{/each}
			</div>
		</nav>
	</div>
</header>

<style>
	.topic-icon {
		width: 21px;
		height: 21px;
		flex: 0 0 21px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
	}
	summary {
		list-style: none;
		gap: 0.75rem;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.chevron {
		margin-left: auto;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
	}
	details[open] .chevron {
		transform: rotate(180deg);
	}
	.direct {
		gap: 0.75rem;
	}
	.arrow {
		margin-left: auto;
	}
	.entry {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
	}
	.entry-note {
		font-size: 0.8rem;
	}
	.availability {
		font-size: 0.7rem;
	}
	.editorial {
		justify-content: space-between;
		gap: 0.5rem;
	}
	.menu-title {
		font: 500 1.7rem/1.15 var(--atv-font-display);
		margin: 0 0 1rem;
	}
</style>
