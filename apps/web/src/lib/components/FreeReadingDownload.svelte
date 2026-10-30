<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { isFreeToolId } from '$lib/free-tools';
	import { parseFreeToolState } from '$lib/free-tool-state';
	import { trackHomeEvent } from '$lib/analytics/home-events';
	import NewsConsent from '$lib/components/NewsConsent.svelte';
	import { parseHoroscopeArchivePath } from '$lib/public-horoscope';
	let { productId }: { productId: string } = $props();
	const funnels: Record<string, string> = {
		ascendente: 'three-pillars',
		'mapa-astral': 'birth-chart',
		'meio-do-ceu': 'purpose-career',
		'dinheiro-no-mapa': 'purpose-career',
		'combinacao-do-casal': 'synastry',
		'carta-do-dia': 'tarot-situation-challenge-advice',
		'carta-do-amor': 'tarot-aphrodite-temple',
		'registro-de-sonho': 'dream-reading',
		horoscopo: 'week-reading'
	};
	const tool = $derived(page.url.searchParams.get('ferramenta') ?? '');
	const resultId = $derived(page.url.searchParams.get('resultado') ?? '');
	const horoscopePath = $derived(page.url.searchParams.get('leitura') ?? '');
	const horoscopeRevision = $derived(page.url.searchParams.get('revisao') ?? '');
	const horoscopeQuery = $derived(
		`?leitura=${encodeURIComponent(horoscopePath)}&revisao=${encodeURIComponent(horoscopeRevision)}`
	);
	const horoscopeCompatible = $derived(
		tool === 'horoscopo' &&
			Boolean(parseHoroscopeArchivePath(horoscopePath)) &&
			/^[1-9][0-9]{0,8}$/.test(horoscopeRevision)
	);
	const resultQuery = $derived(
		tool === 'horoscopo'
			? horoscopeQuery
			: resultId
				? `?resultado=${encodeURIComponent(resultId)}`
				: ''
	);
	const compatible = $derived(
		(isFreeToolId(tool) || horoscopeCompatible) && funnels[tool] === productId
	);
	let ready = $state(false),
		available = $state(false),
		identified = $state(false),
		emailCodeAvailable = $state(false);
	let busy = $state(false),
		sent = $state(false),
		email = $state(''),
		code = $state(''),
		message = $state('');
	onMount(() => {
		ready = true;
	});
	$effect(() => {
		if (!ready) return;
		trackHomeEvent('product_view', { product_id: productId, context: 'landing' });
	});
	$effect(() => {
		if (!ready || !compatible) {
			available = false;
			return;
		}
		const current = tool;
		const target = resultId;
		const publicReadingQuery = horoscopeQuery;
		const historyQuery =
			target && current === 'registro-de-sonho'
				? `?historico=1&resultado=${encodeURIComponent(target)}`
				: '';
		const controller = new AbortController();
		available = false;
		void Promise.all([
			fetch(
				current === 'horoscopo'
					? `/api/free-tools/horoscopo/reading${publicReadingQuery}`
					: `/api/free-tools/${current}${historyQuery}`,
				{
					signal: controller.signal,
					cache: 'no-store'
				}
			),
			fetch('/api/free-tools/identity', { signal: controller.signal, cache: 'no-store' })
		])
			.then(async ([reading, identity]) => {
				const payload: unknown = reading.ok ? await reading.json() : null;
				const history =
					payload &&
					typeof payload === 'object' &&
					'history' in payload &&
					Array.isArray(payload.history)
						? payload.history
						: [];
				const state = parseFreeToolState(historyQuery ? history[0] : payload);
				const account: unknown = identity.ok ? await identity.json() : null;
				if (controller.signal.aborted) return;
				available =
					current === 'horoscopo'
						? Boolean(
								payload &&
								typeof payload === 'object' &&
								'available' in payload &&
								payload.available === true
							)
						: Boolean(state?.result && (!target || state.result.id === target));
				identified = Boolean(
					account &&
					typeof account === 'object' &&
					'identified' in account &&
					account.identified === true
				);
				emailCodeAvailable = Boolean(
					account &&
					typeof account === 'object' &&
					'emailCodeAvailable' in account &&
					account.emailCodeAvailable === true
				);
			})
			.catch(() => {
				if (!controller.signal.aborted) available = false;
			});
		return () => controller.abort();
	});
	async function confirm(action: 'request' | 'verify') {
		busy = true;
		message = '';
		trackHomeEvent('pdf_request', { tool_id: tool, product_id: productId, context: 'landing' });
		try {
			const response = await fetch('/api/free-tools/identity', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action, email, code })
			});
			if (!response.ok) {
				message =
					response.status === 429
						? 'Aguarde um minuto antes de pedir outro código.'
						: action === 'verify'
							? 'Confira o código ou peça um novo.'
							: 'Não foi possível enviar o código agora. Tente novamente.';
				return;
			}
			if (action === 'request') {
				sent = true;
				message = 'Código enviado. Confira também a pasta de spam.';
			} else {
				identified = true;
				message = 'E-mail confirmado. Seu PDF está pronto para baixar.';
				trackHomeEvent('pdf_identity_result', {
					tool_id: tool,
					product_id: productId,
					state: 'success'
				});
			}
		} catch {
			message = 'Confira sua conexão e tente novamente.';
		} finally {
			busy = false;
		}
	}
	async function download() {
		busy = true;
		message = '';
		trackHomeEvent('pdf_request', { tool_id: tool, product_id: productId, context: 'landing' });
		try {
			const response = await fetch(`/api/free-tools/${tool}/pdf${resultQuery}`, {
				cache: 'no-store'
			});
			if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
				if (response.status === 422) {
					message =
						tool === 'horoscopo'
							? 'Um caractere desta publicação ainda não pode ser exportado em PDF. A leitura continua disponível no site.'
							: 'Sua leitura continua salva e completa na ferramenta. Um caractere do relato ainda não pode ser exportado em PDF. Você pode editar o relato e tentar novamente.';
					return;
				}
				if (tool === 'horoscopo' && response.status === 404) {
					available = false;
					message =
						'Esta versão da publicação não está mais disponível para baixar. Consulte a disponibilidade do seu signo.';
					return;
				}
				message =
					response.status === 409
						? 'Há leituras diferentes neste navegador e na sua conta. Volte à ferramenta para escolher o perfil antes de baixar.'
						: response.status === 401
							? 'Entre novamente para confirmar seu acesso.'
							: 'Não foi possível preparar o PDF agora. Seu resultado continua na ferramenta.';
				return;
			}
			const blob = await response.blob();
			const href = URL.createObjectURL(blob),
				link = document.createElement('a');
			link.href = href;
			link.download = `atvna-${tool}.pdf`;
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(href), 1000);
			trackHomeEvent(
				'pdf_download',
				{ tool_id: tool, product_id: productId, context: 'landing', state: 'success' },
				{ operationId: response.headers.get('x-atv-result-id') ?? undefined }
			);
			message = 'PDF preparado. Confira os downloads do navegador.';
		} catch {
			message = 'Confira sua conexão e tente baixar novamente.';
		} finally {
			busy = false;
		}
	}
</script>

{#if compatible}
	<section class="free-download" aria-labelledby="free-download-title">
		<p class="eyebrow">Sua leitura gratuita</p>
		<h3 id="free-download-title">Leve seu resultado com você</h3>
		{#if available && identified}
			<p>
				{tool === 'horoscopo'
					? 'Baixe em PDF o mesmo texto publicado por signo e período que você acabou de consultar.'
					: 'Baixe o texto completo da leitura, seus dados calculados e as informações de método em PDF.'}
			</p>
			<button class="button secondary" disabled={busy} onclick={download}
				>{busy ? 'Preparando…' : 'Baixar meu PDF gratuito'}</button
			>
		{:else if available && emailCodeAvailable}
			<p>
				{tool === 'horoscopo'
					? 'Confirme seu e-mail para baixar o PDF desta publicação aqui.'
					: 'Confirme seu e-mail para guardar a leitura na sua conta e baixar o PDF aqui.'}
			</p>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					void confirm(sent ? 'verify' : 'request');
				}}
			>
				<label for="free-pdf-email">Seu e-mail</label>
				<input
					id="free-pdf-email"
					type="email"
					autocomplete="email"
					required
					maxlength="254"
					bind:value={email}
					readonly={sent}
				/>
				{#if sent}<label for="free-pdf-code">Código recebido por e-mail</label><input
						id="free-pdf-code"
						inputmode="numeric"
						autocomplete="one-time-code"
						pattern={'[0-9]{6,10}'}
						minlength="6"
						maxlength="10"
						required
						bind:value={code}
					/>{/if}
				<button class="button secondary" disabled={busy}
					>{busy ? 'Aguarde…' : sent ? 'Confirmar meu e-mail' : 'Receber código por e-mail'}</button
				>
				{#if sent}<button
						class="text-link"
						type="button"
						disabled={busy}
						onclick={() => {
							sent = false;
							code = '';
							message = '';
						}}>Alterar e-mail ou pedir outro código</button
					>{/if}
			</form>
			<p class="small">
				Ao confirmar, você cria ou acessa sua conta. Consulte a <a href="/privacidade"
					>Política de Privacidade</a
				>.
			</p>
		{:else if available}
			<p>
				O PDF está disponível para contas com e-mail confirmado. A confirmação por código está em
				preparação.
			</p>
			<a
				class="button secondary"
				href={`/entrar?next=${encodeURIComponent(page.url.pathname + page.url.search)}`}
				>Entrar para baixar meu PDF</a
			>
		{:else if tool === 'horoscopo'}
			<p>
				Esta versão da publicação não está disponível para baixar. Consulte a disponibilidade do seu
				signo.
			</p>
		{:else}
			<p>Seu resultado continua na ferramenta, com os dados que você informou neste navegador.</p>
		{/if}
		{#if available}<NewsConsent {identified} />{/if}
		{#if message}<p role="status">{message}</p>{/if}
		<a
			class="return-link"
			href={horoscopeCompatible && available
				? horoscopePath
				: `/?ferramenta=${tool}${resultId ? `&resultado=${encodeURIComponent(resultId)}` : ''}#ferramentas`}
			>Voltar à minha leitura gratuita <span aria-hidden="true">↗</span></a
		>
	</section>
{/if}

<style>
	.free-download {
		margin-top: 2rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--atv-border);
	}
	h3 {
		font-size: 1.65rem;
	}
	form {
		display: grid;
		gap: 10px;
		margin: 20px 0;
	}
	input {
		width: 100%;
		min-width: 0;
		min-height: 46px;
		padding: 10px;
		border: 1px solid #687d83;
		border-radius: 3px;
		background: #fffdf8;
	}
	label,
	.small {
		font-size: 0.85rem;
	}
	button,
	.button {
		min-height: 44px;
	}
	.return-link {
		display: inline-block;
		padding: 14px 0;
		font-size: 0.9rem;
	}
	.small a {
		text-decoration: underline;
	}
</style>
