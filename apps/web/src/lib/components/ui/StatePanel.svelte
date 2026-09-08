<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		kind = 'empty',
		title,
		description,
		children
	}: {
		kind?: 'empty' | 'loading' | 'error' | 'success' | 'attention' | 'info';
		title: string;
		description?: string;
		children?: Snippet;
	} = $props();
</script>

<div
	class={`state-panel ${kind}`}
	role={kind === 'error'
		? 'alert'
		: kind === 'success' || kind === 'loading'
			? 'status'
			: undefined}
	aria-busy={kind === 'loading' ? true : undefined}
>
	<span class="state-mark" aria-hidden="true"
		>{kind === 'error' || kind === 'attention' ? '!' : kind === 'success' ? '✓' : '—'}</span
	>
	<div>
		<h2>{title}</h2>
		{#if description}<p>{description}</p>{/if}{#if children}<div class="state-actions">
				{@render children()}
			</div>{/if}
	</div>
</div>

<style>
	.state-panel {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface-card);
	}
	.state-mark {
		flex: 0 0 2rem;
		height: 2rem;
		display: grid;
		place-items: center;
		border: 1px solid currentColor;
		border-radius: 50%;
		color: var(--atv-action);
	}
	h2 {
		margin: 0;
		font: 500 clamp(1.3rem, 2vw, 1.65rem)/1.25 var(--atv-font-display);
	}
	p {
		margin: 0.75rem 0 0;
		max-width: 42rem;
		color: var(--atv-text-secondary);
	}
	.error {
		border-inline-start: 3px solid var(--atv-danger);
	}
	.error .state-mark {
		color: var(--atv-danger);
	}
	.success .state-mark {
		color: var(--atv-success);
	}
	.attention {
		border-inline-start: 3px solid var(--atv-gold-500);
		background: var(--atv-surface-muted);
	}
	.state-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}
	@media (max-width: 400px) {
		.state-mark {
			display: none;
		}
	}
</style>
