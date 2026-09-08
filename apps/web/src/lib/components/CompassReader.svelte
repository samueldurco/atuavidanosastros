<script lang="ts">
	import ReadingShell from '$lib/components/shells/ReadingShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { LibraryReaderData } from '$lib/library-result';
	let { data }: { data: LibraryReaderData } = $props();
	const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });
	const date = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(
			new Date(value)
		);
</script>

<div data-stitch="MEM-03 SH-03">
	<ReadingShell
		contents={data.state === 'ready'
			? [
					{ id: 'posicao', label: 'Posição calculada' },
					{ id: 'origem', label: 'Origem e método' },
					{ id: 'limites', label: 'Escopo e limites' }
				]
			: []}
	>
		{#snippet heading()}
			<nav class="breadcrumb" aria-label="Caminho do resultado">
				<a href="/biblioteca">Biblioteca</a><span aria-hidden="true">/</span><span
					aria-current="page">Resultado salvo</span
				>
			</nav>
			{#if data.synthetic}<p class="fixture-notice">
					Referência sintética local — não pertence a uma pessoa e não foi salva no banco.
				</p>{/if}
			<PageIntro
				eyebrow="Seu arquivo pessoal · Propósito"
				title={data.item?.title ?? 'Resultado salvo'}
				description={data.item
					? `Guardado em ${date(data.item.created_at)}. Este arquivo recupera a posição calculada que você escolheu salvar.`
					: 'Um lugar para reencontrar seu resultado, com sua origem e seus limites.'}
			/>
		{/snippet}
		{#snippet actions()}
			<div class="actions-panel">
				<p class="eyebrow">Continuar</p>
				<Button href="/biblioteca" variant="secondary">Voltar à Biblioteca</Button><a
					href="/bussola-de-carreira">Fazer outro cálculo →</a
				>
				<p>Um novo cálculo não altera automaticamente este resultado salvo.</p>
			</div>
		{/snippet}
		{#if data.state === 'ready' && data.result}
			<section id="posicao" aria-labelledby="position-heading">
				<p class="eyebrow">01 · O dado preservado</p>
				<h2 id="position-heading">Seu Meio do Céu</h2>
				<div class="position-card">
					<p class="sign">{data.result.sign}</p>
					<p class="degree">{number.format(data.result.degree)}° no signo</p>
					<dl>
						<div>
							<dt>Longitude eclíptica</dt>
							<dd>{number.format(data.result.midheaven)}°</dd>
						</div>
						<div>
							<dt>Natureza do resultado</dt>
							<dd>Cálculo determinístico</dd>
						</div>
					</dl>
				</div>
				{#if data.result.status === 'not-applicable'}<StatePanel
						kind="attention"
						title="Há uma limitação de método."
						description={data.result.warning ??
							'O sistema de casas solicitado não foi aplicável. Consulte o método antes de interpretar este resultado.'}
					/>{/if}
				<p class="editorial">
					Esta é a posição preservada no seu arquivo, não um novo cálculo. Signo e grau descrevem o
					ponto encontrado pelo motor; não determinam profissão, renda ou destino.
				</p>
			</section>
			<section id="origem" aria-labelledby="source-heading">
				<p class="eyebrow">02 · Proveniência</p>
				<h2 id="source-heading">Origem e método</h2>
				<dl class="provenance">
					<div>
						<dt>Motor</dt>
						<dd>{data.result.provenance.provider}</dd>
					</div>
					<div>
						<dt>Versão registrada</dt>
						<dd>{data.result.provenance.providerVersion}</dd>
					</div>
					{#if data.result.provenance.calculatedAt}<div>
							<dt>Data do cálculo</dt>
							<dd>{date(data.result.provenance.calculatedAt)}</dd>
						</div>{/if}
				</dl>
				<p class="editorial">
					A precisão da hora e das coordenadas usadas influencia o resultado. Este arquivo não
					guarda os campos brutos de nascimento; por isso, uma conferência com outros dados pede um
					novo cálculo.
				</p>
				<a href="/metodo">Conhecer o método e suas limitações →</a>
			</section>
			<section id="limites" aria-labelledby="limits-heading">
				<p class="eyebrow">03 · Escopo</p>
				<h2 id="limits-heading">Um ponto, não o mapa inteiro.</h2>
				<p class="editorial">
					Este resultado contém apenas o Meio do Céu. Não inclui síntese natal, recomendação de
					carreira ou interpretação individual por inteligência artificial.
				</p>
				<p class="editorial">
					Uma leitura de propósito exige relacionar fatores e contexto. Até que essa camada esteja
					validada, o arquivo mantém separados o dado calculado e qualquer interpretação.
				</p>
				<a href="/meio-do-ceu">Ler a introdução ao Meio do Céu →</a>
			</section>
		{:else if data.state === 'unsupported'}<StatePanel
				title="Este formato ainda não tem um leitor disponível."
				description="O item permanece na sua Biblioteca. Você pode voltar ao acervo para consultar os outros resultados."
			/>
		{:else}<StatePanel
				kind="error"
				title="Não foi possível recuperar este resultado."
				description="O item não foi apagado por esta tentativa. Volte à Biblioteca e tente novamente em alguns instantes."
			/>{/if}
	</ReadingShell>
</div>

<style>
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		font-size: 0.8125rem;
		margin-bottom: 1.5rem;
	}
	section {
		scroll-margin-top: 2rem;
		padding-bottom: 2.5rem;
		margin-bottom: 2.5rem;
		border-bottom: 1px solid var(--atv-border);
	}
	h2 {
		font: 500 clamp(1.8rem, 3vw, 2.5rem)/1.2 var(--atv-font-display);
		margin: 0.75rem 0 1.5rem;
	}
	.position-card {
		padding: clamp(1.5rem, 3vw, 2.5rem);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface-muted);
		margin-bottom: 1.5rem;
	}
	.sign {
		margin: 0;
		font: 500 clamp(2.5rem, 5vw, 4rem)/1.1 var(--atv-font-display);
	}
	.degree {
		font-size: 1rem;
		color: var(--atv-text-secondary);
		margin: 1rem 0 2rem;
	}
	dl {
		margin: 0;
	}
	dl > div {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 1.5rem;
		padding-block: 0.8rem;
		border-top: 1px solid var(--atv-border);
	}
	dt {
		color: var(--atv-text-secondary);
		font-size: 0.875rem;
	}
	dd {
		margin: 0;
		font-size: 0.875rem;
		overflow-wrap: anywhere;
	}
	.editorial {
		font: 400 1.1875rem/1.7 var(--atv-font-editorial);
	}
	.actions-panel {
		padding: 1.25rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		display: grid;
		gap: 1.25rem;
	}
	.actions-panel p {
		margin: 0;
	}
	.actions-panel p:not(.eyebrow) {
		color: var(--atv-text-secondary);
		font-size: 0.8125rem;
		line-height: 1.6;
	}
	.actions-panel a {
		font-size: 0.875rem;
		padding-block: 0.5rem;
	}
	.fixture-notice {
		border: 1px solid var(--atv-border);
		padding: 1rem;
		background: var(--atv-surface-muted);
		font-size: 0.875rem;
	}
</style>
