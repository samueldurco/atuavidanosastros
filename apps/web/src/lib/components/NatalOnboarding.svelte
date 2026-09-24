<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Button from './ui/Button.svelte';
	import Field from './ui/Field.svelte';
	import Dialog from './ui/Dialog.svelte';
	import {
		ONBOARDING_VERSION,
		parseOnboardingSnapshot,
		type OnboardingSnapshot,
		type OnboardingCommand
	} from '$lib/onboarding';
	import { emptyNatalForm, formFromNatal, natalFormCommand } from '$lib/natal-form';
	let snapshot = $state<OnboardingSnapshot | null>(null);
	let form = $state(emptyNatalForm());
	let consent = $state(false);
	let busy = $state(true);
	let uncertain = $state(false);
	let message = $state('');
	let error = $state('');
	let confirmForget = $state(false);
	let feedback: HTMLDivElement;
	const locked = $derived(busy || !snapshot || uncertain);
	const messages: Record<string, string> = {
		revision_conflict:
			'Seu perfil mudou em outra aba. Recarregue o perfil salvo antes de tentar novamente.',
		invalid_input:
			'Os dados não passaram pela validação. Confira data, hora, fuso, deslocamento UTC e coordenadas. Horários inexistentes no fuso não são aceitos.',
		auth_required: 'Sua sessão terminou. Entre novamente para recuperar seu perfil.',
		profile_unavailable: 'Este perfil não está disponível para atualização.',
		same_origin_required:
			'Não foi possível confirmar a origem do pedido. Abra esta página novamente.'
	};
	async function request(command?: OnboardingCommand) {
		if (command && locked) return;
		busy = true;
		error = '';
		message = '';
		try {
			const response = await fetch('/api/onboarding', {
				method: command ? 'POST' : 'GET',
				credentials: 'same-origin',
				cache: 'no-store',
				signal: AbortSignal.timeout(15000),
				...(command
					? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) }
					: {})
			});
			const payload: unknown = await response.json();
			const body =
				payload && typeof payload === 'object' && !Array.isArray(payload)
					? (payload as Record<string, unknown>)
					: {};
			const errorCode = typeof body.error === 'string' ? body.error : '';
			if (!response.ok) {
				error =
					messages[errorCode] ??
					'Não foi possível acessar seu perfil agora. Tente recuperar os dados salvos antes de enviar novamente.';
				uncertain = !command || response.status !== 400 || errorCode !== 'invalid_input';
				return;
			}
			const next = parseOnboardingSnapshot(body?.onboarding);
			if (!next) throw new Error('invalid_response');
			snapshot = next;
			// Explicit recovery discards the unsaved draft; a successful begin does not.
			if (!command || command.action !== 'begin') form = formFromNatal(next.natal);
			consent = false;
			uncertain = false;
			message =
				command?.action === 'save-natal'
					? 'Perfil natal salvo. Isso não gera nem libera uma interpretação.'
					: command?.action === 'forget-natal'
						? 'Todas as versões do seu perfil natal foram apagadas. Sua Biblioteca não foi alterada.'
						: command?.action === 'begin'
							? 'Seu início foi salvo. Você pode completar os dados depois.'
							: '';
		} catch {
			uncertain = true;
			error = command
				? 'A resposta não chegou. O pedido pode ter sido salvo. Recarregue o perfil antes de fazer outro envio.'
				: 'Não foi possível recuperar seu perfil. Seus dados não foram preenchidos automaticamente.';
		} finally {
			busy = false;
			if (command) {
				await tick();
				feedback?.focus();
			}
		}
	}
	function action(kind: 'begin' | 'forget-natal') {
		if (!snapshot || locked) return;
		confirmForget = false;
		void request({
			version: ONBOARDING_VERSION,
			expectedRevision: snapshot.revision,
			action: kind
		});
	}
	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!snapshot || locked) return;
		const result = natalFormCommand(form, snapshot.revision, consent);
		if (!result.command) {
			error = result.error;
			message = '';
			void tick().then(() => feedback?.focus());
			return;
		}
		void request(result.command);
	}
	onMount(() => {
		void request();
	});
</script>

<div class="onboarding" data-stitch="ID-02">
	<aside class="orientation">
		<p class="eyebrow">Seu ponto de partida</p>
		<h1>Seu nascimento,<br /> com cuidado.</h1>
		<p>Guarde os dados que conhece. Você pode corrigir seu perfil ou apagá-lo quando quiser.</p>
		<div class="progress-block">
			<strong
				>{snapshot?.state === 'COMPLETE'
					? 'Perfil natal salvo'
					: snapshot?.state === 'IN_PROGRESS'
						? 'Cadastro em andamento'
						: 'Preparar seu perfil'}</strong
			>
			<ol aria-label="Etapas do cadastro">
				<li>01 · Conferir dados</li>
				<li>02 · Autorizar armazenamento</li>
				<li>03 · Salvar e recuperar</li>
			</ol>
			{#if snapshot?.natal}<p>
					Versão {snapshot.natal.version} · Hora {snapshot.natal.timePrecision === 'EXACT'
						? 'exata'
						: 'aproximada'}
				</p>{/if}
		</div>
		<div class="care">
			<h2>O que muda com a hora?</h2>
			<p>
				O horário informa posições sensíveis ao instante de nascimento. Uma hora aproximada continua
				identificada como aproximada. Se não souber, não precisa adivinhar.
			</p>
			<a href="/metodo">Conheça o método →</a>
		</div>
		<a href="/dashboard">Voltar ao seu atlas</a>
	</aside>
	<section class="form-panel" aria-label="Dados natais" aria-busy={busy}>
		<header>
			<p class="eyebrow">Perfil pessoal</p>
			<h2>Comece pelo que você sabe.</h2>
			<p>Este cadastro armazena dados. Ele não calcula um mapa nem habilita interpretações.</p>
		</header>
		<div class="feedback" bind:this={feedback} tabindex="-1">
			{#if busy}<p role="status">
					{snapshot ? 'Aguarde a confirmação…' : 'Recuperando seu perfil…'}
				</p>{/if}
			{#if message}<p role="status">{message}</p>{/if}
			{#if error}<p role="alert">{error}</p>{/if}
			{#if !busy && (!snapshot || uncertain)}<Button variant="secondary" onclick={() => request()}
					>Recarregar perfil salvo</Button
				>
				<p class="help">
					Ao recarregar, os campos serão substituídos pelos dados salvos. Não reenviamos pedidos
					automaticamente.
				</p>
				<a href="/entrar">Entrar novamente</a>{/if}
		</div>
		<noscript
			>Ative JavaScript para recuperar e editar seu perfil. Nenhum dado será enviado por este
			formulário sem ele.</noscript
		>
		<form onsubmit={save}>
			<fieldset disabled={locked}>
				<legend>Data e hora de nascimento</legend>
				<Field id="natal-date" label="Data de nascimento"
					>{#snippet children(describedBy)}<input
							id="natal-date"
							type="date"
							min="1900-01-01"
							max="2099-12-31"
							required
							bind:value={form.date}
							aria-describedby={describedBy}
						/>{/snippet}</Field
				>
				<Field id="natal-precision" label="O que você sabe sobre a hora?"
					>{#snippet children(describedBy)}<select
							id="natal-precision"
							bind:value={form.precision}
							aria-describedby={describedBy}
							><option value="UNKNOWN">Não sei a hora</option><option value="EXACT"
								>Sei a hora exata</option
							><option value="APPROXIMATE">Hora aproximada</option></select
						>{/snippet}</Field
				>
				{#if form.precision !== 'UNKNOWN'}<Field
						id="natal-time"
						label="Hora local de nascimento"
						help="Use a hora do local onde você nasceu, não a hora de hoje."
						>{#snippet children(describedBy)}<input
								id="natal-time"
								type="time"
								step="0.001"
								required
								bind:value={form.time}
								aria-describedby={describedBy}
							/>{/snippet}</Field
					>{:else}<p class="help">
						Você pode salvar apenas o início do cadastro e voltar depois. Não usamos meio-dia nem
						outro horário padrão.
					</p>{/if}
			</fieldset>
			<fieldset disabled={locked}>
				<legend>Local e referência temporal</legend>
				<p class="help">
					Ainda não há busca automática de cidade. Confira as coordenadas e o fuso em uma fonte de
					sua confiança. Não envie dados de outra pessoa.
				</p>
				<Field id="natal-location" label="Cidade e região de nascimento"
					>{#snippet children(describedBy)}<input
							id="natal-location"
							maxlength="200"
							required
							bind:value={form.location}
							aria-describedby={describedBy}
						/>{/snippet}</Field
				>
				<div class="field-grid">
					<Field id="natal-country" label="Código do país" help="Duas letras, por exemplo BR ou PT."
						>{#snippet children(describedBy)}<input
								id="natal-country"
								maxlength="2"
								pattern={'[A-Za-z]{2}'}
								required
								bind:value={form.country}
								aria-describedby={describedBy}
							/>{/snippet}</Field
					>
					<Field
						id="natal-zone"
						label="Fuso IANA"
						help="Por exemplo America/Sao_Paulo. Não usamos o fuso do seu dispositivo."
						>{#snippet children(describedBy)}<input
								id="natal-zone"
								maxlength="80"
								required
								bind:value={form.timezone}
								aria-describedby={describedBy}
								spellcheck="false"
							/>{/snippet}</Field
					>
					<Field id="natal-lat" label="Latitude" help="De -90 a 90; use ponto decimal."
						>{#snippet children(describedBy)}<input
								id="natal-lat"
								inputmode="text"
								required
								bind:value={form.latitude}
								aria-describedby={describedBy}
							/>{/snippet}</Field
					>
					<Field id="natal-lon" label="Longitude" help="De -180 a 180; use ponto decimal."
						>{#snippet children(describedBy)}<input
								id="natal-lon"
								inputmode="text"
								required
								bind:value={form.longitude}
								aria-describedby={describedBy}
							/>{/snippet}</Field
					>
				</div>
				<Field
					id="natal-offset"
					label="Deslocamento UTC na data de nascimento"
					help="Exemplo: -03:00. Se houver horário repetido na mudança de fuso, este valor distingue os dois instantes. Não confirmamos regras históricas automaticamente."
					>{#snippet children(describedBy)}<input
							id="natal-offset"
							placeholder="±HH:MM"
							maxlength="9"
							required
							bind:value={form.offset}
							aria-describedby={describedBy}
						/>{/snippet}</Field
				>
				<Field
					id="natal-source"
					label="Fonte das coordenadas e do fuso"
					help="Indique a referência consultada, sem incluir documentos ou dados sensíveis."
					>{#snippet children(describedBy)}<input
							id="natal-source"
							maxlength="80"
							required
							bind:value={form.source}
							aria-describedby={describedBy}
						/>{/snippet}</Field
				>
			</fieldset>
			<fieldset class="consent" disabled={locked}>
				<legend>Sua escolha de armazenamento</legend>
				<label
					><input type="checkbox" bind:checked={consent} />Autorizo guardar estes dados na minha
					conta para recuperar e reutilizar meu próprio perfil natal.</label
				>
				<p class="help">
					Esta escolha não autoriza marketing, analytics, IA ou continuidade ATV+. Correções criam
					uma nova versão. Para apagar todas as versões natais, use a ação abaixo. Resultados já
					salvos na Biblioteca têm exclusão separada.
				</p>
				<a href="/privacidade">Leia como tratamos seus dados</a>
			</fieldset>
			<div class="actions">
				<Button
					type="submit"
					pending={busy}
					disabled={locked || !consent || form.precision === 'UNKNOWN'}>Salvar perfil natal</Button
				><Button variant="secondary" disabled={locked} onclick={() => action('begin')}
					>Completar depois</Button
				>
			</div>
		</form>
		{#if snapshot?.natal}<div class="manage">
				<h2>Gerencie o que fica guardado.</h2>
				<p>
					Apagar o perfil remove todas as suas versões natais. Não apaga sua conta nem resultados da
					Biblioteca, que podem conter cópias desses dados.
				</p>
				<div class="actions">
					<Button variant="destructive" disabled={locked} onclick={() => (confirmForget = true)}
						>Apagar perfil natal</Button
					><a href="/biblioteca">Gerenciar resultados na Biblioteca →</a>
				</div>
			</div>{/if}
	</section>
</div>
<Dialog bind:open={confirmForget} id="forget-natal" title="Apagar todas as versões natais?">
	<p>
		Esta ação não pode ser desfeita. Os dados de nascimento do seu perfil serão removidos. Sua conta
		e os resultados da Biblioteca não serão apagados.
	</p>
	<div class="actions">
		<Button variant="secondary" onclick={() => (confirmForget = false)}>Manter perfil</Button
		><Button variant="destructive" disabled={locked} onclick={() => action('forget-natal')}
			>Confirmar exclusão natal</Button
		>
	</div>
</Dialog>

<style>
	.onboarding {
		display: grid;
		grid-template-columns: minmax(14rem, 0.85fr) minmax(0, 1.7fr);
		gap: 2.5rem;
		max-width: 70rem;
		margin: 1rem auto 4rem;
		align-items: start;
	}
	h1 {
		font: 500 clamp(2.25rem, 3.4vw, 3.5rem)/1.08 var(--atv-font-display);
		margin: 0.75rem 0 1.5rem;
	}
	h2 {
		font: 500 1.65rem/1.2 var(--atv-font-display);
		margin: 0 0 1rem;
	}
	p {
		line-height: 1.65;
	}
	.orientation > p:not(.eyebrow),
	.help,
	.form-panel header > p:not(.eyebrow) {
		color: var(--atv-text-secondary);
	}
	.progress-block {
		border-block: 1px solid var(--atv-border);
		padding: 1.5rem 0;
		margin: 1.5rem 0;
	}
	ol {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.75rem;
		font-size: 0.875rem;
	}
	.care {
		padding-bottom: 2rem;
	}
	.form-panel {
		background: var(--atv-surface-card);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		padding: 2rem;
		min-width: 0;
	}
	fieldset {
		border: 0;
		border-top: 1px solid var(--atv-border);
		padding: 1.5rem 0;
		margin: 1rem 0 0;
		min-width: 0;
		display: grid;
		gap: 1.25rem;
	}
	legend {
		font-weight: 600;
		padding-right: 0.75rem;
		font-size: 0.9375rem;
	}
	.field-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
	}
	input,
	select {
		width: 100%;
		min-width: 0;
		font-size: 1rem;
	}
	.consent label {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		line-height: 1.6;
		cursor: pointer;
	}
	input[type='checkbox'] {
		flex: 0 0 1.25rem;
		width: 1.25rem;
		min-height: 1.25rem;
		margin-top: 0.25rem;
	}
	.help {
		font-size: 0.875rem;
		margin: 0;
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}
	.manage {
		border-top: 1px solid var(--atv-border);
		margin-top: 2rem;
		padding-top: 2rem;
	}
	.feedback {
		scroll-margin-top: 6rem;
		overflow-wrap: anywhere;
	}
	[role='alert'] {
		border-left: 3px solid var(--atv-action);
		padding: 0.75rem 1rem;
		background: var(--atv-surface-page);
	}
	@media (max-width: 1100px) {
		.onboarding {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.care {
			display: none;
		}
		h1 br {
			display: none;
		}
		.progress-block {
			margin-bottom: 1rem;
		}
	}
	@media (max-width: 600px) {
		.form-panel {
			padding: 1.25rem;
		}
		.field-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
