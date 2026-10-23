import { describe, expect, it } from 'vitest';
import {
	calculateTarotMethod,
	calculateDreamRecord,
	tarotMethodFor,
	type WorkflowInput,
	type CalculationSnapshot,
	type MethodCard,
	type DreamAtlasFactSource
} from '@atv/domain';
import { calculateDreamDossier } from '../dream-interpretation';
import { calculateDreamAtlasSnapshot } from '../dream-atlas-reading';
import { tarotCanon } from '../reconstruction/tarot-canon';
import {
	composeCurrentSymbolic,
	composeCurrentSingleCard,
	type CurrentSymbolicReading
} from './symbolic';
import { currentTarotMovement } from './symbolic-tarot';
import { cardRelationPrinciples } from './symbolic-relations';
import { tarotApplications } from './symbolic-contexts';
import { tarotDevelopments } from './symbolic-developments';

// Synthetic counterfactuals only. No personal records, runtime service or approval
// artifact is read or written by this suite.
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const input = (productId: string, focus?: string): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId,
	...(focus ? { focus } : {}),
	consent: {
		storage: true,
		partner: false,
		continuity: productId === 'dream-dossier',
		policyVersion: 'atv-input-consent/1'
	}
});
const paidTarot = [
	'tarot-situation-challenge-advice',
	'tarot-peladan-cross',
	'tarot-celtic-cross',
	'tarot-aphrodite-temple',
	'tarot-astrological-mandala'
];
const draw = (value: WorkflowInput) =>
	calculateTarotMethod(value, uuid(1), new AbortController().signal);
function syntheticCards(calculation: CalculationSnapshot, ids: string[]) {
	const changed = structuredClone(calculation);
	const cards = changed.data.cards as unknown as MethodCard[];
	for (const [i, id] of ids.entries()) {
		cards[i]!.cardId = id;
		cards[i]!.name = tarotCanon[id]!.name;
		changed.facts.find((f) => f.id === `card-${i + 1}`)!.display =
			`${cards[i]!.positionName}: ${cards[i]!.name} (posição direta)`;
	}
	return changed;
}
function checkEvidence(reading: CurrentSymbolicReading, calculation: CalculationSnapshot) {
	expect(reading.version).toBe('atv-current-reading/1.0.0');
	expect(reading.interpretation.conclusions).toHaveLength(reading.sections.length);
	for (const conclusion of reading.interpretation.conclusions) {
		const section = reading.sections[conclusion.section]!;
		expect(section.text).toContain(conclusion.claim);
		expect(conclusion.factIds).toEqual(section.factIds);
		expect(conclusion.factIds.every((id) => calculation.facts.some((f) => f.id === id))).toBe(true);
		expect(conclusion.relation.length).toBeGreaterThan(35);
	}
	// Questions supplement a completed narrative rather than becoming its body.
	expect(reading.questions.length).toBeLessThanOrEqual(2);
	expect(reading.sections.map((s) => s.text).join('\n')).not.toMatch(
		/procure evidências contrárias|a síntese se completa quando|observe se isso acontece/iu
	);
}
const dreamInput = (product = 'dream-reading'): WorkflowInput => ({
	...input(product),
	dream: {
		date: '2026-09-20',
		narrative:
			'Eu não conseguia abrir a porta. Depois entrei pela passagem e me sentei perto da janela.',
		emotions: ['curiosidade', 'medo'],
		associations: ['mudança de casa']
	}
});
const previous = (
	n: number,
	day: number,
	patch: Partial<DreamAtlasFactSource> = {}
): DreamAtlasFactSource => ({
	version: 'atv-dream-atlas-entry/1',
	id: uuid(n),
	revision: 1,
	dreamDate: `2026-09-${String(day).padStart(2, '0')}`,
	narrative: 'Procurei a entrada da casa. Depois encontrei uma chave.',
	emotions: ['curiosidade'],
	associations: ['mudança de casa'],
	includeInSynthesis: true,
	...patch
});
const full = (reading: { sections: { text: string }[] }) =>
	reading.sections.map((s) => s.text).join('\n');

describe('current symbolic interpretations', () => {
	it.each(paidTarot)(
		'preserves the complete contextual applications in the current paid method %s without a focus',
		async (productId) => {
			const value = input(productId);
			const calculation = await draw(value);
			const reading = composeCurrentSymbolic(value, calculation) as CurrentSymbolicReading;
			const mode = productId === 'tarot-aphrodite-temple' ? 'love' : 'question';
			expect(reading.opening).toBe('');
			for (const card of calculation.data.cards as unknown as MethodCard[]) {
				expect(full(reading), `${productId}/${card.cardId}`).toContain(
					tarotApplications[card.cardId]![mode]
				);
			}
			checkEvidence(reading, calculation);
		}
	);
	it('uses the supplied focus as the paid opening and closes the Celtic rhythm with a return agreement', async () => {
		const value = input('tarot-celtic-cross', 'Como cuidar do ritmo desta relação?');
		const calculation = await draw(value);
		const cards = calculation.data.cards as unknown as MethodCard[];
		const ids = cards.map((card) => card.cardId);
		ids[0] = 'swords-4';
		ids[1] = 'wands-8';
		ids[6] = 'major-14';
		const reading = composeCurrentSymbolic(
			value,
			syntheticCards(calculation, ids)
		) as CurrentSymbolicReading;
		expect(reading.opening).toBe('Você trouxe a questão “Como cuidar do ritmo desta relação?”.');
		expect(reading.practice).toContain('Combinar uma hora para retomar a conversa');
		expect(reading.practice).toContain(
			'cada mensagem deixa de exigir uma disponibilidade imediata'
		);
		expect(reading.practice).not.toBe(tarotDevelopments['major-14']!.love);
	});
	it('covers all 78 distinct card meanings and changes operation within one suit', () => {
		expect(Object.keys(currentTarotMovement).sort()).toEqual(Object.keys(tarotCanon).sort());
		expect(Object.keys(cardRelationPrinciples).sort()).toEqual(Object.keys(tarotCanon).sort());
		expect(currentTarotMovement['wands-1']).not.toBe(currentTarotMovement['wands-10']);
		expect(currentTarotMovement['cups-2']).not.toBe(currentTarotMovement['cups-8']);
	});
	it('relates desire and pain through the actual cards rather than generic protection or speed', async () => {
		const value = input('tarot-situation-challenge-advice', 'Como participar desta relação?');
		const base = await draw(value);
		const dependency = composeCurrentSymbolic(
			value,
			syntheticCards(base, ['cups-1', 'major-15', 'wands-14'])
		)!;
		expect(dependency.sections[0]!.text).toContain('liberdade para recusar');
		expect(dependency.sections[0]!.text).toContain('gratificação');
		expect(dependency.sections[0]!.text).not.toMatch(
			/proteger o que já existe|certeza antes de experimentar/iu
		);
		const authority = composeCurrentSymbolic(
			value,
			syntheticCards(base, ['cups-1', 'major-4', 'wands-14'])
		)!;
		expect(authority.sections[0]!.text).toContain('autoridade');
		expect(authority.sections[0]!.text).not.toContain('gratificação passa a comandar');
		const hurt = composeCurrentSymbolic(
			value,
			syntheticCards(base, ['swords-5', 'swords-3', 'wands-14'])
		)!;
		expect(hurt.sections[0]!.text).toContain('confiança');
		expect(hurt.sections[0]!.text).toContain('ferida');
		expect(hurt.sections[0]!.text).not.toMatch(/acelerar|pressa|velocidade/iu);
		const single = composeCurrentSingleCard('major-15', 'Como participar da relação?', 'love');
		expect(single.sections.map((section) => section.body).join(' ')).toContain(
			'gratificação passa a comandar'
		);
		expect(single.sections.map((section) => section.body).join(' ')).not.toContain(
			'proteger o que já existe'
		);
	});
	it.each(paidTarot)(
		'delivers %s as method-specific relationships with actual position evidence',
		async (product) => {
			const value = input(product, 'Como participar melhor da relação?'),
				calculation = await draw(value);
			const reading = composeCurrentSymbolic(value, calculation) as CurrentSymbolicReading;
			checkEvidence(reading, calculation);
			const cardIds = calculation.facts.filter((f) => f.kind === 'drawn').map((f) => f.id);
			expect(
				cardIds.every((id) => reading.sections.some((section) => section.factIds.includes(id)))
			).toBe(true);
			expect(
				reading.sections.every(
					(section) => section.factIds.filter((id) => id.startsWith('card-')).length >= 2
				)
			).toBe(true);
			expect(reading.title).toBe(tarotMethodFor(product)!.name);
			if (product === 'tarot-aphrodite-temple')
				expect(reading.limits.join(' ')).toContain('estados internos de terceiros');
			if (product === 'tarot-astrological-mandala') expect(reading.sections).toHaveLength(7);
		}
	);
	it('a second card changes the interpreted relation, even when its suit stays the same', async () => {
		const value = input(paidTarot[0]!, 'Como conduzir o projeto?'),
			calculation = await draw(value);
		const a = composeCurrentSymbolic(
			value,
			syntheticCards(calculation, ['major-0', 'wands-1', 'major-9'])
		) as CurrentSymbolicReading;
		const b = composeCurrentSymbolic(
			value,
			syntheticCards(calculation, ['major-0', 'wands-10', 'major-9'])
		) as CurrentSymbolicReading;
		expect(a.sections[0]!.text).toContain('Os dois impulsos favorecem a abertura');
		expect(b.sections[0]!.text).toContain('Cada começo pede uma parte da mesma disponibilidade');
		expect(a.interpretation.conclusions[0]!.claim).not.toBe(b.interpretation.conclusions[0]!.claim);
	});
	it('exchanging challenge and advice changes what is constrained and what supplies a response', async () => {
		const value = input(paidTarot[0]!, 'Como conduzir o projeto?'),
			calculation = await draw(value);
		const a = composeCurrentSymbolic(
			value,
			syntheticCards(calculation, ['major-1', 'major-4', 'major-9'])
		) as CurrentSymbolicReading;
		const b = composeCurrentSymbolic(
			value,
			syntheticCards(calculation, ['major-1', 'major-9', 'major-4'])
		) as CurrentSymbolicReading;
		expect(a.sections.at(-1)!.text).toContain('uma regra conserva sua utilidade');
		expect(b.sections.at(-1)!.text).toContain('o recolhimento esclarece');
		expect(a.sections.at(-1)!.text).not.toBe(b.sections.at(-1)!.text);
	});
	it('distinguishes governance from dependency even within the same relational operation', async () => {
		const value = input(paidTarot[0]!, 'Como conduzir o projeto?'),
			calculation = await draw(value);
		const emperor = composeCurrentSymbolic(
			value,
			syntheticCards(calculation, ['major-1', 'major-4', 'major-9'])
		) as CurrentSymbolicReading;
		const devil = composeCurrentSymbolic(
			value,
			syntheticCards(calculation, ['major-1', 'major-15', 'major-9'])
		) as CurrentSymbolicReading;
		expect(currentTarotMovement['major-4']).toBe(currentTarotMovement['major-15']);
		expect(emperor.sections[0]!.text).toContain(
			'A iniciativa pode ficar estreita quando precisa caber numa regra que ainda não ouviu o que você está propondo'
		);
		expect(devil.sections[0]!.text).toContain('A liberdade para recusar continua necessária');
		expect(emperor.interpretation.conclusions[0]!.claim).not.toBe(
			devil.interpretation.conclusions[0]!.claim
		);
	});
	it('changing the stated question changes the application without changing the recorded cards', async () => {
		const work = input(paidTarot[0]!, 'Como conduzir meu trabalho?'),
			love = input(paidTarot[0]!, 'Como cuidar da relação?');
		const a = await draw(work),
			b = await draw(love);
		expect(a.data.cards).toEqual(b.data.cards);
		const workReading = composeCurrentSymbolic(
				work,
				syntheticCards(a, ['wands-8', 'pentacles-7', 'swords-4'])
			)!,
			loveReading = composeCurrentSymbolic(
				love,
				syntheticCards(b, ['wands-8', 'pentacles-7', 'swords-4'])
			)!;
		expect(workReading.sections.at(-1)!.text).toContain('A sequência de ações');
		expect(loveReading.sections.at(-1)!.text).toContain('uma troca de mensagens');
		expect(workReading.sections.at(-1)!.text).not.toBe(loveReading.sections.at(-1)!.text);
	});
	it('preserves recorded-position integrity and does not accept a missing card', async () => {
		const value = input(paidTarot[0]!),
			calculation = await draw(value);
		calculation.facts = calculation.facts.filter((f) => f.id !== 'card-2');
		expect(() => composeCurrentSymbolic(value, calculation)).toThrow(/inconsistente/);
	});
	it('one-card tools use the card and the actual question, including returning versus leaving', () => {
		const returning = composeCurrentSingleCard('major-13', 'Quero retomar uma relação', 'love');
		const leaving = composeCurrentSingleCard('major-13', 'Penso em sair da relação', 'love');
		expect(returning.sections[1]!.body).toContain('retomar');
		expect(returning.sections[1]!.body).toContain('forma anterior');
		expect(leaving.sections[1]!.body).toContain('uma saída');
		expect(returning.sections[1]!.body).not.toBe(leaving.sections[1]!.body);
		const newCard = composeCurrentSingleCard('major-3', 'Quero retomar uma relação', 'love');
		expect(newCard.sections[0]!.body).toContain('quando cuidar vira ser indispensável');
		expect(newCard.sections[0]!.body).not.toBe(returning.sections[0]!.body);
		expect(() => composeCurrentSingleCard('unknown', undefined, 'day')).toThrow();
	});
	it('distinguishes completing a course or project from leaving it', () => {
		const course = composeCurrentSingleCard(
			'major-3',
			'Vou conseguir terminar meu curso?',
			'question'
		);
		const leaving = composeCurrentSingleCard('major-3', 'Devo sair do meu curso?', 'question');
		expect(course.sections[1]!.body).toContain('concluir esse percurso de aprendizagem');
		expect(course.sections[1]!.body).toContain('etapa restante');
		expect(course.sections[1]!.body).not.toContain('uma saída');
		expect(leaving.sections[1]!.body).toContain('uma saída');
		expect(leaving.sections[1]!.body).not.toContain('etapa restante');
		for (const focus of ['Como finalizar meu projeto?', 'Quero encerrar esta tarefa']) {
			const body = composeCurrentSingleCard('major-3', focus, 'question').sections[1]!.body;
			expect(body).toContain('concluir uma tarefa ou projeto');
			expect(body).not.toContain('uma saída');
		}
	});
	it('does not turn idioms, stopped habits or ambiguous verbs into a departure', () => {
		for (const focus of [
			'Vou sair bem na prova?',
			'Como deixar de procrastinar?',
			'Como deixar meu projeto mais claro?',
			'Não quero terminar mal este ano',
			'Preciso encerrar?'
		]) {
			expect(
				composeCurrentSingleCard('major-3', focus, 'question').sections[1]!.body
			).not.toContain('uma saída');
		}
	});
	it('applies resumption to the reported domain without inventing a returning relationship', () => {
		const study = composeCurrentSingleCard('major-3', 'Quero voltar a estudar', 'question');
		const work = composeCurrentSingleCard('major-3', 'Como retomar meu projeto?', 'question');
		expect(study.sections[1]!.body).toContain('retomada dos estudos');
		expect(study.sections[1]!.body).not.toContain('recuperar uma presença');
		expect(work.sections[1]!.body).toContain('novos prazos e acordos');
		expect(work.sections[1]!.body).not.toContain('recuperar uma presença');
	});
	it('reads a narrated obstacle and passage, with mixed feelings instead of an invented emotional resolution', () => {
		const value = dreamInput(),
			calculation = calculateDreamRecord(value),
			reading = composeCurrentSymbolic(value, calculation) as CurrentSymbolicReading;
		checkEvidence(reading, calculation);
		expect(reading.sections[0]!.text).toContain('impedimento');
		expect(reading.sections[1]!.text).toContain('Interesse e cautela compõem uma ambivalência');
		expect(reading.sections[1]!.text).toContain('não informa qual veio primeiro');
		expect(reading.sections[1]!.text).toContain('mudança de casa');
		expect(reading.sections[1]!.text).toContain('chegar a um lugar e sentir-se instalado');
		expect(full(reading)).not.toMatch(/casa (significa|representa)|porta (significa|representa)/iu);
	});
	it('changing actions changes the interpretation with the same objects, feelings and association', () => {
		const a = dreamInput(),
			b = structuredClone(a);
		b.dream!.narrative = 'Entrei pela porta da casa. Depois saí pela passagem e fui embora.';
		const old = composeCurrentSymbolic(a, calculateDreamRecord(a))!,
			changed = composeCurrentSymbolic(b, calculateDreamRecord(b))!;
		expect(changed.sections[0]!.text).toContain('duas maneiras de regular a proximidade');
		expect(changed.sections[0]!.text).not.toBe(old.sections[0]!.text);
	});
	it('emotion ablation removes the emotional conclusion; negation does not become action or fear', () => {
		const value = dreamInput();
		value.dream!.narrative = 'Não entrei na casa. Eu disse: “entrei pela porta”.';
		value.dream!.emotions = ['não senti medo'];
		const reading = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		expect(reading.sections[0]!.text).toContain(
			'pelas imagens relatadas e pelas associações pessoais'
		);
		expect(reading.sections[1]!.text).not.toContain('A cautela torna');
		value.dream!.emotions = [];
		const ablated = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		expect(ablated.sections[1]!.text).toContain('não nomeou emoções');
		expect(ablated.sections[1]!.text).not.toContain('ambivalência');
	});
	it('relates two affirmative actions within one clause and scopes negation before an adversative', () => {
		const value = dreamInput();
		value.dream!.narrative = 'Entrei na casa e saí pela janela.';
		const entryExit = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		expect(entryExit.sections[0]!.text).toContain('duas maneiras de regular a proximidade');
		expect(entryExit.sections[0]!.text).toContain('saí pela janela');
		value.dream!.narrative = 'Procurei a chave e encontrei uma chave na mesa.';
		expect(composeCurrentSymbolic(value, calculateDreamRecord(value))!.sections[0]!.text).toContain(
			'A procura e o reconhecimento'
		);
		value.dream!.narrative = 'Não entrei mas saí pela porta.';
		const negative = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		expect(negative.interpretation!.conclusions[0]!.claim).toContain('mudar a própria distância');
		expect(negative.interpretation!.conclusions[0]!.claim).not.toContain('entrada e o afastamento');
		value.dream!.narrative = 'Ela sai pela janela. Ela procurava a chave.';
		expect(
			composeCurrentSymbolic(value, calculateDreamRecord(value))!.interpretation!.conclusions[0]!
				.claim
		).toContain('pelas imagens relatadas');
	});
	it('integrates the action and feeling into a delivered meaning rather than asking the reader to complete it', () => {
		const value = dreamInput();
		value.dream!.narrative = 'Entrei na casa e esperei na janela.';
		const staying = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		expect(staying.sections[2]!.text).toContain('O tempo de assimilar faz parte dessa aproximação');
		expect(staying.sections[1]!.text).toContain('mudança de casa');
		value.dream!.narrative = 'Entrei na casa e saí pela janela.';
		const leaving = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		expect(leaving.sections[2]!.text).toContain(
			'a distância não precisa ser lida como indiferença'
		);
		expect(leaving.sections[2]!.text).not.toContain('O tempo de assimilar');
	});
	it('a changed personal association changes the conclusion; absent context does not pretend one was given', () => {
		const value = dreamInput(),
			a = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		value.dream!.associations = ['preparar uma apresentação'];
		const b = composeCurrentSymbolic(value, calculateDreamRecord(value))!;
		expect(b.sections[1]!.text).toContain('preparar uma apresentação');
		expect(full(b)).not.toContain('mudança de casa');
		expect(b.sections[1]!.text).not.toBe(a.sections[1]!.text);
		expect(full(b)).not.toContain('Você situou o sonho neste contexto');
	});
	it('the dossier explains a shared association modified by different actions and emotions', () => {
		const value = dreamInput('dream-dossier'),
			calculation = calculateDreamDossier(value, [previous(1, 2)]),
			reading = composeCurrentSymbolic(value, calculation) as CurrentSymbolicReading;
		checkEvidence(reading, calculation);
		const comparison = reading.sections.at(-1)!;
		expect(comparison.text).toContain('gesto final dá outra forma à participação');
		expect(comparison.text).toContain('procura');
		expect(comparison.text).toContain('impedimento');
		expect(comparison.factIds).toContain(`history-${uuid(1)}`);
	});
	it('a dossier with the same beginning and a different ending cites the decisive final gestures', () => {
		const value = dreamInput('dream-dossier');
		value.dream!.narrative = 'Entrei na casa e saí pela janela.';
		const prior = previous(1, 2, { narrative: 'Entrei na casa e esperei perto da porta.' });
		const reading = composeCurrentSymbolic(value, calculateDreamDossier(value, [prior]))!;
		expect(reading.sections.at(-1)!.text).toContain('esperei perto da porta');
		expect(reading.sections.at(-1)!.text).toContain('saí pela janela');
		expect(reading.sections.at(-1)!.text).toContain('mudar a própria distância');
	});
	it('a different opening does not turn the same final pause into a changed ending', () => {
		const value = dreamInput('dream-dossier');
		value.dream!.narrative = 'Não consegui abrir a porta. Depois entrei e esperei na janela.';
		const prior = previous(1, 2, { narrative: 'Entrei na casa e esperei na janela.' });
		const reading = composeCurrentSymbolic(value, calculateDreamDossier(value, [prior]))!;
		const comparison = reading.sections.at(-1)!.text;
		expect(comparison).toContain('continuidade no gesto final');
		expect(comparison).not.toContain('gesto final dá outra forma');
		expect(full(reading)).not.toContain('personagens');
	});
	it('the atlas compares authorized sources and preserves gaps rather than inventing a month-long trajectory', () => {
		const value = { ...input('dream-atlas'), dreamAtlas: { startDate: '2026-09-01' } };
		const entries = [
			previous(1, 2),
			previous(2, 12, { narrative: 'Entrei na casa. Depois saí pela porta.', emotions: ['medo'] }),
			previous(3, 29, {
				narrative: 'Entrei na casa. Depois esperei na janela.',
				emotions: ['calma']
			}),
			previous(4, 15, { narrative: 'EXCLUDED_PRIVATE_SENTENCE', includeInSynthesis: false })
		];
		const calculation = calculateDreamAtlasSnapshot(value.dreamAtlas.startDate, entries),
			reading = composeCurrentSymbolic(value, calculation) as CurrentSymbolicReading;
		checkEvidence(reading, calculation);
		expect(full(reading)).not.toContain('EXCLUDED_PRIVATE_SENTENCE');
		expect(full(reading)).toContain('27 dias sem relatos');
		expect(full(reading)).toContain('mudança de casa');
		expect(full(reading)).toContain('não comprova uma evolução linear');
		expect(reading.sections.some((s) => s.factIds.includes(`entry-${uuid(2)}`))).toBe(true);
		(calculation.data.entries as unknown as DreamAtlasFactSource[])[0]!.narrative =
			'alterado depois do cálculo';
		expect(() => composeCurrentSymbolic(value, calculation)).toThrow(/não correspondem/);
	});
	it('does not intercept revoked or unrelated products', () => {
		const value = dreamInput();
		expect(
			composeCurrentSymbolic({ ...value, productId: 'dream-journal' }, calculateDreamRecord(value))
		).toBeNull();
	});
	it('the atlas develops association, emotional function, adjacent contrasts and an integrated ending separately', () => {
		const value = { ...input('dream-atlas'), dreamAtlas: { startDate: '2026-09-01' } };
		const entries = [
			previous(1, 2),
			previous(2, 12, { narrative: 'Entrei na casa. Depois saí pela porta.', emotions: ['medo'] }),
			previous(3, 29, {
				narrative: 'Entrei na casa. Depois esperei na janela.',
				emotions: ['curiosidade']
			})
		];
		const reading = composeCurrentSymbolic(
			value,
			calculateDreamAtlasSnapshot(value.dreamAtlas.startDate, entries)
		)!;
		const association = reading.sections.find((s) => s.title.startsWith('A ligação'))!;
		const feeling = reading.sections.find((s) => s.title.startsWith('Um tom'))!;
		const sequence = reading.sections.find((s) => s.title.startsWith('Como uma cena'))!;
		expect(association.text).toContain('saí pela porta');
		expect(association.text).toContain('mudar a própria distância');
		expect(feeling.text).toContain('disponibilidade para descobrir');
		expect(feeling.text).toContain('referência encontrada');
		expect(feeling.text).toContain('permanência abre um intervalo');
		expect(sequence.text).toContain(
			'ter encontrado algo não se converte automaticamente em permanecer'
		);
		expect(sequence.text).toContain('afastar-se e permanecer por um momento');
		expect(sequence.factIds).toContain(`entry-${uuid(2)}`);
		expect(reading.sections.at(-1)!.text).toContain('precisar de distância e poder permanecer');
		expect(reading.sections.at(-1)!.text).not.toContain('No último registro');
		expect(association.text).not.toMatch(/Em \d{2}\/\d{2}\/\d{4}, [A-Z]/u);
	});
	it('keeps complete compound advice outside a larger grammatical subject', async () => {
		const value = input('tarot-peladan-cross', 'Como participar da relação?');
		const calculation = syntheticCards(await draw(value), [
			'major-1',
			'major-9',
			'pentacles-2',
			'cups-11',
			'major-19'
		]);
		const reading = composeCurrentSymbolic(value, calculation)!;
		expect(reading.practice).toBe(tarotDevelopments['pentacles-2']!.love);
		expect(full(reading)).toContain('Um ajuste ajuda quando reduz a instabilidade');
		expect(full(reading)).not.toMatch(/precariedade (oferece|precisa|passa)/u);
		expect(full(reading)).not.toContain('limite de O Eremita');
	});
	it('states a matching emotional ending once and preserves other current feelings', () => {
		const value = dreamInput('dream-dossier');
		const prior = previous(1, 2, { narrative: 'Entrei na casa e esperei na janela.' });
		const reading = composeCurrentSymbolic(value, calculateDreamDossier(value, [prior]))!;
		const comparison = reading.sections.at(-1)!.text;
		expect(comparison.match(/a permanência abre um intervalo/gu)).toHaveLength(1);
		expect(comparison).toContain('preserva os outros sentimentos nomeados');
	});
});
