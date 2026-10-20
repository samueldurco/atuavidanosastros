import { bodyNames, signs } from '../reconstruction/canon';
import type { Position } from '../reconstruction/fact-graph';
import { natalStyles } from '../reconstruction/natal-canon';
import { aspectNames } from '../reconstruction/date-facts';

/** Keep the planet's function when modulating it by sign; a sign is not a solar reading. */
export function planetParticipation(p: Position): string {
	const s = natalStyles[p.sign];
	const meanings: Record<string, string> = {
		sun: `dar uma direção própria às escolhas, procurando ${s.aim}`,
		moon: `encontrar amparo emocional, com a necessidade de ${s.need}`,
		mercury: `compreender e comunicar, pela tendência a ${s.thought}`,
		venus: `reconhecer o que merece proximidade e investimento, procurando ${s.affection}`,
		mars: `transformar vontade em atitude, pela tendência a ${s.action}`,
		jupiter: `abrir possibilidades e ampliar o entendimento, procurando ${s.aim}`,
		saturn: `estabelecer um compromisso que resista ao tempo, usando como critério ${s.thought}`,
		uranus: `abrir espaço para escolhas independentes e mudanças, questionando o modo habitual de ${s.aim}`,
		neptune: `dar espaço à imaginação e à sensibilidade, sem tomar o desejo de ${s.aim} como garantia de realização`,
		pluto: `aprofundar e transformar o que perdeu sentido, inclusive a forma de ${s.aim}`
	};
	return meanings[p.body] ?? `participar por meio de ${s.aim}`;
}

const angleFunctions: Record<string, { movement: string; cost: string; support: string }> = {
	sun: {
		movement: 'assumir a autoria da direção escolhida',
		cost: 'a necessidade de reconhecimento pode tornar difícil experimentar sem já ter uma imagem definida',
		support: 'a identificação com a escolha ajuda a dar continuidade ao primeiro movimento'
	},
	moon: {
		movement: 'conservar espaço para as próprias necessidades emocionais',
		cost: 'a resposta esperada de fora pode disputar espaço com o tempo necessário para se recompor',
		support:
			'perceber o próprio ritmo emocional ajuda a escolher uma forma de presença que possa ser sustentada'
	},
	mercury: {
		movement: 'entender, explicar e rever a forma de se apresentar',
		cost: 'a preocupação de encontrar a explicação certa pode atrasar uma participação que ainda está sendo construída',
		support:
			'a conversa e a aprendizagem permitem ajustar a direção sem exigir que tudo esteja decidido de saída'
	},
	venus: {
		movement: 'reconhecer o que merece adesão e construir aproximações',
		cost: 'ser aceito pode ganhar peso excessivo diante da escolha de uma direção própria',
		support:
			'afinidades e valores ajudam a criar uma participação que não dependa apenas de esforço'
	},
	mars: {
		movement: 'agir e defender espaço para uma vontade própria',
		cost: 'a urgência de avançar pode entrar em conflito com a forma de participar ou com o efeito da iniciativa sobre os outros',
		support:
			'a iniciativa ajuda a converter intenção em um passo concreto, sem exigir que toda situação vire confronto'
	},
	jupiter: {
		movement: 'ampliar possibilidades e encontrar um horizonte de sentido',
		cost: 'a promessa de crescimento pode exceder o espaço e os meios que essa direção tem no presente',
		support:
			'estudo, troca e abertura a outras perspectivas podem ampliar o alcance da contribuição'
	},
	saturn: {
		movement: 'assumir responsabilidade e construir continuidade',
		cost: 'a exigência de estar preparado pode fazer a exposição parecer uma prova que precisa ser vencida antes de começar',
		support: 'limites claros e prática consistente dão sustentação à presença, sem exigir perfeição'
	},
	uranus: {
		movement: 'preservar autonomia e poder mudar uma forma já estabelecida',
		cost: 'a necessidade de romper uma expectativa pode se adiantar à construção de uma alternativa viável',
		support:
			'experimentar outro modo de participar permite renovar a direção sem perder toda continuidade'
	},
	neptune: {
		movement: 'dar lugar à sensibilidade, à imaginação e ao que ainda não tem forma',
		cost: 'a imagem ideal de uma participação pode tornar menos nítidos os limites do que é possível assumir',
		support:
			'imaginação e escuta ampliam a contribuição quando encontram uma forma e limites compartilháveis'
	},
	pluto: {
		movement: 'aprofundar escolhas e transformar relações com poder e controle',
		cost: 'a necessidade de não ficar à mercê das circunstâncias pode tornar a presença defensiva ou a direção excessivamente controlada',
		support:
			'rever o que perdeu sentido permite sustentar mudanças profundas sem precisar controlar todas as respostas'
	}
};

export function angleContactMeaning(p: Position, angle: 'asc' | 'mc', kind: string): string {
	const f = angleFunctions[p.body];
	if (!f) return '';
	const aspect = aspectNames[kind] ?? kind;
	const field =
		angle === 'asc'
			? 'a maneira de entrar em contato com o mundo'
			: 'a direção que ganha expressão pública';
	const effect =
		kind === 'square' || kind === 'opposition'
			? `Há uma tensão específica: ${f.cost}.`
			: kind === 'conjunction'
				? `Esse movimento fica próximo da própria forma de participar: ${f.support}. Sua intensidade também pede medida, pois ${f.cost}.`
				: `A ligação oferece apoio: ${f.support}.`;
	return `${bodyNames[p.body]} em ${signs[p.sign]}, em ${aspect} com ${angle === 'asc' ? 'o Ascendente' : 'o Meio do Céu'}, aproxima ${field} da necessidade de ${f.movement}. ${effect} O signo dá a essa busca uma orientação particular: ${planetParticipation(p)}.`;
}
