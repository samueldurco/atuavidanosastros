<script lang="ts">
	import { goto } from '$app/navigation';
	import { productCatalog, workflowFor } from '@atv/domain';
	import ReadingShell from '$lib/components/shells/ReadingShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { isUuid } from '$lib/library-result';
	import { parseProductRun, runLabels, type WorkflowReaderData } from '$lib/product-run';
	let { data }: { data: WorkflowReaderData } = $props();
	let busy = $state<'reprocess' | 'delete' | 'download' | null>(null);
	let failure = $state('');
	let downloadFormat = $state<'web' | 'pdf' | 'svg' | 'card'>('web');
	let cardSection = $state(0);
	$effect(() => {
		void data.run.id;
		cardSection = 0;
	});
	const cardEligible = $derived(
		productCatalog.some(
			(entry) => entry.id === data.run.productId && entry.delivery.includes('web')
		)
	);
	let confirmDelete = $state(false);
	const product = $derived(workflowFor(data.run.productId));
	const svgEligible = $derived(
		!!data.run.cartography &&
			productCatalog.some(
				(entry) => entry.id === data.run.productId && entry.delivery.includes('svg')
			)
	);
	const pdfEligible = $derived(
		productCatalog.some(
			(entry) => entry.id === data.run.productId && entry.delivery.includes('pdf')
		)
	);
	const date = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'America/Sao_Paulo'
		}).format(new Date(value));
	const explanation = $derived(
		data.run.state === 'FAILED'
			? 'Esta tentativa foi interrompida. O registro permanece disponível; uma nova tentativa não sobrescreve esta versão.'
			: data.run.state === 'CANCELLED'
				? 'Esta tentativa foi encerrada sem entregar uma leitura.'
				: 'O registro está preservado. A interpretação só será exibida após as verificações de cálculo, qualidade editorial e segurança.'
	);
	async function download(format: 'web' | 'pdf' | 'svg' | 'card') {
		if (busy || data.synthetic || !data.run.released) return;
		busy = 'download';
		downloadFormat = format;
		failure = '';
		try {
			const section = cardSection;
			const response = await fetch(
				`/api/workflows/${data.run.id}/download?format=${format}${format === 'card' ? `&section=${section}` : ''}`
			);
			if (
				!response.ok ||
				!response.headers
					.get('content-type')
					?.startsWith(
						format === 'pdf'
							? 'application/pdf'
							: format === 'svg' || format === 'card'
								? 'image/svg+xml'
								: 'text/html'
					)
			) {
				failure =
					response.status === 401
						? 'Entre novamente para baixar seu relatório.'
						: response.status === 404 || response.status === 409
							? format === 'card'
								? 'Este card não está disponível. Atualize o estado do registro ou consulte o relatório completo.'
								: 'Este relatório não está disponível para download. Atualize o estado do registro.'
							: 'Não foi possível baixar o relatório. Tente novamente; seu registro permanece salvo.';
				return;
			}
			const objectUrl = URL.createObjectURL(await response.blob());
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = `atv-${data.run.id}-r${data.run.revision}${format === 'card' ? `-card-${section + 1}.svg` : `.${format === 'web' ? 'html' : format}`}`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
		} catch {
			failure =
				'Não foi possível baixar o relatório. Tente novamente; seu registro permanece salvo.';
		} finally {
			busy = null;
		}
	}
	async function act(action: 'reprocess' | 'delete') {
		if (busy || data.synthetic) return;
		busy = action;
		failure = '';
		try {
			const keyName = `atv-reprocess:${data.run.id}`;
			let requestKey = sessionStorage.getItem(keyName);
			if (action === 'reprocess' && (!requestKey || !isUuid(requestKey))) {
				requestKey = crypto.randomUUID();
				sessionStorage.setItem(keyName, requestKey);
			}
			const response = await fetch(
				`/api/workflows/${data.run.id}${action === 'reprocess' ? '/reprocess' : ''}`,
				{
					method: action === 'delete' ? 'DELETE' : 'POST',
					headers: { 'content-type': 'application/json' },
					...(action === 'reprocess' ? { body: JSON.stringify({ requestKey }) } : {})
				}
			);
			if (!response.ok) {
				failure =
					response.status === 401
						? 'Entre novamente para continuar. Seu registro não foi alterado.'
						: response.status === 409
							? 'O reprocessamento não está liberado neste momento. A versão original permanece intacta.'
							: response.status === 403
								? 'Seu acesso não permite esta ação agora.'
								: response.status === 429
									? 'O limite de tentativas foi atingido. Aguarde antes de tentar novamente.'
									: 'Não foi possível confirmar a ação. Você pode tentar novamente com segurança.';
				return;
			}
			if (action === 'delete') {
				sessionStorage.removeItem(keyName);
				await goto('/biblioteca', { invalidateAll: true });
				return;
			}
			const created = await response.json();
			if (!created || typeof created !== 'object' || !('runId' in created))
				throw new Error('invalid_response');
			const { runId } = created;
			if (typeof runId !== 'string' || !isUuid(runId)) throw new Error('invalid_response');
			const recovered = await fetch(`/api/workflows/${runId}`);
			if (!recovered.ok) throw new Error('recovery_unavailable');
			const payload = await recovered.json();
			const run =
				payload && typeof payload === 'object' && 'run' in payload
					? parseProductRun(payload.run)
					: null;
			if (!run?.libraryItemId || run.id !== runId) throw new Error('recovery_unavailable');
			// Keep the key for this source version: retry/reload always recovers the same new version.
			await goto(`/biblioteca/${run.libraryItemId}`, { invalidateAll: true });
		} catch {
			failure =
				'Não foi possível confirmar a ação. Tente novamente; a mesma solicitação será recuperada sem duplicação.';
		} finally {
			busy = null;
		}
	}
</script>

<div data-stitch="MEM-03 SH-03">
	<ReadingShell
		contents={[
			...(data.run.released
				? [
						{ id: 'leitura', label: 'Sua leitura' },
						{ id: 'origem', label: 'Base e limites' }
					]
				: []),
			{ id: 'historico', label: 'Histórico desta versão' }
		]}
	>
		{#snippet heading()}
			<nav aria-label="Caminho do resultado">
				<a href="/biblioteca">Biblioteca</a> / <span aria-current="page">Seu registro</span>
			</nav>
			{#if data.synthetic}<p class="fixture-notice">
					Referência sintética local — não é uma leitura homologada nem pertence a uma pessoa.
				</p>{/if}
			<PageIntro
				eyebrow="Seu arquivo pessoal"
				title={data.item.title}
				description={`Guardado em ${date(data.run.createdAt)}. Cada versão preserva seu próprio histórico.`}
			/>
		{/snippet}
		{#snippet actions()}
			<div class="actions-panel">
				<p class="eyebrow">Continuar</p>
				<Button href="/biblioteca" variant="secondary">Voltar à Biblioteca</Button>
				{#if data.run.released}
					<Button
						onclick={() => download('web')}
						disabled={!!busy || data.synthetic}
						pending={busy === 'download' && downloadFormat === 'web'}
						variant="secondary">Baixar relatório web</Button
					>
					{#if svgEligible}
						<Button
							onclick={() => download('svg')}
							disabled={!!busy || !!data.synthetic}
							pending={busy === 'download' && downloadFormat === 'svg'}
							variant="secondary">Baixar cartografia SVG</Button
						>
					{/if}
					{#if pdfEligible}
						<Button
							onclick={() => download('pdf')}
							disabled={!!busy || data.synthetic}
							pending={busy === 'download' && downloadFormat === 'pdf'}
							variant="secondary">Baixar PDF</Button
						>
					{/if}
					{#if cardEligible && data.run.editorial}
						<div class="card-choice">
							<label for="card-section">Seção do card</label>
							<select id="card-section" bind:value={cardSection} disabled={!!busy}>
								{#each data.run.editorial.sections as section, index (index)}
									<option value={index}>{index + 1}. {section.title}</option>
								{/each}
							</select>
						</div>
						<Button
							onclick={() => download('card')}
							disabled={!!busy || data.synthetic}
							pending={busy === 'download' && downloadFormat === 'card'}
							variant="secondary">Baixar card SVG</Button
						>
						<p>
							Uma seção integral com suas bases e todos os limites. Não substitui a leitura
							completa. Conteúdos extensos podem não caber no card.
						</p>
					{/if}
					<p>
						Relatório para ler offline. O acesso será verificado novamente ao baixar. Cópias
						baixadas não são removidas ao excluir o registro.
					</p>
				{/if}
				<Button
					variant="secondary"
					disabled={!data.run.canReprocess || !!busy || data.synthetic}
					pending={busy === 'reprocess'}
					onclick={() => act('reprocess')}>Reprocessar em nova versão</Button
				>
				<p>
					{product?.kind === 'tarot'
						? 'O reprocessamento preserva as cartas já registradas. Não é um novo sorteio.'
						: 'A nova tentativa usa os dados já registrados, sem alterar esta versão.'}
				</p>
				{#if !data.run.canReprocess}<p>
						Reprocessamento indisponível para o estado ou acesso atual.
					</p>{/if}
				<Button variant="tertiary" onclick={() => location.reload()} disabled={!!busy}
					>Atualizar estado</Button
				>
				{#if confirmDelete}
					<p id="delete-warning">
						Excluir remove esta versão e seu histórico. Outras versões reprocessadas continuam na
						Biblioteca.
					</p>
					<Button
						variant="destructive"
						aria-describedby="delete-warning"
						pending={busy === 'delete'}
						disabled={!!busy || data.synthetic}
						onclick={() => act('delete')}>Confirmar exclusão</Button
					>
					<Button variant="tertiary" disabled={!!busy} onclick={() => (confirmDelete = false)}
						>Manter registro</Button
					>
				{:else}<Button
						variant="tertiary"
						disabled={!!busy || data.synthetic}
						onclick={() => (confirmDelete = true)}>Excluir esta versão</Button
					>{/if}
			</div>
		{/snippet}
		{#if failure}<StatePanel kind="error" title="Ação não confirmada" description={failure} />{/if}
		{#if data.run.released && data.run.editorial && data.run.calculation}
			<section id="leitura" aria-labelledby="reading-title">
				<p class="eyebrow">Leitura preservada</p>
				<h2 id="reading-title">{data.run.editorial.title}</h2>
				{#each data.run.editorial.sections as section, index (index)}<article>
						<h3>{section.title}</h3>
						<p class="editorial">{section.text}</p>
						<p class="evidence">Base: {section.evidence.join(' · ')}</p>
					</article>{/each}
			</section>
			<section id="origem" aria-labelledby="source-title">
				<h2 id="source-title">Base e limites</h2>
				<dl>
					{#each data.run.calculation.facts as fact (fact.id)}<div>
							<dt>{fact.id}</dt>
							<dd>{fact.display}<small>{fact.source}</small></dd>
						</div>{/each}
				</dl>
				<p>Método: {data.run.calculation.version}. Edição: {data.run.editorial.version}.</p>
				{#each [...data.run.calculation.limits, ...data.run.editorial.limits] as limit, index (index)}<p
					>
						{limit}
					</p>{/each}
				<p>
					Esta leitura é simbólica e não determina suas escolhas. Não substitui orientação
					profissional.
				</p>
			</section>
		{:else}<StatePanel
				kind={data.run.state === 'FAILED' ? 'error' : 'info'}
				title={data.run.state === 'READY'
					? 'Leitura temporariamente indisponível'
					: runLabels[data.run.state]}
				description={explanation}
			/>{/if}
		<section id="historico" aria-labelledby="history-title">
			<h2 id="history-title">Histórico desta versão</h2>
			{#if data.run.parentId}<p>
					Esta é uma nova versão de um registro anterior. A versão de origem não foi sobrescrita.
				</p>{/if}
			<ol>
				{#each data.run.history as event (event.revision)}<li>
						<strong>{runLabels[event.state]}</strong><time datetime={event.at}
							>{date(event.at)}</time
						>
					</li>{/each}
			</ol>
			<p>
				Relatórios web, PDF, cards e cartografia SVG elegíveis são gerados ao baixar, após nova
				verificação de acesso. Outros formatos permanecem indisponíveis.
			</p>
		</section>
	</ReadingShell>
</div>

<style>
	nav {
		font-size: 0.85rem;
		margin-bottom: 1.5rem;
	}
	.fixture-notice {
		padding: 1rem;
		border: 1px dashed var(--atv-border);
	}
	.actions-panel {
		display: grid;
		gap: 1rem;
	}
	.actions-panel p,
	.evidence,
	small {
		font-size: 0.85rem;
		color: var(--atv-text-secondary);
	}
	.card-choice {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
	}
	.card-choice label {
		font-size: 0.85rem;
	}
	.card-choice select {
		width: 100%;
		min-width: 0;
		padding: 0.75rem;
		border: 1px solid var(--atv-border);
		border-radius: 0.25rem;
		color: var(--atv-text-primary);
		background: var(--atv-surface-card);
		font: inherit;
		font-size: 0.85rem;
	}
	section {
		scroll-margin-top: 2rem;
		margin-bottom: 3rem;
		overflow-wrap: anywhere;
	}
	h2 {
		margin: 0 0 1.5rem;
	}
	.editorial {
		white-space: pre-wrap;
	}
	article {
		margin-block: 2rem;
	}
	dl > div {
		padding-block: 1rem;
		border-bottom: 1px solid var(--atv-border);
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0.4rem 0 0;
	}
	small,
	time {
		display: block;
	}
	ol {
		padding-left: 1.25rem;
	}
	li {
		padding: 0.7rem 0;
	}
	time {
		font-size: 0.85rem;
		margin-top: 0.3rem;
	}
</style>
