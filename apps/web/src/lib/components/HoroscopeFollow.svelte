<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { signs, signNames, type SignSlug } from '$lib/data/site';
	import {
		HOROSCOPE_FOLLOW_KEY,
		horoscopePeriods,
		periodNames,
		parseHoroscopeFollow,
		unreadHoroscopeEntries,
		type HoroscopeEntry,
		type HoroscopeFollow,
		type PublicPeriod
	} from '$lib/public-horoscope';
	let {
		entries,
		serverNow,
		initialSign = 'aries',
		initialPeriod = 'daily'
	}: {
		entries: HoroscopeEntry[];
		serverNow: string;
		initialSign?: SignSlug;
		initialPeriod?: PublicPeriod;
	} = $props();
	let sign = $state<SignSlug>(untrack(() => initialSign));
	let period = $state<PublicPeriod>(untrack(() => initialPeriod));
	let consent = $state(false);
	let follow = $state<HoroscopeFollow | null>(null);
	let message = $state('');
	const unread = $derived(unreadHoroscopeEntries(entries, follow));
	onMount(() => {
		try {
			follow = parseHoroscopeFollow(localStorage.getItem(HOROSCOPE_FOLLOW_KEY));
			if (follow) {
				sign = follow.sign;
				period = follow.period;
			}
		} catch {
			message = 'As preferências estão indisponíveis neste navegador.';
		}
	});
	function activate(event: SubmitEvent) {
		event.preventDefault();
		if (!consent) return;
		const next: HoroscopeFollow = {
			version: 1,
			sign,
			period,
			consentedAt: serverNow,
			seenThrough: serverNow
		};
		try {
			localStorage.setItem(HOROSCOPE_FOLLOW_KEY, JSON.stringify(next));
			follow = next;
			consent = false;
			message = 'Avisos ativados neste navegador.';
		} catch {
			message = 'Não foi possível guardar a preferência neste navegador.';
		}
	}
	function clear() {
		try {
			localStorage.removeItem(HOROSCOPE_FOLLOW_KEY);
			follow = null;
			message = 'Preferência removida.';
		} catch {
			message = 'Não foi possível remover a preferência neste navegador.';
		}
	}
	function acknowledge() {
		if (!follow) return;
		const next = {
			...follow,
			seenThrough: serverNow > follow.seenThrough ? serverNow : follow.seenThrough
		};
		try {
			localStorage.setItem(HOROSCOPE_FOLLOW_KEY, JSON.stringify(next));
			follow = next;
			message = 'Avisos marcados como vistos.';
		} catch {
			message = 'Não foi possível atualizar os avisos.';
		}
	}
</script>

<section class="follow card" aria-labelledby="follow-heading">
	<p class="eyebrow">Acompanhar</p>
	<h2 id="follow-heading">Avisos de novas leituras</h2>
	<p>
		Ao voltar ao horóscopo, veja aqui se há uma nova leitura publicada para o signo e o período
		escolhidos. A preferência fica somente neste navegador.
	</p>
	{#if follow}
		<p>Acompanhando <strong>{signNames[follow.sign]} · {periodNames[follow.period]}</strong>.</p>
		{#if unread.length}
			<div class="new-readings" role="status">
				<p>
					<strong
						>{unread.length === 1
							? 'Uma leitura nova ou atualizada'
							: `${unread.length} leituras novas ou atualizadas`}</strong
					>
				</p>
				<ul>
					{#each unread as entry (entry.id)}<li><a href={entry.path}>{entry.title}</a></li>{/each}
				</ul>
			</div>
			<button class="button secondary" type="button" onclick={acknowledge}
				>Marcar avisos como vistos</button
			>
		{:else}<p>Nenhuma nova leitura publicada desde a sua última conferência.</p>{/if}
		<button class="text-button" type="button" onclick={clear}
			>Remover preferência e desativar avisos</button
		>
	{/if}
	<details>
		<summary>{follow ? 'Mudar signo ou período' : 'Ativar avisos neste navegador'}</summary>
		<form onsubmit={activate}>
			<div class="choices">
				<label
					>Signo<select bind:value={sign}
						>{#each signs as item (item)}<option value={item}>{signNames[item]}</option
							>{/each}</select
					></label
				>
				<label
					>Período<select bind:value={period}
						>{#each horoscopePeriods as item (item)}<option value={item}>{periodNames[item]}</option
							>{/each}</select
					></label
				>
			</div>
			<label class="consent"
				><input type="checkbox" bind:checked={consent} required />
				<span
					>Quero guardar meu signo e período neste navegador para ver avisos de novas leituras ao
					voltar aqui.</span
				></label
			>
			<button class="button" type="submit" disabled={!consent}
				>Salvar preferência e ativar avisos</button
			>
		</form>
	</details>
	<p class="message" role="status">{message}</p>
</section>

<style>
	.follow {
		margin-top: 2.5rem;
		padding: clamp(1.25rem, 3vw, 2rem);
	}
	.follow p {
		max-width: 65ch;
	}
	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-block: 1rem;
	}
	.choices label {
		display: grid;
		gap: 0.4rem;
		flex: 1 1 10rem;
	}
	select {
		min-height: 2.75rem;
		width: 100%;
	}
	.consent {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		margin-block: 1.25rem;
	}
	.consent input {
		flex: 0 0 auto;
		margin-top: 0.3rem;
	}
	.text-button {
		display: block;
		min-height: 2.75rem;
		background: transparent;
		color: inherit;
		text-decoration: underline;
		border: 0;
		padding: 0.5rem 0;
		cursor: pointer;
	}
	summary {
		cursor: pointer;
		padding-block: 0.75rem;
	}
	.new-readings {
		border-inline-start: 3px solid currentColor;
		padding-inline-start: 1rem;
		margin-bottom: 1rem;
	}
	.message:empty {
		display: none;
	}
</style>
