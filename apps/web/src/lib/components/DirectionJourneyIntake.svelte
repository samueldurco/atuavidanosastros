<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Button from './ui/Button.svelte';
	import Field from './ui/Field.svelte';
	import type { IntakeAccess } from '$lib/symbolic-intake';
	import { parseDirectionJourneyForm } from '$lib/direction-journey-request';
	import { createWorkflowRequest, type WorkflowRequestState } from '$lib/workflow-request';

	let { ownerId, access }: { ownerId: string; access: IntakeAccess } = $props();
	let client: ReturnType<typeof createWorkflowRequest> | undefined;
	let outcome = $state<WorkflowRequestState>({ mode: 'blocked', message: '' });
	let errors = $state<Record<string, string>>({});
	let busy = $state(false);
	let form = $state<HTMLFormElement>();
	let feedback = $state<HTMLParagraphElement>();
	const canEnter = $derived(access === 'AVAILABLE' && outcome.mode === 'new' && !busy);
	const accessMessage = $derived(
		{
			AVAILABLE:
				'Você pode registrar um objetivo. Leitura, acompanhamento e entrega dependem de etapas próprias de revisão e liberação.',
			UNRELEASED: 'A Jornada de Carreira está em preparação; novos pedidos estão desativados.',
			ACCESS_REQUIRED:
				'Seu acesso atual não permite criar este pedido. Seus registros anteriores continuam na Biblioteca.',
			UNAVAILABLE: 'Não foi possível verificar o acesso agora. Nenhum pedido será enviado.'
		}[access]
	);
	onMount(() => {
		try {
			client = createWorkflowRequest({
				operation: { kind: 'create', ownerId },
				productId: 'direction-journey',
				storage: sessionStorage,
				fetch,
				randomUUID: () => crypto.randomUUID()
			});
			outcome = client.inspect();
		} catch {
			outcome = {
				mode: 'blocked',
				message: 'O armazenamento desta aba está indisponível. Nenhum pedido foi enviado.'
			};
		}
	});
	async function focusFeedback() {
		await tick();
		feedback?.focus();
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!client || !form || !canEnter) return;
		const parsed = parseDirectionJourneyForm(new FormData(form));
		errors = parsed.errors;
		if (!parsed.input) {
			outcome = { mode: 'new', message: 'Revise os campos indicados. Nenhum pedido foi enviado.' };
			await focusFeedback();
			return;
		}
		busy = true;
		outcome = await client.perform(true, parsed.input);
		busy = false;
		await focusFeedback();
	}
	async function recover() {
		if (!client || busy || outcome.mode !== 'recover') return;
		busy = true;
		outcome = await client.perform(false);
		busy = false;
		await focusFeedback();
	}
	async function another() {
		if (!client || busy || !outcome.href || access !== 'AVAILABLE') return;
		outcome = client.startAnother();
		if (outcome.mode === 'new') {
			form?.reset();
			errors = {};
		}
		await focusFeedback();
	}
</script>

<section class="intake" aria-labelledby="journey-title" aria-busy={busy}>
	<p class="eyebrow">Carreira · 30 dias</p>
	<h1 id="journey-title">Jornada de Carreira</h1>
	<p class="lead">
		Escolha um objetivo de carreira para acompanhar durante 30 dias. Conte o que você quer
		desenvolver e quando pretende começar.
	</p>
	<p class="access-note">{accessMessage}</p>
	<form bind:this={form} method="POST" onsubmit={submit} novalidate autocomplete="off">
		<fieldset disabled={!canEnter}>
			<legend>Seu objetivo de carreira</legend>
			<Field
				id="goal"
				label="Objetivo que deseja explorar (obrigatório)"
				help="Até 400 caracteres. Descreva uma possibilidade sua, sem incluir dados de outras pessoas."
				error={errors.goal}
			>
				{#snippet children(describedBy)}<textarea
						id="goal"
						name="goal"
						rows="4"
						maxlength="400"
						required
						aria-invalid={!!errors.goal}
						aria-describedby={describedBy}></textarea>{/snippet}
			</Field>
			<Field
				id="startDate"
				label="Data inicial (obrigatória)"
				help="Esta será a data do dia 1. As datas dos dias 7, 14 e 30 são apenas marcos civis."
				error={errors.startDate}
			>
				{#snippet children(describedBy)}<input
						id="startDate"
						name="startDate"
						type="date"
						min="1900-01-01"
						max="2099-12-02"
						required
						aria-invalid={!!errors.startDate}
						aria-describedby={describedBy}
					/>{/snippet}
			</Field>
			<Field
				id="context"
				label="Contexto que deseja registrar (opcional)"
				help="Até 1.200 caracteres. Evite nomes completos e dados de terceiros."
				error={errors.context}
			>
				{#snippet children(describedBy)}<textarea
						id="context"
						name="context"
						rows="3"
						maxlength="1200"
						aria-invalid={!!errors.context}
						aria-describedby={describedBy}></textarea>{/snippet}
			</Field>
			<label class="consent" for="storage"
				><input
					id="storage"
					name="storage"
					type="checkbox"
					required
					aria-invalid={!!errors.storage}
					aria-describedby={errors.storage ? 'storage-error' : undefined}
				/><span
					>Autorizo guardar os dados deste pedido e seus resultados na minha conta. (Obrigatório)</span
				></label
			>
			{#if errors.storage}<p class="field-error" id="storage-error">{errors.storage}</p>{/if}
			<p class="privacy">
				Os campos não são salvos como rascunho neste navegador. Ao enviar, somente uma chave de
				recuperação fica nesta aba. <a href="/privacidade">Política de privacidade</a>.
			</p>
			{#if errors.form}<p class="field-error">{errors.form}</p>{/if}
			<Button type="submit" variant="primary" pending={busy} disabled={!canEnter}
				>Solicitar jornada</Button
			>
		</fieldset>
	</form>
	{#if outcome.message}<p bind:this={feedback} role="status" tabindex="-1">
			{outcome.message}
		</p>{/if}
	{#if outcome.mode === 'recover'}<Button variant="secondary" pending={busy} onclick={recover}
			>Consultar pedido</Button
		>{/if}
	{#if outcome.href}<div class="next">
			<Button href={outcome.href} variant="primary">Acompanhar na Biblioteca</Button><Button
				variant="secondary"
				disabled={busy || access !== 'AVAILABLE'}
				onclick={another}>Iniciar outro pedido</Button
			>
		</div>{/if}
	<p class="boundary">
		A jornada está em preparação. A leitura inicial e as etapas de acompanhamento ainda não estão
		disponíveis.
	</p>
	<a href="/biblioteca">Voltar à Biblioteca →</a>
</section>

<style>
	.intake {
		max-width: 48rem;
		margin: 0 auto;
		color: var(--atv-text-primary);
	}
	h1 {
		font-family: var(--atv-font-display);
		font-size: clamp(2rem, 4vw, 3.5rem);
		line-height: 1.12;
	}
	.lead {
		font-family: var(--atv-font-editorial);
		font-size: 1.2rem;
	}
	.access-note {
		border-left: 3px solid #bf9153;
		padding: 0.8rem 1rem;
		background: var(--atv-surface-subtle);
	}
	form {
		margin: 2rem 0;
	}
	fieldset {
		border: 0;
		padding: 0;
		display: grid;
		gap: 1.4rem;
	}
	legend {
		font-weight: 700;
		margin-bottom: 1rem;
	}
	:global(.intake input[type='date']),
	:global(.intake textarea) {
		width: 100%;
		box-sizing: border-box;
	}
	.consent {
		display: flex;
		gap: 0.7rem;
		align-items: flex-start;
	}
	.privacy,
	.boundary {
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.boundary {
		margin: 2rem 0;
	}
	.field-error {
		color: var(--atv-color-error, #9b3030);
	}
	.next {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin: 1rem 0;
	}
</style>
