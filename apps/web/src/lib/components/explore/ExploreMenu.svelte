<script lang="ts">
	import { page } from '$app/state';
	import { exploreSigns, exploreThemes } from '$lib/data/explore';
	let { onNavigate }: { onNavigate: () => void } = $props();
</script>

<div class="explore-menu-groups">
	<section aria-labelledby="menu-themes-title">
		<h3 id="menu-themes-title">
			<a href="/temas" onclick={onNavigate}>Por temas <span aria-hidden="true">↗</span></a>
		</h3>
		<p>Comece pelo assunto que você quer descobrir.</p>
		<div class="menu-themes">
			{#each exploreThemes as theme (theme.slug)}
				<a
					class="menu-theme"
					href={`/temas/${theme.slug}`}
					onclick={onNavigate}
					aria-current={page.url.pathname === `/temas/${theme.slug}` ? 'page' : undefined}
				>
					<img src={`/brand/explorar/icons/${theme.slug}.svg`} alt="" width="40" height="40" />
					<span>{theme.name}</span>
				</a>
			{/each}
		</div>
	</section>
	<section aria-labelledby="menu-signs-title">
		<h3 id="menu-signs-title">
			<a href="/signos" onclick={onNavigate}>Por signos <span aria-hidden="true">↗</span></a>
		</h3>
		<p>Conteúdos e experiências para cada signo.</p>
		<div class="menu-signs">
			{#each exploreSigns as sign (sign.slug)}
				<a
					class="menu-sign"
					style={`--sign-ink:${sign.colors.ink};--sign-wash:${sign.colors.wash}`}
					href={`/signos/${sign.slug}`}
					onclick={onNavigate}
					aria-current={page.url.pathname === `/signos/${sign.slug}` ? 'page' : undefined}
				>
					<span class="sign-glyph" aria-hidden="true">{sign.glyph}</span><span>{sign.name}</span>
				</a>
			{/each}
		</div>
	</section>
</div>

<style>
	.explore-menu-groups {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 28px;
	}
	section {
		min-width: 0;
	}
	h3 {
		margin: 0;
		font: 400 24px/1.2 var(--atv-font-display);
	}
	h3 a {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 44px;
	}
	h3 span {
		font: 16px var(--atv-font-ui);
	}
	p {
		margin: 0 0 16px;
		color: #52626a;
		font: 12px/1.5 var(--atv-font-ui);
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	a:hover,
	a[aria-current='page'] {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	a:focus-visible {
		outline: 2px solid #976326;
		outline-offset: 3px;
	}
	.menu-themes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px 14px;
	}
	.menu-theme {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 70px;
		border-bottom: 1px solid #173b4929;
		font: 600 12px/1.45 var(--atv-font-ui);
	}
	.menu-theme img {
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
	}
	.menu-signs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	.menu-sign {
		display: flex;
		align-items: center;
		gap: 7px;
		min-height: 48px;
		padding: 8px;
		border: 1px solid color-mix(in srgb, var(--sign-ink) 30%, transparent);
		background: var(--sign-wash);
		font: 500 12px/1.3 var(--atv-font-ui);
	}
	.sign-glyph {
		color: color-mix(in srgb, var(--sign-ink) 80%, #163849);
		font:
			23px/1 Georgia,
			serif;
	}
	@container approved-header (max-width: 960px) {
		.explore-menu-groups {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		section + section {
			border-top: 1px solid #173b4929;
			padding-top: 12px;
		}
	}
	@container approved-header (max-width: 420px) {
		.menu-themes {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.menu-theme {
			min-height: 54px;
		}
		.menu-signs {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
