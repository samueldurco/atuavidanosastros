<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	let open = $state(false);
	let variant = $state<'dialog' | 'drawer' | 'bottom-sheet'>('dialog');
</script>

<svelte:head
	><title>Atlas Essencial — laboratório de componentes</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<PageIntro
		eyebrow="Gate B · laboratório local"
		title="Atlas Essencial em código"
		description="Exemplos sintéticos para testar os contratos de interação. Esta página só está disponível no ambiente local."
	/>
	<section class="spec">
		<h2>Ações</h2>
		<div class="examples">
			<Button>Primária</Button><Button variant="secondary">Secundária</Button><Button
				variant="tertiary">Terciária</Button
			><Button variant="night">Night</Button><Button variant="gold-on-night">Gold on Night</Button
			><Button variant="destructive">Destrutiva</Button><Button disabled>Indisponível</Button
			><Button pending>Processando…</Button>
		</div>
	</section>
	<section class="spec">
		<h2>Campos e escolhas</h2>
		<div class="fields">
			<Field
				id="example-name"
				label="Nome de referência"
				help="Use apenas dados sintéticos neste laboratório."
				>{#snippet children(describedBy)}<input
						id="example-name"
						aria-describedby={describedBy}
						autocomplete="off"
					/>{/snippet}</Field
			><Field id="example-select" label="Universo"
				>{#snippet children(describedBy)}<select id="example-select" aria-describedby={describedBy}
						><option>Meu Céu</option><option>Propósito</option></select
					>{/snippet}</Field
			><Field
				id="example-error"
				label="Hora de referência"
				error="Informe uma hora entre 00:00 e 23:59."
				>{#snippet children(describedBy)}<input
						id="example-error"
						aria-invalid="true"
						aria-describedby={describedBy}
					/>{/snippet}</Field
			><Field id="example-text" label="Pergunta"
				>{#snippet children(describedBy)}<textarea
						id="example-text"
						aria-describedby={describedBy}
						rows="3"></textarea>{/snippet}</Field
			>
			<fieldset>
				<legend>Preferência sintética</legend><label
					><input type="checkbox" /> Guardar a preferência</label
				>
			</fieldset>
			<fieldset>
				<legend>Formato de leitura</legend><label
					><input type="radio" name="format" value="web" /> Web</label
				><label><input type="radio" name="format" value="pdf" /> PDF</label>
			</fieldset>
		</div>
	</section>
	<section class="spec">
		<h2>Abas e painéis</h2>
		<Tabs
			id="spec"
			label="Exemplo de abas"
			items={[
				{ id: 'facts', label: 'Fatos' },
				{ id: 'reading', label: 'Leitura' }
			]}
			>{#snippet children(selected)}<p>
					{selected === 'facts'
						? 'Fatos calculados com proveniência.'
						: 'Interpretação separada dos fatos.'}
				</p>{/snippet}</Tabs
		>
	</section>
	<section class="spec">
		<h2>Estados</h2>
		<div class="states">
			{#each ['empty', 'loading', 'error', 'success', 'attention', 'info'] as kind (kind)}<StatePanel
					kind={kind as 'empty' | 'loading' | 'error' | 'success' | 'attention' | 'info'}
					title={`Estado: ${kind}`}
					description="Mensagem específica, contexto preservado e próximo passo visível."
				/>{/each}
		</div>
	</section>
	<section class="spec">
		<h2>Famílias de cartões</h2>
		<div class="states">
			{#each ['editorial', 'product', 'attention', 'data', 'result'] as kind (kind)}<Card
					variant={kind as 'editorial' | 'product' | 'attention' | 'data' | 'result'}
					title={`Cartão: ${kind}`}
					eyebrow="Exemplo sintético"
					><p>Conteúdo com hierarquia, sem métricas ou ofertas fictícias.</p></Card
				>{/each}
		</div>
	</section>
	<section class="spec">
		<h2>Diálogo e painéis sobrepostos</h2>
		<div class="examples">
			{#each ['dialog', 'drawer', 'bottom-sheet'] as mode (mode)}<Button
					variant="secondary"
					onclick={() => {
						variant = mode as typeof variant;
						open = true;
					}}>Abrir {mode}</Button
				>{/each}
		</div>
	</section>
	<section class="spec">
		<h2>Dados e progresso</h2>
		<nav aria-label="Caminho de exemplo">
			<a href="/">Início</a> / <span aria-current="page">Laboratório</span>
		</nav>
		<div class="table-region" role="region" aria-label="Tabela de demonstração">
			<table class="data-table">
				<caption>Estados do exemplo local</caption><thead
					><tr><th scope="col">Etapa</th><th scope="col">Estado</th></tr></thead
				><tbody><tr><th scope="row">Contrato</th><td>Em validação</td></tr></tbody>
			</table>
		</div>
		<label for="spec-progress">Uma de duas etapas demonstrativas</label><progress
			id="spec-progress"
			value="1"
			max="2">1 de 2</progress
		>
	</section>
</ContentShell>
<Dialog id="spec-dialog" bind:open {variant} title="Preferências de exemplo"
	><p>Este diálogo permite testar foco, Escape e retorno ao acionador.</p>
	<Field id="dialog-input" label="Nome sintético"
		>{#snippet children(describedBy)}<input
				id="dialog-input"
				aria-describedby={describedBy}
			/>{/snippet}</Field
	>
	<div class="dialog-action"><Button onclick={() => (open = false)}>Concluir</Button></div></Dialog
>

<style>
	.spec {
		margin-block: 3rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--atv-border);
	}
	h2 {
		font: 500 2rem var(--atv-font-display);
	}
	.examples {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.fields,
	.states {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
	}
	fieldset {
		min-width: 0;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-sm);
	}
	fieldset label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 48px;
	}
	progress {
		display: block;
		margin-top: 1rem;
	}
	.dialog-action {
		margin-top: 1.5rem;
	}
	@media (max-width: 767px) {
		.fields,
		.states {
			grid-template-columns: 1fr;
		}
	}
</style>
