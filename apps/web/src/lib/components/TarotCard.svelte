<script lang="ts">
	import { tarotArtwork, tarotArtworkCredit } from '$lib/trials/tarot-artwork';
	let {
		cardId,
		name,
		caption = 'Carta sorteada',
		compact = false,
		credit = true
	}: {
		cardId: string;
		name: string;
		caption?: string;
		compact?: boolean;
		credit?: boolean;
	} = $props();
</script>

<figure class:compact>
	<div class="artwork">
		<img
			src={tarotArtwork(cardId)}
			alt={`${name} — Tarot Rider–Waite–Smith`}
			width="600"
			height="1040"
		/>
	</div>
	<figcaption>
		<span class="eyebrow">{caption}</span>
		<strong>{name}</strong>
		<span class="orientation">Posição direta</span>
		{#if credit}
			<a class="credit" href={tarotArtworkCredit.source} target="_blank" rel="noreferrer"
				>Arte de Pamela Colman Smith · RWS</a
			>
		{/if}
	</figcaption>
</figure>

<style>
	figure {
		display: grid;
		justify-items: center;
		gap: 1.15rem;
		margin: 1.5rem 0 2rem;
		color: var(--atv-ink, #183746);
	}
	.artwork {
		width: min(100%, 15rem);
		padding: 0.4rem;
		border: 1px solid var(--atv-copper, #a36632);
		background: var(--atv-paper-light, #fff8e9);
		box-shadow: 0 8px 22px #18374612;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
	}
	figcaption {
		text-align: center;
	}
	.eyebrow,
	strong,
	.orientation,
	.credit {
		display: block;
	}
	.eyebrow {
		font:
			500 0.7rem/1.4 Onest,
			sans-serif;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	strong {
		margin-top: 0.3rem;
		font:
			500 1.6rem/1.25 Newsreader,
			Georgia,
			serif;
	}
	.orientation {
		margin-top: 0.3rem;
		font:
			400 0.85rem/1.5 Onest,
			sans-serif;
		color: #596365;
	}
	.credit {
		margin-top: 0.65rem;
		font:
			400 0.72rem/1.5 Onest,
			sans-serif;
		color: #596365;
		text-underline-offset: 0.2em;
	}
	.credit:focus-visible {
		outline: 2px solid #183746;
		outline-offset: 4px;
	}
	.compact {
		margin: 0;
		gap: 0.65rem;
	}
	.compact .artwork {
		width: min(100%, 11rem);
	}
	.compact strong {
		font-size: 1.25rem;
	}
</style>
