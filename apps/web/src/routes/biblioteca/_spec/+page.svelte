<script lang="ts">
	import Library from '../+page.svelte';
	let { data } = $props();
</script>

<p class="fixture-note">
	Laboratório local: dados sintéticos, sem conexão com o acervo de uma pessoa.
</p>
<Library {data} />

<style>
	.fixture-note {
		border: 1px solid var(--atv-border);
		padding: 1rem;
		color: var(--atv-text-secondary);
		font-size: 0.8rem;
	}
</style>
