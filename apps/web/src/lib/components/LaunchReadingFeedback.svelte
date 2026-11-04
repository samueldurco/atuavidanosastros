<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	let {
		preparationId,
		history = [],
		historyAvailable = true
	}: {
		preparationId: string;
		history?: { id: string; decision: string; comment: string; created_at: string }[];
		historyAvailable?: boolean;
	} = $props();
	let decision = $state('');
	let comment = $state('');
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);
	let retry = $state<{ signature: string; key: string } | null>(null);
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		const signature = JSON.stringify({ decision, comment: comment.trim() });
		if (retry?.signature !== signature) retry = { signature, key: crypto.randomUUID() };
		busy = true;
		message = '';
		failed = false;
		try {
			const response = await fetch(`/api/launch-preparations/${preparationId}/feedback`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ request_key: retry!.key, decision, comment: comment.trim() })
			});
			const result = (await response.json()) as { message?: unknown };
			if (!response.ok)
				throw new Error(
					typeof result.message === 'string'
						? result.message
						: 'Não foi possível salvar sua avaliação.'
				);
			message = 'Sua avaliação foi registrada. Obrigado por contar como foi a leitura.';
			retry = null;
			decision = '';
			comment = '';
			await invalidateAll();
		} catch (cause) {
			failed = true;
			message =
				cause instanceof Error
					? cause.message
					: 'Não foi possível salvar sua avaliação. Tente novamente.';
		} finally {
			busy = false;
		}
	}
</script>

<section class="feedback" aria-labelledby="feedback-title">
	<h2 id="feedback-title">Como foi esta leitura para você?</h2>
	<p>
		Sua avaliação fica registrada separadamente da revisão editorial. Ela ajuda a conferir esta
		edição de teste; a liberação comercial continua em outra etapa.
	</p>
	<form onsubmit={submit} aria-busy={busy}>
		<fieldset disabled={busy}>
			<legend>Sua avaliação desta edição</legend>
			<label class="choice"
				><input
					type="radio"
					name="launch-feedback-decision"
					value="approved"
					bind:group={decision}
					required
				/> Aprovo esta leitura de teste</label
			>
			<label class="choice"
				><input
					type="radio"
					name="launch-feedback-decision"
					value="rejected"
					bind:group={decision}
					required
				/> Precisa de ajustes</label
			>
			<label for="launch-feedback-comment"
				>{decision === 'rejected'
					? 'O que precisa mudar? (obrigatório)'
					: 'O que funcionou ou poderia melhorar? (opcional)'}</label
			>
			<textarea
				id="launch-feedback-comment"
				bind:value={comment}
				maxlength="3000"
				required={decision === 'rejected'}
				rows="5"
				aria-describedby="feedback-comment-help"></textarea>
			<p id="feedback-comment-help" class="help">
				Até 3.000 caracteres. Cada avaliação é preservada; você pode registrar uma nova depois.
			</p>
			<button type="submit">{busy ? 'Registrando…' : 'Registrar minha avaliação'}</button>
		</fieldset>
	</form>
	{#if message}<p class="message" role={failed ? 'alert' : 'status'}>{message}</p>{/if}
	{#if history.length}
		<h3>Suas últimas avaliações desta edição</h3>
		<ol class="history">
			{#each history as entry (entry.id)}<li>
					<p>
						<strong
							>{entry.decision === 'approved'
								? 'Leitura aprovada por você'
								: 'Ajustes solicitados'}</strong
						>
						·
						<time datetime={entry.created_at}
							>{new Date(entry.created_at).toLocaleString('pt-BR', {
								timeZone: 'America/Sao_Paulo'
							})}</time
						>
					</p>
					{#if entry.comment}<p class="comment">{entry.comment}</p>{/if}
				</li>{/each}
		</ol>
	{:else if !historyAvailable}<p class="help">
			O histórico de avaliações está temporariamente indisponível. Sua leitura continua disponível.
		</p>{/if}
</section>

<style>
	.feedback {
		width: min(100% - 2 * var(--atv-page-margin), var(--atv-container-reading));
		margin: 0 auto 4rem;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--atv-border);
		border-top: 3px solid var(--atv-color-gold, #c5963c);
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
	}
	h2 {
		font: 400 clamp(1.7rem, 3vw, 2.15rem)/1.2 var(--atv-font-editorial);
		margin: 0 0 1rem;
	}
	p {
		line-height: 1.65;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 1.5rem 0 0;
		min-width: 0;
	}
	legend {
		font-weight: 600;
		margin-bottom: 0.75rem;
	}
	label {
		display: block;
		margin-top: 1.25rem;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 44px;
		margin: 0.25rem 0;
		cursor: pointer;
	}
	input {
		width: 1.15rem;
		height: 1.15rem;
		flex-shrink: 0;
		accent-color: var(--atv-text-primary);
	}
	textarea {
		display: block;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		padding: 0.8rem;
		margin-top: 0.65rem;
		font: inherit;
		color: inherit;
		background: var(--atv-surface-paper, #fff8e9);
		border: 1px solid var(--atv-border);
		resize: vertical;
	}
	.help {
		color: var(--atv-text-secondary);
		font-size: 0.875rem;
	}
	button {
		min-height: 44px;
		padding: 0.85rem 1.2rem;
		font: inherit;
		color: var(--atv-surface-paper, #fff8e9);
		background: var(--atv-text-primary);
		border: 1px solid var(--atv-text-primary);
		cursor: pointer;
	}
	fieldset:disabled {
		opacity: 0.65;
	}
	button:disabled {
		cursor: wait;
	}
	:focus-visible {
		outline: 3px solid var(--atv-text-primary);
		outline-offset: 3px;
	}
	.message {
		padding: 0.85rem;
		border-left: 3px solid var(--atv-text-primary);
	}
	h3 {
		font: 400 1.4rem/1.3 var(--atv-font-editorial);
		margin-top: 2rem;
	}
	.history {
		padding-left: 1.25rem;
	}
	.history li {
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--atv-border);
		margin-bottom: 1rem;
	}
	.comment {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	time {
		font-size: 0.875rem;
	}
</style>
