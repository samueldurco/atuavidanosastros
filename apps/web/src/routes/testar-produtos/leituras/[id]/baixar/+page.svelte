<script lang="ts">
	import { onMount } from 'svelte';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let busy = $state(false),
		message = $state('Preparando seu PDF completo…'),
		url = $state('');
	async function prepare() {
		if (busy) return;
		busy = true;
		message = 'Preparando seu PDF completo neste navegador…';
		try {
			const { trialPdf } = await import('$lib/trials/pdf');
			const bytes = await trialPdf(data.saved);
			if (url) URL.revokeObjectURL(url);
			url = URL.createObjectURL(
				new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
			);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${data.saved.product_id}-${data.saved.id}.pdf`;
			link.click();
			message = 'PDF pronto. Se o download não começou, use o link abaixo.';
		} catch {
			message =
				'Não foi possível preparar o PDF neste navegador. Sua leitura continua salva. Tente novamente ou guarde a versão em texto.';
		} finally {
			busy = false;
		}
	}
	onMount(() => {
		void prepare();
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});
</script>

<svelte:head
	><title>Baixar {data.saved.reading.title}</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<a href={`/testar-produtos/leituras/${data.saved.id}`}>← Voltar à sua leitura</a>
	<h1>{data.saved.reading.title}</h1>
	<p role="status" aria-live="polite">{message}</p>
	{#if url}<p>
			<a href={url} download={`${data.saved.product_id}-${data.saved.id}.pdf`}
				>Baixar PDF completo</a
			>
		</p>{/if}
	<button onclick={prepare} disabled={busy}>{busy ? 'Preparando…' : 'Preparar novamente'}</button>
	<p>
		<a href={`/api/private-trials/${data.saved.id}/download?format=txt`}
			>Guardar uma cópia em texto</a
		>
	</p>
</ContentShell>
