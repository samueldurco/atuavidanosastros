<script lang="ts">
	import { page } from '$app/state';
	import { exploreSigns } from '$lib/data/explore';

	let { inMenu = false, onNavigate }: { inMenu?: boolean; onNavigate?: () => void } = $props();
</script>

<nav class="sign-links" class:in-menu={inMenu} aria-label="Explorar os doze signos">
	{#each exploreSigns as sign (sign.slug)}
		{@const href = `/signos/${sign.slug}`}
		<a
			style:--sign-ink={sign.colors.ink}
			style:--sign-wash={sign.colors.wash}
			{href}
			onclick={onNavigate}
			aria-current={page.url.pathname === href ? 'page' : undefined}
		>
			<span class="glyph" aria-hidden="true">{sign.glyph}</span><span>{sign.name}</span>
		</a>
	{/each}
</nav>

<style>
	.sign-links {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.sign-links.in-menu {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 58px;
		padding: 0.7rem;
		border: 1px solid color-mix(in srgb, var(--sign-ink) 30%, transparent);
		background: var(--sign-wash);
		color: #163849;
		font: 500 0.9rem/1.3 var(--atv-font-ui);
		text-decoration: none;
	}
	.in-menu a {
		gap: 7px;
		min-height: 48px;
		padding: 8px;
		font-size: 12px;
	}
	a:is(:hover, [aria-current='page']) {
		border-color: var(--sign-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	a:focus-visible {
		outline: 2px solid var(--sign-ink);
		outline-offset: 3px;
	}
	.glyph {
		color: color-mix(in srgb, var(--sign-ink) 80%, #163849);
		font:
			1.65rem/1 Georgia,
			serif;
	}
	.in-menu .glyph {
		font-size: 23px;
	}
	@media (max-width: 1000px) {
		.sign-links:not(.in-menu) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 540px) {
		.sign-links:not(.in-menu) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@container approved-header (max-width: 420px) {
		.sign-links.in-menu {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
