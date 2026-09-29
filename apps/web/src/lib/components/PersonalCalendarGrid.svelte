<script lang="ts">
	import type { PersonalCalendarGrid } from '$lib/personal-calendar-grid';
	let { grid }: { grid: PersonalCalendarGrid } = $props();
	const label = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(
			new Date(`${value}T00:00:00Z`)
		);
</script>

<section id="calendario-civil" aria-labelledby="personal-calendar-title">
	<p class="eyebrow">Base factual experimental</p>
	<h2 id="personal-calendar-title">Dias civis do mês</h2>
	<p>
		Esta grade reúne os dias do mês em UTC. O Sol natal mostrado nos fatos é uma referência
		estática; não representa um cálculo para cada dia. As datas pessoais abaixo foram informadas por
		você para este pedido.
	</p>
	<ol aria-label="Dias civis do mês">
		{#each grid.dates as date (date)}
			<li>
				<time datetime={date}>{label(date)}</time>
				{#each grid.marks.filter((mark) => mark.date === date) as mark (mark.id)}
					<p>{mark.display} <small>Fonte: dado informado por você</small></p>
				{/each}
			</li>
		{/each}
	</ol>
	<p class="method">
		Método: {grid.version} · mês civil UTC; sem eventos, trânsitos ou previsão diária.
	</p>
</section>

<style>
	ol {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
		gap: 0.75rem;
		padding-left: 1.25rem;
	}
	ol > li {
		border: 1px solid var(--atv-border);
		border-radius: 0.5rem;
		padding: 0.75rem;
	}
	small {
		display: block;
		color: var(--atv-text-secondary);
	}
	.method {
		font-size: 0.85rem;
		color: var(--atv-text-secondary);
	}
</style>
