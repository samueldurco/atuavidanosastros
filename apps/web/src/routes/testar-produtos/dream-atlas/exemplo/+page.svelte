<script lang="ts">
	import { onMount } from 'svelte';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import ReadingExperience from '$lib/components/ReadingExperience.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let busy = $state(false),
		message = $state(''),
		downloadUrl = $state('');
	onMount(() => () => {
		if (downloadUrl) URL.revokeObjectURL(downloadUrl);
	});
	async function download() {
		if (busy) return;
		busy = true;
		message = 'Preparando o PDF da demonstração…';
		try {
			const { dreamAtlasExamplePdf } = await import('$lib/trials/dream-atlas-example-pdf');
			const bytes = await dreamAtlasExamplePdf(data.saved);
			if (downloadUrl) URL.revokeObjectURL(downloadUrl);
			downloadUrl = URL.createObjectURL(
				new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
			);
			message = 'Seu PDF de demonstração está pronto.';
		} catch {
			message = 'Não foi possível preparar o PDF. Tente novamente.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>Demonstração do Diário de Sonhos — ATVNA</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<a href="/testar-produtos/dream-atlas">← Voltar ao Diário de Sonhos</a>
	<p class="eyebrow">Demonstração privada · relatos fictícios</p>
	<h1>Veja como fica a análise dos 30 dias</h1>
	<p class="explanation">
		Este exemplo reúne oito sonhos inventados entre 1 e 30 de setembro. Ele permite avaliar a
		leitura e o PDF agora. Nenhum relato é seu, nenhum diário foi iniciado e nada será salvo na sua
		biblioteca. No diário real, a análise só fica disponível após os 30 dias.
	</p>
	<ReadingExperience saved={data.saved} initial={{ chapter: 0, bookmarks: [] }} ephemeral />
	<div class="downloads">
		<button class="atv-button" onclick={download} disabled={busy}
			>{busy ? 'Preparando…' : 'Preparar PDF de demonstração'}</button
		>
		{#if downloadUrl}<a
				class="atv-button"
				href={downloadUrl}
				download="diario-sonhos-demonstracao-ficticia.pdf">Baixar PDF de demonstração</a
			>{/if}
		<p role="status" aria-live="polite">{message}</p>
	</div>
</ContentShell>

<style>
	.explanation {
		max-width: 64ch;
		line-height: 1.7;
	}
	.downloads {
		margin-block: 2rem;
	}
	.downloads .atv-button {
		margin: 0.5rem 0.75rem 0.5rem 0;
	}
</style>
