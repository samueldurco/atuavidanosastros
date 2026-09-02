<script lang="ts">
	let { compact = false, onDark = false } = $props<{ compact?: boolean; onDark?: boolean }>();
	const source = $derived(
		compact
			? '/brand/logo/symbol/atv-symbol.svg'
			: onDark
				? '/brand/logo/horizontal/atv-logo-horizontal-on-dark.svg'
				: '/brand/logo/horizontal/atv-logo-horizontal.svg'
	);
</script>

<img
	class:compact
	src={source}
	alt="A Tua Vida nos Astros"
	width={compact ? 256 : 1600}
	height={compact ? 256 : 360}
/>

<style>
	img {
		display: block;
		width: min(22rem, 38vw);
		height: auto;
	}
	img.compact {
		width: 2.6rem;
	}
</style>
