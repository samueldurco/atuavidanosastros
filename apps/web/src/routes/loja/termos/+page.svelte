<script lang="ts">
	import ShopPolicyDocument from '$lib/components/ShopPolicyDocument.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<ShopPolicyDocument
	kind="termos"
	ariesOnly={data.ariesOnly}
	deliveryBusinessDays={data.deliveryBusinessDays}
/>
