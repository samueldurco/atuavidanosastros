<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		atvPlusCommercialPlans,
		atvPlusCommercialOffers,
		atvPlusCommercialPlanFor
	} from '@atv/domain';
	import type { CommercialPageState } from '$lib/server/atv-plus-commercial-page';
	import CitySearch from './CitySearch.svelte';
	import AtvPlusDeliveryArtwork from './AtvPlusDeliveryArtwork.svelte';
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

<div class="atv-plus-showroom">
	<header class="commercial-hero">
		<div class="hero-copy">
			<p class="eyebrow">Leituras pessoais, ao longo do tempo</p>
			<h1>ATV<span>+</span></h1>
			<p class="hero-lead">Um novo olhar,<br /><em>a cada período.</em></p>
			<p>
				Receba a próxima Revolução Solar na entrada e acompanhe as datas adiante com leituras
				programadas do seu plano, em PDF pelo WhatsApp.
			</p>
			<a class="primary-link" href="#planos">Conhecer os planos <span aria-hidden="true">↘</span></a
			>
			<a class="quiet-link" href="#por-dentro"
				>Ver por dentro da leitura <span aria-hidden="true">↗</span></a
			>
			<p class="hero-format">Leituras pessoais em PDF · envio programado pelo WhatsApp</p>
		</div>
		<figure class="signature-art">
			<div class="signature-house">A Tua Vida nos Astros · assinatura</div>
			<AtvPlusDeliveryArtwork />
			<figcaption>
				Seu ano à frente. Suas próximas leituras.<span
					>Apresentação ilustrativa dos PDFs e da leitura no celular.</span
				>
			</figcaption>
		</figure>
	</header>

	<section class="first-delivery" aria-labelledby="first-delivery-title">
		<figure class="solar-art">
			<AtvPlusDeliveryArtwork mode="solar" />
			<figcaption>01 / Uma leitura para começar · apresentação ilustrativa</figcaption>
		</figure>
		<div class="first-copy">
			<p class="eyebrow">Seu ano à frente · em todos os planos</p>
			<h2 id="first-delivery-title">A próxima Revolução Solar é a primeira entrega.</h2>
			<p class="first-intro">
				Uma leitura do período que vai de um aniversário ao outro, preparada com os seus dados.
			</p>
			<p>
				Após a contratação e a confirmação dos seus dados e do WhatsApp, você recebe de imediato o
				PDF da sua próxima Revolução Solar. Isso vale também para o plano trimestral, mesmo que o
				aniversário aconteça depois do fim da assinatura.
			</p>
			<p>
				Informe a data, a hora e a cidade de nascimento, além da cidade onde pretende estar na
				próxima Revolução Solar. Depois, as previsões chegam nas datas futuras do calendário
				contratado. A cada novo ciclo anual elegível, há uma nova Revolução Solar.
			</p>
			<div class="delivery-format">
				<span>FORMATO<strong>PDF pessoal</strong></span><span
					>COMO CHEGA<strong>Pelo WhatsApp</strong></span
				><span>DEPOIS<strong>Leituras programadas</strong></span>
			</div>
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
					<div class="plan-art"><AtvPlusDeliveryArtwork planId={plan.id} mode="plan" /></div>
					<p class="eyebrow">0{index + 1} · Assinatura de {term} meses</p>
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
									<input type="hidden" name="offerId" value={offer?.id} /><button
										class="primary-link">Contratar {plan.name} ↗</button
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
		<p class="small plan-conditions">
			Os três planos têm opções de 3, 6 ou 12 meses. Os mapas natais de presente são concedidos uma
			vez por pessoa e tipo de mapa, inclusive nas renovações e mudanças de plano. As condições e o
			valor total aparecem antes da contratação.
		</p>
	</section>

	<section id="por-dentro" class="edition" aria-labelledby="edition-title">
		<div class="edition-copy">
			<p class="eyebrow">Por dentro da leitura</p>
			<h2 id="edition-title">Abra uma edição.<br /><em>Conheça o que chega até você.</em></h2>
			<p>
				Um PDF pessoal para ler no celular e voltar quando quiser. Explore os temas e o ritmo de
				cada plano: a sua leitura usa os seus dados e o período indicado no calendário.
			</p>
			<label class="term"
				>Exemplo de plano<select bind:value={samplePlan}
					>{#each atvPlusCommercialPlans as plan (plan.id)}<option value={plan.id}
							>{plan.name}</option
						>{/each}</select
				></label
			>
			<ol class="edition-chapters">
				{#each sample.sections as section, index (section)}<li>
						<span>0{index + 1}</span>{section}
					</li>{/each}
			</ol>
			<p>
				O serviço é de envio programado. Consultas individuais, perguntas ao leitor e grupos não
				fazem parte da assinatura.
			</p>
		</div>
		<figure
			class="sample"
			aria-label="Exemplo ilustrativo da estrutura de uma edição, sem interpretação pessoal"
		>
			<div class="sample-heading">
				<span>ATV+ · AMOSTRA DA LEITURA</span><span>PDF + CELULAR</span>
			</div>
			<AtvPlusDeliveryArtwork mode="inside" planId={samplePlan} />
			<figcaption>
				<strong>{sample.title}</strong><span>{sample.cadence}</span><small
					>Apresentação ilustrativa do formato. Não contém uma previsão pessoal.</small
				>
			</figcaption>
		</figure>
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
				Entre na sua conta para acompanhar sua assinatura, completar os dados e conferir o
				calendário.
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
									Usaremos o <a href="/conta/nascimento">perfil natal salvo na sua conta</a>.
									Confira os dados antes de continuar.
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
</div>

<style>
	.atv-plus-showroom {
		color: #fff8e9;
	}
	.commercial-hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(2rem, 5vw, 5rem);
		align-items: center;
		padding: 1rem 0 4rem;
	}
	.hero-copy > p {
		max-width: 35rem;
	}
	.eyebrow {
		color: #e8bd6b;
	}
	.commercial-hero h1 {
		font: 400 clamp(5rem, 9vw, 8rem)/0.85 var(--font-display, Newsreader, Georgia, serif);
		letter-spacing: -0.065em;
		margin: 1.5rem 0;
		color: #efcf94;
	}
	h1 span {
		font-size: 0.62em;
		vertical-align: top;
		letter-spacing: -0.02em;
	}
	.hero-lead {
		font: 400 clamp(2.5rem, 4vw, 3.8rem)/1.02 var(--font-display, Newsreader, Georgia, serif);
		letter-spacing: -0.035em;
		margin: 1.5rem 0;
	}
	.hero-copy > p:not(.eyebrow):not(.hero-lead) {
		color: #e0e4dc;
	}
	.hero-copy .hero-format {
		font-size: 0.72rem;
		margin-top: 1.5rem;
	}
	.primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		min-height: 48px;
		padding: 0.9rem 1.25rem;
		background: #fff8e9;
		color: #102c3d;
		border: 1px solid #fff8e9;
		text-decoration: none;
		font: 600 0.85rem/1.4 var(--font-body, Onest, Arial, sans-serif);
		cursor: pointer;
	}
	.primary-link:hover {
		background: #efcf94;
		border-color: #efcf94;
	}
	.primary-link:disabled {
		opacity: 0.65;
		cursor: wait;
	}
	.quiet-link {
		display: inline-flex;
		gap: 0.7rem;
		font-size: 0.8rem;
		margin: 1rem 0 0 1.25rem;
		color: #fff8e9;
		text-underline-offset: 5px;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 3px solid #cf9a44;
		outline-offset: 4px;
	}
	.signature-art {
		position: relative;
		margin: 0;
		padding: 20px 12px 22px;
		border: 1px solid #d9b87970;
		background:
			radial-gradient(ellipse at 50% 0%, #a5834928, transparent 75%),
			linear-gradient(135deg, #284653, #102f3e 60%, #213e49);
		box-shadow: inset 0 0 0 7px #102d3a;
	}
	.signature-house {
		color: #efcf94;
		text-align: center;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
	}
	.signature-art figcaption {
		text-align: center;
		color: #efcf94;
		font: 400 1.3rem var(--font-display, Newsreader, Georgia, serif);
		padding: 0 10px;
	}
	.signature-art figcaption span {
		display: block;
		color: #e0e4dc;
		font: 400 0.6rem/1.6 var(--font-body, Onest, Arial, sans-serif);
		margin-top: 7px;
	}
	h2 {
		font: 400 clamp(2rem, 3.4vw, 3rem)/1.08 var(--font-display, Newsreader, Georgia, serif);
		letter-spacing: -0.025em;
		margin: 0.6rem 0 1.25rem;
		text-wrap: balance;
	}
	h3 {
		font: 400 1.95rem/1.1 var(--font-display, Newsreader, Georgia, serif);
		margin: 0.7rem 0 1rem;
		letter-spacing: -0.02em;
	}
	.first-delivery {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		align-items: center;
		gap: clamp(1.5rem, 4vw, 4rem);
		padding: clamp(1.5rem, 4vw, 3rem);
		margin-bottom: 4.5rem;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp') center/cover;
		color: #183746;
		border: 1px solid #d9b87980;
	}
	.first-copy .eyebrow {
		color: #80551f;
	}
	.first-copy p {
		font-size: 0.85rem;
		line-height: 1.8;
	}
	.first-copy .first-intro {
		font: 400 1.35rem/1.45 var(--font-display, Newsreader, Georgia, serif);
	}
	.solar-art {
		margin: 0;
		background: #d6e1df80;
		border: 1px solid #18374620;
		padding: 15px 10px;
	}
	.solar-art figcaption {
		font-size: 0.55rem;
		letter-spacing: 0.08em;
		text-align: center;
		text-transform: uppercase;
	}
	.delivery-format {
		display: grid;
		grid-template-columns: 1fr 1fr 1.3fr;
		gap: 0.8rem;
		border-top: 1px solid #18374630;
		padding-top: 1.25rem;
		margin-top: 1.6rem;
	}
	.delivery-format > span {
		font-size: 0.5rem;
		letter-spacing: 0.09em;
	}
	.delivery-format strong {
		display: block;
		font: 400 1rem/1.2 var(--font-display, Newsreader, Georgia, serif);
		margin-top: 8px;
		letter-spacing: 0;
	}
	#planos,
	.edition {
		scroll-margin-top: 6rem;
	}
	.section-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 2rem;
		margin-bottom: 1.8rem;
	}
	.section-heading h2 {
		max-width: 36rem;
		margin-bottom: 0;
	}
	.term {
		display: grid;
		gap: 0.6rem;
		min-width: 240px;
		font-size: 0.8rem;
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
		position: relative;
		isolation: isolate;
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: clamp(1.25rem, 2.5vw, 2rem);
		border: 1px solid #bfa77770;
		background: linear-gradient(150deg, #2a4855, #153340);
	}
	.commercial-plans article:before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: url('/brand/mvp/assets/papel-fino.webp') center/400px;
		opacity: 0.09;
		mix-blend-mode: screen;
	}
	.commercial-plans article:nth-child(2) {
		background: linear-gradient(150deg, #294a54, #183644);
	}
	.commercial-plans article.premium {
		background: linear-gradient(150deg, #3a4b50, #102d3d 70%);
		border-color: #d5b479;
		box-shadow: inset 0 3px 0 #d5b479;
	}
	.plan-art {
		margin: -0.25rem -1rem 0.75rem;
		border-bottom: 1px solid #e7c78b35;
	}
	.commercial-plans article > p:not(.eyebrow) {
		color: #e0e4dc;
		font-size: 0.86rem;
		line-height: 1.6;
	}
	.commercial-plans .eyebrow {
		font-size: 0.6rem;
		letter-spacing: 0.11em;
	}
	.commercial-plans ul {
		padding-left: 1.1rem;
		flex: 1;
		font-size: 0.78rem;
		line-height: 1.7;
		color: #e0e4dc;
		margin: 0.6rem 0;
	}
	li + li {
		margin-top: 0.7rem;
	}
	.commercial-plans li::marker {
		color: #efcf94;
	}
	.offer-action {
		border-top: 1px solid #d9b87950;
		padding-top: 1rem;
		margin-top: 1rem;
	}
	.availability {
		color: #efcf94;
		font-size: 0.8rem;
		margin: 0;
	}
	.price {
		font: 400 1.8rem var(--font-display, Newsreader, Georgia, serif);
	}
	.price small {
		display: block;
		font: 400 0.85rem var(--font-body, Onest, Arial, sans-serif);
	}
	.small {
		font-size: 0.78rem;
		line-height: 1.8;
		color: #d7ded8;
	}
	.plan-conditions {
		max-width: 67rem;
		margin-top: 1.4rem;
	}
	.edition {
		display: grid;
		grid-template-columns: 0.85fr 1.15fr;
		gap: clamp(2rem, 5vw, 4rem);
		align-items: center;
		margin: 4.5rem 0;
		padding: 4rem 0;
		border-block: 1px solid #d9b87950;
	}
	.edition-copy > p:not(.eyebrow) {
		font-size: 0.85rem;
		line-height: 1.85;
		color: #e0e4dc;
	}
	.edition .term {
		max-width: 28rem;
		margin: 1.6rem 0;
	}
	.edition-chapters {
		list-style: none;
		padding: 0;
		margin: 1.8rem 0;
	}
	.edition-chapters li {
		display: flex;
		gap: 1rem;
		align-items: baseline;
		border-top: 1px solid #d9b87940;
		padding: 0.8rem 0;
		margin: 0;
		font-size: 0.78rem;
	}
	.edition-chapters li > span {
		color: #efcf94;
		font: italic 1.2rem var(--font-display, Newsreader, Georgia, serif);
	}
	.sample {
		min-width: 0;
		margin: 0;
		padding: 20px 18px;
		background: radial-gradient(ellipse at 0 0, #b3a27225, transparent 70%), #294854;
		border: 1px solid #d9b87970;
	}
	.sample-heading {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding-bottom: 14px;
		border-bottom: 1px solid #d9b87940;
		color: #efcf94;
		font-size: 0.5rem;
		letter-spacing: 0.12em;
	}
	.sample figcaption {
		display: grid;
		gap: 6px;
		padding: 10px 5px 0;
		text-align: center;
	}
	.sample figcaption strong {
		font: 400 1.6rem var(--font-display, Newsreader, Georgia, serif);
		color: #fff8e9;
	}
	.sample figcaption > span {
		font-size: 0.7rem;
		color: #efcf94;
	}
	.sample figcaption small {
		font-size: 0.6rem;
		color: #e0e4dc;
		line-height: 1.6;
	}
	.member-area {
		padding: clamp(1.4rem, 4vw, 3rem);
		background: #e7e9dc url('/brand/mvp/assets/papel-fino.webp') center/cover;
		color: #183746;
		border: 1px solid #c7bfac;
		margin: 3rem 0;
	}
	.member-area .eyebrow {
		color: #80551f;
	}
	.member-area a {
		color: #183746;
		text-underline-offset: 4px;
	}
	.member-area .primary-link {
		background: #183746;
		color: #fff8e9;
		border-color: #183746;
	}
	.member-area .primary-link:hover {
		background: #2c4d58;
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
	@media (max-width: 1000px) {
		.commercial-hero {
			gap: 2rem;
		}
		.quiet-link {
			margin-left: 0;
			display: flex;
		}
		.first-delivery {
			grid-template-columns: 0.75fr 1fr;
		}
		.commercial-plans {
			gap: 0.8rem;
		}
		.commercial-plans article {
			padding: 1.2rem;
		}
		.commercial-plans h3 {
			font-size: 1.65rem;
		}
		.commercial-plans ul {
			font-size: 0.74rem;
		}
		.edition {
			grid-template-columns: 1fr 1.1fr;
			gap: 2rem;
		}
	}
	@media (max-width: 760px) {
		.commercial-hero {
			grid-template-columns: 1fr;
			gap: 2rem;
			padding-bottom: 2.5rem;
		}
		.commercial-hero h1 {
			font-size: 6rem;
		}
		.hero-lead {
			font-size: clamp(2.5rem, 8vw, 3.5rem);
		}
		.hero-copy .hero-format {
			font-size: 0.65rem;
		}
		.signature-art {
			width: 100%;
			max-width: 540px;
			justify-self: center;
			box-sizing: border-box;
			padding: 20px 12px;
		}
		.first-delivery {
			grid-template-columns: 1fr;
			padding: 1.25rem;
			gap: 1.8rem;
			margin-bottom: 3rem;
		}
		.solar-art {
			max-width: 420px;
			width: 100%;
			box-sizing: border-box;
			justify-self: center;
		}
		.first-copy h2 {
			font-size: 2.2rem;
		}
		.delivery-format {
			gap: 0.6rem;
		}
		.delivery-format strong {
			font-size: 0.95rem;
		}
		.section-heading {
			display: block;
		}
		.section-heading .term {
			margin-top: 1.5rem;
		}
		.term {
			min-width: 0;
		}
		.commercial-plans {
			grid-template-columns: 1fr;
			gap: 1.3rem;
		}
		.commercial-plans article {
			padding: 1.5rem;
		}
		.commercial-plans h3 {
			font-size: 2rem;
		}
		.commercial-plans ul {
			font-size: 0.83rem;
		}
		.commercial-plans article > p:not(.eyebrow) {
			font-size: 0.9rem;
		}
		.edition {
			grid-template-columns: 1fr;
			margin: 3rem 0;
			padding: 3rem 0;
			gap: 1.5rem;
		}
		.sample {
			padding: 16px 12px;
		}
		.sample-heading {
			font-size: 0.45rem;
		}
		.member-area {
			margin-top: 2rem;
		}
	}
</style>
