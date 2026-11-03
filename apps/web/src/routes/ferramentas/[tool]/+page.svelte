<script lang="ts">
	import FreeToolExperience from '$lib/components/free-tools/FreeToolExperience.svelte';
	import PersonalArcanaTool from '$lib/components/free-tools/PersonalArcanaTool.svelte';
	let { data } = $props();
</script>

{#if data.tool.id === 'arcano-pessoal'}
	<PersonalArcanaTool tool={data.tool} />
{:else}
	<FreeToolExperience {data} />
{/if}
