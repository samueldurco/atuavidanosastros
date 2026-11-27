<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<svg
	class={className}
	viewBox="0 0 120 120"
	fill="none"
	stroke="currentColor"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<circle cx="60" cy="60" r="55" stroke-width="1.3" />
	<circle cx="60" cy="60" r="49" stroke-width="0.6" />
	<path d="M60 20 63.8 32.2 76 36 63.8 39.8 60 52 56.2 39.8 44 36 56.2 32.2Z" stroke-width="1.3" />
	<path
		d="M25 57c13-3 24 1 35 10 11-9 22-13 35-10v27c-13-2-24 1-35 8-11-7-22-10-35-8Z"
		stroke-width="1.8"
	/>
	<path
		d="M60 67v25M20 62v27c14-2 27 1 40 8 13-7 26-10 40-8V62M32 64c7 0 14 2 21 7M32 71c7 0 14 2 21 7M32 78c7 0 14 2 21 6M67 71c7-5 14-7 21-7M67 78c7-5 14-7 21-7M67 84c7-4 14-6 21-6"
		stroke-width="1"
	/>
	<path d="M18 48h6m72 0h6M31 28l4 4m50 0 4-4" stroke-width="1" />
</svg>
