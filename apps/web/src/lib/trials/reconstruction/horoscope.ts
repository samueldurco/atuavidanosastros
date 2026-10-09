import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { CrossAspectCalculation } from '@atv/astrology';
import type { TrialReading } from '../reading';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { CANON_VERSION, bodyNames, functions, signs } from './canon';
import { houseAreas, natalStyles } from './natal-canon';
import { normalizeFactGraph, type Position } from './fact-graph';
import { aspectNames } from './date-facts';
import { assertHoroscopeProjection } from './horoscope-facts';

const unique = (ids: string[]) => [...new Set(ids)];
const background = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const meanings: Record<string, { invitation: string; risk: string; action: string }> = {
	sun: {
		invitation: 'assumir uma participação que tenha sentido para você',
		risk: 'procurar aprovação antes de reconhecer sua própria contribuição',
		action: 'escolha uma contribuição que consiga explicar com suas palavras'
	},
	moon: {
		invitation: 'escutar uma necessidade que muda sua disponibilidade',
		risk: 'responder no calor de uma reação sem conferir o que precisa',
		action: 'faça uma pausa e nomeie a necessidade antes de assumir outro compromisso'
	},
	mercury: {
		invitation: 'distinguir o que você sabe do que está supondo',
		risk: 'acumular explicações que ninguém teve oportunidade de confirmar',
		action: 'converta uma suposição em pergunta e confira a resposta'
	},
	venus: {
		invitation: 'reconhecer o valor de uma troca e suas condições',
		risk: 'ceder por aproximação e depois cobrar um acordo que não foi dito',
		action: 'expresse uma preferência junto com o limite que a torna viável'
	},
	mars: {
		invitation: 'mobilizar energia para uma iniciativa delimitada',
		risk: 'tratar toda resistência como algo que precisa ser vencido',
		action: 'teste um passo pequeno e observe a resposta antes de aumentar a força'
	},
	jupiter: {
		invitation: 'ampliar uma possibilidade sem perder a noção de escala',
		risk: 'prometer mais tempo ou recursos do que consegue sustentar',
		action: 'compare a oportunidade com a capacidade concreta disponível'
	},
	saturn: {
		invitation: 'dar forma e limite a uma responsabilidade',
		risk: 'confundir responsabilidade com carregar tudo sem negociação',
		action: 'defina o que depende de você, um prazo possível e o apoio necessário'
	},
	uranus: {
		invitation: 'experimentar uma diferença que preserve autonomia',
		risk: 'romper um acordo antes de testar uma alternativa praticável',
		action: 'proponha uma experiência reversível e combine como será avaliada'
	},
	neptune: {
		invitation: 'acolher uma percepção sem perder critérios de realidade',
		risk: 'transformar uma impressão ou ideal em certeza sobre alguém',
		action: 'separe a impressão, os fatos conhecidos e a informação que falta'
	},
	pluto: {
		invitation: 'rever onde você insiste em controlar uma mudança',
		risk: 'tentar obter segurança intensificando controle sobre outras pessoas',
		action: 'identifique uma escolha sob sua responsabilidade e um limite que precisa respeitar'
	}
};
const aspects: Record<string, string> = {
	conjunction:
		'As duas funções se concentram no mesmo ponto: distinguir suas necessidades ajuda a não exigir que uma resposta resolva tudo.',
	sextile:
		'A relação sugere uma possibilidade que pede participação: um convite só se torna experiência quando você decide como responder.',
	square:
		'As funções podem pedir ajustes diferentes; experimentar uma mudança de medida costuma ser mais informativo do que escolher uma delas como inimiga.',
	trine:
		'A afinidade simbólica pode facilitar uma resposta conhecida; observe se a facilidade apoia uma escolha ou apenas repete o hábito.',
	opposition:
		'Há duas necessidades a considerar; procure uma negociação que dê lugar a ambas sem atribuir a outra pessoa o papel de problema.'
};
const style = (p: Position) => {
	const s = natalStyles[p.sign];
	return p.body === 'sun'
		? s.aim
		: p.body === 'moon'
			? s.need
			: p.body === 'mercury'
				? s.thought
				: p.body === 'venus'
					? s.affection
					: p.body === 'mars'
						? s.action
						: meanings[p.body].invitation;
};
function contextFor(input: WorkflowInput) {
	const text = (input.context || '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	if (/relacion|casal|parceir|amor|vinculo/.test(text))
		return {
			key: 'relationships' as EditorialTrace['context']['key'],
			bodies: ['moon', 'venus', 'mercury'],
			houses: [5, 7, 8],
			focus: 'a reciprocidade e a clareza dos acordos',
			question:
				'Qual acordo precisa de uma conversa explícita, em vez de uma interpretação da intenção da outra pessoa?',
			practice:
				'Escolha um acordo concreto. Diga o que precisa, pergunte o que a outra pessoa pode oferecer e registre o que foi realmente combinado.'
		};
	if (/trabalh|carreira|prazo|renda|dinheiro|financeir|carga/.test(text))
		return {
			key: 'workload' as EditorialTrace['context']['key'],
			bodies: ['sun', 'mars', 'saturn', 'jupiter'],
			houses: [2, 6, 10],
			focus: 'a relação entre compromisso, capacidade e reconhecimento',
			question:
				'Qual compromisso pode ser redimensionado para caber no tempo e nos recursos que existem?',
			practice:
				'Escolha uma entrega ou compromisso. Compare escopo, prazo e capacidade; negocie um ajuste verificável antes de assumir trabalho adicional.'
		};
	if (/estud|aprend|curso|formacao|prova/.test(text))
		return {
			key: 'study' as EditorialTrace['context']['key'],
			bodies: ['mercury', 'jupiter', 'saturn'],
			houses: [3, 9],
			focus: 'o equilíbrio entre compreender, praticar e conferir o aprendizado',
			question:
				'Qual pequena aplicação permite verificar o que você já compreendeu e o que ainda precisa estudar?',
			practice:
				'Escolha uma ideia de estudo e aplique-a a um exemplo sem consultar a explicação. Registre a dúvida que aparecer e revise somente esse ponto.'
		};
	return {
		key: 'general' as EditorialTrace['context']['key'],
		bodies: ['sun', 'moon', 'mercury', 'venus', 'mars'],
		houses: [],
		focus: 'a diferença entre reagir por hábito e escolher uma resposta possível',
		question:
			'Que situação observável permite testar esta leitura sem precisar acreditar antecipadamente nela?',
		practice:
			'Escolha uma situação pequena, registre a resposta habitual e experimente uma alternativa possível. Depois compare o que esperava com o que observou.'
	};
}

export function composeReconstructedHoroscope(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertHoroscopeProjection(input, calculation);
	const natal = normalizeFactGraph(calculation.data.natal as CalculationSnapshot);
	const geometry = calculation.data.transitGeometry as CrossAspectCalculation;
	const binding = contextFor(input);
	const ranked = geometry.aspects
		.map((a, i) => {
			const receiver = natal.positions.find((p) => p.body === a.second)!;
			return {
				...a,
				receiver,
				factId: `horoscope-transit-${i}`,
				score:
					(binding.bodies.includes(a.second) ? 12 : 0) +
					(receiver.house && binding.houses.includes(receiver.house) ? 6 : 0) +
					(['sun', 'moon', 'mercury', 'venus', 'mars'].includes(a.second) ? 5 : 0) +
					(2 - a.orbDegrees) * 3
			};
		})
		.sort((a, b) => b.score - a.score || a.factId.localeCompare(b.factId));
	type Contact = (typeof ranked)[number];
	const chosen: Contact[] = [];
	const take = (a: Contact | undefined) => {
		if (a && !chosen.includes(a)) chosen.push(a);
	};
	// A fast stimulus and a slow background are different scales, not measured durations.
	take(ranked.find((a) => !background.has(a.first)));
	take(ranked.find((a) => background.has(a.first)));
	for (const a of ranked)
		if (chosen.length < 5 && !chosen.some((b) => b.first === a.first || b.second === a.second))
			take(a);
	for (const a of ranked) if (chosen.length < Math.min(3, ranked.length)) take(a);
	chosen.sort((a, b) => b.score - a.score || a.factId.localeCompare(b.factId));
	const label = (a: Contact) =>
		`${bodyNames[a.first]} em ${aspectNames[a.kind]} com ${bodyNames[a.second]} natal`;
	const area = (a: Contact) =>
		a.receiver.house
			? `a casa ${a.receiver.house}, associada a ${houseAreas[a.receiver.house - 1]}`
			: 'uma área sem localização por casas nesta base';
	const support = (a: Contact) =>
		unique([
			a.factId,
			`sample-${a.first}`,
			a.receiver.factId,
			'sample-instant',
			...(a.receiver.house ? [`house-${a.receiver.house}`] : [])
		]);
	const all = chosen.flatMap(support);
	const fast = chosen.filter((a) => !background.has(a.first)),
		slow = chosen.filter((a) => background.has(a.first));
	const leading = chosen[0],
		other = chosen[1];
	const sections: TrialReading['sections'] = [];
	const add = (title: string, paragraphs: string[], factIds: string[]) =>
		sections.push({ title, text: paragraphs.join('\n\n'), factIds: unique(factIds) });
	add(
		'O tema central do seu dia',
		leading
			? [
					`Na amostra de ${input.targetDate}, ${label(leading)} sugere ${meanings[leading.first].invitation} ao lidar com ${functions[leading.second]}. Essa relação alcança ${area(leading)}; seu ponto natal em ${signs[leading.receiver.sign]} acrescenta a necessidade de ${style(leading.receiver)}. O tema nasce dessa combinação, não apenas do signo solar.`,
					other
						? `A segunda linha é ${label(other)}, que convida a ${meanings[other.first].invitation}. ${leading.receiver.house && leading.receiver.house === other.receiver.house ? `Os dois contatos convergem na casa ${leading.receiver.house}; procure como necessidades diferentes estão participando de uma mesma situação.` : `Aqui entra ${area(other)}. A pergunta integradora é como uma decisão na primeira área modifica sua disponibilidade na segunda, sem presumir que sejam o mesmo problema.`}`
						: 'Foi encontrado apenas um contato dentro do recorte adotado. A leitura conserva esse limite, sem acrescentar relações para completar uma quantidade.',
					`No contexto trazido, a prioridade é observar ${binding.focus}. Uma hipótese útil é começar pela necessidade natal, escolher uma resposta de tamanho possível e conferir o que a situação devolve. A correspondência com sua vida precisa ser reconhecida por você; o cálculo não conhece os acontecimentos do dia.`
				]
			: [
					`A amostra de ${input.targetDate} não trouxe aspectos maiores dentro do orbe editorial de 2°. Não há base para atribuir um tema de trânsito a esta comparação, e isso não significa um dia vazio ou neutro.`,
					`Seu contexto permite uma reflexão sobre ${binding.focus}, mas essa reflexão não será apresentada como resultado de um trânsito. Use uma situação observável para separar necessidade pessoal, condição externa e escolha disponível.`
				],
		leading ? all : ['sample-instant', 'position-sun', 'position-moon']
	);
	chosen.forEach((a, i) =>
		add(
			`Movimento ${i + 1} · ${bodyNames[a.first]} e ${bodyNames[a.second]}`,
			[
				`${label(a)}: o contato relaciona ${functions[a.first]} na data com ${functions[a.second]} no nascimento. Na amostra das 12h UTC, o desvio em relação ao ângulo do aspecto é de ${a.orbDegrees.toFixed(2)}°. ${background.has(a.first) ? 'O corpo em trânsito pertence à escala de pano de fundo; o fato de aparecer neste dia não indica que o processo comece ou termine hoje.' : 'O corpo em trânsito pertence à escala mais rápida desta seleção; sua presença na amostra não assegura que a mesma relação dure o dia inteiro.'}`,
				`O ponto natal está em ${signs[a.receiver.sign]} e alcança ${area(a)}. A função natal pode ser explorada como uma necessidade de ${style(a.receiver)}. O estímulo da data convida a ${meanings[a.first].invitation} nessa área. ${aspects[a.kind]}`,
				`O excesso a vigiar é ${meanings[a.first].risk}. Como experiência possível, ${meanings[a.first].action}. Use a situação ligada a ${functions[a.second]} para avaliar se essa resposta cuida da necessidade ou acrescenta exigência.`
			],
			support(a)
		)
	);
	add(
		'Estímulos rápidos e pano de fundo',
		[
			fast.length
				? `Nesta seleção, ${fast.map(label).join('; ')} pertencem ao ritmo mais rápido. Use essas relações para notar respostas próximas: uma conversa, uma preferência ou uma iniciativa que pode ser revista conforme a situação. O movimento aparente e a retrogradação podem modificar a duração; não foi feita uma busca de início, exatidão ou fim.`
				: 'Nenhum dos contatos selecionados envolve um corpo da escala mais rápida. Isso limita esta seleção; não demonstra ausência de variações ao longo do dia.',
			slow.length
				? `Como pano de fundo aparecem ${slow.map(label).join('; ')}. São símbolos de processos que costumam pedir observação além de uma reação imediata. Um passo de hoje pode ajudar a reconhecer o tema, mas não precisa resolver um processo inteiro; esta amostra não mede há quanto tempo ele está presente.`
				: 'Não foi selecionado contato de corpo lento dentro deste recorte. Uma leitura diária não precisa preencher esse espaço com um processo que o cálculo não encontrou.',
			`A distinção é de escala habitual dos corpos, sem calendário individual de duração. ${fast.length && slow.length ? `Experimente responder ao estímulo rápido sem abandonar a necessidade de ${style(slow[0].receiver)} que aparece no pano de fundo.` : 'Mantenha a ação proporcional à informação disponível e registre antes de concluir que existe um padrão recorrente.'}`
		],
		all.length ? all : ['sample-instant']
	);
	add(
		'Como isso conversa com seu momento',
		[
			input.context
				? `Você trouxe este contexto: “${input.context}”. A prioridade é observar ${binding.focus}; seu relato não altera as posições, os aspectos ou a data da amostra, e não comprova uma causa astrológica para a situação.`
				: 'Sem um contexto particular, a leitura oferece hipóteses abertas. Escolha uma situação que reconheça em vez de procurar encaixar todas as áreas da vida em um mesmo texto.',
			leading
				? `A relação prioritária envolve ${functions[leading.second]} e alcança ${area(leading)}. Ao considerar seu momento, compare a necessidade de ${style(leading.receiver)} com a demanda concreta que está diante de você. Se as áreas forem diferentes, preserve a diferença e use a pergunta como reflexão, sem inventar uma correspondência.`
				: 'Sem contato selecionado, a questão prática vem do contexto informado. Ela não será usada como prova de que um movimento aconteceu.',
			binding.question
		],
		unique([
			...(leading ? support(leading) : ['sample-instant']),
			...(input.context ? ['personal-context'] : [])
		])
	);
	add(
		'Uma escolha para experimentar hoje',
		[
			binding.practice,
			leading
				? `Ao fazer isso, acompanhe especialmente o risco de ${meanings[leading.first].risk}. O critério é obter uma informação que ajude a escolher, e não produzir uma prova de que o horóscopo estava certo.`
				: 'A experiência parte de sua questão, pois o recorte da amostra não forneceu contato para sustentá-la como trânsito.',
			'Registre o que você esperava, o que fez e o que realmente ocorreu. Separe resposta observada de intenção atribuída a alguém. Ao reler, aceite confirmar, limitar ou abandonar a hipótese; nenhuma decisão importante precisa ser tomada apenas com base nesta leitura.'
		],
		unique([
			...(leading ? support(leading) : ['sample-instant']),
			...(input.context ? ['personal-context'] : [])
		])
	);
	add(
		'O período e o alcance desta leitura',
		[
			`Este horóscopo se refere à data ${input.targetDate}, comparada ao nascimento informado em um único instante às 12h UTC. É uma referência diária, sem afirmar que os mesmos contatos valham por todas as horas do seu fuso. O mapa natal completo sustenta os pontos de chegada e suas casas; não foram calculadas casas da data.`,
			`Foram comparados cem pares dirigidos e selecionados ${chosen.length} contatos, com cinco tipos de aspecto e orbe de até 2°. A prioridade considera a função natal, o contexto declarado e a presença de escalas distintas. Contatos não selecionados continuam disponíveis nas referências; o número de contatos não mede a importância do dia.`,
			'Não foram calculados eventos exatos, passagens repetidas, aplicação ou separação. A base de efeméride permanece experimental, com precisão não certificada. Temas simbólicos não garantem acontecimentos, sentimentos de terceiros, resultados de saúde, financeiros ou profissionais.'
		],
		['sample-instant', ...all]
	);
	add(
		'Referências desta leitura',
		calculation.facts.map((f) => f.display),
		calculation.facts.map((f) => f.id)
	);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Seu Horóscopo',
		opening: `O tema de ${input.targetDate} em relação ao seu mapa natal. Uma seleção de estímulos e processos para observar e escolher com mais clareza.`,
		sections,
		questions: [
			binding.question,
			'O que pede uma resposta próxima e o que precisa de observação ao longo do tempo?',
			'Qual observação limita ou contraria a hipótese que você levou desta leitura?'
		],
		practice: binding.practice,
		source:
			'Leitura original ATVNA em astrologia psicológica e humanista. Referências consultadas: Seu Mapa Astral por Inteiro, seções sobre funções pessoais e ciclos; Robert Hand, excertos autorizados sobre planetas internos e externos e Júpiter na casa 4. A seleção e o cânone desta leitura são decisões editoriais próprias.',
		limits: calculation.limits,
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-horoscope-daily-relations/1.0.0',
			selection: chosen.map((a) => ({
				factId: a.factId,
				score: a.score,
				reason: `Função natal ${a.second}; contexto ${binding.key}; ${background.has(a.first) ? 'pano de fundo' : 'estímulo rápido'}; orbe ${a.orbDegrees.toFixed(6)}°.`
			})),
			patterns:
				leading && other
					? [
							{
								kind:
									leading.receiver.house && leading.receiver.house === other.receiver.house
										? 'shared-natal-area'
										: 'complementary-daily-demands',
								factIds: unique([...support(leading), ...support(other)])
							}
						]
					: [],
			themes: chosen.map((a) => ({ id: `horoscope-${a.first}-${a.second}`, factIds: support(a) })),
			context: { key: binding.key, factId: input.context ? 'personal-context' : null },
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

export function reviewReconstructedHoroscope(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	try {
		assertHoroscopeProjection(input, calculation);
	} catch {
		return ['invalid-horoscope-geometry'];
	}
	const failures: string[] = [];
	const trace = reading.editorial;
	if (
		!trace ||
		trace.graph !== 'atv-horoscope-daily-relations/1.0.0' ||
		trace.canon !== CANON_VERSION
	)
		return ['missing-horoscope-trace'];
	const available = (calculation.data.transitGeometry as CrossAspectCalculation).aspects.length;
	if (trace.selection.length < Math.min(3, available) || trace.selection.length > 6)
		failures.push('invalid-movement-selection');
	if (
		reading.sections.filter((s) => /^Movimento \d/.test(s.title)).length !== trace.selection.length
	)
		failures.push('unbound-movement-chapters');
	if (
		trace.selection.some((s) => !reading.sections[0].factIds.includes(s.factId)) ||
		trace.patterns.some((p) => p.factIds.some((id) => !reading.sections[0].factIds.includes(id)))
	)
		failures.push('unused-horoscope-relations');
	if (
		trace.plan.length !== reading.sections.length ||
		trace.plan.some(
			(p, i) =>
				p.title !== reading.sections[i].title ||
				p.factIds.join('|') !== reading.sections[i].factIds.join('|')
		)
	)
		failures.push('unbound-horoscope-plan');
	const chapters = reading.sections.filter((s) => !/^Referências/.test(s.title));
	if (chapters.length < 5 || chapters.some((s) => s.text.length < 220 || !s.factIds.length))
		failures.push('insufficient-horoscope-chapters');
	if (input.context && trace.context.factId !== 'personal-context')
		failures.push('unbound-horoscope-context');
	const interpreted = chapters.map((s) => s.text.replace(input.context || '\0', '')).join('\n');
	if (
		/vai acontecer|acontecerá|sucesso garantido|data favorável|destino inevitável|pipeline|fact graph/.test(
			interpreted
		)
	)
		failures.push('unsupported-horoscope-claim');
	return unique(failures);
}
