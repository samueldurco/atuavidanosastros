<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Button from './ui/Button.svelte';
	import Field from './ui/Field.svelte';
	import { symbolicProduct, parseSymbolicForm, type IntakeAccess } from '$lib/symbolic-intake';
	import { createWorkflowRequest, type WorkflowRequestState } from '$lib/workflow-request';
	let { ownerId, productId, access }: { ownerId: string; productId: string; access: IntakeAccess } =
		$props();
	const product = $derived(symbolicProduct(productId));
	const tarot = $derived(product?.kind === 'tarot');
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
			UNRELEASED:
				'Este produto está em preparação. Nenhum modelo está homologado; novos pedidos estão desativados.',
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
		<p class="eyebrow">{tarot ? 'Tarot · escuta simbólica' : 'Sonhos · caderno pessoal'}</p>
		<h1 id="intake-title">{product?.name}</h1>
		<p class="lead">
			{tarot
				? 'Uma boa pergunta abre espaço para outras perspectivas.'
				: 'Registre o que ficou, antes de buscar um significado.'}
		</p>
		<p class="access-note">{accessMessage}</p>
	</header>
	<div class="workspace">
		<div class="writing">
			<form bind:this={form} method="POST" onsubmit={submit} novalidate autocomplete="off">
				<fieldset disabled={!canEnter}>
					<legend>{tarot ? 'Seu ponto de partida' : 'O relato é seu'}</legend>
					{#if tarot}
						{#each Array.from({ length: productId === 'three-questions' ? 3 : 1 }, (_, i) => i + 1) as number (number)}
							<Field
								id={`question${number}`}
								label={productId === 'three-questions'
									? `Pergunta ${number} (obrigatória)`
									: 'Sua pergunta (obrigatória)'}
								help="Até 400 caracteres. Prefira perguntas sobre suas escolhas e possibilidades."
								error={errors[`question${number}`]}
							>
								{#snippet children(describedBy)}<textarea
										id={`question${number}`}
										name={`question${number}`}
										rows="3"
										maxlength="400"
										required
										aria-invalid={!!errors[`question${number}`]}
										aria-describedby={describedBy}></textarea>{/snippet}
							</Field>
						{/each}
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
						label="Contexto do momento (opcional)"
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
					{#if !tarot}<label class="consent" for="continuity"
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
						disabled={!canEnter}>Criar pedido</Button
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
						onclick={recover}>Consultar pedido original</Button
					>{/if}
				{#if outcome.href}<div class="next">
						<Button href={outcome.href} variant={tarot ? 'gold-on-night' : 'primary'}
							>Abrir pedido na Biblioteca</Button
						><Button
							variant={tarot ? 'gold-on-night' : 'secondary'}
							disabled={busy || access !== 'AVAILABLE'}
							onclick={another}>Preparar outro pedido</Button
						>
					</div>{/if}
			</div>
		</div>
		<aside aria-label="Método e continuidade">
			<p class="eyebrow">O que acontece depois</p>
			<h2>{tarot ? 'Símbolos, não sentenças.' : 'Sentidos que partem de você.'}</h2>
			<p>
				{tarot
					? 'As cartas são sorteadas pelo motor do produto após o pedido. Nenhuma carta ou interpretação é criada por este formulário.'
					: 'O relato e suas associações orientam a leitura simbólica. Não deduzimos um diagnóstico, uma previsão ou uma recorrência a partir deste registro.'}
			</p>
			<ol>
				<li>Seu pedido é salvo com uma referência recuperável.</li>
				<li>O cálculo e a interpretação seguem etapas próprias.</li>
				<li>Somente resultados revisados e liberados aparecem na Biblioteca.</li>
			</ol>
			<p>Não use esta leitura como orientação médica, jurídica ou financeira.</p>
			<div class="continuity">
				<h2>Seu caminho tem memória.</h2>
				<p>Acompanhe o estado do pedido, consulte versões e retome seus registros.</p>
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
