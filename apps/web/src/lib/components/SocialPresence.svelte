<script lang="ts">
	import { publicChannels } from '$lib/data/public-channels';
	let { compact = false }: { compact?: boolean } = $props();
</script>

<section class="social-presence" class:compact aria-label="ATVNA nas redes">
	{#if !compact}
		<div class="social-intro">
			<div>
				<p class="eyebrow">ATVNA nas redes</p>
				<h2>A conversa continua.</h2>
			</div>
			<p>Acompanhe a ATVNA nas suas redes preferidas. Estes são os nossos perfis oficiais.</p>
		</div>
	{/if}
	<ul class="channel-list">
		{#each publicChannels as channel (channel.id)}
			<li>
				<a href={channel.href} rel="me noopener noreferrer"
					><span>{channel.name}</span><span aria-hidden="true">↗</span></a
				>
			</li>
		{/each}
	</ul>
	{#if !compact}
		<div class="social-actions">
			<a href="/canais-oficiais">Conhecer nossos canais <span aria-hidden="true">→</span></a><a
				href="/fale-conosco">Fale conosco <span aria-hidden="true">→</span></a
			>
		</div>
	{/if}
</section>

<style>
	.social-presence {
		color: var(--atv-text-primary);
	}
	.social-intro {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: end;
		margin-bottom: 2rem;
	}
	h2 {
		font: 500 clamp(2rem, 4vw, 3.5rem)/1.08 var(--atv-font-display);
		margin: 0.5rem 0 0;
	}
	.social-intro > p {
		max-width: 32rem;
		line-height: 1.7;
		margin: 0;
	}
	.channel-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		border-top: 1px solid var(--atv-border);
	}
	li {
		min-width: 0;
		border-bottom: 1px solid var(--atv-border);
	}
	li a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem 0.75rem;
		min-height: 52px;
		text-decoration: none;
		font: 500 1rem var(--atv-font-ui);
	}
	li a:hover {
		background: var(--atv-surface-card);
		text-decoration: underline;
	}
	.social-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		margin-top: 1.25rem;
	}
	.social-actions a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
	}
	.compact .channel-list {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	@media (max-width: 600px) {
		.social-intro {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.channel-list,
		.compact .channel-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
