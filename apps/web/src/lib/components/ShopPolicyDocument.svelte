<script lang="ts">
	import {
		shopPolicyDocuments,
		shopPolicyUpdatedAt,
		type ShopPolicyKind
	} from '$lib/data/shop-policies';
	import approvedPolicies from '$lib/data/shop-policies.json';
	import ShopPolicyLinks from './ShopPolicyLinks.svelte';
	let { kind }: { kind: ShopPolicyKind } = $props();
	const metadata = $derived(shopPolicyDocuments[kind]);
	// Static, reviewed bodies also applied in Shopify on 2026-10-27. This curated
	// copy contains no operational notes or private identification/address data.
	const document = $derived.by(() => {
		const policy = approvedPolicies.policies.find((entry) => entry.type === metadata.type);
		if (!policy) throw new Error(`Missing approved shop policy: ${metadata.type}`);
		return { ...policy, ...metadata };
	});
</script>

<svelte:head>
	<title>{document.title} — Loja dos Signos</title>
	<meta name="description" content={document.description} />
	<link rel="canonical" href={`https://atuavidanosastros.com.br${document.href}`} />
</svelte:head>

<article class="section reading shop-policy-document">
	<p class="eyebrow">Loja dos Signos · Informações de compra</p>
	<h1>{document.title}</h1>
	<p class="lead">{document.description}</p>
	<p>Atualizada em {shopPolicyUpdatedAt}</p>
	<ShopPolicyLinks current={document.href} />
	{#if kind === 'devolucoes'}
		<p>
			<a href="https://shopify.com/104247329136/account">Acompanhar pedido e solicitar devolução</a>
			na sua conta da loja. Entre com o e-mail usado na compra.
		</p>
	{/if}
	<div class="policy-body">
		<!-- Static, reviewed local HTML; no customer or provider response is interpolated. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<!--email_off-->${document.body}<!--/email_off-->`}
	</div>
	<nav aria-label="Privacidade e atendimento" class="related-links">
		<a href="/privacidade">Política de Privacidade</a>
		<a href="/fale-conosco?assunto=loja">Fale com a loja</a>
		<a href="/loja">Voltar à Loja dos Signos</a>
	</nav>
</article>

<style>
	.shop-policy-document {
		max-width: 76ch;
		margin-inline: auto;
		overflow-wrap: anywhere;
	}
	.policy-body :global(h2) {
		margin-top: 2rem;
		font-size: clamp(1.25rem, 3vw, 1.65rem);
	}
	.policy-body :global(p) {
		line-height: 1.75;
	}
	.related-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
		margin-top: 2rem;
	}
	.related-links a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
</style>
