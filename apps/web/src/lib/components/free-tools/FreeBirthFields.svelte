<script lang="ts">
	import BirthCityFields from '$lib/components/BirthCityFields.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import type { NatalForm } from '$lib/natal-form';
	let {
		id,
		label = 'Dados de nascimento',
		form = $bindable()
	}: { id: string; label?: string; form: NatalForm } = $props();
</script>

<div class="birth-fields">
	<h3>{label}</h3>
	<div class="field-pair">
		<Field id={`${id}-date`} label="Data de nascimento">
			{#snippet children(describedBy)}
				<input
					id={`${id}-date`}
					bind:value={form.date}
					type="date"
					min="1900-01-01"
					max="2099-12-31"
					required
					aria-describedby={describedBy}
				/>
			{/snippet}
		</Field>
		<Field
			id={`${id}-time`}
			label="Hora de nascimento"
			help="Confira a hora no registro de nascimento. Sem hora conhecida, não é possível calcular o Ascendente."
		>
			{#snippet children(describedBy)}
				<input
					id={`${id}-time`}
					bind:value={form.time}
					type="time"
					required
					aria-describedby={describedBy}
				/>
			{/snippet}
		</Field>
	</div>
	<BirthCityFields id={`${id}-city`} label="Cidade de nascimento" bind:form />
</div>

<style>
	.birth-fields {
		display: grid;
		gap: 1rem;
	}
	h3 {
		margin: 0;
		font-family: var(--atv-font-display);
	}
	.field-pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	input {
		width: 100%;
		min-height: 48px;
		padding: 0.75rem;
		color: var(--atv-text-primary);
		background: var(--atv-surface);
		border: 1px solid var(--atv-border);
		border-radius: 8px;
		font: inherit;
	}
	@media (max-width: 450px) {
		.field-pair {
			grid-template-columns: 1fr;
		}
	}
</style>
