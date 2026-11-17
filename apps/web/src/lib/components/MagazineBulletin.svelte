<script lang="ts">
	import { enhance } from '$app/forms';
	import { mvpArt } from '$lib/data/mvp-visual';

	let { receipt }: { receipt?: string } = $props();
	let feedback = $state<string>();
	let pending = $state(false);
	const messages: Record<string, string> = {
		received: 'Cadastro recebido. Seu e-mail entrou na lista do Boletim ATVNA.',
		'invalid-email': 'Confira se o e-mail está completo e tente de novo.',
		'missing-consent': 'Marque a opção se quiser receber o boletim por e-mail.',
		unavailable: 'O cadastro está indisponível agora. Tente novamente em alguns instantes.'
	};
	const status = $derived(feedback ?? receipt);
</script>

<section class="bulletin" id="boletim" aria-labelledby="bulletin-title">
	<div class="bulletin-intro">
		<img src={mvpArt('bussola-gravada')} alt="" width="76" height="76" loading="lazy" />
		<div>
			<h2 id="bulletin-title">Boletim ATVNA</h2>
			<p>
				Inscreva-se para receber por e-mail novidades sobre trânsitos, guias e o horóscopo da
				semana.
			</p>
		</div>
	</div>
	<form
		method="POST"
		action="/revista?/boletim#boletim"
		use:enhance={({ cancel }) => {
			if (pending) {
				cancel();
				return;
			}
			pending = true;
			feedback = '';
			return async ({ result, formElement, update }) => {
				pending = false;
				if (result.type === 'success' || result.type === 'failure') {
					if (typeof result.data?.bulletin === 'string') feedback = result.data.bulletin;
					if (result.type === 'success') formElement.reset();
					return;
				}
				await update();
			};
		}}
	>
		<label for="bulletin-email">Seu e-mail</label>
		<div class="bulletin-fields">
			<input
				id="bulletin-email"
				name="email"
				type="email"
				autocomplete="email"
				maxlength="254"
				required
			/>
			<button type="submit" disabled={pending}>{pending ? 'Inscrevendo…' : 'Inscrever-se'}</button>
		</div>
		<label class="consent">
			<input type="checkbox" name="consent" value="yes" required />
			<span
				>Quero receber o boletim por e-mail. <a href="/privacidade">Política de privacidade</a
				></span
			>
		</label>
		<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" hidden />
		{#if status && messages[status]}<p class="feedback" role="status">{messages[status]}</p>{/if}
	</form>
</section>

<style>
	.bulletin {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem 2rem;
		align-items: start;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--atv-border);
		background: var(--atv-paper-1);
		color: var(--atv-text-primary);
		scroll-margin-top: 7rem;
	}
	.bulletin-intro {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	img {
		width: clamp(3rem, 7vw, 4.75rem);
		height: auto;
		flex: none;
		object-fit: contain;
	}
	h2 {
		margin: 0;
		font-size: clamp(1.65rem, 3vw, 2.3rem);
		line-height: 1.05;
	}
	p {
		margin: 0.4rem 0 0;
		font-size: 0.94rem;
	}
	form > label:first-child {
		display: block;
		margin-bottom: 0.4rem;
		font-weight: 650;
		font-size: 0.88rem;
	}
	.bulletin-fields {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.4rem;
	}
	input[type='email'],
	button {
		min-height: 2.75rem;
		border: 1px solid var(--atv-text-primary);
		border-radius: 0.25rem;
		font: inherit;
		padding: 0.55rem 0.75rem;
	}
	input[type='email'] {
		width: 100%;
		background: var(--atv-paper-0);
		color: inherit;
	}
	button {
		background: var(--atv-text-primary);
		color: var(--atv-paper-0);
		font-weight: 650;
		cursor: pointer;
	}
	button:disabled {
		cursor: wait;
		opacity: 0.7;
	}
	.consent {
		display: flex;
		align-items: start;
		gap: 0.5rem;
		margin-top: 0.65rem;
		font-size: 0.84rem;
	}
	.consent input {
		margin-top: 0.22rem;
		accent-color: var(--atv-text-primary);
	}
	.consent a {
		text-decoration: underline;
	}
	.feedback {
		margin-top: 0.6rem;
		font-weight: 650;
	}
	@media (max-width: 760px) {
		.bulletin {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 370px) {
		.bulletin-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
