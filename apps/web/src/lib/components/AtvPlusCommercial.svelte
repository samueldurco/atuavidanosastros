<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		atvPlusCommercialPlans,
		atvPlusCommercialOffers,
		atvPlusCommercialPlanFor
	} from '@atv/domain';
	import type { CommercialPageState } from '$lib/server/atv-plus-commercial-page';
	import CitySearch from './CitySearch.svelte';
	import type { CityLocation } from '$lib/city-location';
	let {
		membershipState,
		now,
		message = ''
	}: { membershipState: CommercialPageState; now: number; message?: string } = $props();
	let term = $state(3);
	let samplePlan = $state('essencial');
	const sampleEditions: Record<string, { title: string; cadence: string; sections: string[] }> = {
		essencial: {
			title: 'Seu horóscopo pessoal',
			cadence: 'Uma edição a cada quinze dias',
			sections: [
				'O período de quinze dias',
				'Temas do seu horóscopo personalizado',
				'Datas e reflexão para acompanhar'
			]
		},
		ampliado: {
			title: 'Trânsitos e Tarot do período',
			cadence: 'Trânsitos semanais e Tarot mensal',
			sections: [
				'A semana e os seus trânsitos',
				'Temas e datas da leitura semanal',
				'Tarot complementar na edição mensal'
			]
		},
		premium: {
			title: 'Uma semana em profundidade',
			cadence: 'Horóscopo e Tarot aprofundado semanais',
			sections: [
				'O seu horóscopo personalizado da semana',
				'Datas e temas do período',
				'Tarot aprofundado que complementa a semana'
			]
		}
	};
	const sample = $derived(sampleEditions[samplePlan]);
	let location = $state<CityLocation | null>(null);
	let saving = $state(false);
	const memberships = $derived(
		membershipState.memberships.filter(
			(row) =>
				['ACTIVE', 'CANCELLED'].includes(row.status) &&
				Date.parse(row.starts_at) <= now &&
				Date.parse(row.ends_at) > now
		)
	);
	const date = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(
			new Date(value)
		);
	const amount = (value: number) =>
		new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
	const names: Record<string, string> = {
		'solar-return': 'Revolução Solar',
		'natal-brief': 'Mapa natal resumido',
		'natal-full': 'Mapa natal completo',
		'personal-horoscope': 'Horóscopo personalizado',
		'transit-reading': 'Leitura de trânsitos',
		'predictive-tarot': 'Tarot preditivo',
		'deep-predictive-tarot': 'Tarot preditivo aprofundado'
	};
	const deliveryName = (kind: string) => names[kind] ?? 'Leitura do seu plano';
	const deliveryStatus = (value: string) =>
		({
			DELIVERED: 'Entregue',
			SCHEDULED: 'Programada',
			PENDING: 'Aguardando preparação',
			BLOCKED: 'Aguardando liberação',
			PROCESSING: 'Em preparação',
			READY: 'Pronta para envio',
			FAILED: 'Envio será reavaliado',
			CANCELLED: 'Encerrada'
		})[value.toUpperCase()] ?? 'Em acompanhamento';
	const locationPayload = $derived(
		location
			? JSON.stringify({
					label: location.label,
					timezone: location.timezone,
					latitude: location.latitude,
					longitude: location.longitude,
					countryCode: location.countryCode
				})
			: ''
	);
</script>

<header class="commercial-hero">
	<div class="hero-copy">
		<p class="eyebrow">Leituras pessoais, ao longo do tempo</p>
		<h1>ATV<span>+</span></h1>
		<p class="hero-lead">Seu próximo ciclo começa agora.<br />As previsões seguem com você.</p>
		<p>
			Receba a próxima Revolução Solar na entrada e acompanhe as datas adiante com leituras
			programadas do seu plano, em PDF pelo WhatsApp.
		</p>
		<a class="primary-link" href="#planos">Conhecer os planos <span aria-hidden="true">↘</span></a>
	</div>
	<div class="solar-art">
		<img
			src="/brand/mvp/assets/product-final/sol-gravado-v1.webp"
			alt=""
			width="420"
			height="420"
		/>
		<p>O seu ano à frente<br /><span>uma leitura para começar</span></p>
	</div>
</header>

<section class="first-delivery" aria-labelledby="first-delivery-title">
	<p class="section-number" aria-hidden="true">01</p>
	<div>
		<p class="eyebrow">Em todos os planos</p>
		<h2 id="first-delivery-title">A próxima Revolução Solar é a primeira entrega.</h2>
		<p>
			Após a contratação e a confirmação dos seus dados e do WhatsApp, você recebe de imediato o PDF
			da sua próxima Revolução Solar. Isso vale também para o plano trimestral, mesmo que o
			aniversário aconteça depois do fim da assinatura.
		</p>
		<p>
			Informe a data, a hora e a cidade de nascimento, além da cidade onde pretende estar na próxima
			Revolução Solar. Depois, as previsões chegam nas datas futuras do calendário contratado. A
			cada novo ciclo anual elegível, há uma nova Revolução Solar.
		</p>
	</div>
</section>

<section id="planos" aria-labelledby="plans-title">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Três formas de acompanhar</p>
			<h2 id="plans-title">Escolha o ritmo das suas leituras</h2>
		</div>
		<label class="term"
			>Duração da assinatura
			<select bind:value={term}
				><option value={3}>Trimestral · 3 meses</option><option value={6}
					>Semestral · 6 meses</option
				><option value={12}>Anual · 12 meses</option></select
			>
		</label>
	</div>
	<div class="commercial-plans">
		{#each atvPlusCommercialPlans as plan, index (plan.id)}
			{@const offer = atvPlusCommercialOffers.find(
				(row) => row.planId === plan.id && row.termMonths === term
			)}
			{@const available = membershipState.offers.find(
				(row) => row.id === offer?.id && row.commercial_enabled
			)}
			<article class:premium={plan.id === 'premium'} data-offer-id={offer?.id}>
				<p class="eyebrow">0{index + 1} · {term} meses</p>
				<h3>{plan.name}</h3>
				<p>{plan.description}</p>
				<ul>
					{#each plan.benefits as benefit (benefit)}<li>{benefit}</li>{/each}
				</ul>
				<div class="offer-action">
					{#if available?.commercial_enabled && available.total_minor}
						<p class="price">
							{amount(available.total_minor)} <small>pelo período completo</small>
						</p>
						<p class="small">Pagamento único por {term} meses. Renovação por nova contratação.</p>
						{#if membershipState.authenticated}
							<form method="POST" action="?/checkout">
								<input type="hidden" name="offerId" value={offer?.id} /><button class="primary-link"
									>Contratar {plan.name} ↗</button
								>
							</form>
						{:else}<a class="primary-link" href="/entrar?next=%2Fatv-mais"
								>Entrar para contratar ↗</a
							>{/if}
					{:else}<p class="availability">Contratação em preparação</p>{/if}
				</div>
			</article>
		{/each}
	</div>
	<p class="small">
		Os três planos têm opções de 3, 6 ou 12 meses. Os mapas natais de presente são concedidos uma
		vez por pessoa e tipo de mapa, inclusive nas renovações e mudanças de plano. As condições e o
		valor total aparecem antes da contratação.
	</p>
</section>

<section class="edition" aria-labelledby="edition-title">
	<div>
		<p class="eyebrow">Conheça a entrega</p>
		<h2 id="edition-title">Uma edição para cada período</h2>
		<p>
			Explore a organização de cada plano. A sua leitura usa os seus dados e o período indicado no
			calendário.
		</p>
		<label class="term"
			>Exemplo de plano<select bind:value={samplePlan}
				>{#each atvPlusCommercialPlans as plan (plan.id)}<option value={plan.id}>{plan.name}</option
					>{/each}</select
			></label
		>
		<p>
			O serviço é de envio programado. Consultas individuais, perguntas ao leitor e grupos não fazem
			parte da assinatura.
		</p>
	</div>
	<div
		class="sample"
		aria-label="Exemplo ilustrativo da estrutura de uma edição, sem interpretação pessoal"
	>
		<p class="eyebrow">ATV+ · exemplo de formato</p>
		<h3>{sample.title}</h3>
		<p>{sample.cadence}</p>
		<ol>
			{#each sample.sections as section (section)}<li><strong>{section}</strong></li>{/each}
		</ol>
		<p class="small">Amostra de estrutura. Não contém uma previsão pessoal.</p>
	</div>
</section>

<section class="member-area" aria-labelledby="member-title">
	<p class="eyebrow">Sua assinatura</p>
	<h2 id="member-title">Dados e próximas entregas</h2>
	{#if message}<p role="status" class="feedback">{message}</p>{/if}
	{#if membershipState.unavailable}
		<p role="status">
			Não foi possível consultar sua assinatura agora. Recarregue a página em alguns instantes.
		</p>
	{:else if !membershipState.authenticated}
		<p>
			Entre na sua conta para acompanhar sua assinatura, completar os dados e conferir o calendário.
		</p>
		<a href="/entrar?next=%2Fatv-mais">Entrar na minha conta ↗</a>
	{:else if !memberships.length}
		<p>
			Sua conta ainda não tem uma assinatura vigente do ATV+. Quando a contratação estiver
			disponível, o plano escolhido aparecerá aqui.
		</p>
	{:else}
		{#each memberships as membership (membership.id)}
			<div class="membership">
				<h3>{atvPlusCommercialPlanFor(membership.plan_id)?.name}</h3>
				<p>Vigência de {date(membership.starts_at)} a {date(membership.ends_at)}.</p>
				{#if membership.status === 'CANCELLED'}<p>
						Renovação encerrada. Seus benefícios seguem até o fim do período pago.
					</p>{/if}
				{#if !membership.onboarded_at}
					{#if membershipState.profileId}
						<form
							method="POST"
							action="?/onboard"
							use:enhance={() => {
								saving = true;
								return async ({ update }) => {
									try {
										await update();
									} finally {
										saving = false;
									}
								};
							}}
						>
							<input type="hidden" name="membershipId" value={membership.id} /><input
								type="hidden"
								name="profileId"
								value={membershipState.profileId}
							/>
							<p>
								Usaremos o <a href="/conta/nascimento">perfil natal salvo na sua conta</a>. Confira
								os dados antes de continuar.
							</p>
							<label for={`phone-${membership.id}`}>WhatsApp com código do país</label><input
								id={`phone-${membership.id}`}
								type="tel"
								name="whatsapp"
								autocomplete="tel"
								placeholder="+55 11 99999 9999"
								required
								maxlength="24"
							/>
							<CitySearch
								id={`solar-city-${membership.id}`}
								label="Cidade da próxima Revolução Solar"
								bind:value={location}
							/>
							<input type="hidden" name="solarLocation" value={locationPayload} />
							<label class="consent"
								><input type="checkbox" name="whatsappConsent" value="yes" required />Autorizo o
								envio das leituras contratadas e avisos de entrega pelo WhatsApp informado.</label
							>
							<button class="primary-link" disabled={saving || !location}
								>{saving ? 'Salvando…' : 'Salvar dados para as entregas'}</button
							>
						</form>
					{:else}<p>
							Complete e autorize o <a href="/conta/nascimento">seu perfil natal</a> para preparar as
							leituras.
						</p>{/if}
				{/if}
			</div>
		{/each}
		{#if membershipState.contact}<p>
				WhatsApp {membershipState.contact.whatsapp_masked} · {membershipState.contact.verified
					? 'Confirmado'
					: 'Aguardando confirmação do número'}
			</p>{/if}
		{#if membershipState.deliveries.length}<div class="calendar-wrap">
				<table>
					<caption>Calendário da assinatura</caption><thead
						><tr
							><th scope="col">Leitura</th><th scope="col">Entrega prevista</th><th scope="col"
								>Situação</th
							></tr
						></thead
					><tbody>
						{#each membershipState.deliveries as delivery (delivery.id)}<tr
								><td>{deliveryName(delivery.kind)}</td><td>{date(delivery.due_at)}</td><td
									>{deliveryStatus(delivery.state)}</td
								></tr
							>{/each}
					</tbody>
				</table>
			</div>{:else}<p>
				As datas das próximas entregas aparecerão após a confirmação do cadastro.
			</p>{/if}
	{/if}
</section>

<style>
	.commercial-hero {
		display: grid;
		grid-template-columns: 1.25fr 0.75fr;
		align-items: center;
		gap: 3rem;
		padding: 1rem 0 4rem;
	}
	.hero-copy > p {
		max-width: 42rem;
	}
	.commercial-hero h1 {
		font: 400 clamp(5rem, 11vw, 8rem)/1 var(--atv-font-editorial);
		margin: 0.8rem 0 1.8rem;
		letter-spacing: -0.05em;
	}
	h1 span {
		color: #a36632;
	}
	.hero-lead {
		font: 400 clamp(1.8rem, 3.2vw, 2.8rem)/1.15 var(--atv-font-editorial);
		color: #183746;
	}
	.solar-art {
		position: relative;
		text-align: center;
		padding: 2rem 0;
		border-bottom: 1px solid #bda676;
		background: radial-gradient(ellipse, #e9d6a746, transparent 70%);
	}
	.solar-art img {
		width: 100%;
		max-width: 350px;
		height: auto;
		mix-blend-mode: multiply;
	}
	.solar-art p {
		font: 400 1.65rem/1.2 var(--atv-font-editorial);
		margin-top: 0.8rem;
	}
	.solar-art span {
		font: 400 0.85rem/1.6 var(--atv-font-body);
	}
	h2 {
		font: 400 clamp(1.8rem, 3vw, 2.5rem)/1.15 var(--atv-font-editorial);
		margin: 0.6rem 0 1.25rem;
	}
	h3 {
		font: 400 1.85rem/1.15 var(--atv-font-editorial);
		margin: 0.7rem 0 1.25rem;
	}
	.primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		min-height: 48px;
		padding: 0.8rem 1.25rem;
		background: #183746;
		color: #fff8e9;
		text-decoration: none;
		border: 1px solid #183746;
		font: 600 0.9rem/1.4 var(--atv-font-body);
		cursor: pointer;
	}
	.primary-link:hover {
		background: #2c4d58;
	}
	.primary-link:disabled {
		opacity: 0.65;
		cursor: wait;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 3px solid #a36632;
		outline-offset: 4px;
	}
	.first-delivery {
		display: grid;
		grid-template-columns: 3rem 1fr;
		gap: 1rem;
		padding: 2.5rem;
		background: #e6e5d6;
		border-top: 1px solid #bca77c;
		margin-bottom: 4rem;
	}
	.first-delivery p {
		max-width: 58rem;
	}
	.section-number {
		white-space: nowrap;
		font: italic 1.75rem var(--atv-font-editorial);
		color: #a36632;
	}
	.section-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 2rem;
		margin-bottom: 1.5rem;
	}
	.term {
		display: grid;
		gap: 0.6rem;
		min-width: 240px;
		font-size: 0.9rem;
	}
	select,
	input[type='tel'] {
		font: inherit;
		color: #183746;
		background: #fff8e9;
		border: 1px solid #9b957d;
		min-height: 48px;
		padding: 0.7rem;
	}
	.commercial-plans {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.2rem;
	}
	.commercial-plans article {
		padding: clamp(1.3rem, 2.5vw, 2rem);
		background: #faf3e5;
		border: 1px solid #c7bfac;
		border-top: 4px solid #a68f61;
		display: flex;
		flex-direction: column;
	}
	.commercial-plans article:nth-child(2) {
		background: #e9ede4;
	}
	.commercial-plans article.premium {
		background: #e3e9e7;
		border-top-color: #183746;
	}
	.commercial-plans ul {
		padding-left: 1.15rem;
		flex: 1;
	}
	li + li {
		margin-top: 0.7rem;
	}
	.offer-action {
		border-top: 1px solid #c7bfac;
		padding-top: 1rem;
		margin-top: 1rem;
	}
	.availability {
		font-size: 0.9rem;
	}
	.price {
		font: 400 1.8rem var(--atv-font-editorial);
	}
	.price small {
		display: block;
		font: 400 0.85rem var(--atv-font-body);
	}
	.small {
		font-size: 0.88rem;
		line-height: 1.65;
		color: #596365;
	}
	.edition {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		margin: 4rem 0;
		padding: 3rem 0;
		border-top: 1px solid #c7bfac;
		border-bottom: 1px solid #c7bfac;
	}
	.sample {
		padding: 2rem;
		background: #fff8e9;
		border: 1px solid #c7bfac;
		box-shadow: 7px 7px 0 #d5d9c6;
	}
	.sample ol {
		padding-left: 1.25rem;
	}
	.sample li {
		padding: 0.5rem;
	}
	.member-area {
		padding: 2.5rem;
		background: #e7e9dc;
		border: 1px solid #c7bfac;
		margin: 3rem 0;
	}
	.membership {
		border-top: 1px solid #c7bfac;
		margin-top: 2rem;
		padding-top: 1rem;
	}
	.membership form {
		display: grid;
		gap: 1rem;
		max-width: 40rem;
	}
	.membership form > input[type='tel'] {
		max-width: 26rem;
	}
	.consent {
		display: flex;
		align-items: start;
		gap: 0.75rem;
	}
	.consent input {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin-top: 3px;
	}
	.feedback {
		padding: 1rem;
		background: #fff8e9;
		border-left: 3px solid #a36632;
	}
	.calendar-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 440px;
		text-align: left;
		margin: 2rem 0;
	}
	caption {
		text-align: left;
		font-weight: 600;
		padding-bottom: 1rem;
	}
	th,
	td {
		padding: 1rem 0.5rem;
		border-bottom: 1px solid #c7bfac;
	}
	th {
		font-size: 0.85rem;
	}
	@media (max-width: 760px) {
		.commercial-hero {
			grid-template-columns: 1fr;
			gap: 1rem;
			padding-bottom: 2rem;
		}
		.solar-art {
			max-width: 280px;
			margin: auto;
			padding: 0;
		}
		.solar-art img {
			max-width: 220px;
		}
		.section-heading {
			display: block;
		}
		.term {
			margin-top: 1.5rem;
		}
		.commercial-plans,
		.edition {
			grid-template-columns: 1fr;
		}
		.edition {
			gap: 2rem;
			margin: 2.5rem 0;
		}
		.first-delivery {
			padding: 1.5rem 1.25rem;
			grid-template-columns: 2rem 1fr;
			gap: 0.5rem;
			margin-bottom: 2.5rem;
		}
		.member-area {
			padding: 1.4rem;
		}
		.commercial-hero h1 {
			font-size: 6rem;
		}
		.commercial-plans article {
			padding: 1.6rem;
		}
	}
</style>
