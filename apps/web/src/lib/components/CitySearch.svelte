<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		cityShardKey,
		normalizeCity,
		searchCityRows,
		type CityLocation
	} from '$lib/city-location';
	let {
		id,
		label = 'Cidade de nascimento',
		value = $bindable(null),
		onchange = () => {},
		disabled = false
	}: {
		id: string;
		label?: string;
		value?: CityLocation | null;
		onchange?: (city: CityLocation | null) => void;
		disabled?: boolean;
	} = $props();
	let query = $state('');
	let results = $state<CityLocation[]>([]);
	let open = $state(false);
	let busy = $state(false);
	let message = $state('');
	let active = $state(-1);
	let sequence = 0;
	let timer: ReturnType<typeof setTimeout>;
	let abort: AbortController | undefined;
	let displayedSelection: string | null = null;
	$effect(() => {
		if (value) {
			query = value.label;
			displayedSelection = value.id;
		} else if (displayedSelection !== null) {
			query = '';
			displayedSelection = null;
			results = [];
			message = '';
			sequence++;
			clearTimeout(timer);
			abort?.abort();
		}
	});
	onDestroy(() => {
		clearTimeout(timer);
		abort?.abort();
	});
	function change() {
		displayedSelection = null;
		value = null;
		onchange(null);
		clearTimeout(timer);
		abort?.abort();
		const current = ++sequence;
		results = [];
		active = -1;
		message = '';
		open = true;
		busy = normalizeCity(query).length >= 2;
		if (!busy) {
			message = 'Digite pelo menos duas letras da cidade.';
			return;
		}
		timer = setTimeout(() => search(current, query), 250);
	}
	async function search(current: number, text: string) {
		abort = new AbortController();
		try {
			const response = await fetch(`/locations/${cityShardKey(text)}.json`, {
				signal: abort.signal
			});
			if (!response.ok && response.status !== 404) throw new Error();
			const rows = response.status === 404 ? [] : await response.json();
			if (current !== sequence) return;
			results = searchCityRows(rows, text);
			message = results.length
				? `${results.length} cidades encontradas. Escolha sua cidade.`
				: 'Cidade não encontrada. Confira a grafia ou tente outro nome usado para essa cidade.';
		} catch (error) {
			if (current === sequence && !(error instanceof DOMException && error.name === 'AbortError'))
				message = 'Não foi possível buscar as cidades. Tente novamente.';
		} finally {
			if (current === sequence) busy = false;
		}
	}
	function choose(city: CityLocation) {
		sequence++;
		clearTimeout(timer);
		abort?.abort();
		value = city;
		query = city.label;
		open = false;
		busy = false;
		message = 'Cidade selecionada. Localização e fuso serão usados automaticamente.';
		onchange(city);
	}
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			return;
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			open = true;
			if (results.length)
				active =
					active < 0
						? event.key === 'ArrowDown'
							? 0
							: results.length - 1
						: (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
		}
		if (event.key === 'Enter' && open) {
			event.preventDefault();
			if (active >= 0 && results[active]) choose(results[active]);
		}
	}
</script>

<div class="city-search">
	<label for={id}>{label}</label>
	<input
		{id}
		{disabled}
		required
		role="combobox"
		aria-autocomplete="list"
		aria-expanded={open && results.length > 0}
		aria-controls={`${id}-results`}
		aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
		aria-describedby={`${id}-help ${id}-status`}
		autocomplete="off"
		placeholder="Digite sua cidade"
		maxlength="200"
		bind:value={query}
		oninput={change}
		onkeydown={keydown}
		onfocus={() => {
			if (!value && results.length) open = true;
		}}
		onblur={() => {
			open = false;
		}}
	/>
	<p id={`${id}-help`} class="help">
		Escolha a cidade com o estado e o país correspondentes. O cálculo usa a localização e o fuso
		automaticamente.
	</p>
	<div
		id={`${id}-results`}
		role="listbox"
		aria-label="Cidades encontradas"
		hidden={!open || !results.length}
	>
		{#each results as city, index (city.id)}
			<div
				role="option"
				aria-selected={active === index}
				id={`${id}-option-${index}`}
				class:active={active === index}
			>
				<button
					type="button"
					tabindex="-1"
					onpointerdown={(event) => event.preventDefault()}
					onclick={() => choose(city)}>{city.label}</button
				>
			</div>
		{/each}
	</div>
	<p id={`${id}-status`} role="status" class="help">{busy ? 'Buscando cidades…' : message}</p>
	<small class="source"
		>Cidades: <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> · CC
		BY
		<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">4.0</a
		></small
	>
</div>

<style>
	.city-search {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
	}
	label {
		font-weight: 600;
	}
	input {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		min-height: 48px;
		padding: 0.75rem;
		border: 1px solid var(--atv-border, #8294b1);
		border-radius: 8px;
		background: var(--atv-surface, white);
		color: var(--atv-text-primary, #10274c);
		font: inherit;
	}
	[role='listbox'] {
		max-height: 18rem;
		overflow: auto;
		border: 1px solid var(--atv-border, #8294b1);
		border-radius: 8px;
	}
	[hidden] {
		display: none;
	}
	button {
		width: 100%;
		min-height: 48px;
		text-align: left;
		padding: 0.75rem;
		border: 0;
		background: var(--atv-surface, white);
		color: var(--atv-text-primary, #10274c);
		font: inherit;
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.active button,
	button:hover {
		background: var(--atv-surface-alt, #eaf0f9);
	}
	input:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--atv-primary, #124c98);
		outline-offset: 2px;
	}
	.help {
		margin: 0;
		color: var(--atv-text-secondary, #476289);
		font-size: 0.875rem;
		line-height: 1.5;
	}
	.source {
		color: var(--atv-text-secondary, #476289);
		font-size: 0.75rem;
	}
	a {
		color: inherit;
	}
</style>
