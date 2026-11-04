<script lang="ts">
	import { goto } from '$app/navigation';
	import { LAUNCH_INPUT_VERSION, parseLaunchInput, type LaunchAnswer } from '@atv/domain';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import TrialBirthFields from '$lib/components/TrialBirthFields.svelte';
	import BirthCityFields from '$lib/components/BirthCityFields.svelte';
	import { resolvedCivilInstant } from '$lib/city-location';
	import '$lib/styles/mvp-product-art.css';
	let { data } = $props();
	const blank = () => ({
		name: '',
		date: '',
		time: '',
		location: '',
		country: '',
		latitude: '',
		longitude: '',
		timezone: '',
		source: '',
		occurrence: ''
	});
	let birth = $state(blank());
	let ceremonies = $state([
		{ ...blank(), label: 'Opção 1' },
		{ ...blank(), label: 'Opção 2' }
	]);
	let responses = $state<Record<string, string>>({});
	let adult = $state(false),
		storage = $state(false),
		busy = $state(false),
		message = $state('');
	let requestKey = '';
	function birthInput(form: ReturnType<typeof blank>) {
		if (!form.source || !form.location || !form.latitude || !form.longitude)
			throw new Error('Selecione a cidade e confira os dados de data e hora.');
		return {
			localDateTime: `${form.date}T${form.time}:00`,
			utcInstant: resolvedCivilInstant(form.date, form.time, form.timezone, form.occurrence)
				.utcInstant,
			timezone: form.timezone,
			latitude: Number(form.latitude),
			longitude: Number(form.longitude),
			locationSource: form.source
		};
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		message = '';
		try {
			const answers: Record<string, LaunchAnswer> = {};
			for (const field of data.spec.fields) {
				if (field.type === 'adult-confirmation') answers[field.key] = adult;
				else if (field.type === 'ceremony-options')
					answers[field.key] = ceremonies.map((item) => ({
						...birthInput(item),
						label: item.label,
						city: item.location
					}));
				else if (field.type === 'list')
					answers[field.key] = (responses[field.key] ?? '')
						.split('\n')
						.map((item) => item.trim())
						.filter(Boolean);
				else if (responses[field.key]?.trim()) answers[field.key] = responses[field.key].trim();
			}
			const input = parseLaunchInput({
				version: LAUNCH_INPUT_VERSION,
				productId: data.product.id,
				consent: { storage, policyVersion: 'atv-launch-consent/1' },
				...(data.spec.requiresBirth ? { birth: birthInput(birth) } : {}),
				answers
			});
			if (!input)
				throw new Error(
					'Confira os campos, os limites indicados e o consentimento antes de salvar.'
				);
			busy = true;
			requestKey ||= crypto.randomUUID();
			const response = await fetch('/api/launch-preparations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ requestKey, input })
			});
			const result = (await response.json()) as { message?: unknown; id?: unknown };
			if (!response.ok)
				throw new Error(
					typeof result.message === 'string'
						? result.message
						: 'Não foi possível salvar. Tente novamente.'
				);
			if (typeof result.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(result.id))
				throw new Error('O salvamento não retornou uma preparação válida. Tente novamente.');
			await goto(`/testar-lancamentos/preparacoes/${encodeURIComponent(result.id)}`);
		} catch (cause) {
			message = cause instanceof Error ? cause.message : 'Não foi possível salvar os dados.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>{data.product.name} — teste gratuito | ATVNA</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<a href="/testar-lancamentos">← Testes gratuitos</a>
	<PageIntro
		eyebrow="Teste gratuito · Dados da leitura"
		title={data.product.name}
		identity={data.product.id}
		productArtwork
		description="Preencha os dados para começar. Depois de salvar, você poderá gerar a leitura e consultar o resultado na sua área."
	/>
	<form onsubmit={submit}>
		{#if data.spec.requiresBirth}<TrialBirthFields
				id="launch-birth"
				label="Seus dados de nascimento"
				bind:form={birth}
			/>{/if}
		{#each data.spec.fields as field (field.key)}
			{#if field.type === 'ceremony-options'}
				<fieldset>
					<legend>{field.label}</legend>
					<p>Informe o início da cerimônia em todas as opções, para comparar o mesmo momento.</p>
					{#each ceremonies as ceremony, index (ceremony)}
						<fieldset>
							<legend>Opção {index + 1}</legend>
							<label
								>Nome da opção<input maxlength="80" required bind:value={ceremony.label} /></label
							>
							<div class="date-pair">
								<label
									>Data da cerimônia<input
										type="date"
										min="1900-01-01"
										max="2099-12-31"
										required
										bind:value={ceremony.date}
									/></label
								><label
									>Horário da cerimônia<input
										type="time"
										required
										bind:value={ceremony.time}
									/></label
								>
							</div>
							<BirthCityFields
								id={`ceremony-${index}`}
								label="Cidade da cerimônia"
								bind:form={ceremonies[index]}
							/>
						</fieldset>
					{/each}
					{#if ceremonies.length < 3}<button
							type="button"
							onclick={() => (ceremonies = [...ceremonies, { ...blank(), label: 'Opção 3' }])}
							>Adicionar terceira opção</button
						>{:else}<button type="button" onclick={() => (ceremonies = ceremonies.slice(0, 2))}
							>Remover terceira opção</button
						>{/if}
				</fieldset>
			{:else if field.type === 'adult-confirmation'}
				<label class="check"
					><input type="checkbox" required bind:checked={adult} />{field.label}</label
				>
			{:else if field.type === 'date'}
				<label
					>{field.label}<input
						type="date"
						min="1900-01-01"
						max="2099-12-31"
						required={field.required}
						bind:value={responses[field.key]}
					/></label
				>
			{:else}
				<label
					>{field.label}{!field.required ? ' (opcional)' : ''}
					{#if field.type === 'text'}<input
							required={field.required}
							maxlength={field.maxLength}
							bind:value={responses[field.key]}
						/>
					{:else}<textarea
							rows="4"
							required={field.required}
							maxlength={field.type === 'list'
								? (field.maxItems ?? 1) * ((field.maxLength ?? 200) + 1)
								: field.maxLength}
							bind:value={responses[field.key]}></textarea>{/if}
					{#if field.type === 'list'}<span class="hint"
							>Uma situação por linha. Informe de {field.minItems} a {field.maxItems} itens, com até {field.maxLength}
							caracteres cada.</span
						>{/if}
				</label>
			{/if}
		{/each}
		<label class="check"
			><input type="checkbox" required bind:checked={storage} />Autorizo salvar estes dados na minha
			área privada para cálculo e revisão deste produto. Posso consultar a
			<a href="/privacidade">Política de Privacidade</a>.</label
		>
		{#if message}<p role="alert">{message}</p>{/if}
		<button class="submit" type="submit" disabled={busy}
			>{busy ? 'Salvando…' : 'Salvar e continuar'}</button
		>
	</form>
</ContentShell>

<style>
	form {
		max-width: 48rem;
	}
	label {
		display: grid;
		gap: 0.5rem;
		margin: 1.25rem 0;
	}
	input,
	textarea,
	button {
		font: inherit;
	}
	input:not([type='checkbox']),
	textarea {
		padding: 0.8rem;
		width: 100%;
		box-sizing: border-box;
		background: #fff8e9;
		color: #183746;
		border: 1px solid #18374670;
		border-radius: 0.4rem;
	}
	fieldset {
		padding: 1rem;
		margin: 1.5rem 0;
		border: 1px solid #18374650;
		min-width: 0;
	}
	legend {
		padding-inline: 0.4rem;
		font-weight: 600;
	}
	.date-pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	.check {
		display: block;
		line-height: 1.65;
	}
	.check input {
		margin-right: 0.5rem;
	}
	.hint {
		font-size: 0.875rem;
	}
	button {
		padding: 0.8rem 1.1rem;
		cursor: pointer;
		background: #fff8e9;
		color: #183746;
		border: 1px solid #18374680;
	}
	.submit {
		background: #183746;
		color: #fff8e9;
	}
	button:disabled {
		opacity: 0.65;
		cursor: wait;
	}
	:global(input:focus-visible),
	:global(textarea:focus-visible),
	button:focus-visible {
		outline: 3px solid #183746;
		outline-offset: 3px;
	}
	[role='alert'] {
		border-left: 3px solid #983e4b;
		padding: 1rem;
	}
	@media (max-width: 450px) {
		.date-pair {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
</style>
