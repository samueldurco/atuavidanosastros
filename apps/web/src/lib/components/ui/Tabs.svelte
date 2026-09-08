<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		id,
		label,
		items,
		active = $bindable(''),
		children
	}: {
		id: string;
		label: string;
		items: { id: string; label: string }[];
		active?: string;
		children: Snippet<[string]>;
	} = $props();
	const selected = $derived(items.some((item) => item.id === active) ? active : items[0]?.id);
	function navigate(event: KeyboardEvent, index: number) {
		const next =
			event.key === 'ArrowRight'
				? (index + 1) % items.length
				: event.key === 'ArrowLeft'
					? (index - 1 + items.length) % items.length
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? items.length - 1
							: -1;
		if (next < 0) return;
		event.preventDefault();
		active = items[next].id;
		document.getElementById(`${id}-tab-${active}`)?.focus();
	}
</script>

<div class="tabs">
	<div role="tablist" aria-label={label}>
		{#each items as item, i (item.id)}<button
				id={`${id}-tab-${item.id}`}
				type="button"
				role="tab"
				aria-selected={selected === item.id}
				aria-controls={`${id}-panel-${item.id}`}
				tabindex={selected === item.id ? 0 : -1}
				onclick={() => (active = item.id)}
				onkeydown={(event) => navigate(event, i)}>{item.label}</button
			>{/each}
	</div>
	{#each items as item (item.id)}<div
			id={`${id}-panel-${item.id}`}
			role="tabpanel"
			aria-labelledby={`${id}-tab-${item.id}`}
			tabindex="0"
			hidden={selected !== item.id}
		>
			{#if selected === item.id}{@render children(item.id)}{/if}
		</div>{/each}
</div>

<style>
	[role='tablist'] {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--atv-border);
	}
	button {
		min-height: 48px;
		padding: 0.75rem 1rem;
		border: 0;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--atv-text-secondary);
	}
	button[aria-selected='true'] {
		color: var(--atv-action);
		border-bottom-color: var(--atv-action);
	}
	[role='tabpanel'] {
		padding-block: 1.5rem;
	}
</style>
