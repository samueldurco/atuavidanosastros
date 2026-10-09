<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { tarotMethodFor } from '@atv/domain';
	import Button from './ui/Button.svelte';
	import Field from './ui/Field.svelte';
	import { symbolicProduct, parseSymbolicForm, type IntakeAccess } from '$lib/symbolic-intake';
	import { createWorkflowRequest, type WorkflowRequestState } from '$lib/workflow-request';
	let { ownerId, productId, access }: { ownerId: string; productId: string; access: IntakeAccess } =
		$props();
	const product = $derived(symbolicProduct(productId));
	const tarot = $derived(product?.kind === 'tarot');
	const method = $derived(tarotMethodFor(productId));
	const atlas = $derived(productId === 'dream-atlas');
	let client: ReturnType<typeof createWorkflowRequest> | undefined;
	let outcome = $state<WorkflowRequestState>({ mode: 'blocked', message: '' });
	let busy = $state(false);
	let errors = $state<Record<string, string>>({});
	let form = $state<HTMLFormElement>();
	let feedback = $state<HTMLParagraphElement>();
	const canEnter = $derived(access === 'AVAILABLE' && outcome.mode === 'new' && !busy);
	const accessMessage = $derived(
		{
			AVAILABLE:
				'Você pode criar um pedido. A interpretação e os arquivos dependem das etapas de revisão e liberação.',
			UNRELEASED: 'Este produto está em preparação. Novos pedidos ainda não estão disponíveis.',
			ACCESS_REQUIRED:
				'Seu acesso atual não permite criar este pedido. Seus registros anteriores continuam na Biblioteca.',
			UNAVAILABLE: 'Não foi possível verificar o acesso agora. Nenhum novo pedido será enviado.'
		}[access]
	);
	onMount(() => {
		try {
			client = createWorkflowRequest({
				operation: { kind: 'create', ownerId },
				productId,
				storage: sessionStorage,
				fetch,
				randomUUID: () => crypto.randomUUID()
			});
			outcome = client.inspect();
		} catch {
			outcome = {
				mode: 'blocked',
				message:
					'O armazenamento desta aba está indisponível. Nenhum pedido foi enviado. Consulte sua Biblioteca.'
			};
		}
	});
	async function focusFeedback() {
		await tick();
		feedback?.focus();
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!client || !canEnter || !form) return;
		const parsed = parseSymbolicForm(productId, new FormData(form));
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

<section class:tarot class="intake" aria-labelledby="intake-title" aria-busy={busy}>
	<header class="intro">
		<p class="eyebrow">{tarot ? 'Tarot' : 'Sonhos'}</p>
		<h1 id="intake-title">{product?.name}</h1>
		<p class="lead">
			{tarot
				? 'Escolha um foco, se desejar. A leitura também é completa sem uma pergunta.'
				: atlas
					? 'Escolha a data de início do seu diário de sonhos de 30 dias.'
					: 'Conte o sonho que você quer interpretar.'}
		</p>
		<p class="access-note">{accessMessage}</p>
		{#if method}
			<p>{method.description} {method.positions.length} cartas. {method.integration}</p>
		{:else if productId === 'dream-dossier'}
			<p>
				Registre o sonho que você quer explorar. A escolha de registros anteriores e a comparação
				entre sonhos ainda não estão disponíveis neste formulário.
			</p>
		{:else if atlas}
			<p>
				Este início delimita 30 dias de calendário. O caderno diário, as leituras semanais e a
				síntese final ainda não estão disponíveis.
			</p>
		{/if}
	</header>
	<div class="workspace">
		<div class="writing">
			<form bind:this={form} method="POST" onsubmit={submit} novalidate autocomplete="off">
				<fieldset disabled={!canEnter}>
					<legend>{tarot ? 'Sua consulta' : atlas ? 'Início do caderno' : 'Seu sonho'}</legend>
					{#if tarot}
						<Field
							id="focus"
							label="Foco da consulta (opcional)"
							help="Até 400 caracteres. Você pode deixar em branco; todas as posições serão interpretadas."
							error={errors.focus}
						>
							{#snippet children(describedBy)}<textarea
									id="focus"
									name="focus"
									rows="3"
									maxlength="400"
									aria-invalid={!!errors.focus}
									aria-describedby={describedBy}></textarea>{/snippet}
						</Field>
					{:else if atlas}
						<Field
							id="startDate"
							label="Data de início dos 30 dias (obrigatória)"
							help="O período começa nesta data e inclui 30 dias de calendário. Nenhum sonho anterior é carregado."
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
					{:else}
						<Field id="date" label="Data do sonho (obrigatória)" error={errors.date}>
							{#snippet children(describedBy)}<input
									id="date"
									name="date"
									type="date"
									min="1900-01-01"
									max="2099-12-31"
									required
									aria-invalid={!!errors.date}
									aria-describedby={describedBy}
								/>{/snippet}
						</Field>
						<Field
							id="narrative"
							label="O que você lembra? (obrigatório)"
							help="Até 6.000 caracteres. Descreva cenas, sensações ou fragmentos sem precisar organizá-los."
							error={errors.narrative}
						>
							{#snippet children(describedBy)}<textarea
									id="narrative"
									name="narrative"
									rows="8"
									maxlength="6000"
									required
									aria-invalid={!!errors.narrative}
									aria-describedby={describedBy}></textarea>{/snippet}
						</Field>
						<Field
							id="associations"
							label="Suas associações (opcional)"
							help="O que essas imagens lembram a você? Até 8 linhas, com 200 caracteres por linha."
							error={errors.associations}
						>
							{#snippet children(describedBy)}<textarea
									id="associations"
									name="associations"
									rows="3"
									maxlength="1607"
									aria-invalid={!!errors.associations}
									aria-describedby={describedBy}></textarea>{/snippet}
						</Field>
						<Field
							id="emotions"
							label="Emoções ao acordar (opcional)"
							help="Até 8 linhas, com 80 caracteres por linha."
							error={errors.emotions}
						>
							{#snippet children(describedBy)}<textarea
									id="emotions"
									name="emotions"
									rows="2"
									maxlength="647"
									aria-invalid={!!errors.emotions}
									aria-describedby={describedBy}></textarea>{/snippet}
						</Field>
					{/if}
					<Field
						id="context"
						label={atlas ? 'Contexto do período (opcional)' : 'Contexto do momento (opcional)'}
						help="Até 1.200 caracteres. Evite nomes completos e dados de outras pessoas."
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
							>Autorizo guardar os dados deste pedido e seus resultados na minha conta.
							(Obrigatório)</span
						></label
					>
					{#if errors.storage}<p class="field-error" id="storage-error">{errors.storage}</p>{/if}
					{#if !tarot && !atlas}<label class="consent" for="continuity"
							><input id="continuity" name="continuity" type="checkbox" /><span
								>Autorizo usar este relato na continuidade de minhas leituras de sonhos. (Opcional)</span
							></label
						>{/if}
					<p class="privacy">
						Os campos não são salvos como rascunho neste navegador. Ao enviar, somente uma chave de
						recuperação fica nesta aba. <a href="/privacidade">Política de privacidade</a>.
					</p>
					{#if errors.form}<p class="field-error">{errors.form}</p>{/if}
					<Button
						type="submit"
						variant={tarot ? 'gold-on-night' : 'primary'}
						pending={busy}
						disabled={!canEnter}>Solicitar leitura</Button
					>
				</fieldset>
			</form>
			<div class="recovery">
				{#if outcome.message}<p bind:this={feedback} role="status" tabindex="-1">
						{outcome.message}
					</p>{/if}
				{#if outcome.mode === 'recover'}<Button
						variant={tarot ? 'gold-on-night' : 'secondary'}
						pending={busy}
						onclick={recover}>Consultar pedido</Button
					>{/if}
				{#if outcome.href}<div class="next">
						<Button href={outcome.href} variant={tarot ? 'gold-on-night' : 'primary'}
							>Acompanhar na Biblioteca</Button
						><Button
							variant={tarot ? 'gold-on-night' : 'secondary'}
							disabled={busy || access !== 'AVAILABLE'}
							onclick={another}>Iniciar outra leitura</Button
						>
					</div>{/if}
			</div>
		</div>
		<aside aria-label="Método e continuidade">
			<p class="eyebrow">O que acontece depois</p>
			<h2>{tarot ? 'Como funciona a leitura de Tarot' : 'Como funciona a leitura do sonho'}</h2>
			<p>
				{productId === 'tarot-journey'
					? 'A pergunta e o objetivo são dados declarados por você. A tiragem e o percurso ainda não estão definidos; este formulário não sorteia cartas.'
					: productId === 'dream-dossier'
						? 'Este formulário registra apenas o sonho principal. O consentimento opcional de continuidade não seleciona nem carrega sonhos anteriores; a comparação do dossiê depende de uma etapa própria.'
						: atlas
							? 'Este formulário registra somente o início e o contexto opcional do período. Não carrega relatos anteriores, identifica padrões ou cria leituras. Os registros diários dependerão de uma etapa própria.'
							: tarot
								? 'A tiragem fica vinculada ao seu pedido. Reabrir ou recuperar esse pedido preserva as mesmas cartas; somente uma nova consulta inicia outra tiragem.'
								: 'O relato e suas associações orientam a leitura simbólica. Não deduzimos um diagnóstico, uma previsão ou uma recorrência a partir deste registro.'}
			</p>
			<ol>
				<li>Seu pedido fica salvo na Biblioteca.</li>
				<li>A leitura passa pelo processamento e pela revisão.</li>
				<li>Somente resultados revisados e liberados aparecem na Biblioteca.</li>
			</ol>
			<p>Não use esta leitura como orientação médica, jurídica ou financeira.</p>
			<div class="continuity">
				<h2>Acompanhe seu pedido</h2>
				<p>Consulte o andamento e abra o resultado quando estiver disponível.</p>
				<a href="/biblioteca">Voltar à Biblioteca →</a>
			</div>
		</aside>
	</div>
</section>

<style>
	.intake {
		max-width: 1280px;
		margin: 0 auto;
		color: var(--atv-text-primary);
	}
	.intro {
		border-bottom: 1px solid var(--atv-border);
		padding-bottom: 2rem;
		margin-bottom: 2rem;
	}
	h1 {
		font-family: var(--atv-font-display);
		font-size: clamp(2rem, 4vw, 3.5rem);
		line-height: 1.12;
		margin: 0.7rem 0 1rem;
	}
	.lead {
		font-family: var(--atv-font-editorial);
		font-size: 1.25rem;
		max-width: 42rem;
	}
	.access-note {
		border-left: 3px solid #bf9153;
		padding: 0.8rem 1rem;
		margin-top: 1.5rem;
		max-width: 48rem;
	}
	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(230px, 1fr);
		gap: 2.5rem;
		align-items: start;
	}
	.writing {
		min-width: 0;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 1.4rem;
		min-width: 0;
	}
	legend {
		font-family: var(--atv-font-display);
		font-size: 1.6rem;
		margin-bottom: 1.5rem;
	}
	textarea {
		resize: vertical;
	}
	.consent {
		display: flex;
		align-items: flex-start;
		gap: 0.8rem;
		min-height: 44px;
		line-height: 1.6;
		font-size: 0.875rem;
	}
	.consent input {
		flex: 0 0 auto;
		margin-top: 0.25rem;
	}
	.privacy {
		font-size: 0.8rem;
		line-height: 1.6;
	}
	aside {
		border-left: 1px solid var(--atv-border);
		padding-left: 2rem;
		line-height: 1.75;
		font-size: 0.95rem;
	}
	h2 {
		font-family: var(--atv-font-display);
		font-size: 1.5rem;
		line-height: 1.25;
	}
	ol {
		padding-left: 1.25rem;
	}
	li {
		margin-bottom: 0.9rem;
	}
	.continuity {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--atv-border);
	}
	a {
		text-underline-offset: 0.2em;
	}
	.recovery {
		margin-top: 1.5rem;
	}
	.recovery p {
		padding: 1rem;
		border: 1px solid currentColor;
		line-height: 1.65;
		overflow-wrap: anywhere;
	}
	.next {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1rem;
	}
	.tarot {
		background: #0b1635;
		color: #fcfbf8;
		padding: clamp(1.25rem, 3vw, 2.5rem);
		border-radius: 12px;
	}
	.tarot .intro,
	.tarot aside,
	.tarot .continuity {
		border-color: #58647a;
	}
	.tarot :global(.eyebrow),
	.tarot a {
		color: #e8c18a;
	}
	.tarot .lead,
	.tarot :global(.field small) {
		color: #d2d9e5;
	}
	.tarot :global(.field-error) {
		color: #ffb7b7;
	}
	.tarot :global(input:disabled),
	.tarot :global(textarea:disabled) {
		opacity: 1;
	}
	@media (max-width: 1050px) {
		.workspace {
			grid-template-columns: 1fr;
		}
		aside {
			border-left: 0;
			border-top: 1px solid var(--atv-border);
			padding: 1.5rem 0 0;
		}
	}
	@media (max-width: 480px) {
		.tarot {
			padding: 1.1rem;
		}
		.workspace {
			gap: 1.5rem;
		}
	}
</style>
