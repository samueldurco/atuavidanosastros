import {
	productCatalog,
	workflowFor,
	type CalculationSnapshot,
	type WorkflowInput
} from '@atv/domain';
import {
	bodyEditorial,
	cardEditorial,
	signEditorial,
	sourceNotice,
	symbolicNotice,
	trialProfiles
} from './content';
import { composeLegacyTrialReading } from './legacy-reading';
import type { TrialReading } from './reading';

export const CONTENT_VERSION = 'atv-ai-editorial-trials/2.0.0';
export const POLICY_VERSION = 'atv-private-trial-approval/2.0.0';
type Fact = CalculationSnapshot['facts'][number];
type Section = TrialReading['sections'][number];
const bodyNames = Object.keys(bodyEditorial);
const signNames = Object.keys(signEditorial);
const bodyActions: Record<string, [string, string, string]> = {
	Sol: [
		'o que você escolhe expressar quando pode agir por convicção',
		'uma atividade em que você reconhece sua própria autoria',
		'Reserve vinte minutos para essa atividade e observe se o interesse continua quando ninguém está avaliando.'
	],
	Lua: [
		'o que ajuda a recuperar segurança depois de um dia exigente',
		'um momento em que você precisou de acolhimento',
		'Anote a necessidade antes de procurar uma solução. Peça um apoio específico, sem esperar que alguém adivinhe.'
	],
	Mercúrio: [
		'como você transforma uma impressão em uma explicação compreensível',
		'uma conversa em que entender e ser entendido foram coisas diferentes',
		'Reescreva uma mensagem importante em três frases e peça à outra pessoa que diga o que compreendeu.'
	],
	Vênus: [
		'como você reconhece valor, prazer e reciprocidade',
		'uma escolha afetiva em que sua preferência ficou pouco clara',
		'Nomeie algo que aprecia e um limite que precisa preservar. Compare o acordo com as atitudes ao longo da semana.'
	],
	Marte: [
		'como você começa uma ação e responde quando encontra resistência',
		'um conflito em que sua intenção e o efeito sobre alguém foram diferentes',
		'Defina uma ação pequena e uma regra de pausa. Observe se consegue defender sua posição sem ultrapassar o limite combinado.'
	],
	Júpiter: [
		'como você amplia horizontes e dá sentido ao que aprende',
		'uma oportunidade em que entusiasmo e recursos disponíveis não coincidiram',
		'Escolha uma possibilidade e verifique tempo, custo e apoio antes de assumir um compromisso maior.'
	],
	Saturno: [
		'como você sustenta compromissos e distingue limite de cobrança',
		'uma responsabilidade que continua existindo mesmo sem reconhecimento',
		'Divida a tarefa em uma etapa possível e uma etapa adiável. Inclua descanso no critério de continuidade.'
	],
	Urano: [
		'como você testa alternativas a um hábito estabelecido',
		'uma mudança que precisou de negociação para funcionar',
		'Altere apenas uma parte da rotina e combine uma revisão com quem também será afetado.'
	],
	Netuno: [
		'como imaginação e expectativa entram na sua percepção',
		'uma situação em que o que você desejava confundiu-se com o que estava observado',
		'Separe imagem, desejo e evidência em três linhas. Verifique uma informação antes de tomar a impressão como certeza.'
	],
	Plutão: [
		'como você percebe influência, vulnerabilidade e necessidade de mudança',
		'um acordo em que uma das pessoas teve menos liberdade para discordar',
		'Identifique o que depende de você e um limite negociável. Evite transformar desconforto em justificativa para controlar alguém.'
	],
	Ascendente: [
		'como você se apresenta ao iniciar uma situação',
		'um primeiro encontro em que sua reação inicial mudou depois',
		'Compare sua primeira impressão com o que descobriu ao escutar. Experimente começar com uma pergunta.'
	],
	'Meio do Céu': [
		'que contribuição você deseja tornar visível no trabalho',
		'uma tarefa em que sua contribuição foi útil para alguém',
		'Peça um retorno específico sobre essa contribuição e teste uma atividade relacionada antes de mudar de direção.'
	]
};
const houseThemes = [
	'iniciativa e apresentação',
	'recursos e valores',
	'trocas e aprendizado próximo',
	'base e pertencimento',
	'criação e prazer',
	'rotina e cuidado cotidiano',
	'parcerias e acordos',
	'partilhas e confiança',
	'estudo e ampliação de horizontes',
	'contribuição pública',
	'redes e projetos coletivos',
	'recolhimento e elaboração'
];
/** Presentation only: immutable, complete calculation facts remain in the appendix. */
export function factLabel(f: Fact): string {
	return f.display
		.replace(/(\d+\.\d{2})\d+(?=°)/g, '$1')
		.replace(/; movimento (direto|retrógrado) da candidata/g, '')
		.replace(/ Precisão não certificada; estabilidade desconhecida\./g, '')
		.replace(/separação nominal [\d.]+°; /g, '')
		.replace(/desvio nominal/g, 'orbe nominal');
}
function bodyOf(f: Fact) {
	return bodyNames.find((b) =>
		new RegExp(`${b}(?: natal| no retorno| do retorno)?:`).test(f.display)
	);
}
function signOf(f: Fact) {
	return signNames.find((s) => f.display.includes(s));
}
function isAspect(f: Fact) {
	return (
		f.kind === 'calculated' &&
		!/^day-|series$/.test(f.id) &&
		/conjunção|sextil|quadratura|trígono|oposição/i.test(f.display) &&
		!/nenhum aspecto/i.test(f.display)
	);
}
function aspectRank(f: Fact) {
	const personal = (f.display.match(/Sol|Lua|Mercúrio|Vênus|Marte/g) ?? []).length;
	const orb = Number(f.display.match(/(?:orbe|desvio nominal) ([\d.]+)/)?.[1] ?? 9);
	return personal * 10 - orb;
}
function aspectText(f: Fact, relationship: boolean, cycles: boolean): string {
	const bodies =
		f.display.match(/Sol|Lua|Mercúrio|Vênus|Marte|Júpiter|Saturno|Urano|Netuno|Plutão/g) ?? [];
	const a = bodies[0],
		b = bodies[1];
	if (!a || !b)
		return 'Este registro reúne os aspectos encontrados na amostra indicada. Ele descreve uma comparação geométrica, sem estabelecer acontecimentos nem horários de início ou término.';
	const pair = `${bodyEditorial[a]} e ${bodyEditorial[b]}`;
	const dynamics = /conjunção/i.test(f.display)
		? `A conjunção aproxima ${pair}. A hipótese é que os dois assuntos ganhem espaço juntos: uma resposta em um deles pode intensificar o outro. Observe quando essa concentração ajuda e quando reduz a possibilidade de escolher outra resposta.`
		: /oposição/i.test(f.display)
			? `A oposição coloca ${pair} em perspectivas distintas. Uma necessidade pode ficar mais visível quando a outra é expressa. Alternar escuta e posicionamento pode ser mais útil do que exigir que os dois lados funcionem do mesmo modo.`
			: /quadratura/i.test(f.display)
				? `A quadratura reúne ${pair} por meio de um possível atrito. Investigue uma situação em que atender a um desses temas tornou o outro mais difícil. O atrito pode pedir ajuste de ritmo ou de acordo; não comprova incompatibilidade.`
				: /trígono/i.test(f.display)
					? `O trígono entre ${pair} sugere uma via simbólica de cooperação. O que parece fácil pode servir como recurso, mas também passar sem exame. Procure uma habilidade observável que possa ser usada conscientemente, sem supor que o aspecto garanta resultados.`
					: `O sextil entre ${pair} pode ser lido como uma oportunidade que precisa de participação. Identifique um gesto que conecte os dois temas; a possibilidade só se torna recurso quando encontra condições reais para acontecer.`;
	const roles = relationship
		? 'A ordem importa: o primeiro fator pertence à Pessoa A e o segundo à Pessoa B. Cada pessoa pode vivenciar o contato de modo diferente. Conversem sobre um exemplo e registrem também uma discordância; a leitura não revela a vontade de ninguém.'
		: cycles
			? 'Considere a data e os papéis natal/trânsito escritos no registro. Trata-se de uma amostra, não de uma janela exata de acontecimentos. Use-a para escolher uma observação do dia e compare-a com o que de fato ocorreu.'
			: `Como experiência, escolha uma situação que envolva ${a} e ${b}, escreva duas respostas possíveis e experimente a que respeita melhor seus limites. Revise pelo resultado observado, não pela obrigação de confirmar o mapa.`;
	return `${dynamics}\n\n${roles}`;
}
function positionSection(f: Fact, house?: number): Section | null {
	const body = bodyOf(f),
		sign = signOf(f);
	if (!body || !sign) return null;
	const [strength, mode, excess] = signEditorial[sign];
	const [question, example, action] = bodyActions[body];
	const scope = f.display.startsWith('Pessoa A')
		? 'Pessoa A · '
		: f.display.startsWith('Pessoa B')
			? 'Pessoa B · '
			: f.id.startsWith('natal-')
				? 'Base natal · '
				: f.id.startsWith('return-')
					? 'Retorno solar · '
					: f.id.startsWith('sample-')
						? 'Amostra da data · '
						: '';
	const temporal = f.id.startsWith('sample-')
		? 'Esta posição pertence à amostra das 12h UTC da data escolhida. Ela propõe um tema de observação para esse instante; não descreve sua personalidade nem dura necessariamente o dia inteiro. '
		: f.id.startsWith('natal-')
			? 'Esta é uma referência do nascimento, usada como base de comparação com a data escolhida. '
			: '';
	const where = house
		? ` Neste cálculo, a posição cai na casa ${house}, associada simbolicamente a ${houseThemes[house - 1]}. Isso localiza uma área para investigar; não descreve um acontecimento.`
		: '';
	return {
		title: `${scope}${body} em ${sign}${house ? ` · casa ${house}` : ''}`,
		text: `${temporal}${body} coloca em foco ${question}. Em ${sign}, a leitura propõe ${strength} como uma maneira de lidar com esse tema. Você pode reconhecer essa combinação ao ${mode}; observe também a possibilidade de ${excess}.${where}\n\nPense em ${example}. O que aconteceu, qual necessidade estava presente e o que você escolheria repetir? ${action}`,
		factIds: [f.id]
	};
}
function natalHouse(f: Fact, calc: CalculationSnapshot): number | undefined {
	const root = calc.data.natal as { data?: Record<string, unknown> } | undefined;
	const data = root?.data ?? calc.data;
	const positions = data.positions as { body: string; longitude: number }[] | undefined;
	const houses = data.houses as { status?: string; cusps?: number[] } | undefined;
	const key = f.id.replace(/^(?:(?:natal-)?position-|natal-|return-)/, '');
	const position = positions?.find((p) => p.body === key);
	if (!position || houses?.cusps?.length !== 12 || !houses.cusps.every(Number.isFinite)) return;
	for (let i = 0; i < 12; i++) {
		const span = (houses.cusps[(i + 1) % 12] - houses.cusps[i] + 360) % 360;
		const distance = (position.longitude - houses.cusps[i] + 360) % 360;
		if (span > 0 && distance < span) return i + 1;
	}
}
export function composeTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const profile = trialProfiles[input.productId],
		product = productCatalog.find((p) => p.id === input.productId);
	if (!profile || !product || !calculation.facts.length) throw Error('Leitura indisponível.');
	const facts = calculation.facts,
		sections: Section[] = [];
	const kind = workflowFor(input.productId)!.kind;
	const relationship = kind === 'relationship',
		cycles = kind === 'cycles';
	const allPositions = facts.filter(
		(f) =>
			f.kind === 'calculated' &&
			!/house|cross-|day-|aspect|series/.test(f.id) &&
			bodyOf(f) &&
			signOf(f)
	);
	const positionFacts =
		cycles && input.productId !== 'solar-return'
			? allPositions
					.filter((f) => /^(?:Sol|Lua|Mercúrio|Vênus|Marte)$/.test(bodyOf(f)!))
					.slice(0, 8)
			: allPositions;
	const aspects = facts
		.filter(isAspect)
		.sort((a, b) => aspectRank(b) - aspectRank(a) || a.id.localeCompare(b.id))
		.slice(0, relationship ? 12 : 8);
	const signatures = relationship
		? ['Pessoa A', 'Pessoa B'].flatMap((person) =>
				positionFacts
					.filter((f) => f.display.startsWith(person))
					.sort(
						(a, b) => Number(!/Sol:|Lua:/.test(a.display)) - Number(!/Sol:|Lua:/.test(b.display))
					)
					.slice(0, 2)
			)
		: positionFacts
				.filter((f) => ['Sol', 'Lua', 'Ascendente', 'Meio do Céu'].includes(bodyOf(f)!))
				.slice(0, 4);
	const anchors = signatures;
	if (anchors.length) {
		const lenses = anchors.map((f) => {
			const body = bodyOf(f),
				sign = signOf(f);
			const scope = f.display.match(/^(Pessoa [AB]|Base natal|Amostra da data)/)?.[1];
			return body && sign
				? `${scope ? scope + ': ' : ''}${body} em ${sign} relaciona ${bodyEditorial[body]} a ${signEditorial[sign][0]}`
				: factLabel(f);
		});
		sections.push({
			title: relationship ? 'O encontro de duas perspectivas' : 'O fio da sua leitura',
			text: `${lenses.join('; ')}.\n\n${relationship ? 'São referências de pessoas diferentes, não uma nota de compatibilidade. Leia primeiro o que cada pessoa precisa expressar; depois compare os contatos selecionados e procure um acordo verificável.' : 'Esses fatores podem apontar necessidades diferentes. Escolha uma situação atual e observe qual delas está recebendo espaço e qual ficou em segundo plano.'}${aspects[0] ? ` A relação ${factLabel(aspects[0])} acrescenta uma hipótese de integração, desenvolvida adiante.` : ''} A síntese é uma hipótese para comparar com sua experiência; você pode discordar dela.`,
			factIds: [...anchors, ...aspects.slice(0, 1)].map((f) => f.id)
		});
	}
	if (input.productId === 'career-compass') {
		sections.push(
			...composeLegacyTrialReading(input, calculation).sections.filter(
				(s) => !s.title.startsWith('Meio do Céu:') && !s.title.startsWith('O que você trouxe:')
			)
		);
	} else {
		const processed = new Set<string>();
		for (const fact of positionFacts) {
			if (processed.has(fact.id)) continue;
			const section = positionSection(
				fact,
				!relationship && !cycles ? natalHouse(fact, calculation) : undefined
			);
			if (section) {
				const shared = relationship
					? positionFacts.filter(
							(f) => f.id !== fact.id && bodyOf(f) === bodyOf(fact) && signOf(f) === signOf(fact)
						)
					: [];
				if (shared.length) {
					section.title = `Um tema em comum · ${bodyOf(fact)} em ${signOf(fact)}`;
					section.text +=
						'\n\nEssa combinação aparece nos dois mapas. Isso não torna as pessoas iguais: cada uma deve responder ao exercício separadamente e contar um exemplo. Comparem como o mesmo tema se manifesta em histórias e condições diferentes; um acordo precisa acolher essas diferenças.';
					section.factIds.push(...shared.map((f) => f.id));
					shared.forEach((f) => processed.add(f.id));
				}
				sections.push(section);
			}
		}
	}
	for (const f of aspects)
		sections.push({
			title: factLabel(f),
			text: aspectText(f, relationship, cycles),
			factIds: [f.id]
		});
	if (input.productId === 'purpose-career') {
		for (const [id, theme, question, action] of [
			[
				'house-2',
				'Recursos e valores',
				'Que habilidade você consegue demonstrar e que recurso precisa proteger?',
				'Liste duas habilidades com exemplos e estime o tempo disponível para desenvolvê-las.'
			],
			[
				'house-6',
				'Rotina de trabalho',
				'Que condições tornam seu trabalho sustentável no dia a dia?',
				'Desenhe uma semana possível, incluindo pausas, tarefas repetidas e limites de disponibilidade.'
			],
			[
				'house-10',
				'Contribuição pública',
				'Que resultado útil você deseja que alguém reconheça?',
				'Escolha uma entrega pequena e peça um retorno sobre sua utilidade, clareza e qualidade.'
			]
		]) {
			const f = facts.find((f) => f.id === id);
			if (!f) continue;
			const sign = signOf(f);
			sections.push({
				title: theme,
				text: `${factLabel(f)}. ${sign ? `O signo na cúspide sugere investigar ${signEditorial[sign][0]} nessa área.` : ''} A cúspide indica o início simbólico da casa, sem afirmar que um planeta a ocupa.\n\n${question} ${action}`,
				factIds: [id]
			});
		}
		sections.push({
			title: 'Juntar direção, recursos e rotina',
			text: 'Compare sua contribuição desejada com as habilidades que consegue demonstrar e com a rotina que consegue sustentar. Se as três coisas não se encontram, reduza o tamanho do primeiro experimento. Teste uma tarefa por uma semana e avalie interesse, esforço e retorno recebido; o mapa não escolhe sua profissão nem promete renda.',
			factIds: facts.filter((f) => /^house-|angle-midheaven/.test(f.id)).map((f) => f.id)
		});
	}
	if (input.productId === 'solar-return') {
		const instant = facts.find((f) => f.id === 'return-instant');
		if (instant)
			sections.push({
				title: 'O início deste ciclo',
				text: `${factLabel(instant)}. O retorno é o instante calculado em que o Sol volta à longitude natal; pode ocorrer em outra data civil que o aniversário. O local escolhido afeta os ângulos e as casas do retorno.\n\nLeia Sol, Lua e Ascendente do retorno como lentes para organizar perguntas sobre o ciclo. Compare as áreas das casas com seus compromissos atuais, sem transformar uma posição em promessa anual. Escolha uma intenção, um limite de recursos e uma data mensal para rever o que está acontecendo. Não foram calculadas datas de acontecimentos ao longo do ano.`,
				factIds: [instant.id]
			});
	}
	if (input.productId === 'week-reading') {
		const series = calculation.data.series as {
			transitBody: string;
			natalBody: string;
			aspectKinds: (string | null)[];
			orbDegrees: (number | null)[];
		}[];
		const labels: Record<string, string> = {
			sun: 'Sol',
			moon: 'Lua',
			mercury: 'Mercúrio',
			venus: 'Vênus',
			mars: 'Marte',
			jupiter: 'Júpiter',
			saturn: 'Saturno',
			uranus: 'Urano',
			neptune: 'Netuno',
			pluto: 'Plutão'
		};
		const names: Record<string, string> = {
			conjunction: 'conjunção',
			sextile: 'sextil',
			square: 'quadratura',
			trine: 'trígono',
			opposition: 'oposição'
		};
		const selected = (series ?? [])
			.filter((s) => s.aspectKinds.some(Boolean))
			.sort(
				(a, b) =>
					Math.min(...a.orbDegrees.filter((n): n is number => n !== null)) -
					Math.min(...b.orbDegrees.filter((n): n is number => n !== null))
			)
			.slice(0, 8);
		const range = facts.find((f) => f.id === 'week-range');
		if (range)
			sections.push({
				title: 'Como usar os sete dias',
				text: `${range.display}\n\nOs contatos abaixo são observações de instantes separados, dentro da política nominal de aspectos. Uma mudança entre amostras não informa o horário em que um aspecto começou ou terminou. Escolha uma pergunta por dia e compare a leitura com sua experiência; evite organizar decisões importantes somente por essas amostras.`,
				factIds: [range.id]
			});
		for (const s of selected) {
			const f = facts.find((f) => f.id === `transit-${s.transitBody}-natal-${s.natalBody}-series`);
			if (!f) continue;
			const a = labels[s.transitBody],
				b = labels[s.natalBody];
			const observations = s.aspectKinds.map((kind, i) => {
				const date = new Date(
					Date.parse(String(calculation.data.startDate) + 'T12:00:00Z') + i * 86400000
				)
					.toISOString()
					.slice(0, 10);
				return `${date}: ${kind ? `${names[kind]} (orbe nominal ${s.orbDegrees[i]!.toFixed(2)}°)` : 'sem aspecto desta política na amostra'}`;
			});
			sections.push({
				title: `${a} em trânsito e ${b} natal`,
				text: `${observations.join('\n')}\n\nO tema do primeiro fator é ${bodyEditorial[a]}; o segundo fornece a referência natal de ${bodyEditorial[b]}. Observe como esses assuntos aparecem juntos no dia, sem exigir que toda amostra corresponda a um acontecimento. ${bodyActions[b][2]}`,
				factIds: [f.id]
			});
		}
	}
	if (input.journey) {
		const milestones = calculation.data.milestones as { day: number; date: string }[];
		sections.push({
			title: 'Seu percurso de trinta dias',
			text: `Objetivo que você escolheu: ${input.journey.goal}\n\n${(milestones ?? []).map((m, i) => `${m.date} · dia ${m.day}: ${['registre o que tentou, o esforço exigido e um apoio que faltou', 'compare o resultado com a intenção inicial; escolha o que manter e o que reduzir', 'revise a decisão usando exemplos, recursos disponíveis e limites; defina o próximo passo ou encerre o experimento'][i]}`).join('\n\n')}\n\nEstas datas são marcos civis de acompanhamento, não janelas astrológicas favoráveis. Se perder uma revisão, retome na próxima data possível.`,
			factIds: facts.filter((f) => /^civil-check-in|declared-/.test(f.id)).map((f) => f.id)
		});
	}
	if (input.productId === 'couple-dossier')
		sections.push({
			title: 'Um acordo para experimentar a dois',
			text: 'Cada pessoa escolhe uma necessidade descrita na leitura e conta um exemplo concreto. A outra repete o que entendeu antes de responder. Registrem um pedido de cada pessoa, um gesto possível durante a semana e um limite que ambos aceitam.\n\nDepois de sete dias, conversem sobre o que foi feito, como cada pessoa se sentiu e qual ajuste deseja. Se não houver consentimento para um acordo, registrem a diferença sem pressionar uma conclusão. Um mapa não autoriza controlar, vigiar ou adivinhar a vontade de alguém.',
			factIds: anchors.map((f) => f.id)
		});
	const cards = calculation.data.cards as
		{ cardId: string; position: number; questionIndex?: number }[] | undefined;
	for (const f of facts.filter((f) => f.kind === 'drawn')) {
		const card = cards?.find((c) => f.id === `card-${c.position}`);
		if (!card) throw Error('Carta sem origem verificável.');
		const editorial = cardEditorial(card.cardId);
		const question =
			input.questions?.[card.questionIndex ?? card.position - 1] ??
			input.questions?.[0] ??
			input.tarotJourney?.goal;
		sections.push({
			title: factLabel(f),
			text: `${question ? `Sua pergunta: ${question}\n\n` : ''}${editorial}\n\nCompare a ação com sua pergunta: que informação real ela ajuda a buscar e qual condição ainda falta? A imagem não determina acontecimentos, uma resposta binária nem a vontade de outra pessoa.`,
			factIds: [f.id]
		});
	}
	const reported = facts.filter((f) => f.kind === 'reported');
	if (reported.length)
		sections.push({
			title: 'O que você compartilhou',
			text: reported.map((f) => f.display).join('\n\n'),
			factIds: reported.map((f) => f.id)
		});
	if (input.atlas)
		sections.push({
			title: 'Suas prioridades viram um plano de observação',
			text:
				input.atlas.priorities
					.map(
						(p, i) =>
							`${i + 1}. ${p}: ${['escolha um gesto que cabe nesta semana e diga o que espera observar', 'identifique um acordo ou apoio necessário para sustentar o gesto', 'defina um limite de tempo e recursos para não prejudicar o que veio antes', 'reserve uma data para revisar a ordem com base no que você viveu'][i]}.`
					)
					.join('\n\n') +
				'\n\nA ordem foi escolhida por você. O mapa não classifica essas prioridades nem decide o que merece mais atenção.',
			factIds: facts.filter((f) => /priorit/.test(f.id)).map((f) => f.id)
		});
	if (input.dream || kind === 'dream') {
		const association = input.dream?.associations[0];
		const emotion = input.dream?.emotions[0];
		sections.push({
			title: 'Duas hipóteses em aberto',
			text: `Uma possibilidade é que ${emotion ? `a emoção que você nomeou como “${emotion}”` : 'uma emoção reconhecível'} aproxime o sonho de uma experiência recente. Outra é que a cena reúna lembranças e imagens sem um significado único.${association ? ` A associação “${association}” pertence ao seu relato: investigue o que ela lembra na sua história, sem aplicar um dicionário universal.` : ' Comece pela associação que a imagem desperta em você.'}\n\nPara comparar, descreva uma situação acordado com sensação semelhante e outra que contradiga a hipótese. Recorrência nos registros selecionados é observação da amostra, não diagnóstico nem prova de um padrão oculto.`,
			factIds: reported.map((f) => f.id)
		});
	}
	if (input.productId === 'dream-atlas') {
		const counts = facts.filter((f) => f.id === 'atlas-count' || f.id.startsWith('atlas-window-'));
		sections.push({
			title: 'O que seus registros permitem observar',
			text: `${counts.map((f) => f.display).join('\n')}\n\nCompare apenas os sonhos que você decidiu incluir. Uma semana com mais relatos pode refletir mais disposição para registrar; não demonstra que você sonhou mais. As repetições declaradas são pontos de conversa: procure um exemplo que apoie a associação e outro que a contradiga. Não preencha dias sem registro com interpretações.`,
			factIds: counts.map((f) => f.id)
		});
	}
	if (cycles) {
		const days = facts.filter((f) => /^day-\d+-.*aspects$/.test(f.id));
		if (days.length)
			sections.push({
				title: 'Calendário de observação',
				text:
					days.map((f) => factLabel(f).split('; ').slice(0, 3).join('; ')).join('\n\n') +
					'\n\nCada linha apresenta até três contatos da amostra às 12h UTC. Os demais estão na cópia em texto. Não fornece início, pico ou fim exato de um trânsito. Dias sem aspecto registrado continuam abertos à sua experiência; não são dias sem acontecimentos.',
				factIds: days.map((f) => f.id)
			});
	}
	if (cards && cards.length > 1)
		sections.push({
			title: 'Como as posições conversam',
			text:
				cards
					.map((c) => `Posição ${c.position}: ${cardEditorial(c.cardId).split('.')[0]}.`)
					.join('\n\n') +
				'\n\nCompare as ações propostas: elas se apoiam ou disputam o mesmo recurso? Escolha uma ação possível, registre a condição para realizá-la e uma razão para interrompê-la. As cartas continuam as mesmas no acompanhamento; o que muda é sua experiência.',
			factIds: facts.filter((f) => f.kind === 'drawn').map((f) => f.id)
		});
	const covered = new Set(sections.flatMap((s) => s.factIds));
	const remaining = facts.filter((f) => !covered.has(f.id));
	const method =
		kind === 'tarot'
			? 'As cartas e sua ordem vêm do sorteio salvo, sem reposição. A interpretação relaciona cada posição à sua pergunta; uma nova edição editorial não sorteia novamente nem transforma a carta em previsão literal.'
			: kind === 'dream'
				? 'A leitura parte do relato e das associações que você informou. Repetições são contadas somente nos registros selecionados. As hipóteses podem ser descartadas; dias sem registro são lacunas, e as imagens não têm um significado universal.'
				: `A interpretação prioriza fatores pessoais e aspectos presentes com menor orbe nominal, dentro da política de cálculo. ${aspects.length ? `Foram desenvolvidos ${aspects.length} contatos;` : 'Não foi inventado um aspecto quando ele não estava disponível;'} pares sem aspecto e cúspides isoladas permanecem no apêndice técnico, sem virar capítulos repetidos. Casas só são relacionadas a posições quando há doze cúspides válidas no cálculo salvo. A seleção editorial não certifica a precisão do motor.`;
	sections.push({
		title: 'Como esta leitura foi organizada',
		text: `${method}\n\n${profile.practice}`,
		factIds: remaining.map((f) => f.id)
	});
	return {
		version: CONTENT_VERSION,
		productId: input.productId,
		title: product.name,
		opening: profile.opening,
		source: sourceNotice,
		sections,
		questions: [...profile.questions],
		practice: profile.practice,
		limits: [
			...new Set([
				symbolicNotice,
				...calculation.limits,
				'Teste privado gratuito. Sua aprovação ou rejeição fica registrada separadamente da revisão automática.'
			])
		]
	};
}
