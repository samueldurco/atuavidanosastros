<script lang="ts">
	import CitySearch from './CitySearch.svelte';
	import { civilInstants, type CityLocation } from '$lib/city-location';
	let {
		id,
		label,
		form = $bindable(),
		onchange = () => {}
	}: {
		id: string;
		label?: string;
		form: {
			date: string;
			time: string;
			location: string;
			country: string;
			latitude: string;
			longitude: string;
			timezone: string;
			source: string;
			occurrence: string;
		};
		onchange?: () => void;
	} = $props();
	let city = $state<CityLocation | null>(null);
	const options = $derived(form.timezone ? civilInstants(form.date, form.time, form.timezone) : []);
	$effect(() => {
		if (form.location !== city?.label && form.location && form.timezone && form.source)
			city = {
				id: 'saved',
				label: form.location,
				countryCode: form.country,
				latitude: Number(form.latitude),
				longitude: Number(form.longitude),
				timezone: form.timezone,
				source: form.source
			};
		if (!form.location) city = null;
	});
	function select(value: CityLocation | null) {
		form.location = value?.label ?? '';
		form.country = value?.countryCode ?? '';
		form.latitude = value ? String(value.latitude) : '';
		form.longitude = value ? String(value.longitude) : '';
		form.timezone = value?.timezone ?? '';
		form.source = value?.source ?? '';
		form.occurrence = '';
		onchange();
	}
</script>

<CitySearch {id} {label} bind:value={city} onchange={select} />
{#if options.length > 1}
	<div class="occurrence">
		<label for={`${id}-occurrence`}>Qual ocorrência do horário consta no seu registro?</label>
		<p>
			Nessa data, o relógio voltou e esse horário ocorreu duas vezes. Confira o registro de
			nascimento para escolher.
		</p>
		<select id={`${id}-occurrence`} required bind:value={form.occurrence} {onchange}>
			<option value="">Selecione a ocorrência</option>
			{#each options as option, index (option.utcInstant)}
				<option value={option.utcInstant}
					>{index === 0
						? 'Primeira ocorrência (antes da mudança)'
						: 'Segunda ocorrência (depois da mudança)'}</option
				>
			{/each}
		</select>
	</div>
{:else if form.date && form.time && form.timezone && !options.length}
	<p role="status">
		Confira a data e a hora: esse horário pode não existir nessa cidade devido à mudança de horário
		de verão.
	</p>
{/if}

<style>
	.occurrence {
		display: grid;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	label {
		font-weight: 600;
	}
	p {
		font-size: 0.875rem;
		line-height: 1.5;
	}
	select {
		width: 100%;
		min-height: 48px;
		font: inherit;
		padding: 0.75rem;
		color: var(--atv-text-primary);
		background: var(--atv-surface);
		border: 1px solid var(--atv-border);
		border-radius: 8px;
	}
</style>
