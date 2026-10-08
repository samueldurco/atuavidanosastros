import type { AspectResult, CrossAspectCalculation } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { bodyNames, CANON_VERSION, functions, signs } from './canon';
import { RECONSTRUCTION_VERSION } from './career';
import { aspectNames } from './date-facts';
import { normalizeFactGraph, type Position } from './fact-graph';
import { houseAreas, natalStyles } from './natal-canon';
import { assertSynastryProjection, type HouseOverlay } from './synastry-facts';

const unique = (ids: string[]) => [...new Set(ids)];
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const id = (a: AspectResult) => `cross-${a.first}-${a.second}`;
const contact = (a: AspectResult) =>
	`${bodyNames[a.first]} de A em ${aspectNames[a.kind]} com ${bodyNames[a.second]} de B`;
const weight: Record<string, number> = {
	sun: 10,
	moon: 12,
	mercury: 9,
	venus: 10,
	mars: 9,
	jupiter: 5,
	saturn: 8,
	uranus: 4,
	neptune: 3,
	pluto: 3
};
const style = (p: Position) => {
	if (p.body === 'saturn')
		return `dar forma a responsabilidades e limites ao ${natalStyles[p.sign].aim}`;
	if (p.body === 'jupiter') return `procurar crescimento e sentido ao ${natalStyles[p.sign].aim}`;
	if (p.body === 'uranus') return `abrir espaço para uma mudança ao ${natalStyles[p.sign].entry}`;
	const key =
		p.body === 'sun'
			? 'aim'
			: p.body === 'moon'
				? 'need'
				: p.body === 'mercury'
					? 'thought'
					: p.body === 'venus'
						? 'affection'
						: p.body === 'mars'
							? 'action'
							: 'entry';
	return natalStyles[p.sign][key];
};
function situation(context = '') {
	const text = context.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	if (/distancia|longe|viagen|cidades|paises/.test(text))
		return {
			key: 'distance',
			bodies: ['moon', 'mercury'],
			lens: 'manter presença quando vocês estão longe',
			action:
				'Escolham uma forma de contato que represente presença para cada pessoa e uma alternativa para os dias em que ela não for possível.',
			question: 'Que gesto mantém o vínculo à distância sem exigir disponibilidade permanente?'
		};
	if (/espaco|autonomia|liberdade|independen/.test(text))
		return {
			key: 'space',
			bodies: ['sun', 'uranus'],
			lens: 'preservar espaço individual dentro do vínculo',
			action:
				'Definam uma atividade individual que cada pessoa deseja preservar e como sinalizar uma pausa com um retorno combinado.',
			question:
				'Como o espaço individual pode ser comunicado sem virar uma suposição sobre o afeto?'
		};
	if (/discuss|briga|conflit|desentend|comunic|conversa/.test(text))
		return {
			key: 'conversation',
			bodies: ['mercury', 'mars'],
			lens: 'conversar sobre um desencontro concreto',
			action:
				'Escolham uma conversa recente. Cada pessoa conta o que ouviu e faz um pedido verificável; a outra confirma o que entendeu antes de responder.',
			question:
				'Qual pedido precisa ser traduzido para que as duas pessoas compreendam o mesmo acordo?'
		};
	if (/mudan|decis|plan|morar|casar|projeto/.test(text))
		return {
			key: 'decision',
			bodies: ['sun', 'saturn'],
			lens: 'negociar uma decisão ou projeto em comum',
			action:
				'Anotem o objetivo compartilhado, uma condição de cada pessoa e um primeiro passo reversível. Combinem quando avaliar a experiência.',
			question:
				'Que parte do projeto é comum e que condição precisa continuar sendo uma escolha individual?'
		};
	return {
		key: context ? 'reported' : 'open',
		bodies: ['moon', 'venus'],
		lens: context
			? 'examinar a situação que você trouxe'
			: 'reconhecer expectativas de reciprocidade',
		action:
			'Escolham uma situação cotidiana, descrevam um gesto de cuidado que cada pessoa reconheça e experimentem um acordo pequeno antes de ampliá-lo.',
		question: 'Que gesto de reciprocidade faz sentido para cada pessoa nesta situação?'
	};
}
const themes = [
	{
		key: 'emotions',
		title: 'Segurança emocional e formas de acolher',
		body: 'moon',
		related: ['moon', 'sun', 'saturn'],
		lens: 'reconhecer o cuidado de que cada pessoa precisa',
		tension: 'esperar que a outra pessoa adivinhe uma necessidade',
		action:
			'Diante de um incômodo, descrevam o cuidado desejado antes de avaliar a intenção do outro.',
		question: 'Qual resposta faz você se sentir acolhido, e qual costuma ser oferecida sem ajudar?'
	},
	{
		key: 'affection',
		title: 'Afeto, valores e reciprocidade',
		body: 'venus',
		related: ['venus', 'moon', 'mars'],
		lens: 'traduzir afeto em gestos reconhecíveis',
		tension: 'confundir a própria maneira de demonstrar afeto com a única maneira válida',
		action:
			'Cada pessoa escolhe um gesto de afeto que gostaria de receber e confirma se a outra deseja oferecê-lo.',
		question: 'Qual diferença entre intenção e gesto precisa de tradução entre vocês?'
	},
	{
		key: 'communication',
		title: 'Comunicação e escuta',
		body: 'mercury',
		related: ['mercury', 'moon', 'saturn'],
		lens: 'construir uma compreensão comum sem exigir raciocínios iguais',
		tension: 'responder à forma da mensagem antes de compreender o pedido',
		action:
			'Em um assunto concreto, repitam com suas palavras o que entenderam e deixem a outra pessoa corrigir.',
		question: 'O que você precisa ouvir antes de conseguir responder a um assunto difícil?'
	},
	{
		key: 'desire',
		title: 'Iniciativa, desejo e limites',
		body: 'mars',
		related: ['mars', 'venus', 'sun'],
		lens: 'negociar iniciativa e disponibilidade',
		tension: 'tratar uma diferença de ritmo como obrigação de acompanhar',
		action:
			'Façam um convite com espaço para aceitar, recusar ou propor outro momento; confirmem o limite em palavras.',
		question:
			'Como um convite pode expressar desejo e ainda deixar a resposta verdadeiramente livre?'
	},
	{
		key: 'conflict',
		title: 'Desencontros e reparação',
		body: 'mars',
		related: ['mars', 'mercury', 'saturn', 'pluto'],
		lens: 'interromper a escalada e reparar um desencontro',
		tension: 'transformar discordância sobre uma situação em julgamento da pessoa',
		action:
			'Combinem um sinal de pausa, um horário possível para retomar o assunto e o que cada pessoa assume reparar.',
		question: 'Qual sinal permite pausar uma discussão sem abandonar o assunto?'
	},
	{
		key: 'commitment',
		title: 'Compromisso e continuidade',
		body: 'saturn',
		related: ['saturn', 'sun', 'moon', 'venus'],
		lens: 'distinguir um compromisso escolhido de uma obrigação presumida',
		tension: 'exigir garantias que nenhuma promessa consegue produzir',
		action:
			'Escrevam um acordo com responsabilidade, limite e data de revisão, usando apenas o que ambas as pessoas aceitam.',
		question: 'Que responsabilidade vocês aceitam hoje e quando ela deve ser revista?'
	},
	{
		key: 'autonomy',
		title: 'Autonomia e espaço para mudar',
		body: 'uranus',
		related: ['uranus', 'sun', 'venus'],
		lens: 'acomodar mudanças sem apagar a individualidade',
		tension: 'interpretar toda mudança de preferência como perda do vínculo',
		action: 'Nomeiem uma liberdade individual e um compromisso de comunicação que podem coexistir.',
		question: 'Qual escolha individual precisa de espaço e qual impacto precisa ser conversado?'
	},
	{
		key: 'growth',
		title: 'Crescimento, expectativas e profundidade',
		body: 'jupiter',
		related: ['jupiter', 'neptune', 'pluto', 'sun'],
		lens: 'dar forma a possibilidades sem projetar uma pessoa ideal',
		tension: 'atribuir ao vínculo a tarefa de resolver toda a vida de cada pessoa',
		action:
			'Escolham uma experiência de aprendizagem em comum e uma expectativa que precisa ser conferida na realidade.',
		question: 'O que vocês querem aprender juntos e qual expectativa merece ser revista?'
	}
] as const;

export function composeReconstructedSynastry(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertSynastryProjection(input, calculation);
	const sources = calculation.data.sources as CalculationSnapshot[],
		graphs = sources.map(normalizeFactGraph);
	const geometry = calculation.data.relationshipGeometry as CrossAspectCalculation,
		binding = situation(input.context);
	const ranked = geometry.aspects
		.map((a) => ({
			a,
			score:
				weight[a.first] +
				weight[a.second] +
				(6 - a.orbDegrees) +
				(input.context && (binding.bodies.includes(a.first) || binding.bodies.includes(a.second))
					? 12
					: 0)
		}))
		.sort((a, b) => b.score - a.score || id(a.a).localeCompare(id(b.a)));
	const main = ranked.slice(0, 3),
		used = new Set<string>();
	const point = (i: number, body: string) => graphs[i].positions.find((p) => p.body === body)!;
	const pointId = (i: number, body: string) => `person-${i === 0 ? 'a' : 'b'}-position-${body}`;
	const evidence = (a: AspectResult) => [id(a), pointId(0, a.first), pointId(1, a.second)];
	const mainIds = unique([
		...main.flatMap(({ a }) => evidence(a)),
		...[0, 1].flatMap((i) => ['sun', 'moon'].map((body) => pointId(i, body)))
	]);
	const moonA = point(0, 'moon'),
		moonB = point(1, 'moon');
	const opening = main.length
		? `O eixo inicial desta comparação é ${contact(main[0].a)}. Ele aproxima ${functions[main[0].a.first]} de A e ${functions[main[0].a.second]} de B; a pergunta é como essas duas funções se encontram em ${binding.lens}.`
		: `Esta comparação começa pelas necessidades emocionais: A tem ${label(moonA)} e B tem ${label(moonB)}. Nenhum contato maior entrou na política desta edição; a leitura explora diferenças e semelhanças de linguagem sem inventar um aspecto.`;
	const overview = `${opening}\n\n${main
		.slice(1)
		.map(
			({ a }) =>
				`${contact(a)} acrescenta ${a.kind === 'square' || a.kind === 'opposition' ? 'uma negociação entre' : 'uma possibilidade de aproximar'} ${a.first === a.second ? `duas maneiras de viver ${functions[a.first]}` : `${functions[a.first]} e ${functions[a.second]}`}.`
		)
		.join(
			' '
		)}\n\nA Lua de A sugere ${style(moonA)}, enquanto a de B propõe ${style(moonB)}. ${moonA.sign === moonB.sign ? 'A linguagem compartilhada pode facilitar o reconhecimento, mas cada história dá um sentido próprio ao mesmo símbolo.' : 'Esse contraste mostra por que um gesto bem-intencionado pode precisar de tradução para ser reconhecido como cuidado.'} A síntese une os contatos selecionados a essa diferença de necessidades; um fator isolado não descreve a relação inteira.`;
	const sections: TrialReading['sections'] = [
		{ title: 'O fio condutor da relação', text: overview, factIds: mainIds }
	];
	const chosen: { factId: string; score: number; reason: string }[] = main.map(({ a, score }) => ({
		factId: id(a),
		score,
		reason: `Funções pessoais, orbe nominal e relevância para ${binding.key}; seleção editorial, sem medida de compatibilidade.`
	}));
	for (const theme of themes) {
		const a = point(0, theme.body),
			b = point(1, theme.body);
		const candidates = ranked
			.filter(
				({ a: c }) =>
					!used.has(id(c)) &&
					(theme.related as readonly string[]).includes(c.first) &&
					(theme.related as readonly string[]).includes(c.second)
			)
			.slice(0, 2);
		candidates.forEach(({ a: c }) => used.add(id(c)));
		const paragraphs = candidates.map(({ a: c }) => {
			const meeting =
				c.first === c.second
					? `duas maneiras de viver ${functions[c.first]}`
					: `${functions[c.first]} e ${functions[c.second]}`;
			const approach =
				c.kind === 'square' || c.kind === 'opposition'
					? `A geometria de tensão põe em contraste ${meeting}; reconhecer a diferença pode abrir uma negociação antes de avançar.`
					: c.kind === 'conjunction'
						? `A proximidade simbólica reúne ${meeting}; convém distinguir o que cada pessoa deseja, mesmo quando existe identificação.`
						: `A ligação de apoio aproxima ${meeting}; uma facilidade percebida precisa de participação para virar um recurso do vínculo.`;
			const generational =
				['uranus', 'neptune', 'pluto'].includes(c.first) &&
				['uranus', 'neptune', 'pluto'].includes(c.second)
					? ` O contato de ${bodyNames[c.first]} de A com ${bodyNames[c.second]} de B pode ser compartilhado por muitas pessoas da mesma geração; sozinho, tem pouco peso para distinguir este vínculo.`
					: '';
			return `${contact(c)} (orbe nominal ${c.orbDegrees.toFixed(2)}°). ${approach}${generational}`;
		});
		const text = `Para ${theme.lens}, A tem ${label(a)}, que sugere ${style(a)}; B tem ${label(b)}, que sugere ${style(b)}. ${a.sign === b.sign ? 'A semelhança de signo oferece uma linguagem comum, sem tornar idênticas as expectativas.' : `As duas linguagens de ${signs[a.sign]} e ${signs[b.sign]} podem complementar-se quando a diferença é nomeada.`}\n\n${paragraphs.length ? paragraphs.join('\n\n') : `Nenhum contato adicional foi escolhido para este tema entre os aspectos maiores calculados. A hipótese deste capítulo se apoia nas duas posições natais; isso não significa falta de ${functions[theme.body]} entre vocês.`}\n\nUm ponto de atenção é ${theme.tension}. ${theme.action} ${theme.question}`;
		sections.push({
			title: theme.title,
			text,
			factIds: unique([
				pointId(0, theme.body),
				pointId(1, theme.body),
				...candidates.flatMap(({ a: c }) => evidence(c))
			])
		});
	}
	const overlays = calculation.data.houseOverlays as HouseOverlay[];
	const chosenOverlays = overlays.filter((o) => ['sun', 'moon', 'venus'].includes(o.body));
	sections.push({
		title: 'Onde a presença da outra pessoa ganha espaço',
		text: chosenOverlays.length
			? `${chosenOverlays.map((o) => `${bodyNames[o.body]} de ${o.from === 'person-a' ? 'A' : 'B'} cai na casa ${o.house} de ${o.from === 'person-a' ? 'B' : 'A'}, área de ${houseAreas[o.house - 1]}. Nesse campo, a presença de ${o.from === 'person-a' ? 'A' : 'B'} pode chamar a atenção de ${o.from === 'person-a' ? 'B' : 'A'} para ${functions[o.body]}.`).join('\n\n')}\n\nA casa pertence ao mapa que recebe o contato. A sobreposição não transfere a personalidade de uma pessoa para a outra nem garante um papel fixo na relação. Escolham uma dessas áreas e descrevam uma situação em que a presença do outro ampliou, incomodou ou reorganizou suas escolhas. Se a hora natal estiver incorreta, as casas podem mudar; mantenham a experiência relatada como critério para avaliar a hipótese.`
			: 'As casas do mapa receptor não estão disponíveis para sobreposições nesta entrada. Por isso, este capítulo não atribui áreas de vida à presença da outra pessoa. A comparação planetária continua possível, com o limite explícito de não descrever em que casas os contatos caem. Conversem sobre um campo da vida em que a presença do outro mudou uma escolha e distingam a experiência relatada de qualquer conclusão astrológica. Uma entrada natal mais precisa pode permitir outra edição, sem alterar esta leitura salva.',
		factIds: chosenOverlays.length
			? unique(chosenOverlays.flatMap((o) => [o.factId, o.positionFactId, o.cuspFactId]))
			: [pointId(0, 'sun'), pointId(1, 'sun')]
	});
	const integrationIds = unique([...mainIds, ...(input.context ? ['personal-context'] : [])]);
	sections.push({
		title: 'Da leitura a um acordo possível',
		text: `${input.context ? `A situação relatada foi: “${input.context}”. Ela orienta a prioridade dos temas; não altera as posições nem confirma as hipóteses sobre a outra pessoa.` : 'Sem uma situação relatada, o próximo passo é escolher um episódio que ambas as pessoas reconheçam e desejem conversar.'}\n\n${main.length ? `Retomem ${contact(main[0].a)} como pergunta sobre o encontro entre ${functions[main[0].a.first]} e ${functions[main[0].a.second]}.` : `Retomem a diferença entre ${label(moonA)} e ${label(moonB)} como pergunta sobre cuidado.`} Depois, confrontem essa hipótese com as necessidades emocionais de cada pessoa, sem usar o mapa como argumento para vencer a conversa. ${binding.action}\n\nAvaliem o acordo pela experiência: foi compreendido, pôde ser recusado e produziu o efeito combinado? Se a resposta for diferente para cada pessoa, revisem o acordo. O valor desta leitura está em abrir perguntas e tornar escolhas mais conscientes; quem decide o vínculo são as pessoas envolvidas.`,
		factIds: integrationIds
	});
	sections.push({
		title: 'Referências desta leitura',
		text: 'Conteúdo original ATVNA, cânone humanista e moderno v1: funções planetárias, signos, relação entre necessidades e escolhas e sobreposições como áreas de experiência. Base própria: Seu Mapa Astral por Inteiro, capítulo de relacionamentos. As referências externas e os limites de consulta estão registrados no dossiê editorial SOURCES_2026-10-08; nenhum livro fechado é apresentado como integralmente lido. Os fatos de A, os de B, os cem pares e as sobreposições permanecem na base técnica. Conjunções, sextis, quadraturas, trígonos e oposições seguem uma política editorial explícita. Graus e orbes são nominais, sem certificação de precisão; interpretação simbólica não é previsão nem avaliação da outra pessoa.',
		factIds: calculation.facts.map((f) => f.id)
	});
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Sinastria',
		opening,
		source: 'Conteúdo original ATVNA · leitura temática de dois mapas tropicais',
		sections,
		questions: [
			binding.question,
			'Qual necessidade sua a outra pessoa só pode conhecer se você a colocar em palavras?',
			'Que acordo pequeno vocês querem experimentar e quando vão avaliar o resultado?'
		],
		practice: binding.action,
		limits: calculation.limits,
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-synastry-thematic/1.0.0',
			selection: chosen,
			patterns: [
				{
					kind: moonA.sign === moonB.sign ? 'shared-emotional-language' : 'emotional-translation',
					factIds: [pointId(0, 'moon'), pointId(1, 'moon')]
				}
			],
			themes: sections
				.slice(1, -1)
				.map((s, i) => ({ id: `synastry-theme-${i}`, factIds: s.factIds })),
			context: {
				key: input.context ? 'relationships' : 'general',
				factId: input.context ? 'personal-context' : null
			},
			plan: sections.map((s, i) => ({
				title: s.title,
				factIds: s.factIds,
				role: i === 0 ? 'synthesis' : i === sections.length - 1 ? 'references' : 'interpretation'
			}))
		}
	};
}

export function reviewReconstructedSynastry(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	try {
		assertSynastryProjection(input, calculation);
	} catch {
		return ['invalid-synastry-projection'];
	}
	const failures: string[] = [],
		chapters = reading.sections.filter((s) => !/^Referências/.test(s.title)),
		trace = reading.editorial;
	if (
		chapters.length < 8 ||
		chapters.length > 12 ||
		chapters.some((s) => s.text.length < 350 || s.factIds.length < 2)
	)
		failures.push('incomplete-synastry-chapters');
	const sentences = chapters
		.flatMap((s) => s.text.split(/(?<=[.!?])\s+/))
		.map((s) => s.trim())
		.filter((s) => s.length > 100);
	if (new Set(sentences).size !== sentences.length) failures.push('repeated-synastry-prose');
	if (!trace || trace.graph !== 'atv-synastry-thematic/1.0.0' || trace.canon !== CANON_VERSION)
		return ['missing-synastry-trace'];
	if (
		trace.selection.some((s) => !reading.sections[0].factIds.includes(s.factId)) ||
		trace.patterns.some((p) => p.factIds.some((f) => !reading.sections[0].factIds.includes(f)))
	)
		failures.push('unbound-synastry-synthesis');
	const ids = new Set(calculation.facts.map((f) => f.id));
	if (
		reading.sections.some((s) => s.factIds.some((f) => !ids.has(f))) ||
		trace.plan.length !== reading.sections.length ||
		trace.plan.some(
			(p, i) =>
				p.title !== reading.sections[i].title ||
				p.factIds.join('|') !== reading.sections[i].factIds.join('|')
		)
	)
		failures.push('unbound-synastry-plan');
	if (trace.context.factId !== (input.context ? 'personal-context' : null))
		failures.push('unbound-synastry-context');
	if (reading.questions.length !== 3 || new Set(reading.questions).size !== 3)
		failures.push('synastry-questions');
	if (
		/alma gêmea|destinados a|percentual de compatibilidade|garante.{0,20}(amor|relacionamento)/i.test(
			JSON.stringify(reading)
		)
	)
		failures.push('unsupported-synastry-claim');
	return failures;
}
