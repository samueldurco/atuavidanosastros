import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createCareerCompassFullBasisCalculator } from '../../../../../worker/src/career-compass-full-basis';
import { calculateTrial } from '../../server/trial-calculation';
import { executeTrialRuntime } from '../../server/trial-computation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { latestReadingVersion } from '../versions';
import {
	assertCompassProjection,
	compassAngularContacts,
	COMPASS_VERSION,
	COMPASS_READING_VERSION,
	COMPASS_READING_VERSION_V5,
	type CompassData
} from './compass-facts';
import {
	compassContext,
	compassSelection,
	composeReconstructedCompass,
	reviewReconstructedCompass
} from './compass';
import {
	compassQaCounterfactuals,
	compassQaProfiles,
	type CompassQaProfile
} from './compass-qa-profiles';
import { normalizeFactGraph } from './fact-graph';
import { prepareCareerCompassV6Origin } from './compass-origin';
import { purposeHouseAt } from './purpose-facts';

const runId = '00000000-0000-4000-8000-000000000150';
const input = (
	context = 'Quero comparar a atividade atual com uma alternativa de trabalho.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'career-compass',
	context,
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
let cached: CalculationSnapshot;
const sample = async () => (cached ??= await calculateTrial(input(), runId));
const saveQaProfiles = async (
	profiles: CompassQaProfile[],
	directory: string,
	indexFile: string
) => {
	await mkdir(directory, { recursive: true });
	const variants = [];
	for (const profile of profiles) {
		const calculation = await calculateTrial(profile.input, profile.id);
		const reading = composeTrialReading(profile.input, calculation);
		const approval = await approveTrialReading(profile.input, calculation, reading);
		expect(reading.version, profile.slug).toBe(COMPASS_READING_VERSION);
		expect(reading.sections, profile.slug).toHaveLength(11);
		expect(approval, profile.slug).not.toBeNull();
		const saved: SavedTrial = {
			id: profile.id,
			product_id: profile.input.productId,
			created_at: '2026-10-14T18:30:00Z',
			input: profile.input,
			calculation,
			reading,
			approval: approval!
		};
		expect(await executeTrialRuntime({ operation: 'verify', saved }), profile.slug).toBe(true);
		await writeFile(`${directory}/${profile.slug}.json`, JSON.stringify(saved, null, 2));
		variants.push({ name: profile.slug, input: profile.input, reading });
	}
	await writeFile(indexFile, JSON.stringify(variants, null, 2));
	return variants;
};
describe('Bússola de Carreira: fonte íntegra, contexto e hipóteses verificáveis', () => {
	it('preserves the full native source, houses, MC ruler and the finite method', async () => {
		const c = await sample(),
			d = c.data as unknown as CompassData;
		expect(c.version).toBe(COMPASS_VERSION);
		expect(d.positions).toHaveLength(10);
		expect(d.houses.cusps).toHaveLength(12);
		for (const f of d.natal.facts) expect(c.facts).toContainEqual(f);
		expect(d.regent.house).toBe(
			purposeHouseAt(d.positions.find((p) => p.body === d.regent.body)!.longitude, d.houses.cusps)
		);
		expect(d.method.selection).toMatchObject({
			personalWeight: 5,
			rulerWeight: 6,
			themeWeight: 4,
			contextWeight: 8,
			maximumAspects: 3
		});
		expect(d.method.applyingSeparating).toBe(false);
		expect(latestReadingVersion('career-compass')).toBe(COMPASS_READING_VERSION);
		assertCompassProjection(input(), c);
	});
	it('includes exact angular limits and wrap-around without widening the policy', async () => {
		const p = (await sample()).data.positions as CompassData['positions'];
		expect(compassAngularContacts([{ ...p[0], longitude: 2 }], 359)).toHaveLength(1);
		expect(compassAngularContacts([{ ...p[0], longitude: 2.00001 }], 359)).toHaveLength(0);
		expect(compassAngularContacts([{ ...p[0], longitude: 356 }], 359)).toHaveLength(1);
	});
	it('preserves every source fact and cites the selected evidence in eleven substantial chapters', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c);
		expect(reviewReconstructedCompass(input(), c, r)).toEqual([]);
		expect(r.sections).toHaveLength(11);
		expect(r.sections.every((s) => s.text.length >= 220)).toBe(true);
		expect(r.editorial!.themes.map((t) => t.id)).toEqual([
			'contribution',
			'motivation',
			'environment',
			'working-style',
			'sustainability'
		]);
		const sourceIds = new Set(c.facts.map((fact) => fact.id));
		expect(sourceIds.size).toBe(c.facts.length);
		expect(r.sections.flatMap((section) => section.factIds).every((id) => sourceIds.has(id))).toBe(
			true
		);
		expect(new Set(r.sections.flatMap((section) => section.factIds))).toEqual(sourceIds);
		expect(r.questions).toHaveLength(3);
		expect(r.sections.find((s) => s.title.includes('vinte minutos'))!.text).toContain(
			'evidência contrária'
		);
		expect(await approveTrialReading(input(), c, r)).not.toBeNull();
	});
	it('changes priority, selection, opening, questions and experiment for declared workload versus study', async () => {
		const a = input('Estou com sobrecarga e preciso preservar descanso.'),
			b = input('Quero avaliar um curso de formação antes de me inscrever.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId),
			ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(ca.data.positions).toEqual(cb.data.positions);
		expect(ca.data.angles).toEqual(cb.data.angles);
		expect(ra.editorial!.plan[2].role).toBe('sustainability');
		expect(rb.editorial!.plan[2].role).toBe('motivation');
		expect(ra.editorial!.selection).not.toEqual(rb.editorial!.selection);
		expect(ra.opening).not.toBe(rb.opening);
		expect(ra.opening).toContain('condições que permitiriam descansar');
		expect(ra.opening).not.toContain('qual apoio permite descansar');
		expect(ra.opening).not.toContain('entrega pequena e avaliável');
		expect(ra.sections.find((s) => s.title.includes('vinte minutos'))!.text).toContain(
			'registro opcional'
		);
		expect(ra.sections.find((s) => s.title.includes('vinte minutos'))!.text).toContain(
			'O descanso e o adiamento são resultados válidos'
		);
		expect(rb.sections.find((s) => s.title.includes('vinte minutos'))!.text).toContain(
			'dois exercícios'
		);
		expect(rb.sections.find((s) => s.title.includes('vinte minutos'))!.text).toContain(
			'Defina a habilidade que quer experimentar'
		);
		expect(rb.sections.find((s) => s.title.includes('vinte minutos'))!.text).toContain(
			'No segundo, revisite a mesma dúvida ou explicação, se houver'
		);
		expect(ra.questions[0]).not.toBe(rb.questions[0]);
		expect(ra.sections.find((s) => s.title.startsWith('Seu contexto'))!.text).toContain(a.context);
		expect(rb.sections.find((s) => s.title.startsWith('Seu contexto'))!.text).toContain(b.context);
		const studyRelations = rb.sections.find((s) => s.title.startsWith('Tensões e recursos'))!.text;
		expect(studyRelations).toContain('exercício');
		expect(studyRelations).not.toMatch(
			/carga e a ajuda foram combinadas|padrão de qualidade foi negociado|controlar as pessoas envolvidas/
		);
		expect(studyRelations).not.toContain('Anote qual etapa exige apoio ou uma mudança de escopo');
		expect(compassSelection(normalizeFactGraph(ca)).map((s) => s.aspect.factId)).toEqual(
			ra.editorial!.selection.map((s) => s.factId)
		);
	});
	it('selects different natal relationships for distinct contexts on the same birth', async () => {
		const profiles = compassQaProfiles.slice(0, 5);
		const calculations = await Promise.all(
			profiles.map((profile) => calculateTrial(profile.input, profile.id))
		);
		const signatures = calculations.map((calculation) =>
			compassSelection(normalizeFactGraph(calculation))
				.map(({ aspect }) => aspect.factId)
				.join('|')
		);
		const scores = calculations.map((calculation) =>
			compassSelection(normalizeFactGraph(calculation))
				.map(({ score }) => score.toFixed(3))
				.join('|')
		);
		const chapters = calculations.map(
			(calculation, index) =>
				composeTrialReading(profiles[index].input, calculation).sections.find(
					(section) => section.title === 'Tensões e recursos: três relações em contexto'
				)?.text ?? ''
		);
		expect(
			calculations.every(
				(calculation) =>
					JSON.stringify(calculation.data.positions) ===
					JSON.stringify(calculations[0].data.positions)
			)
		).toBe(true);
		expect(new Set(signatures).size).toBeGreaterThanOrEqual(2);
		expect(new Set(scores).size).toBeGreaterThanOrEqual(3);
		expect(new Set(chapters).size).toBe(profiles.length);
		expect(chapters[0]).toContain('desenhar');
		expect(chapters[1]).toContain('modelagem');
		for (let index = 1; index <= 3; index++)
			expect(chapters[0].split('\n\n')[index]).not.toBe(chapters[1].split('\n\n')[index]);
		expect(chapters[4]).not.toContain('Reserve uma etapa para reservar');
	});
	it.each([
		['Quero me tornar ilustradora sem perder minha renda.', 'ilustradora'],
		['Pretendo atuar com cerâmica mantendo meu emprego.', 'cerâmica'],
		['Tenho interesse em ilustração editorial sem abandonar meu trabalho.', 'ilustração editorial']
	])('recognizes a parallel career intention phrased as %s', (report, target) => {
		const binding = compassContext(report);
		expect(binding.key).toBe('transition');
		expect(binding.scene).toContain(target);
		expect(binding.task).toContain(target);
	});
	it('does not turn a negated parallel intention into a transition', () => {
		expect(compassContext('Não quero me tornar ilustradora sem perder minha renda.').key).toBe(
			'general'
		);
	});
	it('keeps feedback from another person optional in a drawing probe', () => {
		const binding = compassContext('Quero testar ilustração editorial mantendo meu emprego.');
		expect(binding.probe?.criterion).toContain('você consegue enunciar a ideia principal');
		expect(binding.task).toContain('Se desejar mostrar a imagem a alguém');
		expect(binding.task).toContain(
			'sem esse retorno, não conclua nada sobre a compreensão de terceiros'
		);
	});
	it('binds explicit team and independent contexts without changing natal geometry', () => {
		expect(compassContext('Preciso organizar a equipe.')).toMatchObject({
			key: 'leadership',
			priority: ['environment', 'contribution']
		});
		expect(compassContext('Quero avaliar um projeto próprio.').task).toContain(
			'sem assumir compromisso financeiro'
		);
		expect(compassContext().key).toBe('general');
	});
	it.each([
		['Quero testar a cerâmica mantendo meu emprego.', 'a cerâmica', 'o emprego atual'],
		['Quero experimentar desenho sem abandonar renda.', 'desenho', 'a renda atual'],
		[
			'Quero testar ilustração editorial preservando minha atividade atual.',
			'ilustração editorial',
			'a atividade atual'
		]
	])('reads a parallel trial and its actual constraint: %s', (context, target, constraint) => {
		const binding = compassContext(context);
		expect(binding.key).toBe('transition');
		expect(binding.priority).toEqual(['contribution', 'environment']);
		expect(binding.scene).toContain(`experimentar ${target} enquanto preserva ${constraint}`);
		expect(binding.focus).toContain(`preservar ${constraint}`);
		expect(binding.question).toContain(`preservando ${constraint}`);
		expect(binding.scene).not.toMatch(/experimentar (?:meu emprego|renda|minha atividade)/);
	});
	it('does not turn a negated trial into an intention to change work', () => {
		const binding = compassContext('Não quero testar cerâmica sem abandonar minha renda.');
		expect(binding.scene).toBeUndefined();
		expect(binding.focus).not.toContain('Você relata querer experimentar');
	});
	it.each([
		['uma consultoria', 'página de escopo', 'dados de terceiros'],
		['programação', 'uma etapa pequena de programação', 'sem acesso'],
		['a cerâmica', 'esboço de peça simples de cerâmica', 'sem presumir acesso à queima']
	])('ties a bounded probe and access limit to the alternative: %s', (target, sample, limit) => {
		const binding = compassContext(`Quero experimentar ${target} mantendo meu emprego.`);
		expect(binding.key).toBe('transition');
		expect(binding.task).toContain(sample);
		expect(binding.task).toContain(limit);
		expect(binding.task).toContain('o emprego atual');
	});
	it('recognizes a portfolio plan, prioritizes overload and keeps a later positive intention', () => {
		const portfolio = compassContext(
			'Quero montar um portfólio de desenhos sem largar meu emprego.'
		);
		expect(portfolio.key).toBe('transition');
		expect(portfolio.focus).toContain('montar um portfólio de desenhos');
		expect(portfolio.task).toContain('portfólio privado');
		const overloaded = compassContext(
			'Estou sobrecarregada e quero experimentar cerâmica mantendo emprego.'
		);
		expect(overloaded.key).toBe('workload');
		expect(overloaded.priority).toEqual(['sustainability', 'environment']);
		const laterIntent = compassContext(
			'Não quero testar desenho agora, mas quero experimentar cerâmica mantendo emprego.'
		);
		expect(laterIntent.scene).toContain('experimentar cerâmica enquanto preserva o emprego atual');
		expect(laterIntent.scene).not.toContain('desenho');
		const negatedWorkload = compassContext(
			'Não estou sobrecarregada; quero experimentar cerâmica mantendo emprego.'
		);
		expect(negatedWorkload.key).toBe('transition');
		expect(negatedWorkload.scene).toContain('experimentar cerâmica');
		expect(compassContext('Não tenho descanso e preciso reduzir a carga.').key).toBe('workload');
		expect(compassContext('Não consigo descansar e preciso reduzir a carga.').key).toBe('workload');
		expect(compassContext('Não preciso descansar.').key).toBe('general');
		const currentWork = compassContext(
			'Quero fazer meu trabalho com mais autonomia mantendo meu emprego.'
		);
		expect(currentWork.key).toBe('general');
		expect(currentWork.scene).toBeUndefined();
	});
	it('uses a reported current activity only when the person actually supplied one', () => {
		expect(
			compassContext(
				'Lívia trabalha com comunicação e quer testar ilustração editorial sem abandonar sua renda atual.'
			).currentActivity
		).toBe('com comunicação');
		expect(
			compassContext('Quero testar cerâmica mantendo meu emprego.').currentActivity
		).toBeUndefined();
	});
	it('changes the work consequences across contexts for the same natal facts', async () => {
		const contexts = [
			'Estou com sobrecarga e preciso descansar.',
			'Quero estudar uma nova habilidade antes de escolher um curso.',
			'Preciso coordenar uma equipe em uma entrega conjunta.',
			'Quero experimentar cerâmica mantendo meu emprego.'
		];
		const readings = await Promise.all(
			contexts.map(async (context) => {
				const i = input(context);
				return composeTrialReading(i, await calculateTrial(i, runId));
			})
		);
		const byRole = (reading: (typeof readings)[number], role: string) =>
			reading.sections[reading.editorial!.plan.findIndex((entry) => entry.role === role)].text;
		for (const role of [
			'contribution',
			'motivation',
			'environment',
			'working-style',
			'sustainability',
			'practical-reflection'
		]) {
			expect(new Set(readings.map((reading) => byRole(reading, role))).size).toBe(contexts.length);
		}
		for (const reading of readings) {
			expect(byRole(reading, 'practical-reflection')).not.toMatch(/por meio de começar/);
			expect(byRole(reading, 'selected-relations')).not.toMatch(
				/podem confirmar ou contrariar cada uma/
			);
		}
		expect(byRole(readings[0], 'practical-reflection')).toContain('priorize descanso');
		expect(byRole(readings[1], 'practical-reflection')).toContain('orientação');
		expect(byRole(readings[2], 'practical-reflection')).toContain('responsáveis');
		expect(byRole(readings[3], 'practical-reflection')).toContain('O esboço permite avaliar');
		const experiment = readings[3].sections.find((s) => s.title.includes('vinte minutos'))!.text;
		expect(experiment).toContain('cerâmica');
		expect(experiment).toContain('emprego atual');
		expect(experiment).toContain('argila e espaço apropriado');
		expect(experiment).toContain('não habilidade com cerâmica');
		expect(byRole(readings[3], 'contribution')).toContain(
			'não mostra como a argila responde às mãos'
		);
		expect(byRole(readings[3], 'practical-reflection')).toContain(
			'modelagem, a secagem e a queima'
		);
		expect(byRole(readings[3], 'practical-reflection')).toContain('não atribua ao desenho');
		expect(readings[3].sections[0].text).toContain('cerâmica');
		expect(byRole(readings[3], 'environment')).toContain('acesso concreto');
		expect(byRole(readings[3], 'sustainability')).toContain('a renda e a rotina');
		expect(byRole(readings[3], 'selected-relations')).not.toMatch(
			/carga e a ajuda foram combinadas|padrão de qualidade foi negociado|valor atribuído ao resultado por cada parte|controlar as pessoas envolvidas/
		);
	});
	it('keeps the historical v5 composer approvable while issuing new readings as v6', async () => {
		const i = input(),
			c = await sample(),
			oldReading = composeReconstructedCompass(i, c, 'v5'),
			newReading = composeTrialReading(i, c);
		expect(oldReading.version).toBe(COMPASS_READING_VERSION_V5);
		expect(oldReading.editorial?.version).toBe(COMPASS_READING_VERSION_V5);
		expect(newReading.version).toBe(COMPASS_READING_VERSION);
		expect(newReading.sections).not.toEqual(oldReading.sections);
		expect(await approveTrialReading(i, c, oldReading)).not.toBeNull();
		expect(await approveTrialReading(i, c, newReading)).not.toBeNull();
	});
	it.skipIf(!process.env.ATVNA_COMPASS_V5_FIXTURE)(
		'recomposes and approves a saved historical v5 reading without changing its text',
		async () => {
			const saved = JSON.parse(
				await readFile(process.env.ATVNA_COMPASS_V5_FIXTURE!, 'utf8')
			) as SavedTrial;
			expect(saved.reading.version).toBe(COMPASS_READING_VERSION_V5);
			expect(composeReconstructedCompass(saved.input, saved.calculation, 'v5')).toEqual(
				saved.reading
			);
			expect(
				await approveTrialReading(saved.input, saved.calculation, saved.reading)
			).not.toBeNull();
		}
	);
	it.each(['positions', 'regent', 'angular', 'method'])(
		'rejects tampered derived %s rather than interpreting altered geometry',
		async (key) => {
			const c = structuredClone(await sample());
			c.data[key] = { altered: true };
			expect(() => composeTrialReading(input(), c)).toThrow('divergente');
		}
	);
	it('rejects a changed birth, context, native source or editorial claim', async () => {
		const c = await sample(),
			i = input(),
			r = composeTrialReading(i, c);
		const changedInput = structuredClone(i);
		changedInput.birth!.longitude = 40;
		expect(() => composeTrialReading(changedInput, c)).toThrow('divergente');
		expect(() => composeTrialReading(input('Outra pergunta.'), c)).toThrow();
		const changed = structuredClone(c);
		(changed.data.natal as CalculationSnapshot).facts[0].display = 'alterado';
		expect(() => composeTrialReading(i, changed)).toThrow();
		const adulterated = structuredClone(r);
		adulterated.opening = 'Você nasceu para uma profissão ideal e terá sucesso.';
		expect(await approveTrialReading(i, c, adulterated)).toBeNull();
	});
	it('preserves unavailable polar houses instead of inventing the ruler house', async () => {
		const i = input();
		i.birth!.latitude = 70;
		const c = await calculateTrial(i, runId),
			d = c.data as unknown as CompassData,
			r = composeTrialReading(i, c);
		expect(d.regent.house).toBeNull();
		expect(d.houses.cusps).toEqual([]);
		expect(r.sections.find((s) => s.title.startsWith('Contribuição'))!.text).toContain(
			'casa do regente está indisponível'
		);
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
	});
	it.each(['1992-04-16T09:30:00', '1985-08-21T17:20:00', '2004-11-03T02:45:00'])(
		'changes the synthesis for independently calculated births: %s',
		async (date) => {
			const i = input();
			i.birth = { ...i.birth!, localDateTime: date, utcInstant: date + 'Z' };
			const c = await calculateTrial(i, runId),
				r = composeTrialReading(i, c),
				baseline = composeTrialReading(input(), await sample());
			expect(r.sections[0].text).not.toBe(baseline.sections[0].text);
			expect(await approveTrialReading(i, c, r)).not.toBeNull();
		}
	);
	it('distinguishes functions when MC and Moon or Mercury and Mars share a sign', async () => {
		const i = input('Quero avaliar uma tarefa acessível.'),
			date = '1985-08-21T17:20:00';
		i.birth = { ...i.birth!, localDateTime: date, utcInstant: date + 'Z' };
		const c = await calculateTrial(i, runId),
			g = normalizeFactGraph(c),
			r = composeTrialReading(i, c),
			byRole = (role: string) =>
				r.sections[r.editorial!.plan.findIndex((entry) => entry.role === role)].text,
			environment = byRole('environment'),
			style = byRole('working-style');
		expect(g.mc!.sign).toBe(g.positions.find((p) => p.body === 'moon')!.sign);
		expect(g.positions.find((p) => p.body === 'mercury')!.sign).toBe(
			g.positions.find((p) => p.body === 'mars')!.sign
		);
		expect(environment).toContain('MC e Lua apontam para a mesma condição');
		expect(environment.match(/confiança para tratar assuntos complexos/g)).toHaveLength(2);
		expect(style.split('\n\n')[0].match(/dar forma própria a uma proposta/g)).toHaveLength(1);
		expect(style.split('\n\n')[1]).not.toContain('dar forma própria a uma proposta');
		expect(style).toMatch(/formule a pergunta.*defina quando ela estará concluída/);
		expect(byRole('motivation')).not.toContain('como fonte de participação');
		expect(byRole('sustainability').split('\n\n')[1]).not.toContain('Júpiter');
		expect(byRole('environment')).not.toContain('Se faltar uma delas');
		expect(r.opening).not.toMatch(/experimentando (?:começar|dar|partir|repetir)/);
		expect(r.questions[1]).not.toMatch(/experimentar (?:começar|dar|partir|repetir)/);
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
	});
	it('keeps a distinct scope from Purpose and verifies the saved synthetic edition', async () => {
		const i = input(),
			c = await sample(),
			r = composeTrialReading(i, c),
			approval = await approveTrialReading(i, c, r);
		const pi = { ...i, productId: 'purpose-career' },
			pc = await calculateTrial(pi, runId),
			pr = composeTrialReading(pi, pc);
		expect(r.sections).not.toEqual(pr.sections);
		expect(pr.sections.length).toBeGreaterThan(r.sections.length);
		const saved: SavedTrial = {
			id: runId,
			product_id: i.productId,
			created_at: '2026-10-08T12:00:00Z',
			input: i,
			calculation: c,
			reading: r,
			approval: approval!
		};
		expect(await executeTrialRuntime({ operation: 'verify', saved })).toBe(true);
		await mkdir('.trial-qa', { recursive: true });
		await writeFile('.trial-qa/compass.json', JSON.stringify(saved, null, 2));
	});
	it('regenerates six fictional profiles with distinct contexts and a second birth', async () => {
		expect(new Set(compassQaProfiles.map((profile) => profile.input.presentation?.name)).size).toBe(
			6
		);
		expect(new Set(compassQaProfiles.map((profile) => profile.input.context)).size).toBe(6);
		expect(new Set(compassQaProfiles.map((profile) => profile.input.birth?.utcInstant)).size).toBe(
			2
		);
		const variants = await saveQaProfiles(
			compassQaProfiles,
			'.trial-qa/compass-v6-saved',
			'.trial-qa/compass-v6-variants.json'
		);
		const chapter = (slug: string, role: string) => {
			const reading = variants.find((variant) => variant.name === slug)!.reading;
			return reading.sections[reading.editorial!.plan.findIndex((entry) => entry.role === role)]
				.text;
		};
		expect(chapter('workload', 'selected-relations')).toContain(
			'uma pausa ou o adiamento do registro são resultados válidos'
		);
		expect(chapter('leadership', 'selected-relations')).toContain('equipe pode combinar');
		expect(chapter('workload', 'selected-relations')).not.toBe(
			chapter('leadership', 'selected-relations')
		);
		expect(chapter('study', 'contribution')).not.toContain('utilidade para outra pessoa');
		for (const { name, reading } of variants) {
			const profile = compassQaProfiles.find((item) => item.slug === name)!;
			const fullBasis = (await createCareerCompassFullBasisCalculator()(profile.input, {
				runId,
				signal: new AbortController().signal
			})) as CalculationSnapshot;
			const origin = await prepareCareerCompassV6Origin(profile.input, fullBasis);
			expect(origin.status, `${name}: trusted origin`).toBe('prepared_for_review');
			if (origin.status === 'prepared_for_review') {
				expect(origin.reading, `${name}: PDF reading matches trusted origin`).toEqual(reading);
			}
			expect(reading.limits.join(' ')).not.toMatch(/Gauntlet|IANA|UT1|DUT1|1900–2099/);
			const method = reading.sections.find(
				(section) => section.title === 'Como esta leitura foi construída'
			)!;
			const saved = JSON.parse(
				await readFile(`.trial-qa/compass-v6-saved/${name}.json`, 'utf8')
			) as SavedTrial;
			const sourceIds = new Set(saved.calculation.facts.map((fact) => fact.id));
			expect(sourceIds.size).toBe(saved.calculation.facts.length);
			expect(new Set(method.factIds)).toEqual(sourceIds);
			expect(method.factIds.every((id) => sourceIds.has(id))).toBe(true);
			expect(method.text.length).toBeLessThan(1000);
			expect(method.text).not.toMatch(/\d+[.,]\d{2,}°|da candidata|do candidato/);
		}
	});
	it('regenerates counterfactuals for targets, negation, workload and natal facts', async () => {
		const [
			consulting,
			negated,
			overloaded,
			secondBirth,
			withoutRest,
			negatedStudy,
			negatedChange,
			negatedLeadership,
			noRest,
			unableToRest
		] = compassQaCounterfactuals;
		expect(compassContext(consulting.input.context).scene).toContain('consultoria');
		expect(compassContext(consulting.input.context).task).not.toContain('materiais');
		expect(compassContext(negated.input.context).scene).toContain('cerâmica');
		expect(compassContext(negated.input.context).scene).not.toContain('desenho');
		expect(compassContext(overloaded.input.context).key).toBe('workload');
		expect(secondBirth.input.birth?.utcInstant).not.toBe(
			compassQaProfiles[5].input.birth?.utcInstant
		);
		expect(compassContext(withoutRest.input.context).key).toBe('workload');
		expect(compassContext(negatedStudy.input.context).key).toBe('leadership');
		expect(compassContext(negatedChange.input.context).key).toBe('general');
		expect(compassContext(negatedLeadership.input.context).key).toBe('general');
		expect(compassContext(noRest.input.context).key).toBe('workload');
		expect(compassContext(unableToRest.input.context).key).toBe('workload');
		const variants = await saveQaProfiles(
			compassQaCounterfactuals,
			'.trial-qa/compass-v6-counterfactuals',
			'.trial-qa/compass-v6-counterfactuals.json'
		);
		expect(variants[2].reading.sections[0].text).toContain(
			'primeiro descanso e espaço para reduzir a carga'
		);
		expect(variants[3].reading.sections).not.toEqual(variants[0].reading.sections);
		expect(variants[4].reading.sections[0].text).toContain(
			'primeiro descanso e espaço para reduzir a carga'
		);
		expect(variants[5].reading.sections[0].text).toContain('equipe');
		expect(variants[6].reading.editorial?.context.key).toBe('general');
		expect(variants[7].reading.editorial?.context.key).toBe('general');
		for (const variant of variants.slice(8)) {
			expect(variant.reading.editorial?.context.key).toBe('workload');
			expect(variant.reading.opening).toContain('condições que permitiriam descansar');
			expect(variant.reading.opening).not.toContain('entrega pequena e avaliável');
		}
	});
});
