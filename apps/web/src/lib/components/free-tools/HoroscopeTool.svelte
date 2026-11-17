<script lang="ts">
	import { recordHoroscopeSubmission } from '$lib/analytics/home-events';
	import { signs, signNames } from '$lib/data/site';
	import { horoscopePeriods, periodNames } from '$lib/public-horoscope';

	let { embedded = false }: { embedded?: boolean } = $props();
</script>

<div class:embedded class="horoscope-tool">
	{#if !embedded}
		<header>
			<h1>Consultar o horóscopo de hoje</h1>
			<p>Escolha seu signo e o período da leitura.</p>
		</header>
	{/if}
	<form
		method="GET"
		action="/horoscopo"
		onsubmit={() => recordHoroscopeSubmission(embedded ? 'home' : 'alias')}
	>
		<label>
			Seu signo
			<select name="sign">
				{#each signs as sign (sign)}<option value={sign}>{signNames[sign]}</option>{/each}
			</select>
		</label>
		<label>
			Período
			<select name="period">
				{#each horoscopePeriods as period (period)}<option value={period}
						>{periodNames[period]}</option
					>{/each}
			</select>
		</label>
		<button type="submit">Consultar meu signo</button>
	</form>
</div>

<style>
	@media (min-width: 700px) {
		form {
			grid-template-columns: 1fr 1fr;
		}
		form button {
			grid-column: 1 / -1;
		}
	}
	.horoscope-tool {
		max-width: 48rem;
		margin-inline: auto;
	}
	form {
		display: grid;
		gap: 1rem;
	}
	label {
		display: grid;
		gap: 0.4rem;
		font-weight: 650;
	}
	select,
	button {
		min-height: 3rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--atv-text-primary);
		border-radius: 0.25rem;
		font: inherit;
	}
	select {
		background: var(--atv-paper, #faf5e7);
		color: var(--atv-text-primary);
		width: 100%;
	}
	button {
		background: var(--atv-text-primary, #153b4d);
		color: #fffaf0;
		cursor: pointer;
	}
	.embedded {
		margin: 0;
	}
</style>
