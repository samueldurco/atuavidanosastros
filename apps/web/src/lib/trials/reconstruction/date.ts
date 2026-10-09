import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { CrossAspectCalculation } from '@atv/astrology';
import type { TrialReading } from '../reading';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { CANON_VERSION, bodyNames, functions, signs } from './canon';
import { houseAreas, natalStyles } from './natal-canon';
import { normalizeFactGraph, type Position } from './fact-graph';
import { assertDateProjection, aspectNames } from './date-facts';

const unique = (ids: string[]) => [...new Set(ids)];
const slow = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const verbs: Record<string, { stimulus: string; excess: string; adjustment: string }> = {
	sun: {
		stimulus: 'tornar uma escolha visível e assumir participação nela',
		excess: 'confundir ser reconhecido com precisar ocupar todo o espaço',
		adjustment: 'definir qual contribuição precisa da sua autoria'
	},
	moon: {
		stimulus: 'perceber como uma situação afeta seu conforto e sua disponibilidade',
		excess: 'tomar uma reação imediata como retrato definitivo da relação',
		adjustment: 'nomear a necessidade antes de responder ao pedido'
	},
	mercury: {
		stimulus: 'formular uma pergunta e rever a informação que orienta uma decisão',
		excess: 'continuar explicando sem conferir o que foi entendido',
		adjustment: 'comparar sua interpretação com uma resposta concreta'
	},
	venus: {
		stimulus: 'avaliar o que tem valor e como uma troca pode ser sustentada',
		excess: 'concordar para conservar uma aproximação que precisa de negociação',
		adjustment: 'explicitar preferências e ouvir o que a outra parte pode oferecer'
	},
	mars: {
		stimulus: 'agir sobre um impedimento e defender um limite',
		excess: 'transformar diferença de ritmo em confronto',
		adjustment: 'distinguir a ação necessária da urgência de obter uma resposta'
	},
	jupiter: {
		stimulus: 'considerar uma possibilidade mais ampla e aprender com uma experiência',
		excess: 'assumir mais compromissos do que a situação permite acompanhar',
		adjustment: 'verificar recursos e condições antes de ampliar o compromisso'
	},
	saturn: {
		stimulus: 'rever responsabilidades, limites e condições de continuidade',
		excess: 'tratar toda dificuldade como obrigação de suportar mais',
		adjustment: 'separar o que depende de constância do que precisa de um limite negociado'
	},
	uranus: {
		stimulus: 'experimentar uma resposta diferente onde um acordo perdeu flexibilidade',
		excess: 'romper uma combinação sem formular a alternativa',
		adjustment: 'testar uma mudança delimitada e observar seus efeitos'
	},
	neptune: {
		stimulus: 'abrir espaço para imaginação e perceber expectativas pouco definidas',
		excess: 'preencher uma informação ausente com o que gostaria que acontecesse',
		adjustment: 'distinguir sensação, desejo e informação confirmada'
	},
	pluto: {
		stimulus: 'examinar dependências e o que está em jogo em uma negociação',
		excess: 'tentar controlar a resposta da outra pessoa para evitar incerteza',
		adjustment: 'reconhecer limites de participação e escolher o que pode negociar'
	}
};
const relation: Record<string, { meaning: string; action: string }> = {
	conjunction: {
		meaning:
			'o estímulo da data se concentra na mesma região da função natal, aproximando temas que podem parecer inseparáveis',
		action: 'diferenciar a necessidade habitual da resposta que esta situação pede'
	},
	sextile: {
		meaning:
			'as duas funções formam uma ligação que pode ser aproveitada por uma iniciativa concreta',
		action: 'criar uma ocasião de troca, em vez de esperar que a possibilidade se realize sozinha'
	},
	square: {
		meaning:
			'as duas funções se relacionam por uma tensão que pede ajuste entre necessidades concorrentes',
		action:
			'identificar qual condição precisa mudar para que a ação não custe o abandono de uma necessidade'
	},
	trine: {
		meaning:
			'as duas funções se relacionam por uma facilidade possível, que também pode deixar um hábito passar sem exame',
		action: 'usar o recurso disponível e verificar se ele ainda serve ao que quer realizar'
	},
	opposition: {
		meaning:
			'as duas funções aparecem em polos distintos, tornando relevante a relação entre sua posição e uma exigência que encontra fora dela',
		action:
			'formular o que cabe a cada parte e conferir o acordo sem presumir a intenção de ninguém'
	}
};
type Binding = {
	key: EditorialTrace['context']['key'];
	bodies: string[];
	houses: number[];
	title: string;
	criteria: string;
	experiment: string;
	question: string;
};
function bind(input: WorkflowInput): Binding {
	const context = (input.context ?? '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	if (/relacion|parcer|casal|famil|amor|vincul|acordo/.test(context))
		return {
			key: 'relationships',
			bodies: ['moon', 'venus', 'mercury'],
			houses: [4, 7, 8],
			title: 'Acordos no vínculo que você trouxe',
			criteria:
				'Diferencie o que foi combinado, o que você espera e o que ainda não perguntou. Uma mudança no seu modo de participar pode ser observada; a intenção da outra pessoa precisa ser conversada, e não deduzida da data.',
			experiment:
				'Escolha um acordo concreto do vínculo citado, descreva o que consegue oferecer e faça uma pergunta sobre a necessidade da outra parte. Registre a resposta sem acrescentar uma intenção que não foi expressa.',
			question:
				'Qual expectativa precisa virar uma pergunta clara antes de você decidir como responder?'
		};
	if (/estud|curso|aprend|prova|formacao/.test(context))
		return {
			key: 'study',
			bodies: ['mercury', 'jupiter', 'saturn'],
			houses: [3, 9],
			title: 'Aprendizagem e a decisão informada',
			criteria:
				'Separe interesse pelo tema, condições de estudo e informação necessária para escolher. A dificuldade de uma atividade isolada não permite concluir sua capacidade nem o resultado de uma prova.',
			experiment:
				'Realize uma tarefa curta do assunto citado, anote a dúvida que permaneceu e procure uma explicação que possa conferir na prática. Compare o que compreendeu antes e depois desse retorno.',
			question:
				'Que informação ou experiência curta falta para avaliar a escolha de estudo que você trouxe?'
		};
	if (/trabalh|carreir|profiss|equipe|chefe|emprego|projeto/.test(context))
		return {
			key: 'workload',
			bodies: ['sun', 'mars', 'saturn', 'mercury'],
			houses: [2, 6, 10],
			title: 'Condições da tarefa e responsabilidade',
			criteria:
				'Observe a tarefa, o tempo disponível e quem decide a prioridade. O sentido que você atribui ao trabalho precisa ser confrontado com suas condições reais; a data não estima renda, contratação ou resultado profissional.',
			experiment:
				'Escolha uma demanda do trabalho citado, esclareça o resultado esperado e negocie um limite de escopo ou de prioridade. Compare o esforço planejado com o que conseguiu realizar e anote a condição que precisa rever.',
			question:
				'Qual condição concreta de uma tarefa precisa ser esclarecida antes de assumir mais responsabilidade?'
		};
	if (/mudanc|transi|escolh|decis|caminho|recomec/.test(context))
		return {
			key: 'transition',
			bodies: ['sun', 'mars', 'uranus', 'saturn'],
			houses: [1, 6, 10],
			title: 'Uma escolha que pode ser examinada',
			criteria:
				'Diferencie desconforto com a situação atual, interesse pela alternativa e condições necessárias para experimentá-la. Esses três pontos podem coexistir sem exigir uma decisão definitiva nesta data.',
			experiment:
				'Escolha uma ação pequena que represente a alternativa citada, defina um limite de esforço e registre o que a experiência esclareceu. Reavalie a escolha com esse dado antes de ampliar o compromisso.',
			question:
				'Que experiência delimitada permitiria comparar a alternativa com o que você já conhece?'
		};
	return {
		key: 'general',
		bodies: ['sun', 'moon', 'mercury'],
		houses: [],
		title: input.context
			? 'Da questão informada à observação'
			: 'Escolher uma situação para observar',
		criteria:
			'Escolha uma situação concreta em que possa distinguir uma necessidade, uma ação e a resposta recebida. Quando não há um tema específico informado, a leitura permanece aberta e não supõe uma área da sua biografia.',
		experiment:
			'Registre uma situação, a necessidade envolvida e uma ação que depende de você. Depois da ação, anote o que aconteceu e compare com sua expectativa inicial, incluindo qualquer resultado que contrarie a leitura.',
		question:
			'Em qual situação concreta você consegue observar a diferença entre sua expectativa e a resposta recebida?'
	};
}

export function composeReconstructedDate(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertDateProjection(input, calculation);
	const natal = normalizeFactGraph(calculation.data.natal as CalculationSnapshot);
	const geometry = calculation.data.transitGeometry as Omit<CrossAspectCalculation, 'roles'>;
	const binding = bind(input);
	const selected = geometry.aspects
		.map((a, i) => {
			const receiver = natal.positions.find((p) => p.body === a.second)!;
			const score =
				(slow.has(a.first) ? 8 : 2) +
				(['sun', 'moon', 'mercury', 'venus', 'mars'].includes(a.second) ? 7 : 0) +
				(binding.bodies.includes(a.second) ? 8 : 0) +
				(receiver.house && binding.houses.includes(receiver.house) ? 5 : 0) +
				(2 - a.orbDegrees) * 3;
			return { ...a, factId: `date-transit-${i}`, receiver, score };
		})
		.sort((a, b) => b.score - a.score || a.factId.localeCompare(b.factId));
	// Distinct receiving functions prevent a single crowded target from swallowing the reading.
	const chosen = selected
		.filter((a, i) => !selected.slice(0, i).some((b) => b.second === a.second))
		.slice(0, 3);
	if (chosen.length < 2)
		for (const a of selected) if (!chosen.includes(a) && chosen.length < 2) chosen.push(a);
	type Contact = (typeof selected)[number];
	const label = (a: Contact) =>
		`${bodyNames[a.first]} da data em ${aspectNames[a.kind]} com ${bodyNames[a.second]} natal`;
	const area = (p: Position) =>
		p.house
			? `a casa ${p.house}, ligada a ${houseAreas[p.house - 1]}`
			: 'uma área que não pode ser localizada por casas nesta base';
	const support = (a: Contact) =>
		unique([
			a.factId,
			`sample-${a.first}`,
			a.receiver.factId,
			...(a.receiver.house ? [`house-${a.receiver.house}`] : []),
			'sample-instant'
		]);
	const sections: TrialReading['sections'] = [];
	const add = (title: string, paragraphs: string[], ids: string[]) =>
		sections.push({ title, text: paragraphs.join('\n\n'), factIds: unique(ids) });
	const first = chosen[0],
		second = chosen[1];
	const sharedHouse =
		first &&
		second &&
		first.receiver.house !== null &&
		first.receiver.house === second.receiver.house;
	const synthesis = first
		? [
				`Na amostra de ${input.targetDate}, ${label(first)} coloca em relação ${functions[first.first]} e ${functions[first.second]}. O ponto de partida é sua maneira natal de exercer essa segunda função em ${signs[first.receiver.sign]}: ${style(first.receiver)}. A data acrescenta um estímulo a esse modo habitual de responder; não substitui seu mapa nem determina acontecimentos.`,
				second
					? `Ao mesmo tempo, ${label(second)} traz outra questão: ${verbs[second.first].stimulus} ao lidar com ${functions[second.second]}. ${sharedHouse ? `As duas relações alcançam ${area(first.receiver)}, por funções diferentes: uma envolve ${functions[first.second]}, a outra ${functions[second.second]}.` : `A primeira relação alcança ${area(first.receiver)}; a segunda, ${area(second.receiver)}. Relacioná-las exige observar como uma escolha em uma dessas áreas repercute na outra, sem presumir que os acontecimentos serão os mesmos.`}`
					: `Esta seleção encontrou uma relação principal dentro do orbe adotado. A ausência de uma segunda ligação selecionável não permite concluir que a data seja neutra ou que o restante do mapa não participe da experiência.`,
				`O fio da leitura é investigar como ${verbs[first.first].adjustment}, preservando a necessidade natal de ${style(first.receiver)}. ${second ? `Isso pode ser acompanhado pela pergunta complementar de como ${verbs[second.first].adjustment}.` : 'Use a questão informada como referência para escolher onde observar essa diferença.'} Confira essa hipótese em uma situação que reconheça, inclusive se a experiência não corresponder ao texto.`
			]
		: [
				`A amostra de ${input.targetDate} não contém aspectos maiores entre os dez corpos da data e os dez natais dentro do limite editorial de 2°. Isso descreve esta comparação de longitudes às 12h UTC; não demonstra que o dia inteiro seja sem movimentos, conflitos ou possibilidades.`,
				`Seu mapa natal continua sendo a referência: o Sol em ${signs[natal.positions.find((p) => p.body === 'sun')!.sign]} e a Lua em ${signs[natal.positions.find((p) => p.body === 'moon')!.sign]} descrevem funções distintas de participação e necessidade de segurança. Sem uma ligação temporal incluída nesta amostra, essas posições não serão apresentadas como ativações da data.`,
				'A reflexão pode partir do contexto informado e de uma situação observável, mantendo aberta a hipótese de que a experiência tenha explicações que esta comparação não examina.'
			];
	add(
		'O que esta data põe em foco',
		synthesis,
		chosen.length ? chosen.flatMap(support) : ['sample-instant', 'position-sun', 'position-moon']
	);
	chosen.slice(0, 3).forEach((a, index) => {
		const sky = geometry.inputPositions.first.find((p) => p.body === a.first)!;
		const v = verbs[a.first],
			form = relation[a.kind];
		add(
			`${index + 1}. ${bodyNames[a.first]} e ${bodyNames[a.second]}: ${index === 0 ? 'o ajuste principal' : index === 1 ? 'uma necessidade complementar' : 'um terceiro ponto de atenção'}`,
			[
				`${label(a)} tem orbe de ${a.orbDegrees.toFixed(2)}° nesta amostra. Entre ${functions[a.first]} e ${functions[a.second]}, ${form.meaning}. ${bodyNames[a.first]} está em ${signs[Math.floor(sky.longitude / 30)]}; a possibilidade de ${skyStyle(a.first, Math.floor(sky.longitude / 30))} será examinada em relação à função natal de ${bodyNames[a.second]}, sem confundir estímulo com resposta.`,
				`A função que recebe esse contato é ${functions[a.second]}, com ${bodyNames[a.second]} natal em ${signs[a.receiver.sign]}. Seu modo de exercê-la tende a procurar ${style(a.receiver)}, especialmente em ${area(a.receiver)}. Aqui, ${v.stimulus} pode tornar visível uma condição de ${functions[a.second]}: o que ajuda a responder e o que precisa ser revisto para participar da situação atual.`,
				`O excesso a observar é ${v.excess}. Uma resposta possível consiste em ${form.action}, começando por ${v.adjustment}. Ao examinar ${functions[a.second]}, procure uma situação em que esse ajuste possa ser observado e depois avalie se ajudou. Se a relação entre ${bodyNames[a.first]} e ${bodyNames[a.second]} não corresponder à sua experiência, descarte essa hipótese.`
			],
			support(a)
		);
	});
	const areas = [
		...new Set(chosen.map((a) => a.receiver.house).filter((h): h is number => h !== null))
	];
	add(
		'Onde o mapa natal recebe esses estímulos',
		[
			areas.length
				? `As áreas destacadas são ${areas.map((h) => `casa ${h} — ${houseAreas[h - 1]}`).join('; ')}. São casas do nascimento, localizadas pelas cúspides natais; cada contato foi relacionado à casa do planeta natal que o recebe. Isso permite perguntar em que campo de experiência a função costuma ser exercida, sem transformar o tema da casa em previsão de um evento.`
				: 'As casas não oferecem uma localização utilizável para os contatos desta seleção. A interpretação permanece nas funções planetárias e nos signos calculados, sem preencher a lacuna com uma área presumida.',
			chosen.length
				? `${chosen.map((a) => `${bodyNames[a.second]} natal coloca ${functions[a.second]} em ${area(a.receiver)}`).join('; ')}. O tema informado pode coincidir com essas áreas, cruzar mais de uma delas ou não corresponder diretamente a nenhuma. Essa diferença é um dado para a reflexão, e não um motivo para reinterpretar sua história até que se encaixe.`
				: 'Sem contatos selecionados, as casas não serão usadas para inventar uma área ativada pela data.',
			'Observe uma situação concreta e descreva qual parte pertence às condições externas e qual envolve seu modo de responder. A mesma área da vida pode pedir respostas diferentes conforme as pessoas, os recursos e os acordos presentes; a casa natal ajuda a organizar a pergunta, mas não substitui essas informações.'
		],
		chosen.length ? chosen.flatMap(support) : ['sample-instant']
	);
	const slowContacts = chosen.filter((a) => slow.has(a.first)),
		fastContacts = chosen.filter((a) => !slow.has(a.first));
	add(
		'O ritmo da amostra e o alcance da leitura',
		[
			`O céu foi amostrado em ${calculation.data.sampleInstant}, às 12:00 UTC. Esse horário não foi convertido em meio-dia da sua cidade. A posição da Lua, em particular, representa esse instante e pode mudar de relação ao longo do dia; não se atribui à amostra cobertura do dia local.`,
			`${slowContacts.length ? `${slowContacts.map((a) => bodyNames[a.first]).join(' e ')} aparecem entre os corpos de movimento mais lento selecionados` : 'A seleção não destacou um corpo de movimento mais lento'}. ${fastContacts.length ? `${fastContacts.map((a) => bodyNames[a.first]).join(' e ')} acrescentam estímulos pessoais mais rápidos à comparação` : 'Não há um estímulo pessoal mais rápido entre os contatos priorizados'}. Essa distinção organiza a leitura simbólica, mas a duração de cada contato, suas repetições e sua fase de aproximação ou afastamento exigem outras amostras, que não foram calculadas aqui.`,
			first
				? `Use a relação entre ${bodyNames[first.first]} e ${bodyNames[first.second]} como pergunta para esta observação, sem estabelecer prazo de resolução. Um orbe menor informa proximidade angular dentro da política adotada; não mede intensidade de um acontecimento, importância biográfica ou certeza da interpretação.`
				: 'A comparação continua limitada ao instante calculado. Nenhuma ausência de aspecto foi convertida em promessa de tranquilidade ou em recomendação para tomar uma decisão.'
		],
		unique(['sample-instant', ...chosen.flatMap(support)])
	);
	add(
		binding.title,
		[
			input.context
				? `Você trouxe como contexto: “${input.context}”. Esse relato orienta a seleção de funções e áreas a examinar; as posições e os aspectos permanecem os mesmos para esta data e nascimento.`
				: 'Nenhum contexto específico foi informado. Por isso, esta parte oferece um modo de observar a leitura sem deduzir um problema, uma relação ou uma decisão que você não mencionou.',
			binding.criteria,
			first
				? `Na relação principal, a pergunta passa por ${functions[first.second]}: como ${verbs[first.first].adjustment} sem perder de vista seu modo natal de ${style(first.receiver)}? ${second ? `A segunda frente, ligada a ${functions[second.second]}, ajuda a conferir se a resposta escolhida deixa uma necessidade importante de fora.` : 'Confira o limite da resposta antes de assumir um novo compromisso.'}`
				: 'Sem um contato temporal selecionado, o contexto oferece a referência prática. Qualquer conclusão sobre causas ou resultados precisa de informação da própria situação.'
		],
		unique([
			...chosen.flatMap(support),
			...(input.context ? ['personal-context'] : []),
			'sample-instant'
		])
	);
	add(
		'Uma experiência para conferir a leitura',
		[
			binding.experiment,
			first
				? `Antes da ação, descreva como costuma exercer ${functions[first.second]} nessa situação e o que espera que mude ao ${verbs[first.first].adjustment}. Depois, compare o que observou com essa expectativa. Um resultado diferente permite ajustar a hipótese; não indica que você respondeu de modo errado ao trânsito.`
				: 'Antes de agir, escreva sua expectativa em termos que possam ser conferidos. Depois, registre o resultado, sem atribuí-lo à ausência de aspectos nesta amostra.',
			'Mantenha o alcance da experiência proporcional à decisão: uma conversa ou um teste delimitado pode esclarecer uma condição, mas não justifica sozinho uma mudança irreversível. A leitura serve para organizar perguntas; a escolha considera também informação, limites e consequências que você conhece na vida concreta.'
		],
		unique([
			...chosen.flatMap(support),
			...(input.context ? ['personal-context'] : []),
			'sample-instant'
		])
	);
	const covered = new Set(sections.flatMap((s) => s.factIds));
	const remainder = calculation.facts.filter((f) => !covered.has(f.id));
	add(
		'Referências do cálculo e da amostra',
		[
			'Os registros abaixo permitem conferir posições e relações não priorizadas no texto. A ordem técnica não é uma escala de importância pessoal; o texto principal reúne os contatos selecionados em hipóteses que precisam da sua experiência.',
			...remainder.map((f) =>
				f.display
					.replace('movimento direto da candidata', 'movimento direto no nascimento')
					.replace('movimento retrógrado da candidata', 'movimento retrógrado no nascimento')
			)
		],
		remainder.map((f) => f.id)
	);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Leitura da Data',
		opening: `Uma leitura de ${input.targetDate} em relação ao seu mapa natal${input.context ? ' e ao contexto que você trouxe' : ''}. As relações calculadas referem-se a uma única amostra às 12h UTC.`,
		sections,
		questions: [
			binding.question,
			first
				? `Onde você observa a necessidade de ${verbs[first.first].adjustment} ao lidar com ${functions[first.second]}?`
				: 'Que informação da situação é mais útil do que procurar uma confirmação na data?',
			'O que você observou que confirma, limita ou contraria a hipótese desta leitura?'
		],
		practice: `${binding.experiment} Preserve no registro a data, a ação, a resposta observada e uma conclusão provisória; uma correlação percebida não estabelece causa.`,
		source:
			'Leitura original ATVNA, em astrologia psicológica e humanista, a partir dos dados de nascimento e da amostra da data. Referências: Seu Mapa Astral por Inteiro, corpus próprio ATVNA; Robert Hand, trecho autorizado de Planets in Transit sobre Júpiter na casa 4, para a relação entre função em trânsito e área natal.',
		limits: calculation.limits,
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-date-natal-relations/1.0.0',
			selection: chosen.map((a) => ({
				factId: a.factId,
				score: a.score,
				reason: `Recebe ${a.second}; orbe ${a.orbDegrees.toFixed(6)}°; contexto ${binding.key}; ${slow.has(a.first) ? 'corpo lento' : 'corpo pessoal'}.`
			})),
			patterns:
				first && second
					? [
							{
								kind: sharedHouse ? 'shared-natal-area' : 'distinct-receiving-functions',
								factIds: unique([...support(first), ...support(second)])
							}
						]
					: [],
			themes: chosen.map((a) => ({ id: `date-${a.second}`, factIds: support(a) })),
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
function style(p: Position) {
	return skyStyle(p.body, p.sign);
}
function skyStyle(body: string, sign: number) {
	const s = natalStyles[sign];
	return body === 'sun'
		? s.aim
		: body === 'moon'
			? s.need
			: body === 'mercury'
				? s.thought
				: body === 'venus'
					? s.affection
					: body === 'mars'
						? s.action
						: s.entry;
}

export function reviewReconstructedDate(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	const failures: string[] = [];
	try {
		assertDateProjection(input, calculation);
	} catch {
		return ['invalid-date-geometry'];
	}
	const chapters = reading.sections.filter((s) => !/^Referências/.test(s.title));
	if (chapters.length < 6 || chapters.some((s) => s.text.length < 220 || !s.factIds.length))
		failures.push('insufficient-supported-chapters');
	const trace = reading.editorial;
	if (!trace || trace.graph !== 'atv-date-natal-relations/1.0.0' || trace.canon !== CANON_VERSION)
		return ['missing-date-trace'];
	if (trace.selection.some((s) => !reading.sections[0].factIds.includes(s.factId)))
		failures.push('unused-date-selection');
	if (trace.patterns.some((p) => p.factIds.some((id) => !reading.sections[0].factIds.includes(id))))
		failures.push('unused-date-pattern');
	if (
		trace.plan.length !== reading.sections.length ||
		trace.plan.some(
			(p, i) =>
				p.title !== reading.sections[i].title ||
				p.factIds.join('|') !== reading.sections[i].factIds.join('|')
		)
	)
		failures.push('unbound-date-plan');
	if (input.context && trace.context.factId !== 'personal-context')
		failures.push('unbound-date-context');
	const sentences = chapters.flatMap((s) =>
		s.text
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 100)
	);
	if (new Set(sentences).size !== sentences.length) failures.push('repeated-date-sentence');
	if (
		/vai acontecer|data favorável|acontecerá|sucesso garantido|destino inevitável|pipeline|fact graph/.test(
			chapters.map((s) => s.text).join('\n')
		)
	)
		failures.push('unsupported-date-claim');
	return unique(failures);
}
