import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, signs } from './canon';
import { RECONSTRUCTION_VERSION } from './career';
import { natalStyles } from './natal-canon';
import {
	assertPairProjection,
	pairFactors,
	type PairFactor,
	type PairPerson,
	type PairPoint
} from './pair-facts';

const names = { sun: 'Sol', moon: 'Lua', ascendant: 'Ascendente' };
const topics = {
	sun: 'Direções que cada pessoa quer construir',
	moon: 'O cuidado precisa ser reconhecido por quem recebe',
	ascendant: 'Como vocês chegam à mesma situação'
};
const functions = {
	sun: 'autoria e direção',
	moon: 'segurança e cuidado',
	ascendant: 'aproximação e primeira resposta'
};
const style = (p: PairPoint) =>
	natalStyles[p.sign][p.factor === 'sun' ? 'aim' : p.factor === 'moon' ? 'need' : 'entry'];
const label = (p: PairPoint) => `${names[p.factor]} em ${signs[p.sign]}`;
const unique = (ids: string[]) => [...new Set(ids)];
const elements = ['fogo', 'terra', 'ar', 'água'];
const rhythms = ['iniciar', 'sustentar', 'adaptar'];
type Situation = {
	key: string;
	priority: PairFactor;
	action: string;
	question: string;
	lens: string;
};
function situation(context: string | undefined): Situation {
	const text = context?.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() ?? '';
	if (/distancia|longe|viagen|viajar|cidades|paises/.test(text))
		return {
			key: 'distance',
			priority: 'moon',
			lens: 'a continuidade do contato à distância',
			action:
				'Combinem uma forma de contato que cada pessoa reconheça como presença e uma alternativa para os dias em que ela não for possível.',
			question:
				'Que contato mantém o vínculo vivo para cada pessoa sem exigir disponibilidade permanente?'
		};
	if (/espaco|autonomia|liberdade|independen/.test(text))
		return {
			key: 'space',
			priority: 'ascendant',
			lens: 'o espaço individual dentro da convivência',
			action:
				'Escolham uma situação em que proximidade e espaço individual precisam coexistir. Cada pessoa descreve como deseja se aproximar e como sinaliza uma pausa.',
			question:
				'Como cada pessoa comunica que precisa de espaço e como combina o retorno ao contato?'
		};
	if (/discuss|briga|conflit|desentend|comunic|conversa/.test(text))
		return {
			key: 'conversation',
			priority: 'moon',
			lens: 'uma conversa em que vocês se desencontram',
			action:
				'Retomem uma conversa específica, com o consentimento de ambas as pessoas. Cada uma descreve o que ouviu, o cuidado de que precisava e um pedido que a outra possa compreender.',
			question: 'Qual pedido concreto ficou escondido atrás da maneira de reagir?'
		};
	if (/mudan|decis|plan|morar|casar|projeto/.test(text))
		return {
			key: 'decision',
			priority: 'sun',
			lens: 'uma decisão ou um projeto em comum',
			action:
				'Anotem separadamente o que cada pessoa deseja construir e o que precisa preservar. Procurem um próximo passo que tenha sentido para as duas, sem exigir que desejem a mesma coisa.',
			question:
				'Que parte da decisão é compartilhada e que parte continua sendo uma escolha individual?'
		};
	return {
		key: context ? 'reported' : 'open',
		priority: 'moon',
		lens: context ? 'a situação que você trouxe' : 'uma situação cotidiana escolhida por vocês',
		action:
			'Escolham um momento recente em que cada pessoa tenha chegado à situação de uma maneira diferente. Perguntem o que cada uma buscava, de que precisava e o que ajudaria na próxima vez.',
		question:
			'Em qual situação recente uma diferença de ritmo foi confundida com falta de interesse?'
	};
}
function comparison(a: PairPoint, b: PairPoint) {
	const fn = functions[a.factor];
	if (a.sign === b.sign)
		return `Em ${fn}, a repetição de ${signs[a.sign]} oferece uma linguagem simbólica semelhante. O ponto cego associado a ${names[a.factor]} é ${natalStyles[a.sign].excess}; observem se ele aparece na situação escolhida e como cada pessoa o percebe.`;
	const sharedElement = a.sign % 4 === b.sign % 4;
	const element = sharedElement
		? `Os dois signos usam a linguagem de ${elements[a.sign % 4]}, embora a expressem de formas diferentes. Uma semelhança de orientação em ${fn} pode ajudar a iniciar a conversa; ainda é preciso descobrir o que satisfaz cada pessoa.`
		: `A linguagem de ${elements[a.sign % 4]} de A encontra a de ${elements[b.sign % 4]} de B em ${fn}. ${a.factor === 'sun' ? 'Uma contribuição diferente pode ampliar o projeto quando vocês nomeiam o que cada pessoa deseja construir.' : a.factor === 'moon' ? 'O cuidado precisa de uma tradução: perguntem qual ajuda seria reconhecida antes de escolher o gesto.' : 'Uma forma de aproximação pode surpreender a outra; combinar a entrada na situação ajuda a evitar suposições.'}`;
	const rhythm =
		a.sign % 3 === b.sign % 3
			? `Em ${fn}, os dois fatores enfatizam ${rhythms[a.sign % 3]}. Observem se vocês se apoiam nessa tarefa ou se esperam que a outra pessoa assuma a parte que falta.`
			: `Em ${fn}, o ritmo de A enfatiza ${rhythms[a.sign % 3]}; o de B, ${rhythms[b.sign % 3]}. Combinem uma etapa de início, continuidade ou revisão para essa função.`;
	return `${element} ${rhythm}`;
}
function chapter(a: PairPoint, b: PairPoint, who: [string, string]) {
	const shared = a.sign === b.sign;
	const first = shared
		? `${who[0]} e ${who[1]} têm ${label(a)}. Para a função de ${functions[a.factor]}, a leitura inicial propõe ${style(a)}.`
		: `${who[0]} tem ${label(a)}: na função de ${functions[a.factor]}, pode reconhecer a busca por ${style(a)}. ${who[1]} tem ${label(b)}, que propõe ${style(b)}. São duas maneiras de abordar a mesma função, que podem ser conferidas no cotidiano.`;
	const end =
		a.factor === 'sun'
			? `Um projeto comum ganha clareza quando vocês distinguem participação conjunta de autoria individual. ${shared ? `O desejo semelhante de ${style(a)} precisa de espaço para duas contribuições, em vez de uma única definição do que tem valor.` : `A direção de ${signs[a.sign]} não precisa desaparecer para acomodar a de ${signs[b.sign]}; procurem uma tarefa em que cada contribuição seja visível.`} Perguntem o que cada pessoa quer poder reconhecer como sua participação.`
			: a.factor === 'moon'
				? `O gesto de cuidado funciona quando chega de forma compreensível. ${shared ? `A necessidade semelhante de ${style(a)} pode ser um ponto de conversa, mas não dispensa perguntar o que ajuda neste momento.` : `Oferecer a B apenas o que tranquiliza A — ${style(a)} — pode não atender ao pedido de ${style(b)}. Experimentem nomear a ajuda desejada antes de oferecê-la.`} Uma diferença na resposta emocional não comprova intensidade maior ou menor de afeto.`
				: `O Ascendente descreve uma entrada simbólica na experiência, dependente da hora e do local de nascimento. ${shared ? 'Mesmo com uma forma de aproximação semelhante, vocês podem precisar de tempos diferentes para se sentir à vontade.' : `A primeira aproximação de ${signs[a.sign]} pode não mostrar a intenção de ${signs[b.sign]} da maneira que A espera, e o inverso também merece ser perguntado.`} Confiram o que está acontecendo antes de atribuir uma intenção à reação inicial.`;
	return `${first}\n\n${comparison(a, b)}\n\n${end}`;
}
function inner(person: PairPerson, who: string) {
	const moon = person.points.find((p) => p.factor === 'moon')!,
		asc = person.points.find((p) => p.factor === 'ascendant')!;
	return moon.sign === asc.sign
		? `Em ${who}, Lua e Ascendente repetem ${signs[moon.sign]}: a forma de chegar — ${style(asc)} — e a necessidade de ${style(moon)} podem parecer reconhecíveis na mesma linguagem.`
		: `Em ${who}, ${label(asc)} sugere ${style(asc)}, enquanto ${label(moon)} pede ${style(moon)}. São duas perspectivas sobre a experiência dessa pessoa.`;
}

export function composeReconstructedPair(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertPairProjection(input, calculation);
	const people = [calculation.data.first, calculation.data.second] as [PairPerson, PairPerson];
	const who: [string, string] = [
		input.presentation?.name ?? 'Pessoa A',
		input.presentation?.partnerName ?? 'Pessoa B'
	];
	const binding = situation(input.context);
	const pairs = pairFactors
		.map((factor) => {
			const a = people[0].points.find((p) => p.factor === factor)!,
				b = people[1].points.find((p) => p.factor === factor)!;
			return {
				factor,
				a,
				b,
				score:
					(factor === 'moon' ? 3 : factor === 'sun' ? 2 : 1) +
					(a.sign % 4 !== b.sign % 4 ? 2 : 0) +
					(a.sign % 3 !== b.sign % 3 ? 1 : 0) +
					(input.context && binding.priority === factor ? 6 : 0)
			};
		})
		.sort(
			(a, b) => b.score - a.score || pairFactors.indexOf(a.factor) - pairFactors.indexOf(b.factor)
		);
	const [first, next] = pairs;
	const allIds = people.flatMap((p) => p.points.map((p) => p.factId));
	const opening = `Uma primeira conversa sobre o que vocês buscam, o cuidado de que precisam e como se aproximam. Os três fatores oferecem hipóteses para conferir juntos.`;
	const lead =
		first.a.sign === first.b.sign
			? `A comparação começa por uma semelhança: os dois têm ${label(first.a)}. Em ${functions[first.factor]}, isso destaca a busca por ${style(first.a)}. A pergunta útil é onde essa linguagem encontra respostas diferentes na história de cada pessoa.`
			: `A comparação começa por ${names[first.factor]}: ${who[0]} tem o fator em ${signs[first.a.sign]}, enquanto ${who[1]} o tem em ${signs[first.b.sign]}. Para ${functions[first.factor]}, A pode buscar ${style(first.a)}; B, ${style(first.b)}. Esse contraste pede uma tradução concreta do que cada pessoa espera.`;
	const second =
		next.a.sign === next.b.sign
			? `Ao olhar ${names[next.factor]}, aparece uma linguagem compartilhada de ${signs[next.a.sign]}: ${style(next.a)}. Essa semelhança pode oferecer um ponto de apoio para conversar sobre ${first.a.sign === first.b.sign ? 'as expectativas de cada pessoa' : 'a diferença anterior'}, sem decidir por vocês como a relação funciona.`
			: `Ao mesmo tempo, ${label(next.a)} de A e ${label(next.b)} de B mostram ${first.a.sign === first.b.sign ? 'uma diferença em outra função' : 'outra diferença'}: ${style(next.a)} se encontra com ${style(next.b)}. Interessa saber qual acordo torna essas duas preferências compreensíveis.`;
	const sections: TrialReading['sections'] = [
		{
			title: 'O que aproxima e o que pede tradução',
			factIds: [...allIds, ...(input.context ? ['personal-context'] : [])],
			text: `${lead}\n\n${second}\n\n${input.context ? `A situação informada orienta o foco desta leitura para ${binding.lens}.` : 'Sem um contexto informado, a comparação permanece aberta: escolham uma situação real antes de tirar conclusões sobre o vínculo.'} Sol, Lua e Ascendente descrevem funções diferentes. As três comparações a seguir ajudam a separar direção pessoal, cuidado e aproximação, sem transformar os signos em um veredito sobre a relação.`
		}
	];
	for (const factor of pairFactors) {
		const { a, b } = pairs.find((p) => p.factor === factor)!;
		sections.push({
			title: topics[factor],
			factIds: [a.factId, b.factId],
			text: chapter(a, b, who)
		});
	}
	const moonAscIds = people.flatMap((p) =>
		p.points.filter((p) => p.factor !== 'sun').map((p) => p.factId)
	);
	sections.push({
		title: 'Antes de concluir o que a outra pessoa quis dizer',
		factIds: moonAscIds,
		text: `${inner(people[0], who[0])}\n\n${inner(people[1], who[1])}\n\nJuntem essas duas observações em um episódio concreto: o que cada pessoa mostrou ao chegar, o que disse precisar e que resposta recebeu? A comparação inicial fica mais útil quando vocês corrigem a hipótese com essa conversa. Se desejarem aprofundar, a Sinastria examina relações calculadas entre mais fatores dos dois mapas; este Preview encerra sua proposta nos três fatores apresentados.`
	});
	if (input.context)
		sections.push({
			title: 'Um próximo passo para a situação informada',
			factIds: unique([
				'personal-context',
				...pairs
					.filter((p) => p.factor === binding.priority)
					.flatMap((p) => [p.a.factId, p.b.factId])
			]),
			text: `Você trouxe:\n“${input.context}”\n\nO relato é o contexto desta conversa, e não uma confirmação de como a outra pessoa se sente. Para ${binding.lens}, a comparação de ${names[binding.priority]} ajuda a formular um pedido que possa ser respondido.\n\n${binding.action} Depois, anotem o que cada pessoa de fato reconheceu ou corrigiu. O acordo pode mudar com a experiência; ele não precisa reproduzir o símbolo.`
		});
	sections.push({
		title: 'Referências desta leitura',
		factIds: calculation.facts.map((f) => f.id),
		text: calculation.facts.map((f) => f.display).join('\n')
	});
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Combinação do Casal',
		opening,
		sections,
		questions: [
			binding.question,
			`Como o cuidado que ${who[0]} oferece chega a ${who[1]}, e o que cada pessoa gostaria de pedir de outra forma?`,
			'Qual observação concreta confirma, modifica ou contraria a comparação que vocês acabaram de ler?'
		],
		practice: `${binding.action} Registrem um pedido de cada pessoa e um acordo pequeno que ambas desejem experimentar. Retomem o assunto depois da experiência para avaliar o que ajudou.`,
		source:
			'Leitura original ATVNA em astrologia psicológica e humanista. Referência editorial: Seu Mapa Astral por Inteiro, capítulos sobre elementos e Sol, Lua e Ascendente. Comparação dos três fatores, com hipóteses de conversa construídas para esta edição.',
		limits: calculation.limits,
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-pair-three-factors/1.0.0',
			selection: pairs.slice(0, 2).map((p) => ({
				factId: p.a.factId,
				score: p.score,
				reason: `${functions[p.factor]}; contraste de linguagem e ritmo; situação ${binding.key}.`
			})),
			patterns: people.map((p) => ({
				kind: `${p.role}-entry-care`,
				factIds: p.points.filter((point) => point.factor !== 'sun').map((point) => point.factId)
			})),
			themes: pairs.map((p) => ({ id: `pair-${p.factor}`, factIds: [p.a.factId, p.b.factId] })),
			context: {
				key: input.context ? 'relationships' : 'general',
				factId: input.context ? 'personal-context' : null
			},
			plan: sections.map((s, i) => ({
				title: s.title,
				factIds: s.factIds,
				role:
					i === 0
						? 'synthesis'
						: /^Referências/.test(s.title)
							? 'technical-reference'
							: 'interpretation'
			}))
		}
	};
}

export function reviewReconstructedPair(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	try {
		assertPairProjection(input, calculation);
	} catch {
		return ['invalid-pair-projection'];
	}
	const failures: string[] = [];
	const chapters = reading.sections.filter((s) => !/^Referências/.test(s.title));
	if (
		chapters.length !== (input.context ? 6 : 5) ||
		chapters.some((s) => s.text.length < 350 || s.factIds.length < 2)
	)
		failures.push('incomplete-pair-chapters');
	const trace = reading.editorial;
	if (!trace || trace.graph !== 'atv-pair-three-factors/1.0.0' || trace.canon !== CANON_VERSION)
		return ['missing-pair-trace'];
	if (
		trace.selection.some((s) => !reading.sections[0].factIds.includes(s.factId)) ||
		trace.patterns.some((p) => p.factIds.some((id) => !reading.sections[0].factIds.includes(id)))
	)
		failures.push('unbound-pair-synthesis');
	if (
		trace.plan.length !== reading.sections.length ||
		trace.plan.some(
			(p, i) =>
				p.title !== reading.sections[i].title ||
				p.factIds.join('|') !== reading.sections[i].factIds.join('|')
		)
	)
		failures.push('unbound-pair-plan');
	if (trace.context.factId !== (input.context ? 'personal-context' : null))
		failures.push('unbound-pair-context');
	if (reading.questions.length !== 3 || new Set(reading.questions).size !== 3)
		failures.push('pair-questions');
	const sentences = chapters.flatMap((s) =>
		s.text
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 100)
	);
	if (new Set(sentences).size !== sentences.length) failures.push('repeated-pair-sentence');
	if (
		/alma gêmea|nasceram um para|destinados a|percentual de compatibilidade|garante.{0,20}(amor|relacionamento)/i.test(
			JSON.stringify(reading)
		)
	)
		failures.push('unsupported-pair-claim');
	return failures;
}
