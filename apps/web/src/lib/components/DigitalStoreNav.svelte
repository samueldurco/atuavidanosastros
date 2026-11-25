<script lang="ts">
	let {
		active,
		dark = false
	}: {
		active: 'readings' | 'launches' | 'atv-plus';
		dark?: boolean;
	} = $props();
	const sections = [
		{
			id: 'atv-plus',
			href: '/atv-mais',
			label: 'Assinatura ATV+',
			shortLabel: 'ATV+',
			description: 'Leituras para acompanhar seus ciclos',
			icon: 'atv-mais'
		},
		{
			id: 'launches',
			href: '/lancamentos',
			label: 'Lançamentos',
			shortLabel: 'Lançamentos',
			description: 'Novas leituras para situações concretas',
			icon: 'lancamentos'
		},
		{
			id: 'readings',
			href: '/leituras',
			label: 'Leituras avulsas',
			shortLabel: 'Avulsas',
			description: 'Escolha o tema que faz sentido agora',
			icon: 'leituras-avulsas'
		}
	] as const;
</script>

<nav class="digital-store-nav" class:dark aria-label="Seções da loja de produtos digitais">
	<div class="store-heading">
		<a href="/leituras">Produtos digitais</a>
		<span>Uma loja. Três formas de explorar.</span>
	</div>
	<div class="store-sections">
		{#each sections as section (section.id)}
			<a
				class="store-section"
				href={section.href}
				aria-label={section.label}
				aria-current={active === section.id ? 'page' : undefined}
			>
				<svg
					width="38"
					height="38"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<use href={`/brand/navigation/icons.svg#${section.icon}`} />
				</svg>
				<span
					><strong class="full-label">{section.label}</strong><strong
						class="short-label"
						aria-hidden="true">{section.shortLabel}</strong
					><small>{section.description}</small></span
				>
				<span class="section-arrow" aria-hidden="true">↗</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.digital-store-nav {
		--store-ink: #183746;
		--store-muted: #4d6269;
		--store-line: #b8b5a5;
		--store-active: #e4e8da;
		color: var(--store-ink);
		margin: 0 0 20px;
		padding: 12px 16px 0;
		border: 1px solid var(--store-line);
		background: #f6efdf url('/brand/mvp/assets/papel-fino.webp') center / 520px;
	}
	.store-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--store-line);
	}
	.store-heading a {
		font:
			400 23px/1.1 'Newsreader',
			Georgia,
			serif;
		color: inherit;
		text-decoration: none;
	}
	.store-heading > span {
		font:
			400 11px/1.5 'Onest',
			Arial,
			sans-serif;
		color: var(--store-muted);
	}
	.store-sections {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}
	.store-section {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		min-height: 66px;
		padding: 10px 8px;
		border-bottom: 3px solid transparent;
		color: inherit;
		text-decoration: none;
		transition: background 160ms ease;
	}
	.store-section[aria-current='page'] {
		border-bottom-color: var(--store-ink);
		background: var(--store-active);
	}
	.store-section:hover {
		background: var(--store-active);
	}
	.store-section:focus-visible,
	.store-heading a:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 4px;
	}
	.store-section svg {
		flex-shrink: 0;
		color: inherit;
		width: 28px;
		height: 28px;
	}
	.store-section strong,
	.store-section small {
		display: block;
		font-family: 'Onest', Arial, sans-serif;
	}
	.store-section strong {
		font-size: 13px;
		line-height: 1.4;
		font-weight: 600;
	}
	.store-section small {
		font-size: 11px;
		line-height: 1.5;
		margin-top: 3px;
		color: var(--store-muted);
	}
	.section-arrow {
		margin-left: auto;
		font-size: 15px;
	}
	.store-section .short-label {
		display: none;
	}
	.dark {
		--store-ink: #f0d08e;
		--store-muted: #d5dedc;
		--store-line: #78827a;
		--store-active: #d5ba7930;
		background:
			linear-gradient(#102c3de8, #183746ed),
			url('/brand/mvp/assets/papel-fino.webp') center / 520px;
	}
	@media (max-width: 760px) {
		.digital-store-nav {
			padding: 10px 10px 0;
			margin-bottom: 16px;
		}
		.store-heading {
			padding-bottom: 9px;
		}
		.store-heading a {
			font-size: 22px;
		}
		.store-heading > span {
			display: none;
		}
		.store-sections {
			gap: 0;
		}
		.store-section {
			justify-content: center;
			min-height: 50px;
			gap: 6px;
			padding: 8px 5px;
		}
		.store-section svg {
			width: 21px;
			height: 21px;
		}
		.store-section strong {
			font-size: 11px;
		}
		.store-section .short-label {
			display: block;
		}
		.store-section .full-label,
		.store-section small,
		.section-arrow {
			display: none;
		}
	}
	@media (max-width: 360px) {
		.store-section svg {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.store-section {
			transition: none;
		}
	}
</style>
