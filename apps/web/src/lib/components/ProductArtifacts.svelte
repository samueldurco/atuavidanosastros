<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { artifactFormats, type ArtifactManifest } from '@atv/domain';
	import type { ProductRunView } from '$lib/product-run';
	import {
		ArtifactRecoveryError,
		listStoredArtifacts,
		recoverStoredArtifact
	} from '$lib/product-artifact-client';
	import Button from './ui/Button.svelte';
	let { run, disabled = false }: { run: ProductRunView; disabled?: boolean } = $props();
	let artifacts = $state<ArtifactManifest[] | null>(null);
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);
	let controller: AbortController | undefined;
	let root: HTMLElement;
	let alive = true;
	onDestroy(() => {
		alive = false;
		controller?.abort();
	});
	const labels = { web: 'Relatório web', pdf: 'PDF', svg: 'Cartografia SVG', card: 'Card SVG' };
	const label = (v: ArtifactManifest) =>
		`${labels[v.format]}${v.format === 'card' ? ` — seção ${v.section + 1}` : ''}`;
	async function consult(artifact?: ArtifactManifest) {
		if (busy || disabled) return;
		const trigger = document.activeElement;
		busy = true;
		message = '';
		failed = false;
		controller = new AbortController();
		const timeout = setTimeout(() => controller?.abort(), 30000);
		try {
			if (!artifact) {
				artifacts = null;
				const result = await listStoredArtifacts(run, fetch, controller.signal);
				if (alive) artifacts = result;
			} else {
				const blob = await recoverStoredArtifact(run, artifact, fetch, controller.signal);
				if (!alive) return;
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement('a');
				anchor.href = url;
				anchor.download = `atv-${run.id}-r${run.revision}-${artifact.id}.${artifactFormats[artifact.format].extension}`;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				setTimeout(() => URL.revokeObjectURL(url), 1000);
				message = 'Arquivo verificado e enviado ao navegador para download.';
			}
		} catch (error) {
			if (alive) {
				artifacts = null;
				failed = true;
				message =
					error instanceof ArtifactRecoveryError
						? error.message
						: 'A consulta foi interrompida. Tente novamente; seu registro permanece salvo.';
			}
		} finally {
			clearTimeout(timeout);
			if (alive) {
				busy = false;
				await tick();
				if (alive) {
					const focus =
						trigger instanceof HTMLElement && trigger.isConnected
							? trigger
							: root?.querySelector('button');
					focus?.focus({ preventScroll: true });
				}
			}
		}
	}
</script>

<section bind:this={root} id="arquivos" aria-labelledby="artifacts-title" aria-busy={busy}>
	<p class="eyebrow">Recuperar sem gerar de novo</p>
	<h2 id="artifacts-title">Arquivos guardados</h2>
	<p>
		Consulte os arquivos efetivamente armazenados desta versão. Baixar um relatório gerado sob
		demanda não o adiciona automaticamente aqui.
	</p>
	<Button variant="secondary" onclick={() => consult()} {disabled} pending={busy}
		>Consultar arquivos guardados</Button
	>
	{#if disabled}<p>Consulta indisponível neste estado.</p>{/if}
	<div aria-live="polite" aria-atomic="true">
		{#if message}<p class:error={failed}>{message}</p>{/if}
		{#if artifacts?.length === 0}<p>
				Nenhum arquivo guardado disponível para esta versão e acesso. Isso não exclui o registro nem
				impede os downloads elegíveis sob demanda.
			</p>{/if}
	</div>
	{#if artifacts?.length}
		<ul aria-label="Arquivos disponíveis">
			{#each artifacts as artifact (artifact.id)}
				<li>
					<div>
						<h3>{label(artifact)}</h3>
						<p>
							Versão {artifact.revision} · {artifact.bytes < 1024
								? `${artifact.bytes} bytes`
								: `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(artifact.bytes / 1024)} KB`}
						</p>
						<p>
							Guardado em <time datetime={artifact.createdAt}
								>{new Intl.DateTimeFormat('pt-BR', {
									dateStyle: 'medium',
									timeStyle: 'short',
									timeZone: 'America/Sao_Paulo'
								}).format(new Date(artifact.createdAt))}</time
							>
						</p>
					</div>
					<Button variant="secondary" disabled={busy || disabled} onclick={() => consult(artifact)}
						>Recuperar {label(artifact)}</Button
					>
				</li>
			{/each}
		</ul>
	{/if}
	<p class="privacy">
		O acesso e a integridade são verificados a cada recuperação. Excluir o registro remove seus
		arquivos guardados, mas não as cópias já baixadas.
	</p>
</section>

<style>
	section {
		margin-block: 3rem;
		scroll-margin-top: 6rem;
		overflow-wrap: anywhere;
	}
	h2 {
		margin-block: 0.5rem 1rem;
	}
	p {
		margin-block: 0.75rem;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0;
	}
	li {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		padding-block: 1.5rem;
		border-top: 1px solid var(--atv-border);
	}
	h3 {
		font-size: 1.1rem;
		margin: 0;
	}
	li p,
	.privacy {
		font-size: 0.85rem;
		color: var(--atv-text-secondary);
	}
	.error {
		border-left: 3px solid var(--atv-text-primary);
		padding-left: 1rem;
	}
	@media (max-width: 600px) {
		li {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
