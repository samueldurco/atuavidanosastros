<script lang="ts">
	import { tick } from 'svelte';
	import { continuityRequest } from '$lib/continuity-management';
	import { parseContinuityAccess, type ContinuityAccess } from '$lib/product-continuity-access';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';

	let snapshot = $state<ContinuityAccess | null>(null);
	let busy = $state(false);
	let failure = $state('');
	let status = $state('');
	let confirmation = $state(false);
	let visibleCount = $state(25);
	let recoveryButton: HTMLDivElement;
	const date = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'UTC' });

	async function read(
		message = 'Registros consultados. Este é o estado disponível nesta consulta.'
	) {
		if (busy) return;
		busy = true;
		snapshot = null;
		failure = '';
		status = '';
		visibleCount = 25;
		try {
			const value = parseContinuityAccess(await continuityRequest('access', {}));
			if (!value) throw new Error('invalid_access');
			snapshot = value;
			status = message;
		} catch {
			failure =
				'Não foi possível consultar os acessos. Consulte novamente para recuperar o estado antes de decidir pela limpeza.';
		} finally {
			busy = false;
		}
	}
	async function clear() {
		if (busy || !snapshot || !confirmation) return;
		confirmation = false;
		busy = true;
		snapshot = null;
		failure = '';
		status = '';
		let deleted: number;
		try {
			const value = await continuityRequest('clear-access', {});
			if (
				!value ||
				typeof value !== 'object' ||
				Array.isArray(value) ||
				Object.keys(value).length !== 1 ||
				!('deleted' in value) ||
				typeof value.deleted !== 'number' ||
				!Number.isInteger(value.deleted) ||
				value.deleted < 0 ||
				value.deleted > 2147483647
			)
				throw new Error('invalid_receipt');
			deleted = value.deleted;
		} catch {
			busy = false;
			failure =
				'Não foi possível confirmar a limpeza. Ela pode ter ocorrido. Consulte os acessos antes de decidir novamente; não repetiremos a limpeza automaticamente.';
			await tick();
			recoveryButton?.querySelector('button')?.focus();
			return;
		}
		busy = false;
		await read(
			`Limpeza confirmada: ${deleted} ${deleted === 1 ? 'registro removido' : 'registros removidos'}. Consulta atualizada; novos registros podem aparecer depois da limpeza.`
		);
		await tick();
		recoveryButton?.querySelector('button')?.focus();
	}
</script>

<section class="access" aria-labelledby="continuity-access-title" aria-busy={busy}>
	<p class="eyebrow">Privacidade · continuidade</p>
	<h2 id="continuity-access-title">Acessos às suas seleções</h2>
	<p>
		Consulte os registros de seleção de referências para contexto. Eles mostram identificadores,
		revisões e datas, sem o conteúdo das notas ou leituras.
	</p>
	<p class="notice">
		Esses registros mostram quais referências foram selecionadas. O uso automático em novas leituras
		ainda está indisponível.
	</p>
	<div class="actions">
		<div bind:this={recoveryButton}>
			<Button variant="secondary" disabled={busy} onclick={() => read()}
				>{busy ? 'Aguarde…' : 'Consultar acessos'}</Button
			>
		</div>
		{#if snapshot}<Button
				variant="tertiary"
				disabled={busy}
				onclick={() => {
					snapshot = null;
					status = '';
				}}>Ocultar registros</Button
			>
			<Button variant="destructive" disabled={busy} onclick={() => (confirmation = true)}
				>Limpar registros de acesso</Button
			>{/if}
	</div>
	{#if failure}<p role="alert">{failure}</p>{/if}
	<p role="status">{status}</p>
	{#if snapshot}
		<p>
			{snapshot.events.length}
			{snapshot.events.length === 1 ? 'registro disponível' : 'registros disponíveis'}. Datas em
			UTC. Registros expirados não aparecem; isso não comprova descarte físico. Excluir uma nota ou
			sua leitura também remove os registros de acesso vinculados.
		</p>
		{#if !snapshot.events.length}<p class="notice">
				Nenhum registro de acesso disponível nesta consulta. Isso não comprova ausência de seleções
				anteriores.
			</p>{/if}
		<ol aria-label="Registros de seleção">
			{#each snapshot.events.slice(0, visibleCount) as event (event.id)}
				<li>
					<h3>Seleção registrada · {date(event.createdAt)} UTC</h3>
					<p>
						{event.items.length}
						{event.items.length === 1 ? 'referência' : 'referências'} · consentimento na revisão {event.consentRevision}.
						Visível até {date(event.expiresAt)} UTC.
					</p>
					<details>
						<summary>Ver identificadores e revisões</summary>
						<p>Registro: <code>{event.id}</code></p>
						<ul>
							{#each event.items as item (item.itemId)}<li>
									<p>Referência: <code>{item.itemId}</code> · revisão {item.itemRevision}</p>
									<p>Leitura: <code>{item.runId}</code> · revisão {item.runRevision}</p>
								</li>{/each}
						</ul>
					</details>
				</li>
			{/each}
		</ol>
		{#if visibleCount < snapshot.events.length}<Button
				variant="secondary"
				onclick={() => (visibleCount += 25)}>Mostrar mais registros</Button
			>{/if}
	{/if}
</section>
<Dialog id="continuity-access-clear" title="Limpar registros de acesso?" bind:open={confirmation}>
	<p>
		Esta ação apaga todos os seus registros de acesso ainda armazenados, inclusive expirados e os
		criados após a última consulta. Não é possível desfazer.
	</p>
	<p>
		Suas notas, leituras e consentimentos permanecem como estão. Limpar não revoga a autorização nem
		impede novos registros. Para revogar, use os controles de continuidade na Biblioteca.
	</p>
	<div class="actions">
		<Button variant="secondary" onclick={() => (confirmation = false)}
			>Manter registros de acesso</Button
		><Button variant="destructive" disabled={busy} onclick={clear}
			>Confirmar limpeza dos acessos</Button
		>
	</div>
</Dialog>

<style>
	.access {
		margin-block: 3rem;
		padding: clamp(1rem, 3vw, 2rem);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface-card);
		overflow-wrap: anywhere;
	}
	h2 {
		font: 500 clamp(2rem, 4vw, 2.875rem)/1.15 var(--atv-font-display);
		margin: 0.75rem 0;
	}
	h3 {
		font-size: 1.1rem;
	}
	p {
		max-width: 45rem;
		line-height: 1.6;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.notice {
		padding: 1rem;
		background: var(--atv-surface-muted);
		border-left: 3px solid var(--atv-text-primary);
	}
	ol {
		padding: 0;
		list-style: none;
	}
	ol > li {
		border-top: 1px solid var(--atv-border);
		padding-block: 1rem;
	}
	ul {
		padding-inline-start: 1rem;
	}
	summary {
		min-height: 44px;
		padding-block: 0.75rem;
		cursor: pointer;
	}
	summary:focus-visible {
		outline: 3px solid var(--atv-focus);
		outline-offset: 3px;
	}
	code {
		font-size: 0.85em;
	}
</style>
