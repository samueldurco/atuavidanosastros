<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { trackHomeEvent } from '$lib/analytics/home-events';
	import MvpProductArt from '$lib/components/MvpProductArt.svelte';
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
	let resultHeading = $state<HTMLHeadingElement>();
	let result = $state<{
		sign: SignSlug;
		period: PublicPeriod;
		current: (HoroscopeEntry & { sections: { heading: string; paragraphs: string[] }[] }) | null;
		hasHistory: boolean;
		supportingGuides: { path: string; title: string; description: string }[];
		archive: string;
	} | null>(null);
	const storageKey = 'atv-free-horoscope';
	const localDay = () =>
		new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
	onMount(() => {
		try {
			const raw = sessionStorage.getItem(storageKey);
			if (!raw || raw.length > 100000) return;
			const saved = JSON.parse(raw);
			if (
				saved.day !== localDay() ||
				!signs.includes(saved.sign) ||
				!horoscopePeriods.includes(saved.period)
			)
				return;
			sign = saved.sign;
			period = saved.period;
			// Reload editorial availability rather than trusting browser-supplied article content.
			void read();
		} catch {
			/* Optional continuity. */
		}
	});
	async function read() {
		if (pending) return;
		trackHomeEvent('tool_submit', {
			tool_id: 'horoscopo',
			context: embedded ? 'home' : 'alias',
			state: 'initial'
		});
		pending = true;
		error = '';
		result = null;
		try {
			const response = await fetch(`/api/free-tools/horoscopo?sign=${sign}&period=${period}`);
			if (!response.ok) throw new Error('Não foi possível consultar agora. Tente novamente.');
			result = await response.json();
			if (result?.current) {
				// Stable, non-personal operation ID deduplicates the same editorial revision.
				const bytes = new Uint8Array(
					await crypto.subtle.digest(
						'SHA-256',
						new TextEncoder().encode(`${result.current.id}:${result.current.revision}`)
					)
				);
				bytes[6] = (bytes[6]! & 15) | 128;
				bytes[8] = (bytes[8]! & 63) | 128;
				const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
				trackHomeEvent(
					'tool_result',
					{ tool_id: 'horoscopo', context: embedded ? 'home' : 'alias', state: 'new' },
					{
						operationId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
					}
				);
				await tick();
				resultHeading?.focus({ preventScroll: true });
			}
			try {
				sessionStorage.setItem(storageKey, JSON.stringify({ sign, period, day: localDay() }));
			} catch {
				/* Optional continuity. */
			}
		} catch (cause) {
			trackHomeEvent('tool_error', {
				tool_id: 'horoscopo',
				context: embedded ? 'home' : 'alias',
				error_code: 'service_unavailable'
			});
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
					<h3 bind:this={resultHeading} tabindex="-1">{result.current.title}</h3>
					{#each result.current.sections as section, sectionIndex (sectionIndex)}<section>
							<h4>{section.heading}</h4>
							{#each section.paragraphs as paragraph, paragraphIndex (paragraphIndex)}<p>
									{paragraph}
								</p>{/each}
						</section>{/each}
				</article>
			{:else}<p>
					A leitura de {periodNames[result.period].toLowerCase()} para {signNames[result.sign]} ainda
					não está disponível.
					{#if result.hasHistory}Você pode consultar as publicações anteriores.{/if}
				</p>
				<p>
					<a href={result.archive}
						>{result.hasHistory ? 'Ver o histórico' : 'Consultar a disponibilidade'} de {signNames[
							result.sign
						]}</a
					>
				</p>
			{/if}
			{#if weeklyProduct && result.current}<aside
					class="continuation"
					data-free-offer="week-reading"
				>
					<div class="continuation-art"><MvpProductArt productId="week-reading" /></div>
					<div>
						<p class="eyebrow">Para aprofundar</p>
						<h4>Uma previsão com o seu mapa</h4>
						<p>
							{weeklyProduct.name} considera seus dados de nascimento para interpretar os trânsitos da
							semana.
						</p>
						<a
							class="button secondary"
							href={`${weeklyProduct.href}?ferramenta=horoscopo&origem=ferramenta&leitura=${encodeURIComponent(result.current.path)}&revisao=${result.current.revision}`}
							data-atv-event="tool_product_click"
							data-atv-tool="horoscopo"
							data-atv-product="week-reading"
							data-atv-universe="ciclos"
							data-atv-context="result"
							data-atv-cta="offer">Conhecer conteúdo e disponibilidade →</a
						>
					</div>
				</aside>{/if}
		{/if}
	</div>
</div>

<style>
	.continuation {
		display: grid;
		grid-template-columns: minmax(130px, 0.6fr) minmax(0, 1fr);
		gap: 1.4rem;
		align-items: center;
		background: #e3ebdf;
		padding: 1.5rem;
	}
	.continuation-art {
		min-width: 0;
	}
	@media (min-width: 700px) {
		form {
			grid-template-columns: 1fr 1fr;
		}
		form button {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 620px) {
		.continuation {
			grid-template-columns: 1fr;
		}
		.continuation-art {
			max-width: 19rem;
			margin-inline: auto;
		}
	}
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
	aside {
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
