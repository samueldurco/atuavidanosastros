<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		open = $bindable(false),
		title,
		id,
		variant = 'dialog',
		children
	}: {
		open?: boolean;
		title: string;
		id: string;
		variant?: 'dialog' | 'drawer' | 'bottom-sheet';
		children: Snippet;
	} = $props();
	let element: HTMLDialogElement;
	let returnFocus: HTMLElement | null = null;
	$effect(() => {
		if (!element) return;
		if (open && !element.open) {
			returnFocus = document.activeElement as HTMLElement;
			element.showModal();
		} else if (!open && element.open) element.close();
	});
	function close() {
		open = false;
		returnFocus?.focus();
	}
	function containFocus(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const controls = [
			...element.querySelectorAll<HTMLElement>(
				'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		].filter((control) => control.getClientRects().length > 0);
		const first = controls[0];
		const last = controls.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first?.focus();
		}
	}
</script>

<dialog
	bind:this={element}
	class={variant}
	aria-labelledby={`${id}-title`}
	onclose={close}
	oncancel={() => (open = false)}
	onkeydown={containFocus}
>
	<div class="dialog-heading">
		<h2 id={`${id}-title`}>{title}</h2>
		<button class="chip" onclick={() => (open = false)} aria-label={`Fechar ${title}`}
			>Fechar</button
		>
	</div>
	{@render children()}
</dialog>

<style>
	dialog {
		max-width: min(38rem, calc(100% - 2.5rem));
		width: 100%;
		max-height: calc(100dvh - 3rem);
		overflow-y: auto;
		padding: 1.5rem;
		color: var(--atv-text-primary);
		background: var(--atv-surface-card);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		box-shadow: var(--atv-shadow-1);
	}
	dialog::backdrop {
		background: rgb(3 23 68 / 45%);
	}
	.dialog-heading {
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}
	h2 {
		margin: 0;
		font: 500 1.75rem var(--atv-font-display);
	}
	.drawer {
		margin: 0 0 0 auto;
		height: 100dvh;
		max-height: 100dvh;
		border-radius: 0;
	}
	.bottom-sheet {
		margin: auto auto 0;
		border-radius: var(--atv-radius-lg) var(--atv-radius-lg) 0 0;
	}
</style>
