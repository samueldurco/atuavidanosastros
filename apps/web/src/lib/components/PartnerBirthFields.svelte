<script lang="ts">
	import Field from '$lib/components/ui/Field.svelte';
	import BirthCityFields from './BirthCityFields.svelte';
	import type { PartnerForm } from '$lib/partner-form';
	let {
		form = $bindable(),
		onchange,
		error
	}: { form: PartnerForm; onchange: () => void; error: string } = $props();
	const fields = [
		{
			key: 'date',
			label: 'Data de nascimento da outra pessoa',
			type: 'date',
			help: 'Instante entre 1900 e 2099.'
		},
		{
			key: 'time',
			label: 'Hora local da outra pessoa',
			type: 'time',
			help: 'Informe somente a hora conhecida. Não adotamos meio-dia como padrão.'
		}
	] as const;
</script>

<div class="partner-fields">
	<p>
		Dados da outra pessoa, usados apenas neste pedido. Não informe nome, contato ou contexto íntimo.
		Escolha a cidade de nascimento. Não criamos um perfil para ela.
	</p>
	<Field id="partner-precision" label="Precisão do horário da outra pessoa">
		{#snippet children(describedBy)}
			<select
				id="partner-precision"
				required
				bind:value={form.precision}
				{onchange}
				aria-describedby={describedBy}
			>
				<option value="">Selecione a precisão</option>
				<option value="EXACT">Exato e conhecido</option>
				<option value="APPROXIMATE">Aproximado — não elegível</option>
				<option value="UNKNOWN">Desconhecido — não elegível</option>
			</select>
		{/snippet}
	</Field>
	{#each fields as field (field.key)}
		<Field id={`partner-${field.key}`} label={field.label} help={field.help}>
			{#snippet children(describedBy)}
				<input
					id={`partner-${field.key}`}
					type={field.type}
					required
					autocomplete="off"
					maxlength="80"
					step={field.type === 'time' ? '0.001' : undefined}
					min={field.type === 'date' ? '1900-01-01' : undefined}
					max={field.type === 'date' ? '2099-12-31' : undefined}
					bind:value={form[field.key]}
					oninput={onchange}
					aria-describedby={describedBy}
				/>
			{/snippet}
		</Field>
	{/each}
	<BirthCityFields
		id="partner-city"
		label="Cidade de nascimento da outra pessoa"
		bind:form
		{onchange}
	/>
	<p class="validation" role="status">
		{error || 'Dados conferidos. Você pode continuar com as autorizações abaixo.'}
	</p>
</div>

<style>
	.partner-fields {
		display: grid;
		gap: 1rem;
		margin-bottom: 1.5rem;
		min-width: 0;
	}
	p {
		line-height: 1.6;
		margin: 0;
	}
	input,
	select {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 0.7rem;
		border: 1px solid var(--atv-border);
		border-radius: 4px;
		background: var(--atv-surface);
		color: var(--atv-text-primary);
		font: inherit;
	}
	.validation {
		color: var(--atv-text-secondary);
	}
</style>
