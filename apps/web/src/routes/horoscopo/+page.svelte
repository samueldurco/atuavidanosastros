<script lang="ts">
	import EditorialHub from '$lib/components/EditorialHub.svelte';
	let { data } = $props();
</script>

<EditorialHub documents={data.documents} seo={data.seo} />
