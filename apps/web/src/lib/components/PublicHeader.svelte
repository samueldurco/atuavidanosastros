<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { interestNavigation } from '$lib/data/public-navigation';
	import { freeTools } from '$lib/data/free-tools';
	import { visibleShopCollections } from '$lib/data/shop-collections';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import BrandLogo from './BrandLogo.svelte';
	import SignOutButton from './SignOutButton.svelte';
	type MenuLink = { href: string; label: string; description?: string; art: string };
	type Menu = { id: string; label: string; href: string; links: MenuLink[] };
	const menus: Menu[] = [
		{
			id: 'ferramentas',
			label: 'Ferramentas grátis',
			href: '/#ferramentas',
			links: freeTools.map((tool) => ({
				href: `/?ferramenta=${tool.id}#ferramentas`,
				label: tool.label,
				description: interestNavigation.find((topic) => topic.id === tool.topicId)?.label,
				art: mvpThemes[tool.topicId].art
			}))
		},
		{
			id: 'produtos',
			label: 'Produtos digitais',
			href: '/leituras',
			links: [
				{
					href: '/leituras',
					label: 'Leituras avulsas',
					description: 'Escolha o tema que faz sentido agora',
					art: 'mandala-gravada'
				},
				{
					href: '/atv-mais',
					label: 'Assinatura ATV+',
					description: 'Leituras para acompanhar seus ciclos',
					art: 'fases-lunares'
				},
				...interestNavigation.map((topic) => ({
					href: `/leituras?tema=${topic.id}`,
					label: topic.label,
					art: mvpThemes[topic.id].art
				}))
			]
		},
		{
			id: 'universos',
			label: 'Universos',
			href: '/temas',
			links: interestNavigation.map((topic) => ({
				href: topic.href,
				label: topic.label,
				description: topic.note,
				art: mvpThemes[topic.id].art
			}))
		},
		{
			id: 'revista',
			label: 'Revista',
			href: '/revista',
			links: interestNavigation.map((topic) => ({
				href: `/revista?tema=${topic.id}`,
				label: topic.label,
				description: 'Artigos e guias',
				art: mvpThemes[topic.id].art
			}))
		},
		{
			id: 'loja',
			label: 'Loja dos Signos',
			href: '/loja',
			links: visibleShopCollections.slice(0, 6).map((collection) => ({
				href: collection.href,
				label: collection.name,
				description: `${collection.products.length} produtos na coleção`,
				art: 'flor-gravada'
			}))
		}
	];
	let mobileOpen = $state(false);
	let active = $state<string | null>(null);
	let ready = $state(false);
	let header: HTMLElement;
	let menuButton: HTMLButtonElement;
	let lastTrigger: HTMLButtonElement | null = null;
	onMount(() => {
		ready = true;
	});
	function dismiss() {
		active = null;
		mobileOpen = false;
	}
	function onKey(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (active) {
			active = null;
			lastTrigger?.focus();
		} else if (mobileOpen) {
			mobileOpen = false;
			menuButton?.focus();
		}
	}
	function outside(event: MouseEvent) {
		if (event.target instanceof Node && !header?.contains(event.target)) dismiss();
	}
</script>

<svelte:window onkeydown={onKey} onclick={outside} />
<header bind:this={header} class="site-header approved-header" data-stitch="SH-01">
	<div class="approved-header-inner">
		<a href="/" class="brand" aria-label="A Tua Vida nos Astros — início" onclick={dismiss}
			><BrandLogo compact /></a
		>
		<button
			bind:this={menuButton}
			class="mobile-menu"
			disabled={!ready}
			aria-expanded={mobileOpen}
			aria-controls="approved-navigation"
			aria-label={mobileOpen ? 'Fechar menu' : 'Menu'}
			onclick={() => {
				mobileOpen = !mobileOpen;
				if (!mobileOpen) active = null;
			}}
			>{mobileOpen ? 'Fechar' : 'Menu'}
			<span aria-hidden="true">{mobileOpen ? '×' : '☰'}</span></button
		>
		<nav id="approved-navigation" class:mobile-open={mobileOpen} aria-label="Navegação principal">
			{#each menus as menu (menu.id)}
				<div class="nav-section">
					<button
						class="nav-trigger"
						disabled={!ready}
						aria-expanded={active === menu.id}
						aria-controls={`nav-${menu.id}`}
						onclick={(event) => {
							lastTrigger = event.currentTarget;
							active = active === menu.id ? null : menu.id;
						}}>{menu.label}<span aria-hidden="true">⌄</span></button
					>
					{#if active === menu.id}
						<div class="nav-panel" id={`nav-${menu.id}`}>
							<div class="nav-panel-heading">
								<span>{menu.label}</span><a href={menu.href} onclick={dismiss}
									>Ver tudo <span aria-hidden="true">↗</span></a
								>
							</div>
							<div class="nav-panel-grid">
								{#each menu.links as link (link.href)}
									<a
										href={link.href}
										class="nav-item"
										onclick={dismiss}
										aria-current={page.url.pathname + page.url.search === link.href
											? 'page'
											: undefined}
										><img src={mvpArt(link.art)} alt="" width="48" height="48" /><span
											><strong>{link.label}</strong>{#if link.description}<small
													>{link.description}</small
												>{/if}</span
										></a
									>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
			<a class="account-link" href={page.data.user ? '/dashboard' : '/entrar'} onclick={dismiss}
				>Minha área <span aria-hidden="true">↗</span></a
			>
			{#if page.data.user}<SignOutButton />{/if}
		</nav>
	</div>
</header>

<style>
	.approved-header {
		position: relative;
		z-index: 40;
		background: #103344;
		color: #fff6df;
		border-bottom: 1px solid #f7e9ce28;
	}
	.approved-header-inner {
		max-width: 1320px;
		width: calc(100% - 64px);
		min-height: 92px;
		margin: auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 28px;
	}
	.brand {
		flex: 0 0 auto;
		text-decoration: none;
	}
	#approved-navigation {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.nav-trigger,
	.account-link,
	.mobile-menu {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 9px;
		min-height: 44px;
		padding: 12px 10px;
		border: 0;
		background: none;
		color: inherit;
		font: 500 12px/1.35 var(--atv-font-ui);
		text-decoration: none;
		cursor: pointer;
	}
	.nav-trigger[aria-expanded='true'],
	.nav-trigger:hover,
	.account-link:hover {
		color: #edcb95;
	}
	.account-link {
		margin-left: 8px;
		border: 1px solid #f7e9ce44;
		padding-inline: 14px;
	}
	.nav-panel {
		position: absolute;
		top: calc(100% - 1px);
		right: max(32px, calc((100% - 1320px) / 2));
		width: min(800px, calc(100% - 64px));
		max-height: calc(100dvh - 110px);
		overflow-y: auto;
		padding: 22px 28px 25px;
		border: 1px solid #c8ad7f;
		background: #f7eedc;
		color: #163849;
		box-shadow: 0 18px 38px #06222b30;
	}
	.nav-panel-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 12px;
		border-bottom: 1px solid #173b4929;
		padding-bottom: 12px;
	}
	.nav-panel-heading > span {
		font: 400 27px/1.2 var(--atv-font-display);
	}
	.nav-panel-heading a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: 12px;
		color: inherit;
	}
	.nav-panel-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 4px 18px;
	}
	.nav-item {
		min-height: 74px;
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid #173b491a;
		color: inherit;
		text-decoration: none;
	}
	.nav-item:hover strong {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.nav-item img {
		width: 43px;
		height: 43px;
		object-fit: contain;
		flex: 0 0 43px;
		mix-blend-mode: multiply;
	}
	.nav-item strong {
		display: block;
		font-size: 12px;
		line-height: 1.4;
		font-weight: 600;
	}
	.nav-item small {
		display: block;
		margin-top: 4px;
		font-size: 10px;
		line-height: 1.4;
		color: #52626a;
	}
	.mobile-menu {
		display: none;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #c89b4d;
		outline-offset: 3px;
	}
	@media (max-width: 1120px) {
		.approved-header-inner {
			width: calc(100% - 40px);
			min-height: 82px;
			gap: 12px;
		}
		.nav-trigger,
		.account-link {
			font-size: 11px;
			padding-inline: 7px;
			gap: 5px;
		}
	}
	@media (max-width: 960px) {
		.approved-header-inner {
			min-height: 78px;
		}
		.mobile-menu {
			display: flex;
			font-size: 13px;
		}
		.mobile-menu span {
			font-size: 22px;
		}
		#approved-navigation {
			display: none;
			position: absolute;
			inset: 100% 0 auto;
			background: #103344;
			padding: 10px 20px 24px;
			max-height: calc(100dvh - 78px);
			overflow-y: auto;
			box-shadow: 0 18px 30px #06222b30;
		}
		#approved-navigation.mobile-open {
			display: block;
		}
		.nav-trigger {
			width: 100%;
			font-size: 14px;
			padding: 16px 2px;
			border-bottom: 1px solid #f7e9ce28;
		}
		.nav-panel {
			position: static;
			width: 100%;
			max-height: none;
			padding: 14px;
			box-shadow: none;
			margin: 5px 0 12px;
		}
		.nav-panel-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 4px 12px;
		}
		.nav-panel-heading > span {
			font-size: 24px;
		}
		.nav-item {
			min-height: 70px;
			gap: 6px;
		}
		.nav-item img {
			width: 33px;
			height: 33px;
			flex-basis: 33px;
		}
		.account-link {
			display: inline-flex;
			margin: 18px 0 0;
			padding-inline: 18px;
			font-size: 13px;
		}
	}
	@media (max-width: 360px) {
		.nav-panel-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
