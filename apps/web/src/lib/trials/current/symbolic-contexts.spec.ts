import { describe, expect, it } from 'vitest';
import { tarotCanon } from '../reconstruction/tarot-canon';
import { tarotApplications } from './symbolic-contexts';
import { tarotDevelopments } from './symbolic-developments';
import { composeCurrentSingleCard } from './symbolic-tarot';
import { interactionMechanism, resolutionMechanism } from './symbolic-interactions';

const modes = ['day', 'love', 'question'] as const;
const readingBody = (card: string, mode: (typeof modes)[number]) => {
	const reading = composeCurrentSingleCard(card, undefined, mode);
	return [reading.summary, ...reading.sections.map((section) => section.body)].join(' ');
};

describe('authored applications of the 78 cards', () => {
	it('has an independent complete application for every card and scope, including no focus', () => {
		expect(Object.keys(tarotApplications).sort()).toEqual(Object.keys(tarotCanon).sort());
		expect(Object.keys(tarotDevelopments).sort()).toEqual(Object.keys(tarotCanon).sort());
		for (const [card, application] of Object.entries(tarotApplications)) {
			expect(new Set(modes.map((mode) => application[mode])).size, card).toBe(3);
			expect(new Set(modes.map((mode) => tarotDevelopments[card]![mode])).size, card).toBe(3);
			for (const mode of modes) {
				const result = composeCurrentSingleCard(card, undefined, mode);
				// The composer must deliver the authored interpretation intact rather
				// than reducing it to a nominal action plus a generic closing exercise.
				expect(`${result.summary} ${result.sections[0]!.body}`, `${card}/${mode}`).toBe(
					application[mode]
				);
				expect(result.sections[0]!.title).toBe(application.title);
				expect(result.sections[1]!.body).toBe(tarotDevelopments[card]![mode]);
			}
		}
		for (const mode of modes) {
			expect(new Set(Object.values(tarotApplications).map((entry) => entry[mode])).size).toBe(78);
			expect(new Set(Object.values(tarotDevelopments).map((entry) => entry[mode])).size).toBe(78);
		}
	});
	it('develops speed as an emotional rhythm in Eight of Wands love, rather than giving its action label', () => {
		const reading = composeCurrentSingleCard('wands-8', undefined, 'love');
		expect(`${reading.summary} ${reading.sections[0]!.body}`).toBe(
			'O Oito de Paus traz ao amor o ritmo das mensagens, dos convites e das respostas que puxam a próxima conversa. A rapidez pode tornar o encontro espontâneo, mas deixar pouco tempo para perceber se vocês acompanham o mesmo passo. Uma troca frequente, sozinha, não esclarece o que cada pessoa espera.'
		);
		expect(reading.sections[1]!.body).toBe(
			'Uma mensagem respondida depressa pode convidar a outra, sem que o assunto anterior tenha sido compreendido. A aproximação ganha espaço quando vocês também podem dizer o que desejam desse contato. O intervalo entre respostas pode acolher essa conversa, em vez de precisar ser lido imediatamente como desinteresse.'
		);
	});
	it('brings Ten of Pentacles into a day through shared support and continuity', () => {
		const reading = composeCurrentSingleCard('pentacles-10', undefined, 'day');
		expect(`${reading.summary} ${reading.sections[0]!.body}`).toBe(
			'O Dez de Ouros volta a atenção para o que se mantém com apoio compartilhado: uma casa, um acordo, um trabalho acumulado. Dividir uma tarefa ou transmitir um jeito de fazer pode valer mais do que iniciar outra coisa sozinho. Preservar essa base também inclui ajustar hábitos que ficaram pesados.'
		);
		expect(reading.sections[1]!.body).toContain(
			'Compartilhar um modo de fazer permite que a base se mantenha'
		);
	});
	it('keeps the complete contextual development when a question is supplied', () => {
		for (const [card, mode, focus] of [
			['wands-8', 'love', 'Como conversar sobre o ritmo desta relação?'],
			['pentacles-10', 'day', 'Como organizar o que precisa continuar?']
		] as const) {
			const result = composeCurrentSingleCard(card, focus, mode);
			expect(result.sections[1]!.body).toContain(tarotDevelopments[card]![mode]);
			expect(`${result.summary} ${result.sections[0]!.body}`).toBe(tarotApplications[card]![mode]);
		}
	});
	it('changes the meaning with the tool while retaining the same card', () => {
		const day = readingBody('pentacles-10', 'day');
		const love = readingBody('pentacles-10', 'love');
		const question = readingBody('pentacles-10', 'question');
		expect(day).toContain('Dividir uma tarefa ou transmitir um jeito de fazer');
		expect(love).toContain('expectativas herdadas sem conversar');
		expect(love).toContain('os desejos de vocês fora do próprio projeto');
		expect(question).toContain(
			'mudar a maneira como tarefas, recursos e decisões são transmitidos'
		);
		expect(day).not.toContain('os desejos de vocês');
		expect(love).not.toContain('Dividir uma tarefa ou transmitir um jeito de fazer');
	});
	it('changes the actual love dynamic between two cards of the same suit', () => {
		const fast = readingBody('wands-8', 'love');
		const shared = readingBody('wands-4', 'love');
		expect(fast).toContain('se vocês acompanham o mesmo passo');
		expect(shared).toContain('ter um espaço em comum');
		expect(shared).toContain(
			'a sensação de estabilidade precisa continuar admitindo conversas difíceis'
		);
		expect(shared).not.toContain('se vocês acompanham o mesmo passo');
		expect(fast).not.toContain('ter um espaço em comum');
	});
	it('keeps agency in concrete desire and care dynamics without assigning the other person a feeling', () => {
		const care = readingBody('major-3', 'love');
		const desire = readingBody('major-15', 'love');
		expect(care).toContain('quando cuidar vira ser indispensável');
		expect(care).toContain('que o outro também ofereça e escolha');
		expect(desire).toContain('a gratificação passa a comandar os acordos');
		expect(desire).toContain('dizer não começa a parecer uma ameaça ao vínculo');
		expect(care).not.toContain('a gratificação passa a comandar os acordos');
	});
	it('distinguishes two beginnings from an adjustment that makes room for a beginning', () => {
		const beginnings = interactionMechanism('major-0', 'wands-1', 'complement', 'relationship');
		const adjustment = interactionMechanism('pentacles-2', 'cups-11', 'complement', 'relationship');
		expect(beginnings).toContain('nenhum deles, sozinho, dá duração ao que começa');
		expect(adjustment).toContain('Ajustar a disponibilidade pode abrir espaço para um convite');
		expect(adjustment).toContain('a variação de tempo pode ser dita');
		expect(adjustment).not.toContain('Os dois impulsos');
	});
	it('ties the pause and rapid messages to the actual response card rather than its broad operation', () => {
		const temperance = resolutionMechanism('swords-4', 'wands-8', 'major-14', 'relationship');
		const king = resolutionMechanism('swords-4', 'wands-8', 'cups-14', 'relationship');
		expect(temperance).toContain('combinar quando voltar ao assunto');
		expect(temperance).toContain('cobrando a próxima resposta durante esse intervalo');
		expect(king).not.toContain('A Temperança');
		expect(king).not.toBe(temperance);
	});
});
