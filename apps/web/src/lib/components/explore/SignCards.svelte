<script lang="ts">
	import { exploreSigns } from '$lib/data/explore';
	let { compact = false }: { compact?: boolean } = $props();
</script>

<nav class:compact class="explore-signs" aria-label="Explorar os doze signos">
	{#each exploreSigns as sign (sign.slug)}
		<a
			class="explore-sign"
			href={`/signos/${sign.slug}`}
			style={`--accent:${sign.colors.ink};--wash:${sign.colors.wash}`}
		>
			<div class="explore-sign-art">
				<span class="explore-glyph" aria-hidden="true">{sign.glyph}</span>
				<img
					src={`/brand/explorar/${sign.slug}-thumb.webp`}
					alt=""
					width="360"
					height="240"
					loading="lazy"
				/>
			</div>
			<div class="explore-sign-copy">
				<span class="explore-element">{sign.element}</span><strong>{sign.name}</strong><span
					class="explore-dates">{sign.approximateDates}</span
				><span class="explore-arrow" aria-hidden="true">↗</span>
			</div>
		</a>
	{/each}
</nav>
