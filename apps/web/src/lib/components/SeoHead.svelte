<script lang="ts">
	import { page } from '$app/state';
	import { SITE } from '$lib/data/site';
	import { legacyOwnsRobots, robotsPolicy, type PageSeo } from '$lib/seo';
	let { seo }: { seo?: PageSeo | null } = $props();
	const visible = $derived(page.status === 200 ? seo : null);
	// jsonLd is serialized with safeJsonLd; never insert an unescaped editorial body.
	const structuredData = $derived(
		visible?.jsonLd ? '<script type="application/ld+json">' + visible.jsonLd + '</' + 'script>' : ''
	);
	const canonical = $derived(
		visible ? `${SITE.url}${visible.path === '/' ? '' : visible.path}` : null
	);
</script>

<svelte:head>
	{#if !legacyOwnsRobots(page.url.pathname) || page.status !== 200}
		<meta name="robots" content={robotsPolicy(visible, page.url, page.status)} />
	{/if}
	{#if visible}
		{#if visible.managePrimary}
			<title>{visible.title}</title>
			<meta name="description" content={visible.description} />
			<link rel="canonical" href={canonical} />
		{/if}
		<meta property="og:type" content={visible.article ? 'article' : 'website'} />
		<meta property="og:locale" content="pt_BR" />
		<meta property="og:site_name" content={SITE.name} />
		<meta property="og:url" content={canonical} />
		<meta property="og:title" content={visible.title} />
		<meta property="og:description" content={visible.description} />
		<meta name="twitter:card" content={visible.image?.large ? 'summary_large_image' : 'summary'} />
		{#if visible.image}
			<meta property="og:image" content={visible.image.url} />
			<meta property="og:image:alt" content={visible.image.alt} />
		{/if}
		{#if visible.article}
			<meta property="article:published_time" content={visible.article.publishedAt} />
			<meta property="article:modified_time" content={visible.article.modifiedAt} />
		{/if}
		{#if visible.jsonLd}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html structuredData}
		{/if}
	{/if}
</svelte:head>
