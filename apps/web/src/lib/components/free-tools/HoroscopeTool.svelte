<script lang="ts">
	import { signs, signNames, type SignSlug } from '$lib/data/site';
	import {
		horoscopePeriods,
		periodNames,
		horoscopeRange,
		type HoroscopeEntry,
		type PublicPeriod
	} from '$lib/public-horoscope';
	import { customerProduct } from '$lib/data/product-copy';
	const weeklyProduct = customerProduct('week-reading');
	let { embedded = false }: { embedded?: boolean } = $props();
	let sign = $state<SignSlug>('aries');
	let period = $state<PublicPeriod>('daily');
	let pending = $state(false);
	let error = $state('');
	let result = $state<{
		sign: SignSlug;
		period: PublicPeriod;
		current: (HoroscopeEntry & { sections: { heading: string; paragraphs: string[] }[] }) | null;
		hasHistory: boolean;
		supportingGuides: { path: string; title: string; description: string }[];
		archive: string;
	} | null>(null);
	async function read() {
		if (pending) return;
		pending = true;
		error = '';
		result = null;
		try {
			const response = await fetch(`/api/free-tools/horoscopo?sign=${sign}&period=${period}`);
			if (!response.ok) throw new Error('Não foi possível consultar agora. Tente novamente.');
			result = await response.json();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Não foi possível consultar agora.';
		} finally {
			pending = false;
		}
	}
</script>

<div class:embedded class="horoscope-tool">
	<form
		onsubmit={(event) => {
			event.preventDefault();
			read();
		}}
	>
		<label
			>Seu signo<select bind:value={sign} disabled={pending}
				>{#each signs as item (item)}<option value={item}>{signNames[item]}</option>{/each}</select
			></label
		>
		<label
			>Período<select bind:value={period} disabled={pending}
				>{#each horoscopePeriods as item (item)}<option value={item}>{periodNames[item]}</option
					>{/each}</select
			></label
		>
		<button type="submit" disabled={pending}
			>{pending ? 'Consultando…' : 'Consultar meu signo'}</button
		>
	</form>
	{#if error}<p role="alert">{error}</p>{/if}
	<div aria-live="polite" aria-busy={pending}>
		{#if result}
			{#if result.current}
				<article>
					<p class="period">{horoscopeRange(result.current)}</p>
					<h3>{result.current.title}</h3>
					{#each result.current.sections as section, sectionIndex (sectionIndex)}<section>
							<h4>{section.heading}</h4>
							{#each section.paragraphs as paragraph, paragraphIndex (paragraphIndex)}<p>
									{paragraph}
								</p>{/each}
						</section>{/each}
					<a href={result.current.path}>Abrir esta leitura</a>
				</article>
			{:else}<p>
					A leitura de {periodNames[result.period].toLowerCase()} para {signNames[result.sign]} ainda
					não está disponível.
					{#if result.hasHistory}Você pode consultar as publicações anteriores.{/if}
				</p>{/if}
			<p>
				<a href={result.archive}
					>{result.hasHistory ? 'Ver o histórico' : 'Consultar a disponibilidade'} de {signNames[
						result.sign
					]}</a
				>
			</p>
			{#if result.supportingGuides.length}
				<section class="supporting-guides" aria-label="Para entender os ciclos">
					<h3>Para entender os ciclos</h3>
					<p>
						Guias educativos sobre os movimentos do céu. Não são previsões para o período escolhido.
					</p>
					{#each result.supportingGuides as guide (guide.path)}
						<div class="guide">
							<h4><a href={guide.path}>{guide.title}</a></h4>
							<p>{guide.description}</p>
						</div>
					{/each}
				</section>
			{/if}
			{#if weeklyProduct}<aside>
					<h4>Uma previsão com o seu mapa</h4>
					<p>
						{weeklyProduct.name} considera seus dados de nascimento para interpretar os trânsitos da semana.
					</p>
					<a href={`/produtos/${weeklyProduct.slug}`}>Conhecer a leitura pessoal →</a>
				</aside>{/if}
		{/if}
	</div>
</div>

<style>
	.horoscope-tool {
		max-width: 48rem;
		margin-inline: auto;
	}
	form {
		display: grid;
		gap: 1rem;
	}
	label {
		display: grid;
		gap: 0.4rem;
		font-weight: 650;
	}
	select,
	button {
		min-height: 3rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--atv-text-primary);
		border-radius: 0.25rem;
		font: inherit;
	}
	select {
		background: var(--atv-paper, #faf5e7);
		color: var(--atv-text-primary);
		width: 100%;
	}
	button {
		background: var(--atv-text-primary, #153b4d);
		color: #fffaf0;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	article,
	aside,
	.supporting-guides {
		margin-top: 1.5rem;
		border-top: 1px solid #153b4d33;
		padding-top: 1rem;
	}
	h3 {
		font-family: var(--atv-font-display);
		font-size: 1.8rem;
	}
	h4 {
		font-size: 1.15rem;
		margin: 1rem 0 0.5rem;
	}
	p {
		line-height: 1.65;
	}
	.period {
		font-size: 0.8rem;
	}
	.embedded {
		margin: 0;
	}
</style>
