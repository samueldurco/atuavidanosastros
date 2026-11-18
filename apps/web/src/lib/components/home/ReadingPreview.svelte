<script lang="ts">
	import ReadingSamplePreview from '../ReadingSamplePreview.svelte';
	let { productId }: { productId: string } = $props();
</script>

<ReadingSamplePreview {productId} />
