<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { workflowFor } from '@atv/domain';
	import Button from '$lib/components/ui/Button.svelte';
	import { NATAL_REQUEST_VERSION } from '$lib/natal-request';
	import { parseOnboardingSnapshot, type OnboardingSnapshot } from '$lib/onboarding';
	import type { IntakeAccess } from '$lib/symbolic-intake';
	import { createWorkflowRequest, type WorkflowRequestState } from '$lib/workflow-request';
	let { ownerId, productId, access }: { ownerId: string; productId: string; access: IntakeAccess } =
		$props();
	let controller: ReturnType<typeof createWorkflowRequest> | undefined;
	let initialized = $state(false);
	let snapshot = $state<OnboardingSnapshot | null>(null);
	let profileMessage = $state('Consulte seu perfil para revisar os dados deste pedido.');
	let loading = $state(false);
	let busy = $state(false);
	let consent = $state(false);
	let feedback: HTMLParagraphElement | undefined = $state();
	let outcome = $state<WorkflowRequestState>({
		mode: 'blocked',
		message: 'Preparando recuperação segura nesta aba.'
	});
	const product = $derived(workflowFor(productId));
	const canEnter = $derived(
		access === 'AVAILABLE' &&
			outcome.mode === 'new' &&
			snapshot?.state === 'COMPLETE' &&
			snapshot.natal?.timePrecision === 'EXACT' &&
			!loading &&
			!busy
	);
	const accessMessage = $derived(
		access === 'AVAILABLE'
			? 'Você pode solicitar o processamento. Isso não significa que já exista resultado ou interpretação aprovada.'
			: access === 'UNRELEASED'
				? 'Este produto ainda não está liberado. Nenhum modelo está homologado. Você pode consultar um pedido anterior.'
				: access === 'ACCESS_REQUIRED'
					? 'Seu acesso não permite criar este pedido agora. A consulta de pedidos anteriores continua disponível.'
					: 'Não foi possível confirmar a disponibilidade. Nenhum novo pedido será enviado.'
	);
	onMount(() => {
		try {
			controller = createWorkflowRequest({
				operation: { kind: 'create-natal', ownerId },
				productId,
				storage: sessionStorage,
				fetch,
				randomUUID: () => crypto.randomUUID()
			});
			outcome = controller.inspect();
		} catch {
			outcome = {
				mode: 'blocked',
				message:
					'Não foi possível preservar a chave de recuperação nesta aba. Consulte sua Biblioteca.'
			};
		}
		initialized = true;
	});
	async function readProfile() {
		if (loading || busy) return;
		loading = true;
		consent = false;
		snapshot = null;
		profileMessage = 'Consultando perfil salvo…';
		try {
			const response = await fetch('/api/onboarding', {
				credentials: 'same-origin',
				cache: 'no-store',
				signal: AbortSignal.timeout(10000)
			});
			const payload: unknown = await response.json();
			const value =
				payload &&
				typeof payload === 'object' &&
				!Array.isArray(payload) &&
				Object.keys(payload).length === 1 &&
				'onboarding' in payload
					? parseOnboardingSnapshot(payload.onboarding)
					: null;
			if (!response.ok || !value) throw new Error('unavailable');
			snapshot = value;
			profileMessage = !value.natal
				? 'Complete e consinta o armazenamento do perfil natal antes de criar este pedido.'
				: value.natal.timePrecision !== 'EXACT'
					? 'Seu horário está registrado como aproximado. Este produto exige horário exato; não transforme uma estimativa em certeza.'
					: 'Perfil consultado. Confira os dados e autorize este pedido separadamente.';
		} catch {
			profileMessage =
				'Não foi possível consultar seu perfil. Nenhum dado foi alterado. Tente novamente ou entre na sua conta.';
		} finally {
			loading = false;
		}
	}
	async function focusFeedback() {
		await tick();
		feedback?.focus();
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!controller || !canEnter || !consent || !snapshot) return;
		busy = true;
		const input = {
			version: NATAL_REQUEST_VERSION,
			productId,
			expectedRevision: snapshot.revision,
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		};
		outcome = await controller.perform(true, input);
		consent = false;
		snapshot = null;
		profileMessage =
			'Para preparar outro envio, consulte novamente o perfil e revise o consentimento.';
		busy = false;
		await focusFeedback();
	}
	async function recover() {
		if (!controller || busy || loading) return;
		busy = true;
		outcome = await controller.perform(false);
		busy = false;
		await focusFeedback();
	}
	function another() {
		if (!controller || busy || loading) return;
		outcome = controller.startAnother();
		consent = false;
		snapshot = null;
	}
</script>

<section class="intake" data-stitch="ID-02 SH-02" aria-labelledby="natal-product-title">
	<header>
		<p class="eyebrow">Meu Céu · novo pedido</p>
		<h1 id="natal-product-title">{product?.name}</h1>
		<p class="lead">Seu céu começa nos dados que você escolheu guardar.</p>
		<p class="access-note">{accessMessage}</p>
	</header>
	<div class="workspace">
		<div>
			<section aria-labelledby="profile-title" class="profile">
				<h2 id="profile-title">1. Confira seu perfil natal</h2>
				<p role="status">{profileMessage}</p>
				{#if snapshot?.natal}
					<dl>
						<div>
							<dt>Data e hora local</dt>
							<dd>{snapshot.natal.localDateTime.replace('T', ' · ')}</dd>
						</div>
						<div>
							<dt>Precisão informada</dt>
							<dd>{snapshot.natal.timePrecision === 'EXACT' ? 'Exata' : 'Aproximada'}</dd>
						</div>
						<div>
							<dt>Local de nascimento</dt>
							<dd>{snapshot.natal.locationLabel} · {snapshot.natal.countryCode}</dd>
						</div>
						<div>
							<dt>Coordenadas</dt>
							<dd>{snapshot.natal.latitude}, {snapshot.natal.longitude}</dd>
						</div>
						<div>
							<dt>Fuso e instante UTC</dt>
							<dd>{snapshot.natal.timezone} · {snapshot.natal.utcInstant}</dd>
						</div>
						<div>
							<dt>Revisão consultada</dt>
							<dd>{snapshot.revision}</dd>
						</div>
					</dl>
				{/if}
				<div class="actions">
					<Button
						variant="secondary"
						pending={loading}
						disabled={!initialized || busy}
						onclick={readProfile}>Consultar perfil salvo</Button
					><a href="/conta/nascimento">Revisar dados de nascimento</a>
				</div>
			</section>
			<form method="POST" onsubmit={submit}>
				<fieldset disabled={!canEnter}>
					<legend>2. Autorize este pedido</legend>
					<label class="consent"
						><input
							type="checkbox"
							required
							bind:checked={consent}
							aria-describedby="natal-retention"
						/>Autorizo guardar uma cópia dos dados natais conferidos e os resultados deste pedido na
						minha conta.</label
					>
					<p id="natal-retention" class="privacy">
						Apagar o perfil natal não apaga a cópia já vinculada a um pedido. O pedido e seu
						histórico são gerenciados separadamente na Biblioteca. Esta autorização não inclui
						marketing nem continuidade automática ATV+.
					</p>
					<Button type="submit" pending={busy} disabled={!canEnter || !consent}>Criar pedido</Button
					>
				</fieldset>
			</form>
			<div class="recovery">
				{#if outcome.message}<p bind:this={feedback} role="status" tabindex="-1">
						{outcome.message}
					</p>{/if}
				{#if outcome.mode === 'recover'}<Button
						variant="secondary"
						pending={busy}
						disabled={loading}
						onclick={recover}>Consultar pedido original</Button
					>{/if}
				{#if outcome.href}<div class="actions">
						<Button href={outcome.href}>Abrir pedido na Biblioteca</Button><Button
							variant="secondary"
							disabled={busy || loading || access !== 'AVAILABLE'}
							onclick={another}>Preparar outro pedido</Button
						>
					</div>{/if}
			</div>
		</div>
		<aside aria-label="Método e continuidade">
			<p class="eyebrow">Da origem à leitura</p>
			<h2>Precisão antes da interpretação.</h2>
			<p>
				Um horário aproximado não será tratado como exato. Mesmo com dados exatos, o motor e a
				revisão editorial têm limites próprios.
			</p>
			<ol>
				<li>O pedido guarda uma cópia imutável do perfil conferido.</li>
				<li>O motor valida e calcula os dados separadamente.</li>
				<li>A interpretação depende de avaliação e liberação editorial.</li>
			</ol>
			<p>
				Você acompanha o estado na Biblioteca. Um pedido salvo não é uma leitura pronta; não
				prometemos PDF, áudio ou outros downloads antes da liberação.
			</p>
			<a href="/biblioteca">Voltar à Biblioteca →</a>
		</aside>
	</div>
</section>

<style>
	.intake {
		max-width: 1280px;
		margin: 0 auto;
		color: var(--atv-text-primary);
	}
	header {
		border-bottom: 1px solid var(--atv-border);
		padding-bottom: 2rem;
		margin-bottom: 2rem;
	}
	h1 {
		font-family: var(--atv-font-display);
		font-size: clamp(2rem, 4vw, 3.5rem);
		line-height: 1.12;
		margin: 0.7rem 0 1rem;
	}
	h2,
	legend {
		font-family: var(--atv-font-display);
		font-size: 1.6rem;
		line-height: 1.25;
	}
	.lead {
		font-family: var(--atv-font-editorial);
		font-size: 1.25rem;
		max-width: 42rem;
	}
	.access-note {
		border-left: 3px solid #bf9153;
		padding: 0.8rem 1rem;
		margin-top: 1.5rem;
		max-width: 48rem;
	}
	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(230px, 1fr);
		gap: 2.5rem;
		align-items: start;
	}
	.workspace > div {
		min-width: 0;
	}
	.profile {
		border-bottom: 1px solid var(--atv-border);
		padding-bottom: 2rem;
		margin-bottom: 2rem;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	dt {
		font-size: 0.8rem;
		margin-bottom: 0.35rem;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
		font-variant-numeric: tabular-nums;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		margin-bottom: 1rem;
	}
	.consent {
		display: flex;
		align-items: flex-start;
		gap: 0.8rem;
		min-height: 44px;
		line-height: 1.6;
	}
	.consent input {
		flex: 0 0 auto;
		margin-top: 0.3rem;
	}
	.privacy {
		font-size: 0.875rem;
		line-height: 1.6;
		margin: 1rem 0 1.5rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}
	.recovery {
		margin-top: 1.5rem;
	}
	aside {
		border-left: 1px solid var(--atv-border);
		padding-left: 2rem;
		line-height: 1.75;
	}
	ol {
		padding-left: 1.25rem;
	}
	li {
		margin-bottom: 0.9rem;
	}
	a {
		text-underline-offset: 0.2em;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	@media (max-width: 767px) {
		.workspace {
			grid-template-columns: minmax(0, 1fr);
			gap: 2rem;
		}
		aside {
			border-left: 0;
			border-top: 1px solid var(--atv-border);
			padding: 1.5rem 0 0;
		}
		dl {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
