<script lang="ts">
	import { signs, signNames } from '$lib/data/site';
</script>

<svelte:head
	><title>Loja dos Signos — em preparação</title><meta
		name="description"
		content="A futura curadoria da Loja dos Signos está em preparação. Nenhum produto, preço ou estoque foi publicado."
	/><link rel="canonical" href="https://atuavidanosastros.com.br/loja" /></svelte:head
>
<section class="section">
	<div class="container">
		<span class="status">Em preparação</span>
		<h1 class="h1">Loja dos Signos</h1>
		<p class="lead">
			Uma curadoria futura de livros, objetos e edições com linguagem editorial. Ainda não há
			produtos, preços, estoque, prazo ou avaliações publicados.
		</p>
		<div class="grid grid-3 signs">
			{#each signs as sign (sign)}<a class="card" href={`/loja/signo/${sign}`}
					><span aria-hidden="true">✦</span><strong>{signNames[sign]}</strong><small
						>Conhecer a proposta</small
					></a
				>{/each}
		</div>
	</div>
</section>

<style>
	.signs {
		margin-top: 3rem;
	}
	.signs a {
		padding: 1.5rem;
		text-decoration: none;
		display: grid;
		gap: 0.4rem;
		color: var(--atv-text-primary);
	}
	.signs span {
		color: var(--atv-gold-500);
	}
	.signs strong {
		font: 500 1.8rem var(--atv-font-display);
	}
	.signs small {
		color: var(--atv-text-secondary);
	}
</style>
