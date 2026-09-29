<script lang="ts">
	import type { SolarReturnCalendarView } from '$lib/solar-return-calendar';
	let {
		calendar,
		facts
	}: {
		calendar: SolarReturnCalendarView;
		facts: { id: string; kind: string; display: string; source: string }[];
	} = $props();
	const label = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'medium' }).format(
			new Date(`${value}T00:00:00Z`)
		);
	const fact = (id: string) => facts.find((item) => item.id === id);
</script>

<section id="calendario-civil" aria-labelledby="solar-calendar-title">
	<p class="eyebrow">Organização civil experimental</p>
	<h2 id="solar-calendar-title">Doze intervalos da Revolução Solar</h2>
	<p>
		A grade parte da data de aniversário declarada. Cada intervalo começa na data indicada e termina
		antes da próxima. A grade organiza a leitura; não calcula trânsitos mensais, acontecimentos ou
		períodos favoráveis.
	</p>
	<ol aria-label="Doze intervalos civis">
		{#each calendar.months as month (month.number)}
			<li>
				<h3>Intervalo {month.number}</h3>
				<p>
					<time datetime={month.startDate}>{label(month.startDate)}</time> até antes de
					<time datetime={month.endDateExclusive}>{label(month.endDateExclusive)}</time>
				</p>
				{#if month.importantDateIds.length}
					<p>Datas informadas pela pessoa:</p>
					<ul>
						{#each month.importantDateIds as id (id)}
							{@const source = fact(id)}
							{#if source}<li>{source.display} <small>Fonte: {source.source}</small></li>{/if}
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ol>
	{#if calendar.boundaryImportantDateIds.length}
		<p>Datas informadas no limite final, fora dos doze intervalos:</p>
		<ul>
			{#each calendar.boundaryImportantDateIds as id (id)}
				{@const source = fact(id)}
				{#if source}<li>{source.display} <small>Fonte: {source.source}</small></li>{/if}
			{/each}
		</ul>
	{/if}
	<p class="method">Método: {calendar.version} · base: aniversário civil declarado.</p>
</section>

<style>
	ol {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: 1rem;
		padding-left: 1.25rem;
	}
	ol > li {
		border: 1px solid var(--atv-border);
		border-radius: 0.5rem;
		padding: 1rem;
	}
	h3 {
		margin-top: 0;
	}
	ul {
		padding-left: 1.25rem;
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
