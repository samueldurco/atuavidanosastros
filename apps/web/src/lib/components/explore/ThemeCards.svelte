<script lang="ts">
	import { exploreThemes } from '$lib/data/explore';
</script>

<nav class="explore-themes" aria-label="Explorar por temas">
	{#each exploreThemes as theme (theme.slug)}
		<a
			class="explore-theme"
			href={`/temas/${theme.slug}`}
			style={`--accent:${theme.color};--wash:${theme.wash}`}
		>
			<img
				src={`/brand/explorar/icons/${theme.slug}.svg`}
				alt=""
				width="96"
				height="96"
				loading="lazy"
			/>
			<span class="explore-theme-copy"><strong>{theme.name}</strong><span>{theme.text}</span></span>
			<span class="explore-arrow" aria-hidden="true">↗</span>
		</a>
	{/each}
</nav>
