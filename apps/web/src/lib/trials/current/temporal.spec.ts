import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading } from '../reading';
import type { Position } from '../reconstruction/fact-graph';
import {
	composeCurrentTemporal,
	CURRENT_TEMPORAL_VERSION,
	temporalCommonSampleCount
} from './temporal';
import {
	temporalContactReading,
	temporalPairMeaning,
	temporalSharedTarget,
	temporalContext,
	type TemporalContact
} from './temporal-canon';

const natal: Position = {
	body: 'mercury',
	longitude: 0,
	sign: 0,
	house: 2,
	retrograde: false,
	factId: 'position-mercury'
};
const contact = (overrides: Partial<TemporalContact> = {}): TemporalContact => ({
	id: 'contact-a',
	transit: 'jupiter',
	natal: 'mercury',
	aspect: 'square',
	orb: 1,
	...overrides
});
const fixture = (productId: WorkflowInput['productId']): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId,
	targetDate: productId === 'solar-return' ? '2026-01-01' : '2026-10-15',
	...(['personal-calendar', 'career-forecast-30d'].includes(productId)
		? { forecastPeriod: 'rolling-30-days' as const }
		: {}),
	...(productId === 'solar-return'
		? {
				returnYear: 2026,
				returnLocation: {
					city: 'São Paulo',
					timezone: 'America/Sao_Paulo',
					latitude: -23.55,
					longitude: -46.63,
					locationSource: 'synthetic-return' as const
				}
			}
		: {}),
	context: 'Quero rever os acordos do relacionamento.',
	birth: {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	},
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
});
const samples = new Map<string, Promise<CalculationSnapshot>>();
const sample = (input: WorkflowInput) => {
	const key = JSON.stringify(input);
	if (!samples.has(key))
		samples.set(key, calculateTrial(input, '00000000-0000-4000-8000-000000000194'));
	return samples.get(key)!;
};

describe('current temporal interpretation: semantic dependence', () => {
	it('changing square to trine changes the mechanism between expansion and understanding', () => {
		const tension = temporalPairMeaning(contact());
		const ease = temporalPairMeaning(contact({ aspect: 'trine' }));
		expect(tension).toMatch(/detalh|conclus|informa/);
		expect(tension).toContain('mudança de maneira');
		expect(ease).toMatch(/visão ampla|ideia maior/);
		expect(ease).toContain('facilitar a passagem');
		expect(ease).not.toContain('mudança de maneira');
	});
	it('the natal sign and house modify the expression and concrete area, not only a technical label', () => {
		const fastMoney = temporalContactReading(contact(), natal).text;
		const steadyBond = temporalContactReading(contact(), { ...natal, sign: 1, house: 7 }).text;
		expect(fastMoney).toContain('formular o ponto principal e testar uma resposta direta');
		expect(fastMoney).toMatch(/dinheiro|recursos/);
		expect(steadyBond).toContain(
			'comparar a ideia com a experiência e procurar uma aplicação concreta'
		);
		expect(steadyBond).toMatch(/acordos|parcerias/);
		expect(steadyBond).not.toContain('formular o ponto principal e testar uma resposta direta');
		const withoutHouses = temporalContactReading(contact(), { ...natal, house: null });
		expect(withoutHouses.text).not.toContain('Na casa');
		expect(withoutHouses.factIds).not.toContain('house-2');
	});
	it('Saturn to Moon addresses care and obligation while Uranus to Venus addresses freedom in closeness', () => {
		const care = temporalPairMeaning(contact({ transit: 'saturn', natal: 'moon' }));
		const closeness = temporalPairMeaning(contact({ transit: 'uranus', natal: 'venus' }));
		expect(care).toMatch(/cuidado|acolhimento|apoio/);
		expect(closeness).toMatch(/liberdade|espaço|afinidade/);
		expect(care).not.toEqual(closeness);
	});
	it('a mixed shared target interprets support and friction together; ablation removes the combined claim', () => {
		const a = contact(),
			b = contact({ id: 'contact-b', transit: 'saturn', aspect: 'trine' });
		const shared = temporalSharedTarget(a, b, natal);
		expect(shared?.claim).toContain('A abertura de um contato não anula a tensão do outro');
		expect(shared?.factIds).toEqual(['contact-a', 'contact-b', 'position-mercury']);
		expect(temporalSharedTarget(a, { ...b, natal: 'venus' }, natal)).toBeNull();
		expect(temporalSharedTarget(a, a, natal)).toBeNull();
	});
	it('simultaneity requires shared grid points rather than overlapping first/last ranges', () => {
		const a = contact(),
			b = contact({ transit: 'saturn', aspect: 'trine' });
		expect(
			temporalCommonSampleCount(
				a,
				b,
				natal,
				[
					[0, 90, 130],
					[1, 100, 120]
				],
				['jupiter', 'saturn']
			)
		).toBe(0);
		expect(
			temporalCommonSampleCount(
				a,
				b,
				natal,
				[
					[0, 90, 130],
					[1, 90, 120]
				],
				['jupiter', 'saturn']
			)
		).toBe(1);
		expect(temporalCommonSampleCount(a, b, natal, [[0, 90, 130]], ['jupiter', 'saturn'])).toBe(0);
	});
	it('declared money and relationships change the practical question and relevance criteria', () => {
		const money = temporalContext('Quero rever minha renda e orçamento.'),
			bond = temporalContext('Quero rever os acordos do relacionamento.');
		expect(money.application).toContain('dinheiro');
		expect(money.houses).toEqual([2, 8]);
		expect(bond.application).toMatch(/relação|troca/);
		expect(bond.houses).toEqual([5, 7, 8]);
		expect(temporalContext(undefined).declared).toBe(false);
	});
});

describe('current temporal interpretation: real deterministic projections', () => {
	it('distinct weekly aspects receive distinct titles and pass the complete approval gate', async () => {
		const input = { ...fixture('week-reading'), targetDate: '2026-10-08', context: undefined },
			calculation = await sample(input),
			reading = composeCurrentTemporal(input, calculation)!;
		const moonSun = reading.sections.filter((s) => /Lua em .+ com Sol$/.test(s.title));
		expect(moonSun).toHaveLength(3);
		expect(new Set(reading.sections.map((s) => s.title)).size).toBe(reading.sections.length);
		expect(await approveTrialReading(input, calculation, reading)).not.toBeNull();
		const duplicated = structuredClone(reading);
		duplicated.sections[1].title = duplicated.sections[0].title;
		expect(await approveTrialReading(input, calculation, duplicated)).toBeNull();
	}, 30000);
	for (const id of [
		'date-reading',
		'week-reading',
		'personal-calendar',
		'career-forecast-30d',
		'solar-return'
	] as const) {
		it(`${id} produces supported conclusions from its own projection and preserves input`, async () => {
			const input = fixture(id),
				calculation = await sample(input),
				before = JSON.stringify(calculation);
			const reading = composeCurrentTemporal(input, calculation)!;
			expect(reading.version).toBe(CURRENT_TEMPORAL_VERSION);
			expect(reading.productId).toBe(id);
			expect(reading.interpretation?.conclusions.length).toBeGreaterThan(0);
			const facts = new Set(calculation.facts.map((f) => f.id));
			for (const c of reading.interpretation!.conclusions) {
				expect(reading.sections[c.section].text).toContain(c.claim);
				expect(c.factIds.length).toBeGreaterThanOrEqual(2);
				expect(c.factIds.every((f) => facts.has(f))).toBe(true);
			}
			expect(reading.sections.every((s) => s.factIds.every((f) => facts.has(f)))).toBe(true);
			expect(JSON.stringify(calculation)).toBe(before);
			expect(reading.questions).toEqual([]);
			const text = reading.sections.map((s) => s.text).join('\n');
			expect(text).not.toMatch(/vinte minutos|20 minutos|o universo garante|vai acontecer/);
			if (id === 'solar-return') {
				expect(reading.sections.filter((s) => /^Mês \d/.test(s.title))).toHaveLength(12);
				expect(text).toContain('repetir seu signo não distingue este ano');
				expect(
					reading.sections.some((s) => s.factIds.some((f) => f.startsWith('solar-month-')))
				).toBe(true);
			}
			if (id === 'week-reading')
				expect(reading.sections.some((s) => s.factIds.includes('week-period'))).toBe(true);
			if (id === 'date-reading') expect(reading.opening).toContain('12h UTC');
			if (id === 'career-forecast-30d') {
				const synthesis = reading.sections.find(
					(s) => s.title === 'O que essa combinação acrescenta às decisões de trabalho'
				);
				expect(synthesis?.text).toMatch(/compromisso|trabalho|profissional/);
				expect(synthesis?.factIds.length).toBeGreaterThanOrEqual(2);
				expect(reading.practice).toBe('');
			}
		}, 30000);
	}
	it('new windows of a recurring calendar theme resume its meaning without repeating a full paragraph', async () => {
		const input = fixture('personal-calendar');
		const reading = composeCurrentTemporal(input, await sample(input))!;
		const paragraphs = reading.sections
			.flatMap((section) => section.text.split('\n\n'))
			.filter((text) => text.length > 200);
		const duplicates = paragraphs.filter(
			(paragraph, index) => paragraphs.indexOf(paragraph) !== index
		);
		expect(duplicates).toEqual([]);
		const text = reading.sections.map((s) => s.text).join('\n');
		expect(text).toMatch(/nova passagem retoma|tema volta a aparecer|maior aproximação observada/);
	}, 30000);
	it('solar meaning joins the actual annual houses and uses a distinct closing conclusion', async () => {
		const input = fixture('solar-return');
		const reading = composeCurrentTemporal(input, await sample(input))!;
		const opening = reading.sections.find(
			(s) => s.title === 'O que você quer desenvolver e o que precisa sustentar'
		)!;
		expect(opening.text).toContain('Sol na casa');
		expect(opening.text).toContain('Lua na casa');
		expect(
			reading.interpretation!.conclusions.some(
				(c) =>
					c.relation.includes('aspecto anual') &&
					c.factIds.some((f) => f.startsWith('solar-annual-'))
			)
		).toBe(true);
		expect(reading.practice).toContain('A ligação ganha sentido');
		expect(opening.text).not.toContain(reading.practice);
		expect(reading.sections.map((s) => s.text).join('\n')).not.toMatch(
			/entre (\d{2}\/\d{2}\/\d{4}) e \1/
		);
	}, 30000);
	it('a missing source fact rejects composition rather than retaining an unsupported interpretation', async () => {
		const input = fixture('date-reading'),
			original = await sample(input),
			forged = structuredClone(original);
		forged.facts = forged.facts.filter((f) => !f.id.startsWith('date-transit-'));
		expect(() => composeCurrentTemporal(input, forged)).toThrow();
	});
	it('legacy snapshots and unrelated products stay outside this edition', async () => {
		const input = fixture('date-reading'),
			calculation = await sample(input);
		expect(
			composeCurrentTemporal(input, { ...calculation, version: 'atv-private-date-synthesis/3.0.0' })
		).toBeNull();
		expect(composeCurrentTemporal({ ...input, productId: 'birth-chart' }, calculation)).toBeNull();
		expect(
			composeCurrentTemporal(
				{ ...fixture('personal-calendar'), forecastPeriod: undefined },
				calculation
			)
		).toBeNull();
	});
});
