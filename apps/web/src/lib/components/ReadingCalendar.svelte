<script lang="ts">
	import type { SavedTrial } from '$lib/trials/reading';
	import type { CalendarData } from '$lib/trials/reconstruction/calendar-facts';
	let {
		saved,
		chapter,
		interactive,
		onopen
	}: { saved: SavedTrial; chapter: number; interactive: boolean; onopen: (index: number) => void } =
		$props();
	const data = $derived(saved.calculation.data as unknown as CalendarData);
	const offset = $derived((new Date(data.days[0].startInstant).getUTCDay() + 6) % 7);
	const month = $derived(
		new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
			new Date(data.days[0].startInstant)
		)
	);
	const dates = $derived(
		data.days.map((day) => {
			const index = saved.reading.editorial!.plan.findIndex(
				(p) => p.role === `calendar-day-${day.date}`
			);
			const signals = saved.reading.sections[index].factIds.filter((id) =>
				saved.reading.editorial!.selection.some((s) => s.factId === id)
			).length;
			const marked = saved.input.calendarMarks?.entries.some((m) => m.date === day.date) ?? false;
			return { date: day.date, number: Number(day.date.slice(8)), index, signals, marked };
		})
	);
</script>

<section class="calendar" aria-label="Calendário do mês">
	<h2>{month}</h2>
	<p>Abra uma data para acompanhar seus sinais e marcos. Dias e horários usam UTC.</p>
	<div class="grid">
		{#each ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as weekday (weekday)}<span
				class="weekday"
				aria-hidden="true">{weekday}</span
			>{/each}
		{#each [...Array(offset).keys()] as spacer (spacer)}<span aria-hidden="true"></span>{/each}
		{#each dates as day (day.date)}
			<button
				disabled={!interactive}
				aria-current={chapter === day.index ? 'date' : undefined}
				aria-label={`${day.number} de ${month}: ${day.signals} ${day.signals === 1 ? 'sinal' : 'sinais'}${day.marked ? ', marco informado' : ''}`}
				onclick={() => onopen(day.index)}
			>
				<strong>{day.number}</strong><span
					>{day.signals} {day.signals === 1 ? 'sinal' : 'sinais'}</span
				>{#if day.marked}<span class="mark" aria-hidden="true">●</span>{/if}
			</button>
		{/each}
	</div>
	<p class="legend">
		● Marco informado por você. Até três mudanças selecionadas por data; zero sinais permite um
		registro livre. Movimentos que atravessam o mês aparecem no capítulo próprio.
	</p>
</section>

<style>
	.calendar {
		padding: clamp(1rem, 3vw, 1.7rem);
		border: 1px solid #c4baa5;
		border-radius: 18px;
		background: #faf6ed;
		color: #262f2b;
		margin-block: 1.5rem;
	}
	h2 {
		text-transform: capitalize;
		margin: 0;
		font-family: Georgia, serif;
	}
	p {
		line-height: 1.6;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: clamp(3px, 1vw, 9px);
	}
	.weekday {
		text-align: center;
		font-size: 0.75rem;
		padding-block: 0.5rem;
	}
	button {
		position: relative;
		min-width: 0;
		min-height: 70px;
		padding: 0.65rem 0.1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid #b7b1a2;
		border-radius: 9px;
		background: #fffdf8;
		color: #29382f;
		cursor: pointer;
	}
	button strong {
		font-size: 1.1rem;
	}
	button span {
		font-size: 0.66rem;
		line-height: 1.2;
	}
	button[aria-current] {
		background: #294b3d;
		color: #fffdf8;
		border-color: #294b3d;
	}
	button:focus-visible {
		outline: 3px solid #956a1d;
		outline-offset: 2px;
	}
	button:disabled {
		cursor: wait;
	}
	.mark {
		position: absolute;
		right: 3px;
		top: 3px;
	}
	.legend {
		font-size: 0.85rem;
		margin-bottom: 0;
	}
</style>
