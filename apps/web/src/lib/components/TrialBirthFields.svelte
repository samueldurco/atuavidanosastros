<script lang="ts">
	import BirthCityFields from './BirthCityFields.svelte';
	let {
		id,
		label,
		form = $bindable()
	}: {
		id: string;
		label: string;
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
	} = $props();
</script>

<fieldset>
	<legend>{label}</legend>
	<div class="dates">
		<label for={`${id}-date`}
			>Data de nascimento<input
				id={`${id}-date`}
				type="date"
				min="1900-01-01"
				max="2099-12-31"
				required
				bind:value={form.date}
			/></label
		>
		<label for={`${id}-time`}
			>Hora registrada de nascimento<input
				id={`${id}-time`}
				type="time"
				required
				bind:value={form.time}
			/></label
		>
	</div>
	<BirthCityFields id={`${id}-city`} label="Cidade de nascimento" bind:form />
	<p>Use a hora do registro. Uma hora aproximada pode alterar os ângulos e as casas.</p>
</fieldset>

<style>
	fieldset {
		border: 1px solid var(--border, #d6cfbf);
		border-radius: 1rem;
		padding: 1.25rem;
		margin: 1.5rem 0;
	}
	legend {
		padding: 0 0.5rem;
		font-weight: 600;
	}
	.dates {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	label {
		display: grid;
		gap: 0.5rem;
	}
	input {
		font: inherit;
		background: var(--paper, #fff);
		color: inherit;
		border: 1px solid #8b8377;
		border-radius: 0.5rem;
		padding: 0.7rem;
		width: 100%;
		box-sizing: border-box;
	}
	p {
		font-size: 0.9rem;
	}
</style>
