<script lang="ts">
	import Dashboard from '$lib/components/Dashboard.svelte';
	let { data } = $props();
</script>

<p role="note">QA local — dados sintéticos; nenhuma conta ou assinatura real.</p>
<Dashboard {data} />
