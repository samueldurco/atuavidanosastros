import { expect, it } from 'vitest';
import { parseSymbolicForm, symbolicProduct, symbolicProducts } from './symbolic-intake';
function form(product = 'daily-card') {
	const data = new FormData();
	data.set('storage', 'on');
	if (product === 'dream-atlas') {
		data.set('startDate', '2026-09-09');
	} else if (product.startsWith('dream')) {
		data.set('date', '2024-02-29');
		data.set('narrative', 'Relato sintético.');
	} else {
		data.set('question1', 'Que possibilidade explorar?');
		if (product === 'three-questions') {
			data.set('question2', 'O que observar?');
			data.set('question3', 'Como agir?');
		}
	}
	return data;
}
it.each(symbolicProducts)('parses explicit consent and inputs for %s', (id) => {
	const result = parseSymbolicForm(id, form(id));
	expect(result.errors).toEqual({});
	expect(result.input).toMatchObject({
		productId: id,
		version: 'atv-workflow/1.0.0',
		consent: { storage: true, continuity: false, partner: false }
	});
});
it('keeps the Tarot Journey initial question and declared goal separate', () => {
	const data = form('tarot-journey');
	data.set('goal', 'Explorar como retomar um hábito criativo.');
	const { input, errors } = parseSymbolicForm('tarot-journey', data);
	expect(errors).toEqual({});
	expect(input?.questions).toEqual(['Que possibilidade explorar?']);
	expect(input?.tarotJourney).toEqual({ goal: 'Explorar como retomar um hábito criativo.' });
});
it('accepts only the principal dream for the unreleased Dream Dossier intake', () => {
	const data = form('dream-dossier');
	data.set('emotions', 'Curiosidade');
	data.set('associations', 'Uma casa conhecida');
	data.set('continuity', 'on');
	const { input, errors } = parseSymbolicForm('dream-dossier', data);
	expect(errors).toEqual({});
	expect(input).toMatchObject({
		productId: 'dream-dossier',
		consent: { storage: true, continuity: true },
		dream: {
			date: '2024-02-29',
			narrative: 'Relato sintético.',
			associations: ['Uma casa conhecida'],
			emotions: ['Curiosidade']
		}
	});
	expect(symbolicProducts).not.toContain('dream-dossier');
});
it('keeps the unreleased Dream Atlas period separate from individual dreams', () => {
	const data = form('dream-atlas');
	data.set('context', 'Contexto sintético do período');
	const { input, errors } = parseSymbolicForm('dream-atlas', data);
	expect(errors).toEqual({});
	expect(input).toMatchObject({
		productId: 'dream-atlas',
		consent: { storage: true, continuity: false },
		dreamAtlas: { startDate: '2026-09-09' },
		context: 'Contexto sintético do período'
	});
	expect(input?.dream).toBeUndefined();
	expect(symbolicProducts).not.toContain('dream-atlas');
});
it.each(['date', 'narrative', 'priorDreams', 'history', 'continuity'])(
	'rejects Dream Atlas field %s outside its initial scope',
	(name) => {
		const data = form('dream-atlas');
		data.set(name, 'forged');
		expect(parseSymbolicForm('dream-atlas', data).input).toBeNull();
	}
);
it('does not treat general continuity consent as Dream Atlas history selection', () => {
	const data = form('dream-atlas');
	data.set('continuity', 'on');
	expect(parseSymbolicForm('dream-atlas', data).input).toBeNull();
});
it.each(['', '2026-02-30', '2099-12-03', '2100-01-01'])(
	'rejects invalid Dream Atlas start date %s',
	(startDate) => {
		const data = form('dream-atlas');
		data.set('startDate', startDate);
		expect(parseSymbolicForm('dream-atlas', data).errors.startDate).toBeTruthy();
	}
);
it('rejects duplicate or file Dream Atlas dates', () => {
	const data = form('dream-atlas');
	data.append('startDate', '2026-09-10');
	expect(parseSymbolicForm('dream-atlas', data).input).toBeNull();
	data.set('startDate', new Blob(['file']));
	expect(parseSymbolicForm('dream-atlas', data).input).toBeNull();
});
it.each(['priorRunId', 'priorDreams', 'history', 'recurrence'])(
	'rejects undeclared Dream Dossier history field %s',
	(name) => {
		const data = form('dream-dossier');
		data.set(name, 'client choice');
		expect(parseSymbolicForm('dream-dossier', data).input).toBeNull();
	}
);
it.each([
	['goal', ''],
	['goal', '  '],
	['goal', 'a'.repeat(401)],
	['goal', 'bad\u0001'],
	['goal', 'bad\u007f'],
	['question2', 'Outra pergunta'],
	['cards', 'client choice']
])('rejects invalid or undeclared Tarot Journey field %s', (name, value) => {
	const data = form('tarot-journey');
	data.set('goal', 'Explorar um hábito.');
	data.set(name, value);
	expect(parseSymbolicForm('tarot-journey', data).input).toBeNull();
});
it('rejects duplicate or file goal for Tarot Journey', () => {
	const data = form('tarot-journey');
	data.set('goal', 'Explorar um hábito.');
	data.append('goal', 'duplicate');
	expect(parseSymbolicForm('tarot-journey', data).input).toBeNull();
	data.set('goal', new Blob(['file']));
	expect(parseSymbolicForm('tarot-journey', data).input).toBeNull();
});
it.each(['tarot-focus', 'tarot-yes-no'])(
	'rejects client-chosen card and extra question for %s',
	(id) => {
		for (const field of ['question2', 'cards', 'binaryVerdict']) {
			const data = form(id);
			data.set(field, 'client choice');
			expect(parseSymbolicForm(id, data).input).toBeNull();
		}
	}
);
it.each(['birth-chart', 'yes-no', '', '../daily-card'])('rejects unsupported product %s', (id) => {
	expect(symbolicProduct(id)).toBeUndefined();
	expect(parseSymbolicForm(id, form()).input).toBeNull();
});
it.each(['', 'true', 'off'])('never implies storage consent from %s', (consent) => {
	const data = form();
	data.set('storage', consent);
	expect(parseSymbolicForm('daily-card', data).errors.storage).toBeTruthy();
});
it('keeps narrative, associations and optional continuity without inventing metadata', () => {
	const data = form('dream-reading');
	data.set('continuity', 'on');
	data.set('context', 'Contexto sintético');
	data.set('associations', '  jardim, infância\n\nporta\r\n');
	data.set('emotions', 'curiosidade\ncalma');
	const { input } = parseSymbolicForm('dream-reading', data);
	expect(input?.dream).toEqual({
		date: '2024-02-29',
		narrative: 'Relato sintético.',
		associations: ['  jardim, infância', 'porta'],
		emotions: ['curiosidade', 'calma']
	});
	expect(input?.consent.continuity).toBe(true);
	expect(input?.context).toBe('Contexto sintético');
});
it.each([
	['question1', ''],
	['question1', '  '],
	['question1', 'a'.repeat(401)],
	['question1', 'bad\u0000'],
	['context', 'a'.repeat(1201)],
	['context', 'bad\u000b'],
	['continuity', 'on'],
	['birth', '{}'],
	['productId', 'dream-reading']
])('rejects unexpected/invalid tarot field %s', (name, value) => {
	const data = form();
	data.set(name, value);
	expect(parseSymbolicForm('daily-card', data).input).toBeNull();
});
it.each([
	['date', '2023-02-29'],
	['date', '2100-01-01'],
	['date', '1899-12-31'],
	['date', ''],
	['narrative', ''],
	['narrative', 'a'.repeat(6001)],
	['associations', Array(9).fill('a').join('\n')],
	['associations', 'a'.repeat(201)],
	['emotions', 'a'.repeat(81)],
	['emotions', 'a\u0001'],
	['continuity', 'true']
])('rejects invalid dream field %s', (name, value) => {
	const data = form('dream-journal');
	data.set(name, value);
	expect(parseSymbolicForm('dream-journal', data).errors[name]).toBeTruthy();
});
it('rejects missing second and third questions', () => {
	const result = parseSymbolicForm('three-questions', form());
	expect(result.errors.question2).toBeTruthy();
	expect(result.errors.question3).toBeTruthy();
});
it('rejects duplicate fields and file payloads', () => {
	const data = form();
	data.append('question1', 'duplicate');
	expect(parseSymbolicForm('daily-card', data).input).toBeNull();
	data.set('question1', new Blob(['file']));
	expect(parseSymbolicForm('daily-card', data).input).toBeNull();
});
it('accepts field boundaries but leaves the UTF-8 transport limit to the controller', () => {
	const data = form('dream-reading');
	data.set('narrative', 'a'.repeat(6000));
	data.set('context', 'a'.repeat(1200));
	data.set('associations', Array(8).fill('a'.repeat(200)).join('\n'));
	data.set('emotions', Array(8).fill('a'.repeat(80)).join('\n'));
	expect(parseSymbolicForm('dream-reading', data).errors).toEqual({});
});
