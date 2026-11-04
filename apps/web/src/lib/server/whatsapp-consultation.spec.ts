import { describe, expect, it } from 'vitest';
import {
	createConsultationCatalogue,
	replyToConsultation,
	type ConsultationCatalogue,
	type ConsultationOffer,
	type ConsultationProduct,
	type ConsultationState
} from './whatsapp-consultation';

const launchProducts: ConsultationProduct[] = [
	{
		id: 'wedding-date-map',
		name: 'Mapa da Data de Casamento',
		href: '/produtos/mapa-da-data-de-casamento',
		topicId: 'amor',
		scope: 'Compara duas ou três opções reais de cerimônia.',
		input: 'Datas, horários e cidade da cerimônia.'
	},
	{
		id: 'financial-blocks-tarot',
		name: 'Tarot dos Bloqueios Financeiros',
		href: '/produtos/tarot-dos-bloqueios-financeiros',
		topicId: 'tarot',
		scope: 'Explora um impasse ao cobrar e um primeiro passo.',
		input: 'Impasse, ação tentada e passo possível.'
	},
	{
		id: 'hidden-talent-map',
		name: 'Mapa do Talento Oculto',
		href: '/produtos/mapa-do-talento-oculto',
		topicId: 'proposito',
		scope: 'Explora dois favores reais e uma oferta experimental.',
		input: 'Dados natais e dois exemplos de favores.'
	}
];
const offer = (productId: string, href: string): ConsultationOffer => ({
	productId,
	href,
	available: true,
	checkoutAvailable: true,
	priceText: 'Consulte o preço vigente na ficha; a conta confirma elegibilidade de membro.',
	timingText: 'O prazo vigente aparece na ficha antes do pagamento.',
	deliveryText: 'Biblioteca da conta no site.'
});
const offers = [
	offer('synastry', '/produtos/analise-astral-do-casal'),
	offer('week-reading', '/produtos/horoscopo-semanal-pessoal'),
	offer('purpose-career', '/produtos/mapa-astral-dinheiro-carreira'),
	offer('tarot-situation-challenge-advice', '/produtos/tarot-3-cartas'),
	offer('atv-plus', '/atv-mais'),
	...launchProducts.map(({ id, href }) => offer(id, href))
];
const catalogue = () =>
	createConsultationCatalogue({
		verifiedFreeToolIds: ['ascendente', 'combinacao-do-casal', 'dinheiro-no-mapa', 'meio-do-ceu'],
		offers,
		registeredProducts: launchProducts
	});
const reply = (
	text: string,
	state?: ConsultationState,
	currentCatalogue: ConsultationCatalogue = catalogue()
) => replyToConsultation({ text, state, catalogue: currentCatalogue });

describe('WhatsApp consultation catalog authority', () => {
	it('fails closed without an explicitly verified destination', () => {
		const empty = createConsultationCatalogue();
		expect(empty.products).toEqual([]);
		expect(empty.freeToolIds).toEqual([]);
		expect(reply('Qual é meu ascendente?', undefined, empty).destination).toBeUndefined();
		expect(
			reply('Como combina meu mapa com meu parceiro?', undefined, empty).destination
		).toBeUndefined();
	});
	it('rejects absent checkout, withdrawn offers, mismatched routes and missing delivery facts', () => {
		const base = offers[0];
		for (const changed of [
			{ checkoutAvailable: false },
			{ available: false },
			{ href: 'https://evil.example/pay' },
			{ href: '/produtos/analise-astral-do-casal?birth=private' },
			{ deliveryText: '' },
			{ timingText: '' },
			{ priceText: '' }
		]) {
			expect(createConsultationCatalogue({ offers: [{ ...base, ...changed }] }).products).toEqual(
				[]
			);
		}
	});
	it('requires registered metadata for a newly published launch', () => {
		const snapshot = offer('wedding-date-map', '/produtos/mapa-da-data-de-casamento');
		expect(createConsultationCatalogue({ offers: [snapshot] }).products).toEqual([]);
		expect(
			createConsultationCatalogue({ offers: [snapshot], registeredProducts: launchProducts })
				.products[0].id
		).toBe('wedding-date-map');
	});
	it('does not admit unknown or partial free tools nor another message origin', () => {
		expect(
			createConsultationCatalogue({ verifiedFreeToolIds: ['horoscopo', 'nonexistent'] }).freeToolIds
		).toEqual([]);
		expect(() => createConsultationCatalogue({ origin: 'https://evil.example' })).toThrow();
	});
	it('bounds registered metadata and keeps choices and WhatsApp messages within transport limits', () => {
		const many = Array.from({ length: 12 }, (_, i) => ({
			id: `synthetic-${i}`,
			name: 'Nome sintético',
			href: `/produtos/synthetic-${i}`,
			topicId: 'amor',
			scope: 'Explicação sintética do alcance. '.repeat(20),
			input: 'Entrada sintética.'
		}));
		const current = createConsultationCatalogue({
			registeredProducts: many,
			offers: many.map(({ id, href }) => offer(id, href))
		});
		const result = reply('Quero conhecer produtos sobre amor', undefined, current);
		expect(result.state.choices).toHaveLength(10);
		expect(result.reply.length).toBeLessThan(4096);
		const invalid = { ...many[0], scope: 'a'.repeat(701) };
		expect(
			createConsultationCatalogue({
				registeredProducts: [invalid],
				offers: [offer(invalid.id, invalid.href)]
			}).products
		).toEqual([]);
	});
	it('uses canonical customer names and does not turn launch-registration metadata into an offer', () => {
		expect(catalogue().products.find(({ id }) => id === 'synastry')?.name).toBe(
			'Análise Astral do Casal'
		);
		expect(createConsultationCatalogue({ registeredProducts: launchProducts }).products).toEqual(
			[]
		);
	});
});

describe('WhatsApp consultation journeys', () => {
	it('starts the two-path menu for the exact public floating CTA message', () => {
		const result = reply('Olá! Quero conhecer a assistente virtual da ATVNA.');
		expect(result.state).toEqual({ step: 'menu' });
		expect(result.reply).toContain('1. Ver produtos digitais');
		expect(result.reply).toContain('2. Fazer uma consulta');
	});
	it('identifies the virtual assistant and offers both free guidance entry paths', () => {
		const first = reply('Oi');
		expect(first.reply).toContain('assistente virtual');
		expect(first.reply).toContain('orientação inicial é gratuita');
		expect(first.reply).toContain('1. Ver produtos digitais');
		expect(first.reply).toContain('2. Fazer uma consulta');
		expect(reply('1', first.state).state.step).toBe('topic');
		expect(reply('2', first.state).state.step).toBe('question');
	});
	it('uses an explicit first question directly and prefers the free ascendant calculator', () => {
		const result = reply('Qual é meu ascendente?');
		expect(result.intent).toBe('ascendant');
		expect(result.destination).toBe('https://atuavidanosastros.com.br/ferramentas/ascendente');
		expect(result.reply).toContain('grátis');
		expect(result.productId).toBeUndefined();
	});
	it('browses love using only currently verified free tools and purchasable offers', () => {
		const result = reply('Quero conhecer os produtos sobre amor.');
		expect(result.intent).toBe('browse-topic');
		expect(result.reply).toContain('Combinação Astral do Casal — grátis');
		expect(result.reply).toContain('Análise Astral do Casal');
		expect(result.reply).not.toContain('Dossiê');
		expect(reply('1', result.state).destination).toContain('/ferramentas/combinacao-do-casal');
	});
	it('provides the synastry scope, input, real delivery and existing commerce path', () => {
		const result = reply('Como meu mapa combina com o do meu parceiro?');
		expect(result.productId).toBe('synastry');
		expect(result.destination).toContain('/produtos/analise-astral-do-casal');
		expect(result.reply).toContain('autorização');
		expect(result.reply).toContain('Preço:');
		expect(result.reply).toContain('Prazo:');
		expect(result.reply).toContain('Biblioteca da conta');
		expect(result.reply).toContain('benefício de membro');
		expect(result.reply).not.toMatch(/24 horas|PDF|e-mail|desconto de/);
	});
	it('explains the free comparison is only a partial alternative if the full offer is withdrawn', () => {
		const current = createConsultationCatalogue({ verifiedFreeToolIds: ['combinacao-do-casal'] });
		const result = reply('Quero comparar meu mapa com meu parceiro.', undefined, current);
		expect(result.destination).toContain('/ferramentas/combinacao-do-casal');
		expect(result.reply).toContain('alternativa parcial');
		expect(result.reply).toContain('não substitui a leitura completa');
		expect(result.productId).toBeUndefined();
	});
	it('separates a one-off week from future recurring forecasts', () => {
		expect(reply('Quero ver as tendências desta semana').productId).toBe('week-reading');
		const recurring = reply('Quero recebê-las toda semana');
		expect(recurring.productId).toBe('atv-plus');
		expect(recurring.destination).toBe('https://atuavidanosastros.com.br/atv-mais');
		expect(recurring.reply).toContain('programação do plano');
	});
	it('routes concrete ceremony options only after the launch has been registered and released', () => {
		const result = reply('Tenho duas datas para a cerimônia');
		expect(result.productId).toBe('wedding-date-map');
		expect(result.reply).toContain('duas ou três datas reais');
		const withoutLaunch = createConsultationCatalogue({ offers });
		expect(
			reply('Tenho duas datas para a cerimônia', undefined, withoutLaunch).destination
		).toBeUndefined();
	});
	it('never substitutes a date comparison for predicting a future marriage', () => {
		const result = reply('Quando vou me casar?');
		expect(result.intent).toBe('marriage-prediction');
		expect(result.destination).toBeUndefined();
		expect(result.reply).toContain('não prevê');
	});
	it('clarifies prosperity and distinguishes natal career, charging and the first service', () => {
		const question = reply('Quero prosperar');
		expect(question.state.step).toBe('prosper');
		expect(reply('1', question.state).productId).toBe('purpose-career');
		expect(reply('Fico sem jeito na hora de cobrar pelo que faço', question.state).productId).toBe(
			'financial-blocks-tarot'
		);
		expect(reply('Faço de graça uma coisa que todo mundo me pede', question.state).productId).toBe(
			'hidden-talent-map'
		);
	});
	it('does not send a purchase link for an unreleased charging launch', () => {
		const current = createConsultationCatalogue({ offers: offers.slice(0, 5) });
		const result = reply('Fico sem jeito ao cobrar', undefined, current);
		expect(result.intent).toBe('charging-impasse');
		expect(result.destination).toBeUndefined();
		expect(result.reply).toContain('não está disponível');
	});
	it('does not promise to feed the WhatsApp question into the three-card reading', () => {
		const result = reply('Quero olhar uma situação pelo Tarot e entender o desafio e o conselho');
		expect(result.productId).toBe('tarot-situation-challenge-advice');
		expect(result.reply).toContain('não exige uma pergunta');
		expect(result.reply).toContain('não é enviada automaticamente');
	});
	it('supports correction, restart and voluntary exit without preserving the prior interpretation', () => {
		const initial = reply('Quero prosperar');
		const corrected = reply('não era isso', initial.state);
		expect(corrected.state).toEqual({ step: 'question' });
		expect(reply('Qual é meu ascendente?', corrected.state).intent).toBe('ascendant');
		expect(reply('voltar', corrected.state).state.step).toBe('menu');
		const exited = reply('sair', initial.state);
		expect(exited.state).toEqual({ step: 'closed' });
		expect(reply('menu', exited.state).state.step).toBe('menu');
	});
	it('rechecks a previously selected destination against the newly resolved catalog', () => {
		const selected = reply('Como meu mapa combina com o do meu parceiro?');
		const withdrawn = reply('ver ficha', selected.state, createConsultationCatalogue());
		expect(withdrawn.destination).toBeUndefined();
		expect(withdrawn.reply).toContain('não está disponível');
		const freeSelected = reply('Qual é meu ascendente?');
		expect(
			reply('abrir', freeSelected.state, createConsultationCatalogue()).destination
		).toBeUndefined();
	});
	it('admits uncertainty and offers correction or theme browsing instead of a random sale', () => {
		const result = reply('Meu cachorro vai encontrar o brinquedo?');
		expect(result.intent).toBe('no-coverage');
		expect(result.destination).toBeUndefined();
		expect(result.reply).toContain('corrigir');
		expect(result.reply).toContain('produtos');
	});
	it('keeps birth data and narrative out of categorical state and does not echo them', () => {
		const sensitive = 'Nasci em 02/02/2002 às 15h. Qual é meu ascendente?';
		const result = reply(sensitive);
		expect(result.state).toEqual({ step: 'choice', choices: ['free-ascendente'] });
		expect(JSON.stringify(result)).not.toContain('02/02/2002');
		expect(reply('a'.repeat(2001)).state.step).toBe('question');
	});
});
