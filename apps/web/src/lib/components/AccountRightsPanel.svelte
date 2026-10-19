<script lang="ts">
	import { customerProduct } from '$lib/data/product-copy';
	import { symbolicProduct } from '$lib/symbolic-intake';
	import { natalProducts, type NatalProduct } from '$lib/natal-request';
	import type { AccountRights } from '$lib/account-rights';

	let { rights, compact = false }: { rights: AccountRights; compact?: boolean } = $props();
	const statePriority = { ACTIVE: 0, PENDING: 1, SUSPENDED: 2, EXPIRED: 3, REVOKED: 4 };
	const ordered = $derived(
		[...rights.items].sort((a, b) => statePriority[a.state] - statePriority[b.state])
	);
	const shown = $derived(compact ? ordered.slice(0, 3) : ordered);
	const activeCountByProduct = $derived(
		rights.items.reduce<Record<string, number>>((counts, right) => {
			if (right.state === 'ACTIVE') counts[right.productId] = (counts[right.productId] ?? 0) + 1;
			return counts;
		}, {})
	);

	function stateLabel(state: string) {
		switch (state) {
			case 'ACTIVE':
				return 'Acesso ativo';
			case 'PENDING':
				return 'Aguardando liberação';
			case 'SUSPENDED':
				return 'Acesso suspenso';
			case 'EXPIRED':
				return 'Acesso expirado';
			case 'REVOKED':
				return 'Acesso revogado';
			default:
				return 'Situação a confirmar';
		}
	}
	function canPrepare(productId: string) {
		return (
			symbolicProduct(productId) ||
			natalProducts.includes(productId as NatalProduct) ||
			[
				'date-reading',
				'week-reading',
				'solar-return',
				'personal-calendar',
				'direction-journey',
				'horoscope',
				'pair-preview',
				'synastry',
				'couple-dossier'
			].includes(productId)
		);
	}
	function dateLabel(value: string | null | undefined) {
		if (!value) return null;
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? null
			: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
	}
</script>

<section class="account-rights" id="seus-acessos" aria-labelledby="rights-title">
	<div class="rights-heading">
		<div>
			<p class="eyebrow">Direitos da conta</p>
			<h2 id="rights-title">Seus acessos</h2>
			<p>
				Consulte seus direitos registrados e a situação de cada um. Resultados concluídos e leituras
				de teste aparecem separadamente.
			</p>
		</div>
		{#if compact}<a href="/biblioteca#seus-acessos">Ver todos os acessos →</a>{/if}
	</div>
	{#if rights.status === 'error'}
		<div class="rights-message" role="status">
			<strong>Não foi possível consultar seus acessos agora.</strong>
			<p>Tente novamente em alguns instantes. Suas leituras salvas continuam na Biblioteca.</p>
		</div>
	{:else if !rights.items.length}
		<div class="rights-message">
			<strong>Você ainda não tem acessos a produtos nesta conta.</strong>
			<p>Conheça as leituras disponíveis. Quando um acesso for liberado, ele aparecerá aqui.</p>
			<a href="/leituras">Conhecer as leituras →</a>
		</div>
	{:else}
		<ul class="rights-list">
			{#each shown as right, index (`${right.productId}:${right.source}:${index}`)}
				{@const product = customerProduct(right.productId)}
				{@const endDate = dateLabel(right.endsAt)}
				{@const available = right.state === 'ACTIVE'}
				{@const multipleSources = (activeCountByProduct[right.productId] ?? 0) > 1}
				<li class="right-card">
					<div class="right-meta">
						<span class="right-source">{right.sourceLabel}</span>
						<span class:active={available} class="right-state">{stateLabel(right.state)}</span>
					</div>
					<h3>{product?.name ?? 'Produto da sua conta'}</h3>
					{#if endDate}<p class="right-validity">Data de término: {endDate}</p>{/if}
					{#if multipleSources && available}
						<p class="right-note">
							Há mais de um acesso ativo para esta leitura. A origem precisa ser escolhida antes do
							uso.
						</p>
					{:else if available && product?.state !== 'ACTIVE'}
						<p class="right-note">
							Seu acesso está registrado. Esta leitura ainda não está disponível para começar.
						</p>
					{:else if available && product?.state === 'ACTIVE' && canPrepare(right.productId)}
						<p class="right-note">A disponibilidade da leitura é confirmada no próximo passo.</p>
					{/if}
					{#if product}
						{#if available && !multipleSources && product.state === 'ACTIVE' && canPrepare(right.productId)}
							<a class="right-action" href={`/biblioteca/nova/${right.productId}`}
								>Preparar leitura →</a
							>
						{:else}
							<a class="right-action" href={product.href}>Ver produto →</a>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
		{#if compact && rights.items.length > shown.length}
			<p class="remaining">
				Mais {rights.items.length - shown.length}
				{rights.items.length - shown.length === 1 ? 'acesso' : 'acessos'} na Biblioteca.
			</p>
		{/if}
	{/if}
</section>

<style>
	.account-rights {
		margin-block: 2rem 2.75rem;
		padding: clamp(1.25rem, 2.5vw, 2rem);
		background:
			var(--private-grain) center / 1000px auto,
			#faf5e9;
		border: 1px solid var(--private-line, var(--atv-border));
		border-top: 4px solid #c99142;
		box-shadow: 0 8px 20px #263e4209;
	}
	.rights-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}
	.rights-heading h2 {
		margin: 0;
		font: 500 clamp(1.7rem, 3vw, 2.2rem)/1.15 var(--atv-font-display);
	}
	.rights-heading p:last-child {
		margin-bottom: 0;
		color: var(--atv-text-secondary);
	}
	.rights-heading > a,
	.rights-message a,
	.right-action {
		color: var(--private-ink, var(--atv-text-primary));
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.3em;
	}
	.rights-heading > a,
	.right-action {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
	}
	.rights-heading > a {
		flex-shrink: 0;
		white-space: nowrap;
	}
	.rights-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: 0.875rem;
	}
	.right-card,
	.rights-message {
		padding: 1.25rem;
		border: 1px solid var(--private-line, var(--atv-border));
		background: #fffaf0;
	}
	.right-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.right-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.right-source,
	.right-state {
		font-size: 0.72rem;
		line-height: 1.4;
		letter-spacing: 0.02em;
	}
	.right-source {
		color: #665334;
	}
	.right-state {
		padding: 0.25rem 0.5rem;
		border: 1px solid #b8a78a;
		color: #594a38;
	}
	.right-state.active {
		border-color: #819273;
		color: #315b3b;
		background: #e7eedb;
	}
	.right-card h3 {
		margin: 0.9rem 0 0.25rem;
		font: 500 1.35rem/1.2 var(--atv-font-display);
	}
	.right-card p,
	.rights-message p,
	.remaining {
		font-size: 0.825rem;
		line-height: 1.55;
		color: var(--atv-text-secondary);
	}
	.right-card .right-note {
		margin-top: 0.5rem;
	}
	.right-action {
		margin-top: auto;
		padding-top: 0.75rem;
	}
	.rights-message strong {
		font: 500 1.2rem var(--atv-font-display);
	}
	.remaining {
		margin: 1rem 0 0;
	}
	@media (max-width: 640px) {
		.rights-heading {
			display: block;
		}
	}
</style>
