<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	let { available = false, pathname = '/' }: { available?: boolean; pathname?: string } = $props();
	const discovery = $derived(
		pathname === '/' ||
			/^\/(leituras|produtos|temas|universos|ferramentas|atv-mais)(\/|$)/.test(pathname)
	);
	let buying = $state(false);
	let observer: IntersectionObserver | undefined;
	function watchPurchase() {
		observer?.disconnect();
		buying = false;
		const panels = Array.from(
			document.querySelectorAll(
				'#disponibilidade, .product-offer-actions, [data-whatsapp-obstacle]'
			)
		);
		const visible = new Set<Element>();
		observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) visible.add(entry.target);
				else visible.delete(entry.target);
			}
			buying = visible.size > 0;
		});
		for (const panel of panels) observer.observe(panel);
	}
	afterNavigate(watchPurchase);
	onMount(() => () => observer?.disconnect());
</script>

{#if available && discovery}
	<aside class="whatsapp-consultation" class:buying aria-label="Consultas pelo WhatsApp">
		<a
			href="/api/whatsapp/entry"
			rel="external noreferrer"
			aria-label="Fazer uma consulta pelo WhatsApp"
		>
			<span>Fazer uma consulta<br class="mobile-break" /> pelo WhatsApp</span>
			<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" fill="currentColor">
				<path
					d="M16 .8A15.1 15.1 0 0 0 2.9 23.4L.8 31.2l8-2.1A15.2 15.2 0 1 0 16 .8Zm0 27.5c-2.3 0-4.5-.6-6.4-1.8l-.5-.3-4.7 1.2 1.2-4.6-.3-.5A12.5 12.5 0 1 1 16 28.3Zm6.9-9.4c-.4-.2-2.2-1.1-2.5-1.2-.4-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.5-.2.2-.4.3-.8.1-.3-.2-1.5-.6-2.9-1.8-1.1-1-1.8-2.2-2-2.6-.2-.4 0-.6.2-.8l.6-.7.4-.6c.1-.2 0-.5 0-.7l-1.2-2.8c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3s1.3 3.4 1.5 3.6c.2.2 2.5 3.8 6.1 5.3.9.4 1.5.6 2 .7.9.3 1.7.3 2.3.2.7-.1 2.2-.9 2.5-1.7.3-.9.3-1.6.2-1.7-.1-.2-.3-.3-.7-.5Z"
				/>
			</svg>
		</a>
	</aside>
{/if}

<style>
	.whatsapp-consultation {
		position: fixed;
		z-index: 45;
		right: max(1.25rem, env(safe-area-inset-right));
		bottom: max(1.25rem, env(safe-area-inset-bottom));
	}
	a {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		min-height: 54px;
		padding: 0.7rem 1rem 0.7rem 1.2rem;
		border: 1px solid #ffffff65;
		border-radius: 999px;
		color: #fff;
		background: #176b42;
		box-shadow: 0 4px 16px #102c3d26;
		text-decoration: none;
		font: 600 14px/1.3 var(--atv-font-ui, sans-serif);
	}
	a:hover {
		background: #125735;
	}
	svg {
		flex-shrink: 0;
	}
	.mobile-break {
		display: none;
	}
	.buying,
	:global(.mvp-experience:has(aside.consent[aria-label='Preferências de cookies']))
		.whatsapp-consultation,
	:global(.mvp-experience:has(.mobile-menu[aria-expanded='true'])) .whatsapp-consultation {
		visibility: hidden;
		pointer-events: none;
	}
	@media (max-width: 600px) {
		.whatsapp-consultation {
			right: max(0.75rem, env(safe-area-inset-right));
			bottom: max(0.75rem, env(safe-area-inset-bottom));
		}
		a {
			gap: 0.65rem;
			padding: 0.65rem 0.85rem 0.65rem 1rem;
			font-size: 12px;
			min-height: 54px;
		}
		.mobile-break {
			display: initial;
		}
	}
</style>
