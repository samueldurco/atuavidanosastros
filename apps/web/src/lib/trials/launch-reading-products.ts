import { calculateAspects, calculateCrossAspects, type NatalChart } from '@atv/astrology';
import { tarotDeck, tarotMethodContract, type LaunchInput, type MethodCard } from '@atv/domain';
import {
	launchConversationAspectPolicy,
	launchFinancialTarotMethod,
	launchNatalAspectPolicy,
	launchNatalScopes,
	type LaunchFactCalculation
} from '../server/launch-calculation';
import { CANON_VERSION, bodyNames, functions, signs } from './reconstruction/canon';
import { natalStyles, type NatalStyle } from './reconstruction/natal-canon';
import {
	TAROT_CANON_VERSION,
	TAROT_CANON_SOURCE_SHA256,
	tarotCanon
} from './reconstruction/tarot-canon';
import { temporalPairMeaning } from './current/temporal-canon';
import type { LaunchReading, LaunchReadingClaim, LaunchReadingSection } from './launch-reading';
import { formatLaunchDate, formatLaunchUtcInstant } from './launch-reading-dates';

/** Original, deliberately finite thematic methods. Runtime does not retrieve sources or call a model. */
export const additionalLaunchProductIds = [
	'sexuality-map',
	'intimacy-map',
	'emotional-reactions-map',
	'financial-blocks-tarot',
	'hidden-talent-map',
	'ascendant-style',
	'conversation-timing',
	'cohabitation-map'
] as const;
type AdditionalId = (typeof additionalLaunchProductIds)[number];
type Body = NatalChart['positions'][number]['body'];
type Aspect = ReturnType<typeof calculateAspects>['aspects'][number];
type NatalData = {
	natal: NatalChart;
	method: string;
	scope: (typeof launchNatalScopes)[keyof typeof launchNatalScopes];
	factors: {
		positions: { body: Body; longitude: number; degreeWithinSign: number; sign: string }[];
		angles: {
			angle: 'ascendant' | 'midheaven';
			longitude: number;
			degreeWithinSign: number;
			sign: string;
		}[];
		houseCusps: { house: number; longitude: number }[];
	};
	aspects: { policy: unknown; aspects: Aspect[] };
};
type Check = { id: string; passed: boolean; detail: string };
type Draft = Pick<
	LaunchReading,
	'summary' | 'sections' | 'claims' | 'practicalAction' | 'reflection'
> & { sources: LaunchReading['provenance']['sources']; limits: string[] };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const q = (value: unknown) => `“${String(value)}”`;
const a = (input: LaunchInput, key: string) => String(input.answers[key] ?? '');
const list = (input: LaunchInput, key: string) => input.answers[key] as string[];
const has = (text: string, clauses: string[]) => clauses.every((clause) => text.includes(clause));
const sourceNatal = `${CANON_VERSION}:natal-styles`;
const sourceTemporal = `${CANON_VERSION}:temporal-pair-meanings`;
const sourcePolicy = 'atv-launch-private-editorial-policy/1';
const aspectPt: Record<string, string> = {
	conjunction: 'conjunção',
	square: 'quadratura',
	opposition: 'oposição',
	trine: 'trígono',
	sextile: 'sextil'
};
const aspectMechanism: Record<string, string> = {
	conjunction:
		'as duas funções entram juntas; distinguir o que cada uma pede evita tratá-las como uma só necessidade',
	square:
		'as duas funções pedem ajustes; dar espaço a uma sem eliminar a outra permite observar onde a fricção diminui',
	opposition:
		'as duas funções podem alternar; negociar as duas necessidades evita escolher permanentemente um dos lados',
	trine:
		'a cooperação entre as funções pode parecer familiar; experimentar uma escolha diferente revela o que virou hábito',
	sextile:
		'a cooperação entre as funções depende de uma atividade deliberada; a oportunidade simbólica não substitui a iniciativa'
};
const styleKey: Record<string, keyof NatalStyle> = {
	sun: 'aim',
	moon: 'need',
	mercury: 'thought',
	venus: 'affection',
	mars: 'action',
	jupiter: 'aim',
	saturn: 'action',
	uranus: 'entry',
	neptune: 'need',
	pluto: 'aim'
};
const bodyObservation: Record<string, string> = {
	sun: 'Observe o que você escolhe assumir como participação própria, em vez de fazer apenas para corresponder a uma expectativa.',
	moon: 'Observe o que traz segurança antes da resposta automática, e se a necessidade pode ser dita sem pedir que alguém a adivinhe.',
	mercury:
		'Observe como você formula a informação, qual pergunta esclarece uma dúvida e se o que disse foi compreendido.',
	venus:
		'Observe o que você valoriza, o que dá vontade de aproximar e onde aceita um acordo que já não corresponde à sua preferência.',
	mars: 'Observe como começa uma ação, pede algo ou interrompe o que não quer; iniciativa e respeito a um limite precisam caber na mesma situação.',
	jupiter:
		'Observe uma oportunidade real de aprender ou ampliar o que já faz, distinguindo curiosidade de prometer mais do que consegue experimentar.',
	saturn:
		'Observe qual responsabilidade consegue sustentar no tempo e qual compromisso precisa de um limite menor para continuar viável.'
};
const style = (longitude: number) => natalStyles[Math.floor(longitude / 30)]!;
const normal = (longitude: number) =>
	Number.isFinite(longitude) && longitude >= 0 && longitude < 360;
const coordinateSigns = [
	'aries',
	'taurus',
	'gemini',
	'cancer',
	'leo',
	'virgo',
	'libra',
	'scorpio',
	'sagittarius',
	'capricorn',
	'aquarius',
	'pisces'
];
const sec = (
	id: string,
	title: string,
	paragraphs: string[],
	evidenceIds: string[],
	sourceIds = [sourceNatal, sourcePolicy]
): LaunchReadingSection => ({
	id,
	title,
	paragraphs,
	evidenceIds: [...new Set(evidenceIds)],
	sourceIds
});
const claim = (
	id: string,
	sectionId: string,
	rule: string,
	evidenceIds: string[],
	factors: LaunchReadingClaim['factors'],
	interpretation: string
): LaunchReadingClaim => ({ id, sectionId, rule, evidenceIds, factors, interpretation });

function natalData(input: LaunchInput, calculation: LaunchFactCalculation): NatalData {
	const id = input.productId as keyof typeof launchNatalScopes,
		scope = launchNatalScopes[id];
	const data = calculation.data as unknown as NatalData;
	if (
		!scope ||
		data.method !== scope.version ||
		!same(data.scope, scope) ||
		!data.natal ||
		data.natal.positions.length !== 10 ||
		new Set(data.natal.positions.map((p) => p.body)).size !== 10 ||
		data.natal.positions.some((p) => !normal(p.longitude))
	)
		throw new Error('launch_additional_natal_invalid');
	if (!same(data.aspects.policy, launchNatalAspectPolicy))
		throw new Error('launch_additional_natal_policy_invalid');
	const selected = new Set<Body>(scope.bodies);
	const checked = calculateAspects(data.natal.positions, launchNatalAspectPolicy).aspects.filter(
		(item) => selected.has(item.first) || selected.has(item.second)
	);
	if (!same(checked, data.aspects.aspects))
		throw new Error('launch_additional_natal_geometry_invalid');
	if (
		data.factors.positions.length !== scope.bodies.length ||
		scope.bodies.some((body) => {
			const p = data.factors.positions.find((p) => p.body === body),
				actual = data.natal.positions.find((p) => p.body === body);
			return (
				!p ||
				!actual ||
				p.longitude !== actual.longitude ||
				p.sign !== coordinateSigns[Math.floor(p.longitude / 30)] ||
				p.degreeWithinSign !== p.longitude % 30 ||
				!calculation.facts.some(
					(f) => f.id === `natal-${body}` && f.display.includes(p.longitude.toFixed(6))
				)
			);
		})
	)
		throw new Error('launch_additional_natal_factors_invalid');
	if (
		data.factors.angles.length !== scope.angles.length ||
		scope.angles.some((angle) => {
			const p = data.factors.angles.find((p) => p.angle === angle);
			return (
				!p ||
				!normal(p.longitude) ||
				p.longitude !== data.natal.houses[angle] ||
				p.sign !== coordinateSigns[Math.floor(p.longitude / 30)] ||
				!calculation.facts.some(
					(f) => f.id === `natal-${angle}` && f.display.includes(p.longitude.toFixed(6))
				)
			);
		})
	)
		throw new Error('launch_additional_angle_invalid');
	if (
		checked.some(
			(_, index) => !calculation.facts.some((f) => f.id === `natal-selected-aspect-${index + 1}`)
		)
	)
		throw new Error('launch_additional_aspect_fact_missing');
	return data;
}

function bodyMeaning(body: Body, longitude: number): string {
	const value = style(longitude);
	return `${bodyNames[body]} em ${signs[Math.floor(longitude / 30)]}, a ${longitude.toFixed(6)}° de longitude tropical, é usado aqui para observar ${functions[body]}. A hipótese própria dessa função é ${value[styleKey[body]!]}; o risco a examinar é ${value.excess}. Um ajuste possível é ${value.adjustment}. Isso precisa ser confrontado com o relato, sem concluir uma preferência ou capacidade pelo signo.`;
}
function aspectText(aspect: Aspect): string {
	return `${bodyNames[aspect.first]} em ${aspectPt[aspect.kind]} com ${bodyNames[aspect.second]} (orbe ${aspect.orbDegrees.toFixed(3)}°): ${aspectMechanism[aspect.kind]}. A relação liga ${functions[aspect.first]} a ${functions[aspect.second]}; é uma hipótese de observação, não a causa comprovada do comportamento.`;
}

type Plan = {
	context: string;
	priority: string;
	application: string;
	action: string;
	reflection: string;
	integration: string;
	blocks: string[];
	extra: { id: string; title: string; paragraphs: string[]; refs: string[] }[];
};
function natalPlan(input: LaunchInput, data: NatalData): Plan {
	const id = input.productId,
		blocks: string[] = [],
		extra: Plan['extra'] = [];
	if (id === 'sexuality-map') {
		const situations = list(input, 'situations'),
			preferences = a(input, 'preferences');
		const priority = 'separar interesse, ritmo e consentimento em cada situação';
		for (const [index, situation] of situations.entries()) {
			const experiment = /devagar|paus|recus|dizer|limite/iu.test(situation)
				? 'Escreva uma frase que diga o ritmo que você quer e como prefere interromper. Confira se a resposta acolhe essa pausa sem cobrança; continuar depende de vontade atual.'
				: 'Escreva um convite pequeno e pergunte se há interesse, sem transformar a sua curiosidade em expectativa de reciprocidade. Só experimente o que os dois quiserem e combinem como pausar.';
			extra.push({
				id: `situation-${index + 1}`,
				title: `Situação ${index + 1}: observar antes de concluir`,
				refs: [
					`reported-situations-${index + 1}`,
					'reported-preferences-1',
					'natal-venus',
					'natal-mars'
				],
				paragraphs: [
					`Diante de ${q(situation)}, diferencie o que desperta vontade (Vênus) de como você inicia ou interrompe uma experiência (Marte). A preferência que você efetivamente declarou foi ${q(preferences)}; ela tem prioridade sobre qualquer hipótese do mapa.`,
					`Para ${q(situation)}: ${experiment} Recusa ou mudança de vontade encerram o experimento; registre depois curiosidade, conforto e o que não deseja repetir.`
				]
			});
		}
		return {
			context: situations.join(' / '),
			priority,
			application: `Nas situações ${q(situations.join(' / '))}, compare a hipótese com ${q(preferences)}, sem transformar desejo em obrigação.`,
			action: `Escolha somente uma das situações relatadas, ${q(situations[0])}, e proponha uma experiência pequena coerente com ${q(preferences)}, com consentimento explícito e possibilidade de pausar.`,
			reflection:
				'Em qual situação o seu interesse e a sua forma de iniciar caminham juntos, e onde você gostaria de poder dizer não com mais clareza?',
			integration:
				'Vênus oferece a hipótese do que ganha valor e atrai; Marte oferece a hipótese de como agir e proteger um limite. Desejo, iniciativa e consentimento são perguntas diferentes: a resposta de uma não autoriza presumir a resposta das outras.',
			blocks,
			extra
		};
	}
	if (id === 'intimacy-map') {
		const situation = a(input, 'situation'),
			wish = a(input, 'wish'),
			boundary = a(input, 'boundaries');
		return {
			context: situation,
			priority: 'transformar o desejo declarado em convite negociável, preservando o limite',
			application: `Na situação ${q(situation)}, confronte essa função com o desejo ${q(wish)} e o limite ${q(boundary)}; nenhum dos dois descreve a vontade da outra pessoa.`,
			action: `Rascunhe um convite curto para ${q(wish)}, diga antes ${q(boundary)} e pergunte se há vontade de conversar. Se houver recusa ou hesitação, pause e negocie outro momento, sem insistir.`,
			reflection:
				'Qual parte do seu desejo pode virar um pedido claro, e qual limite precisa ser dito antes de qualquer aproximação?',
			integration: `Vênus ajuda a formular o valor do encontro; Marte ajuda a formular iniciativa e interrupção. Em ${q(situation)}, o acordo revisável é perguntar por ${q(wish)}, preservar ${q(boundary)} e só continuar com respostas livres dos dois.`,
			blocks,
			extra: [
				{
					id: 'revisable-agreement',
					title: 'Convite, recusa e revisão do acordo',
					refs: [
						'reported-wish-1',
						'reported-boundaries-1',
						'reported-situation-1',
						'natal-venus',
						'natal-mars'
					],
					paragraphs: [
						`Convite possível: “Quero conversar sobre ${wish}. Meu limite é ${boundary}. Você quer falar disso agora?” É um rascunho a adaptar, não uma fala que garante resposta. O ritmo depende da disponibilidade que for expressa pelos dois.`,
						'Se a resposta for não, não peça demonstrações de afeto como contrapartida. Se houver sim, combinem uma experiência pequena, uma forma de interromper e quando perguntar novamente se o acordo ainda faz sentido. Um acordo anterior não substitui consentimento atual.'
					]
				}
			]
		};
	}
	if (id === 'emotional-reactions-map') {
		const trigger = a(input, 'trigger'),
			reaction = a(input, 'reaction'),
			effect = a(input, 'effect');
		const interrupt = /interromp|não me deixa falar|corta minha fala/iu.test(trigger);
		const request = interrupt
			? '“Quero terminar esta frase; depois escuto você.”'
			: '“Preciso de uma pausa curta para dizer o que entendi e o que estou pedindo.”';
		if (!data.aspects.aspects.some((aspect) => aspect.first === 'moon' || aspect.second === 'moon'))
			blocks.push(
				'A Lua não tem contato maior dentro do orbe do método. Falta relação natal adicional para a profundidade desta entrega; não foi criada uma relação substituta.'
			);
		return {
			context: trigger,
			priority: 'distinguir gatilho relatado, resposta própria e efeito observado',
			application: `O gatilho relatado foi ${q(trigger)}; a sua resposta foi ${q(reaction)} e o efeito que percebeu foi ${q(effect)}. A Lua é uma hipótese de necessidade; não é diagnóstico nem prova da causa dessa sequência.`,
			action: `Em uma próxima ocorrência semelhante a ${q(trigger)}, se houver espaço, experimente dizer ${request} Registre o que efetivamente mudou em comparação com ${q(reaction)}; se não houver espaço, interromper a conversa também é uma opção.`,
			reflection:
				'Que necessidade você consegue nomear antes de repetir a reação, e qual efeito real indicaria que uma resposta diferente ajudou?',
			integration: `A necessidade lunar precisa ser lida junto da relação calculada com outra função, sem transformar tensão simbólica em defeito pessoal. O relato ${q(trigger)} → ${q(reaction)} → ${q(effect)} oferece uma sequência verificável; uma pausa cria uma alternativa entre os dois primeiros passos.`,
			blocks,
			extra: [
				{
					id: 'seven-day-observation',
					title: 'Uma semana de observação',
					refs: ['reported-trigger-1', 'reported-reaction-1', 'reported-effect-1', 'natal-moon'],
					paragraphs: [
						`Durante sete dias, registre somente episódios que acontecerem: situação, primeira reação, frase ou pausa escolhida e efeito percebido. Compare no máximo dois episódios semelhantes a ${q(trigger)}; ausência de episódio também é um resultado, sem fabricar uma ocasião.`,
						`A alternativa a testar é ${request} Ao final, avalie se ela mudou o efeito ${q(effect)} e se precisa ser ajustada. Este registro organiza uma observação pessoal; não mede saúde mental nem substitui apoio profissional que você já utilize.`
					]
				}
			]
		};
	}
	if (id === 'hidden-talent-map') {
		const favors = list(input, 'favors'),
			resources = a(input, 'resources');
		const patterns = [
			{
				id: 'organização',
				re: /organiz|planej|agenda|planilha|processo/iu,
				offer: 'organizar uma etapa pequena e entregar uma lista de próximos passos'
			},
			{
				id: 'explicação',
				re: /explic|ensin|entend|resum|texto/iu,
				offer: 'explicar um tema delimitado e entregar um resumo que a pessoa consiga usar'
			},
			{
				id: 'criação',
				re: /cri|desenh|arte|foto|vídeo|visual/iu,
				offer: 'criar uma proposta pequena e mostrar uma primeira versão para retorno'
			},
			{
				id: 'escuta',
				re: /ouvir|escut|acolh|convers|conselh/iu,
				offer:
					'organizar uma conversa de escuta, sem oferecer tratamento ou prometer resolver a vida da pessoa'
			}
		];
		const matched = patterns.filter((pattern) => favors.every((favor) => pattern.re.test(favor)));
		if (matched.length !== 1)
			blocks.push(
				'Os dois favores não sustentam um padrão comum inequívoco no vocabulário deste método. É necessário esclarecer o que foi entregue e para quem; nenhum talento foi deduzido apenas do mapa.'
			);
		const pattern = matched[0],
			label = pattern?.id ?? 'padrão ainda não esclarecido',
			offer =
				pattern?.offer ??
				'esclarecer com quem pediu os favores qual foi o resultado concreto de cada um';
		return {
			context: favors.join(' / '),
			priority: `testar o padrão relatado de ${label} em uma oferta pequena`,
			application: `Os favores relatados foram ${q(favors[0])} e ${q(favors[1])}. Eles são os indícios de uso real; o mapa apenas propõe funções para examinar o modo de fazer.`,
			action: `Com o recurso que você declarou, ${q(resources)}, convide uma pessoa a testar ${offer}. Combine escopo e prazo possíveis, sem fixar preço ou prometer renda; peça que descreva uma coisa útil e uma que precisa mudar.`,
			reflection:
				'O que as duas pessoas pediram que você fizesse, e qual resultado pequeno você consegue demonstrar sem comprar recursos novos?',
			integration: `O padrão de ${label} vem da relação entre ${q(favors[0])} e ${q(favors[1])}, não de um planeta renomeado como profissão. Mercúrio pode ajudar a examinar como explicar o trabalho; Saturno, como sustentar um escopo. A oferta experimental é ${offer}, usando somente ${q(resources)}.`,
			blocks,
			extra: [
				{
					id: 'small-offer',
					title: 'Oferta experimental e retorno observável',
					refs: [
						'reported-favors-1',
						'reported-favors-2',
						'reported-resources-1',
						'natal-mercury',
						'natal-saturn'
					],
					paragraphs: [
						`Hipótese de padrão comum: ${label}. Primeiro pedido: ${q(favors[0])}. Segundo pedido: ${q(favors[1])}. Verifique com quem pediu se o que parece comum foi de fato útil; se a resposta divergir, revise o padrão antes de ampliar a oferta.`,
						`Proposta para teste: ${offer}. Recurso disponível: ${q(resources)}. Limite a uma pessoa e uma entrega; registre tempo gasto, dificuldade e retorno concreto. Um teste pode mostrar interesse, necessidade de prática ou ausência de demanda; nenhum desses resultados é uma previsão de renda.`
					]
				}
			]
		};
	}
	if (id === 'ascendant-style') {
		const occasion = a(input, 'occasion'),
			comfort = a(input, 'comfort'),
			wardrobe = list(input, 'wardrobe');
		const tops = wardrobe.filter((item) =>
			/camis|blusa|suéter|sueter|regata|polo|top/iu.test(item)
		);
		const bottoms = wardrobe.filter((item) => /calça|calca|saia|short|bermuda/iu.test(item));
		const shoes = wardrobe.filter((item) =>
			/tênis|tenis|sapato|sandália|sandalia|bota|sapatilha|mocassim/iu.test(item)
		);
		const combinations = tops
			.flatMap((top) => bottoms.flatMap((bottom) => shoes.map((shoe) => [top, bottom, shoe])))
			.slice(0, 3);
		if (combinations.length !== 3)
			blocks.push(
				'O inventário não permite três combinações completas distintas no vocabulário de peças do método. Não foram adicionadas peças; é preciso esclarecer o acervo.'
			);
		combinations.forEach((items, index) =>
			extra.push({
				id: `outfit-${index + 1}`,
				title: `Combinação ${index + 1}: testar com o que você tem`,
				refs: [
					'natal-ascendant',
					'reported-occasion-1',
					'reported-comfort-1',
					...items.map((item) => `reported-wardrobe-${wardrobe.indexOf(item) + 1}`)
				],
				paragraphs: [
					`Peças: ${items.map(q).join(' + ')}. Para ${q(occasion)}, use esta combinação como teste de apresentação, preservando ${q(comfort)}. São peças do seu inventário; o Ascendente não prescreve compra, gênero ou tipo de corpo.`,
					`Com ${items.map(q).join(', ')}, faça um movimento que a ocasião exige, como sentar e caminhar. Observe se atende ao conforto que você pediu, ${q(comfort)}, e se a hipótese de entrada do Ascendente combina com a impressão que deseja experimentar; descarte a combinação se ela exigir tolerar desconforto.`
				]
			})
		);
		return {
			context: occasion,
			priority: `experimentar uma apresentação para ${q(occasion)} com o conforto declarado`,
			application: `A ocasião é ${q(occasion)} e o critério real é ${q(comfort)}; a hipótese do Ascendente só participa se ajudar você a escolher entre peças que já possui.`,
			action: `Experimente uma das combinações completas do seu inventário antes de ${q(occasion)}. Caminhe e sente por alguns minutos; escolha pela sensação de ${q(comfort)}, ajustando ou descartando sem comprar peças para obedecer ao mapa.`,
			reflection:
				'Qual combinação ajuda você a chegar à ocasião com o conforto que pediu e com uma apresentação que reconhece como sua?',
			integration: `A entrada simbólica do Ascendente não define o corpo nem uma identidade visual obrigatória. A escolha junta a ocasião ${q(occasion)}, o critério ${q(comfort)} e as peças realmente disponíveis; o teste de uso pode contrariar a hipótese astrológica.`,
			blocks,
			extra
		};
	}
	const habits = list(input, 'habits'),
		expectation = a(input, 'expectation'),
		friction = a(input, 'friction');
	const agreements = [
		{
			theme: habits[0]!,
			responsibility:
				'cada pessoa declara a parte que aceita assumir; só o que for confirmado entra no acordo',
			frequency: 'uma conferência breve ao fim de cada dia'
		},
		{
			theme: habits[1]!,
			responsibility:
				'quem precisar alterar a rotina avisa e propõe uma alternativa; ninguém recebe uma tarefa por dedução do mapa',
			frequency: 'uma revisão no meio da primeira semana'
		},
		{
			theme: friction,
			responsibility:
				'os dois descrevem um exemplo concreto e escolhem uma mudança pequena, com direito a recusar e renegociar',
			frequency: 'uma conversa ao final da primeira semana'
		}
	];
	const reviewQuestions = [
		'No primeiro hábito, confira se o combinado protegeu a necessidade de cada um sem transferir toda a manutenção para uma pessoa.',
		'No segundo hábito, confira se o aviso chegou antes da mudança e se a alternativa foi aceita, em vez de só comunicada como decisão pronta.',
		'Na fricção, compare um episódio antes e depois do pequeno ajuste: o que cada pessoa fez, o que continuou pendente e o que precisa ser renegociado.'
	];
	agreements.forEach((agreement, index) =>
		extra.push({
			id: `agreement-${index + 1}`,
			title: `Acordo proposto ${index + 1}`,
			refs: [
				index < 2 ? `reported-habits-${index + 1}` : 'reported-friction-1',
				'reported-expectation-1',
				'natal-moon',
				'natal-mercury',
				'natal-venus',
				'natal-saturn'
			],
			paragraphs: [
				`Tema observado: ${q(agreement.theme)}. Proposta de responsabilidade: ${agreement.responsibility}. Frequência de acompanhamento: ${agreement.frequency}. É um rascunho para concordância explícita; não uma regra concedida pelo mapa.`,
				`${reviewQuestions[index]} Compare com a expectativa ${q(expectation)} e a fricção ${q(friction)}. Se uma pessoa não concordar, reformule antes de chamar isso de acordo.`
			]
		})
	);
	return {
		context: habits.join(' / '),
		priority: 'converter hábitos e fricção em três acordos pequenos, explícitos e revisáveis',
		application: `Os hábitos relatados são ${q(habits.join(' / '))}; a expectativa é ${q(expectation)} e a fricção é ${q(friction)}. A função natal descreve uma hipótese sua, sem atribuir características à outra pessoa.`,
		action: `Leve somente um dos três rascunhos a uma conversa sobre ${q(friction)}; pergunte quem aceita fazer o quê e quando revisar. Só registre como acordo o que os dois confirmarem, considerando ${q(expectation)}.`,
		reflection:
			'Qual responsabilidade e qual frequência vocês conseguem confirmar explicitamente, sem presumir que a outra pessoa já concorda?',
		integration: `Lua ajuda a nomear a necessidade de segurança; Mercúrio, a explicitar a mensagem; Vênus, a negociar preferências; Saturno, a sustentar uma responsabilidade possível. Para ${q(friction)}, essas funções diferentes se encontram no teste de um acordo, cuja utilidade depende de atender ${q(expectation)} e da confirmação dos dois.`,
		blocks,
		extra
	};
}

function composeNatal(input: LaunchInput, calculation: LaunchFactCalculation): Draft {
	const data = natalData(input, calculation),
		plan = natalPlan(input, data),
		sections: LaunchReadingSection[] = [],
		claims: LaunchReadingClaim[] = [];
	for (const p of data.factors.positions) {
		const text = bodyMeaning(p.body, p.longitude),
			id = `function-${p.body}`,
			refs = [`natal-${p.body}`];
		sections.push(
			sec(
				id,
				`${bodyNames[p.body]}: uma função em contexto`,
				[text, `${bodyObservation[p.body]} ${plan.application}`],
				refs.concat(
					data.scope.contextKeys.flatMap((key) =>
						calculation.facts
							.filter((f) => f.source.startsWith(`input.answers.${key}`))
							.map((f) => f.id)
					)
				)
			)
		);
		claims.push(
			claim(
				`claim-${id}`,
				id,
				'natal-function-in-context',
				refs,
				{ body: p.body, longitude: p.longitude, styleKey: styleKey[p.body]! },
				text
			)
		);
	}
	for (const p of data.factors.angles) {
		const name = p.angle === 'ascendant' ? 'Ascendente' : 'Meio do Céu',
			role = p.angle === 'ascendant' ? style(p.longitude).entry : style(p.longitude).aim;
		const text = `${name} em ${signs[Math.floor(p.longitude / 30)]}, a ${p.longitude.toFixed(6)}° de longitude tropical: a hipótese de ${p.angle === 'ascendant' ? 'apresentação e entrada' : 'direção visível do trabalho'} é ${role}. É uma referência simbólica a testar, sem deduzir corpo, profissão ou resultado social.`;
		const id = `angle-${p.angle}`,
			refs = [`natal-${p.angle}`];
		sections.push(
			sec(
				id,
				`${name}: hipótese e uso real`,
				[
					text,
					`Para a hipótese de ${p.angle === 'ascendant' ? 'entrada na situação' : 'direção visível'}, compare a impressão desejada com o retorno efetivamente recebido. ${plan.application}`
				],
				refs.concat(
					data.scope.contextKeys.flatMap((key) =>
						calculation.facts
							.filter((f) => f.source.startsWith(`input.answers.${key}`))
							.map((f) => f.id)
					)
				)
			)
		);
		claims.push(
			claim(
				`claim-${id}`,
				id,
				'actual-angle-in-context',
				refs,
				{ angle: p.angle, longitude: p.longitude },
				text
			)
		);
	}
	// One actual relationship adds a mechanism, rather than printing every aspect as filler.
	const relevant = data.aspects.aspects.find(
		(aspect) =>
			input.productId !== 'emotional-reactions-map' ||
			aspect.first === 'moon' ||
			aspect.second === 'moon'
	);
	if (relevant) {
		const index = data.aspects.aspects.indexOf(relevant),
			refs = [`natal-selected-aspect-${index + 1}`],
			text = aspectText(relevant);
		sections.push(
			sec(
				'calculated-relation',
				'Duas funções em relação',
				[
					text,
					`No seu contexto ${q(plan.context)}, observe onde uma necessidade reduz o espaço da outra e experimente uma mudança pequena. O ajuste é comparar o efeito real, não tentar eliminar um planeta, um signo ou uma parte de si.`
				],
				refs
			)
		);
		claims.push(
			claim(
				'claim-calculated-relation',
				'calculated-relation',
				'actual-aspect-mechanism',
				refs,
				{
					first: relevant.first,
					second: relevant.second,
					aspect: relevant.kind,
					orbDegrees: relevant.orbDegrees
				},
				text
			)
		);
	}
	for (const extra of plan.extra)
		sections.push(sec(extra.id, extra.title, extra.paragraphs, extra.refs));
	const functionRefs = data.factors.positions
		.map((p) => `natal-${p.body}`)
		.concat(data.factors.angles.map((p) => `natal-${p.angle}`));
	const contextRefs = calculation.facts
		.filter((f) => f.kind === 'reported' && f.id !== 'reported-birth')
		.map((f) => f.id);
	const integration = `${plan.integration} A prioridade prática é ${plan.priority}.`;
	sections.push(
		sec(
			'thematic-integration',
			'Síntese e experimento',
			[integration, plan.action],
			functionRefs.concat(contextRefs)
		)
	);
	claims.push(
		claim(
			'claim-thematic-integration',
			'thematic-integration',
			'specific-thematic-integration',
			functionRefs.concat(contextRefs),
			{ bodies: [...data.scope.bodies], angles: [...data.scope.angles], context: plan.context },
			integration
		)
	);
	return {
		summary: `A leitura parte de ${q(plan.context)}. A prioridade é ${plan.priority}; os relatos e o resultado do experimento podem contrariar a hipótese simbólica.`,
		sections,
		claims,
		practicalAction: plan.action,
		reflection: plan.reflection,
		sources: [
			{
				id: sourceNatal,
				version: CANON_VERSION,
				origin:
					'Cânone original local: funções humanistas, natalStyles e mecanismos de aspectos. Referências e limites de consulta em SOURCES_2026-10-08.md; não houve pesquisa no runtime.'
			}
		],
		limits: [
			'O mapa não comprova preferências, capacidade profissional, hábitos ou reação emocional; o relato e o teste real têm prioridade.',
			...plan.blocks
		]
	};
}

function financialCards(calculation: LaunchFactCalculation): MethodCard[] {
	const d = calculation.data,
		cards = d.cards as MethodCard[];
	if (
		!same(d.method, launchFinancialTarotMethod) ||
		d.deckVersion !== tarotMethodContract.deckVersion ||
		d.drawAlgorithm !== tarotMethodContract.drawAlgorithm ||
		d.executionId !== calculation.executionId ||
		d.replacement !== false ||
		d.reversals !== false ||
		!Array.isArray(cards) ||
		cards.length !== 3 ||
		new Set(cards.map((c) => c.cardId)).size !== 3 ||
		cards.some(
			(card, index) =>
				card.position !== index + 1 ||
				card.positionId !== launchFinancialTarotMethod.positions[index]!.id ||
				card.positionName !== launchFinancialTarotMethod.positions[index]!.name ||
				card.orientation !== 'upright' ||
				!tarotDeck.some((entry) => entry.id === card.cardId && entry.name === card.name) ||
				!tarotCanon[card.cardId] ||
				!calculation.facts.some(
					(fact) =>
						fact.id === `card-${index + 1}` &&
						fact.display === `${card.positionName}: ${card.name} (posição direta)`
				)
		)
	)
		throw new Error('launch_financial_cards_invalid');
	return cards;
}
function financialContext(input: LaunchInput) {
	const text = a(input, 'impasse');
	// Explicitly contextual; no inference of actual income, debt size, diagnosis or investment advice.
	return /cobr|preço|preco|orçamento|orcamento/iu.test(text)
		? {
				id: 'scope-before-price',
				criterion:
					'o pedido descreve escopo, prazo e responsabilidade antes de qualquer negociação de valor',
				step: 'escrever uma frase de escopo e uma pergunta sobre o que a outra pessoa espera receber'
			}
		: /começ|comec|adi|trav|public|mostr/iu.test(text)
			? {
					id: 'small-exposure',
					criterion:
						'uma primeira versão pequena foi mostrada a uma pessoa, com pedido de retorno concreto',
					step: 'definir a menor primeira versão que caiba no recurso disponível e mostrá-la a uma pessoa'
				}
			: {
					id: 'clarify-constraint',
					criterion:
						'o próximo passo distingue uma restrição material de uma hipótese sobre a sua atitude',
					step: 'anotar o que falta concretamente, o que já está disponível e uma dúvida que pode ser conferida'
				};
}
function composeFinancial(input: LaunchInput, calculation: LaunchFactCalculation): Draft {
	const cards = financialCards(calculation),
		context = financialContext(input),
		meanings = cards.map((card) => tarotCanon[card.cardId]!);
	const texts = [
		`Na posição Impasse, ${cards[0]!.name} oferece o espelho simbólico ${meanings[0]!.core}. No trabalho, ${meanings[0]!.work}. Compare com o impasse ${q(a(input, 'impasse'))}; a carta não acrescenta uma condição financeira ao relato.`,
		`Na posição Possível bloqueio, ${cards[1]!.name} propõe a hipótese ${meanings[1]!.excess}. Ela precisa ser confrontada com a tentativa ${q(a(input, 'attemptedAction'))}. A alternativa é haver uma restrição concreta de tempo, recurso, demanda ou acordo; a carta não demonstra que o obstáculo é interno.`,
		`Na posição Primeiro passo, ${cards[2]!.name} oferece ${meanings[2]!.resource}. A pergunta da carta é ${meanings[2]!.action}. O passo que você declarou disponível foi ${q(a(input, 'availableStep'))}; verifique se ele permite ${context.step}, sem assumir custo novo.`
	];
	const positionalTest = [
		'No espelho do impasse, confira se a imagem ajuda a nomear o problema sem criar uma causa.',
		'Na hipótese de bloqueio, procure um dado que a contrarie antes de tratá-la como explicação.',
		'No primeiro passo, avalie se a ação cabe no recurso e no tempo que você declarou.'
	];
	const sections = cards.map((card, index) =>
		sec(
			`financial-position-${index + 1}`,
			`${card.positionName}: ${card.name}`,
			[
				texts[index]!,
				`${positionalTest[index]} Critério observável para este contexto: ${context.criterion}. Registre o que aconteceu depois da ação e o que continua sem informação; o resultado pode contrariar a hipótese da carta.`
			],
			[`card-${index + 1}`, `reported-${['impasse', 'attemptedAction', 'availableStep'][index]}-1`],
			[TAROT_CANON_VERSION, sourcePolicy]
		)
	);
	const claims = cards.map((card, index) =>
		claim(
			`claim-financial-${index + 1}`,
			`financial-position-${index + 1}`,
			['concrete-impasse-mirror', 'falsifiable-block-hypothesis', 'available-observable-step'][
				index
			]!,
			[`card-${index + 1}`],
			{
				cardId: card.cardId,
				positionId: card.positionId,
				sourceLine: meanings[index]!.sourceLine,
				contextClass: context.id
			},
			texts[index]!
		)
	);
	const synthesis = `O recurso da primeira carta, ${meanings[0]!.resource}, contrasta com o risco da segunda, ${meanings[1]!.excess}. A terceira oferece ${meanings[2]!.resource} para testar uma ação, e não explicar toda a sua situação financeira. Para o impasse ${q(a(input, 'impasse'))}, o critério é observar se ${context.criterion}, sem concluir que uma carta revelou a causa.`;
	sections.push(
		sec(
			'financial-joint-reading',
			'Hipótese, restrição e teste',
			[
				synthesis,
				`A tentativa já relatada foi ${q(a(input, 'attemptedAction'))}. Se o teste mostrar falta de tempo, recurso, informação ou demanda, trate essa restrição como dado e revise o plano; não converta uma limitação material em culpa pessoal.`
			],
			['card-1', 'card-2', 'card-3', 'reported-impasse-1', 'reported-attemptedAction-1'],
			[TAROT_CANON_VERSION, sourcePolicy]
		)
	);
	claims.push(
		claim(
			'claim-financial-joint',
			'financial-joint-reading',
			'resource-risk-observable-test',
			['card-1', 'card-2', 'card-3'],
			{ cards: cards.map((card) => card.cardId), contextClass: context.id },
			synthesis
		)
	);
	return {
		summary: `Para ${q(a(input, 'impasse'))}, a leitura propõe uma hipótese testável, com alternativa material. O próximo passo é ${context.step}.`,
		sections,
		claims,
		practicalAction: `Use o passo disponível ${q(a(input, 'availableStep'))} para ${context.step}. Compare com a tentativa ${q(a(input, 'attemptedAction'))}; registre uma resposta observável, sem comprar recurso novo ou prever receita.`,
		reflection:
			'Que informação concreta faria você abandonar a hipótese de bloqueio e mudar o próximo passo?',
		sources: [
			{
				id: TAROT_CANON_VERSION,
				version: TAROT_CANON_VERSION,
				origin: `Verbetes locais das três cartas, compilados do Livro 19, capítulos 3–7; SHA256 ${TAROT_CANON_SOURCE_SHA256}.`
			}
		],
		limits: [
			'Não identifica causa comprovada de bloqueio, não recomenda investimento e não prevê renda ou retorno.'
		]
	};
}

type Contact = {
	transit: Body;
	natal: Body;
	kind: string;
	orbDegrees: number;
	separationDegrees?: number;
	exactAngleDegrees?: number;
};
type DailyData = {
	method: string;
	policy: typeof launchConversationAspectPolicy;
	natal: NatalChart;
	period: {
		startDate: string;
		endDateExclusive: string;
		sampleCount: number;
		stepHours: number;
		timezone: string;
	};
	observations: {
		id: string;
		instant: string;
		positions: { body: Body; longitude: number }[];
		contacts: Contact[];
	}[];
};
function conversationData(calculation: LaunchFactCalculation): DailyData {
	const d = calculation.data as unknown as DailyData;
	if (
		d.method !== 'atv-launch-conversation-seven-day-transit-observations/1.0.0' ||
		!same(d.policy, launchConversationAspectPolicy) ||
		d.period.sampleCount !== 28 ||
		d.period.stepHours !== 6 ||
		d.period.timezone !== 'UTC' ||
		d.observations.length !== 28 ||
		d.natal.positions.length !== 10
	)
		throw new Error('launch_conversation_period_invalid');
	const start = Date.parse(`${d.period.startDate}T00:00:00Z`);
	if (new Date(start + 7 * 86400000).toISOString().slice(0, 10) !== d.period.endDateExclusive)
		throw new Error('launch_conversation_period_invalid');
	d.observations.forEach((observation, index) => {
		if (
			observation.id !== `transit-sample-${index + 1}` ||
			Date.parse(observation.instant) !== start + index * 21600000 ||
			observation.positions.length !== 10 ||
			new Set(observation.positions.map((p) => p.body)).size !== 10 ||
			observation.positions.some((p) => !normal(p.longitude)) ||
			!calculation.facts.some((f) => f.id === observation.id)
		)
			throw new Error('launch_conversation_observation_invalid');
		const expected = calculateCrossAspects(
			observation.positions,
			d.natal.positions,
			d.policy
		).aspects.map(({ first, second, ...rest }) => ({ transit: first, natal: second, ...rest }));
		if (!same(expected, observation.contacts))
			throw new Error('launch_conversation_geometry_invalid');
	});
	return d;
}
function dailyContact(d: DailyData, day: number) {
	const candidates = d.observations.slice(day * 4, day * 4 + 4).flatMap((row) =>
		row.contacts
			.filter((c) => ['mercury', 'moon', 'venus', 'mars', 'saturn'].includes(c.natal))
			.flatMap((contact) => {
				try {
					return [
						{
							...contact,
							sampleId: row.id,
							instant: row.instant,
							meaning: temporalPairMeaning({
								id: row.id,
								transit: contact.transit,
								natal: contact.natal,
								aspect: contact.kind,
								orb: contact.orbDegrees
							})
						}
					];
				} catch {
					return [];
				}
			})
	);
	return candidates.sort(
		(x, y) =>
			['mercury', 'moon', 'venus', 'mars', 'saturn'].indexOf(x.natal) -
				['mercury', 'moon', 'venus', 'mars', 'saturn'].indexOf(y.natal) ||
			x.orbDegrees - y.orbDegrees ||
			x.instant.localeCompare(y.instant)
	)[0];
}
function composeConversation(input: LaunchInput, calculation: LaunchFactCalculation): Draft {
	const d = conversationData(calculation),
		sections: LaunchReadingSection[] = [],
		claims: LaunchReadingClaim[] = [];
	const subject = a(input, 'subject'),
		objective = a(input, 'objective'),
		constraints = a(input, 'constraints');
	const dailyTasks = [
		'Escreva a pergunta principal em uma frase, separando o pedido da explicação longa.',
		'Pergunte que informação a outra pessoa precisa antes de responder, sem presumir o que ela já sabe.',
		'Diferencie o que você quer negociar do limite que precisa comunicar; recusa e contraproposta são respostas possíveis.',
		'Confira se as palavras usadas por vocês significam a mesma tarefa; peça um exemplo concreto.',
		'Descreva o que consegue assumir e pergunte o que a outra pessoa aceita, sem atribuir responsabilidade por silêncio.',
		'Resuma o que foi efetivamente combinado e o que continua sem resposta, se a conversa tiver ocorrido.',
		'Revise se ainda é necessário falar do mesmo assunto; se não houve conversa, confirme disponibilidade antes de repetir o pedido.'
	];
	for (let day = 0; day < 7; day++) {
		const rows = d.observations.slice(day * 4, day * 4 + 4),
			date = rows[0]!.instant.slice(0, 10),
			displayDate = formatLaunchDate(date),
			c = dailyContact(d, day),
			id = `conversation-day-${day + 1}`;
		const relation = c
			? `${bodyNames[c.transit]} em trânsito em ${aspectPt[c.kind]} com ${bodyNames[c.natal]} natal, observado em ${formatLaunchUtcInstant(c.instant)} (orbe ${c.orbDegrees.toFixed(3)}°): ${c.meaning}`
			: 'Nenhum contato suportado pelo vocabulário do método foi selecionado neste dia; a ausência não significa um dia ruim ou sem possibilidade de diálogo.';
		const text = `${displayDate}: quatro amostras em 00h, 06h, 12h e 18h UTC. ${relation} A escolha do contato é um recorte de função comunicativa e proximidade geométrica; não é uma nota de qualidade do dia.`;
		sections.push(
			sec(
				id,
				`${displayDate}: falar ou esperar depende das condições`,
				[
					text,
					`${dailyTasks[day]} Para tratar de ${q(subject)} visando ${q(objective)}, falar é uma possibilidade somente se houver disponibilidade expressa, escuta e um pedido claro. Esperar é uma possibilidade se faltar uma dessas condições. Respeite ${q(constraints)}; estas amostras não calculam disponibilidade nem horário favorável.`
				],
				rows
					.map((row) => row.id)
					.concat(['reported-subject-1', 'reported-objective-1', 'reported-constraints-1']),
				[sourceTemporal, sourcePolicy]
			)
		);
		if (c)
			claims.push(
				claim(
					`claim-${id}`,
					id,
					'daily-conditional-observed-contact',
					[c.sampleId],
					{
						date,
						transit: c.transit,
						natal: c.natal,
						aspect: c.kind,
						instant: c.instant,
						orbDegrees: c.orbDegrees
					},
					text
				)
			);
	}
	const synthesis = `O assunto é ${q(subject)} e o objetivo declarado é ${q(objective)}. Mercúrio orienta a hipótese de clareza da mensagem; Lua, a de segurança para ouvir; Saturno, a de um limite que possa ser sustentado. A comparação dos sete dias oferece perguntas diferentes, sem eleger uma data por contagem de aspectos. A condição prática é ${q(constraints)}; nenhuma posição substitui disponibilidade confirmada.`;
	sections.push(
		sec(
			'conversation-decision',
			'Uma decisão condicional para a conversa',
			[
				synthesis,
				'Antes de propor um momento, escreva uma frase com o assunto e um pedido observável; pergunte se a outra pessoa pode conversar. Se não puder, combine como consultar outra disponibilidade. Se o pedido ainda estiver confuso ou houver pressão, espere e revise a frase. Isso organiza a decisão de falar ou esperar, sem prever a reação da outra pessoa.'
			],
			[
				'reported-subject-1',
				'reported-objective-1',
				'reported-constraints-1',
				...d.observations.map((row) => row.id)
			],
			[sourceTemporal, sourcePolicy]
		)
	);
	claims.push(
		claim(
			'claim-conversation-decision',
			'conversation-decision',
			'contextual-talk-wait-conditions',
			['reported-subject-1', 'reported-objective-1', 'reported-constraints-1'],
			{ subject, objective, constraints },
			synthesis
		)
	);
	return {
		summary: `Sete dias para organizar uma conversa sobre ${q(subject)}, visando ${q(objective)}. A decisão entre falar e esperar depende de disponibilidade, clareza e ${q(constraints)}, sem promessa de horário mágico.`,
		sections,
		claims,
		practicalAction: `Escreva uma frase sobre ${q(subject)} com um pedido que ajude ${q(objective)}. Consulte a disponibilidade da outra pessoa e preserve ${q(constraints)}; se faltar confirmação, espere e combine como retomar a consulta.`,
		reflection:
			'Qual resposta observável você espera obter, e qual condição concreta faria você esperar antes de iniciar a conversa?',
		sources: [
			{
				id: sourceTemporal,
				version: CANON_VERSION,
				origin:
					'Pares natal/trânsito suportados pelo cânone temporal local original, consultados por função e aspecto; pesquisa não ocorre no runtime.'
			}
		],
		limits: [
			'Comparação diária de sete dias, sem eleger o melhor horário, atribuir probabilidade ou garantir resposta; disponibilidade não é calculada pela astrologia.'
		]
	};
}

export function additionalSourceVersions(id: string): [string, string][] {
	return id === 'financial-blocks-tarot'
		? [[TAROT_CANON_VERSION, TAROT_CANON_VERSION]]
		: id === 'conversation-timing'
			? [[sourceTemporal, CANON_VERSION]]
			: additionalLaunchProductIds.includes(id as AdditionalId)
				? [[sourceNatal, CANON_VERSION]]
				: [];
}
export function composeAdditionalLaunchReading(
	input: LaunchInput,
	calculation: LaunchFactCalculation
): Draft {
	return input.productId === 'financial-blocks-tarot'
		? composeFinancial(input, calculation)
		: input.productId === 'conversation-timing'
			? composeConversation(input, calculation)
			: composeNatal(input, calculation);
}
export function additionalLaunchSurface(
	input: LaunchInput,
	calculation: LaunchFactCalculation
): Record<string, number> {
	const draft = composeAdditionalLaunchReading(input, calculation);
	return Object.fromEntries(draft.sections.map((part) => [part.id, part.paragraphs.length]));
}

/** Verifies factual mechanisms and product-specific relevance; closed-corpus integrity is checked by the caller separately. */
export function evaluateAdditionalLaunchReading(
	input: LaunchInput,
	calculation: LaunchFactCalculation,
	reading: LaunchReading
): Check[] {
	const checks: Check[] = [],
		check = (id: string, passed: boolean, detail: string) => checks.push({ id, passed, detail });
	if (input.productId === 'financial-blocks-tarot') {
		try {
			const cards = financialCards(calculation),
				context = financialContext(input),
				meanings = cards.map((card) => tarotCanon[card.cardId]!);
			check(
				'financial-positional-meaning',
				cards.every((card, index) => {
					const c = reading.claims.find((c) => c.id === `claim-financial-${index + 1}`);
					const clauses =
						index === 0
							? [meanings[0]!.core, meanings[0]!.work, a(input, 'impasse')]
							: index === 1
								? [
										meanings[1]!.excess,
										a(input, 'attemptedAction'),
										'restrição concreta',
										'não demonstra'
									]
								: [
										meanings[2]!.resource,
										meanings[2]!.action,
										a(input, 'availableStep'),
										context.step
									];
					return (
						!!c &&
						c.rule ===
							[
								'concrete-impasse-mirror',
								'falsifiable-block-hypothesis',
								'available-observable-step'
							][index] &&
						c.factors.cardId === card.cardId &&
						c.factors.positionId === card.positionId &&
						c.factors.sourceLine === meanings[index]!.sourceLine &&
						c.factors.contextClass === context.id &&
						has(c.interpretation, clauses)
					);
				}),
				'Cada carta cumpre sua posição: relato, hipótese falsificável com alternativa material e passo disponível.'
			);
			const c = reading.claims.find((c) => c.id === 'claim-financial-joint');
			check(
				'financial-joint-counterhypothesis',
				!!c &&
					same(
						c.factors.cards,
						cards.map((card) => card.cardId)
					) &&
					has(c.interpretation, [
						meanings[0]!.resource,
						meanings[1]!.excess,
						meanings[2]!.resource,
						context.criterion,
						a(input, 'impasse')
					]) &&
					has(reading.practicalAction, [
						a(input, 'availableStep'),
						a(input, 'attemptedAction'),
						context.step
					]),
				'Síntese depende de três cartas diferentes e muda o teste conforme o impasse e a ação possível.'
			);
		} catch {
			check('financial-positional-meaning', false, 'Método, sorteio ou posição sem fatos válidos.');
		}
		return checks;
	}
	if (input.productId === 'conversation-timing') {
		try {
			const d = conversationData(calculation);
			check(
				'seven-day-geometry',
				true,
				'28 observações reais verificadas geometricamente contra o natal.'
			);
			check(
				'daily-conversation-meaning',
				Array.from({ length: 7 }, (_, day) => {
					const part = reading.sections.find((s) => s.id === `conversation-day-${day + 1}`),
						c = dailyContact(d, day),
						date = d.observations[day * 4]!.instant.slice(0, 10);
					const dependent = c
						? reading.claims.some(
								(claim) =>
									claim.id === `claim-conversation-day-${day + 1}` &&
									claim.factors.transit === c.transit &&
									claim.factors.natal === c.natal &&
									claim.factors.aspect === c.kind &&
									claim.factors.instant === c.instant &&
									claim.factors.date === date &&
									claim.factors.orbDegrees === c.orbDegrees &&
									has(claim.interpretation, [
										c.meaning,
										formatLaunchUtcInstant(c.instant),
										c.orbDegrees.toFixed(3),
										'não é uma nota de qualidade'
									])
							)
						: !!part?.paragraphs[0]?.includes('Nenhum contato suportado');
					return (
						!!part &&
						part.title === `${formatLaunchDate(date)}: falar ou esperar depende das condições` &&
						part.evidenceIds.filter((id) => id.startsWith('transit-sample-')).length === 4 &&
						has(part.paragraphs.join(' '), [
							formatLaunchDate(date),
							a(input, 'subject'),
							a(input, 'objective'),
							a(input, 'constraints'),
							'disponibilidade expressa',
							'Esperar é uma possibilidade',
							'não calculam disponibilidade'
						]) &&
						dependent
					);
				}).every(Boolean),
				'Todos os dias comparam falar e esperar por condições reais; cada hipótese depende do par/aspecto observado, sem janela inventada.'
			);
			const integration = reading.claims.find((c) => c.id === 'claim-conversation-decision');
			check(
				'conversation-context-decision',
				!!integration &&
					has(integration.interpretation, [
						a(input, 'subject'),
						a(input, 'objective'),
						a(input, 'constraints'),
						'clareza',
						'segurança',
						'limite',
						'sem eleger uma data'
					]) &&
					has(reading.practicalAction, [
						a(input, 'subject'),
						a(input, 'objective'),
						a(input, 'constraints'),
						'se faltar confirmação, espere'
					]),
				'Assunto, objetivo e restrição alteram o pedido e a condição concreta de adiar.'
			);
		} catch {
			check('seven-day-geometry', false, 'Período, amostras ou contatos sem geometria válida.');
		}
		return checks;
	}
	try {
		const data = natalData(input, calculation),
			plan = natalPlan(input, data);
		check(
			'selected-natal-geometry',
			true,
			'Escopo, coordenadas, signos, ângulos e contatos conferidos sem inventar fatores.'
		);
		check(
			'function-specific-semantics',
			data.factors.positions.every((p) => {
				const c = reading.claims.find((c) => c.id === `claim-function-${p.body}`),
					part = reading.sections.find((s) => s.id === `function-${p.body}`),
					s = style(p.longitude);
				return (
					!!c &&
					!!part &&
					c.rule === 'natal-function-in-context' &&
					c.factors.body === p.body &&
					c.factors.longitude === p.longitude &&
					c.factors.styleKey === styleKey[p.body] &&
					has(c.interpretation, [
						bodyNames[p.body]!,
						signs[Math.floor(p.longitude / 30)]!,
						p.longitude.toFixed(6),
						functions[p.body]!,
						s[styleKey[p.body]!],
						s.excess,
						s.adjustment
					]) &&
					part.paragraphs.some((p) =>
						has(p, [bodyObservation[c.factors.body as string]!, plan.application])
					)
				);
			}),
			'Cada planeta usa a função e o mecanismo próprios, com contexto; trocar nomes ou preservar IDs não mantém a aprovação.'
		);
		check(
			'angle-specific-semantics',
			data.factors.angles.every((p) => {
				const c = reading.claims.find((c) => c.id === `claim-angle-${p.angle}`);
				return (
					!!c &&
					c.factors.angle === p.angle &&
					c.factors.longitude === p.longitude &&
					has(c.interpretation, [
						signs[Math.floor(p.longitude / 30)]!,
						p.longitude.toFixed(6),
						p.angle === 'ascendant' ? style(p.longitude).entry : style(p.longitude).aim
					])
				);
			}),
			'Ângulo real altera a hipótese de entrada/direção, sem deduzir corpo ou profissão.'
		);
		const aspect = data.aspects.aspects.find(
			(aspect) =>
				input.productId !== 'emotional-reactions-map' ||
				aspect.first === 'moon' ||
				aspect.second === 'moon'
		);
		check(
			'actual-aspect-semantic-relation',
			!aspect ||
				reading.claims.some(
					(c) =>
						c.id === 'claim-calculated-relation' &&
						c.factors.first === aspect.first &&
						c.factors.second === aspect.second &&
						c.factors.aspect === aspect.kind &&
						c.factors.orbDegrees === aspect.orbDegrees &&
						has(c.interpretation, [
							functions[aspect.first]!,
							functions[aspect.second]!,
							aspectMechanism[aspect.kind]!,
							aspect.orbDegrees.toFixed(3)
						])
				),
			'A relação usa duas funções e o mecanismo do aspecto calculado, sem transformar aspecto em causa.'
		);
		const integration = reading.claims.find((c) => c.id === 'claim-thematic-integration');
		check(
			'specific-thematic-integration',
			!!integration &&
				same(integration.factors.bodies, [...data.scope.bodies]) &&
				same(integration.factors.angles, [...data.scope.angles]) &&
				integration.factors.context === plan.context &&
				has(integration.interpretation, [plan.integration, plan.priority]) &&
				reading.practicalAction === plan.action &&
				reading.summary.includes(plan.priority),
			'A síntese tem contrato próprio e liga funções distintas aos relatos, à decisão e ao experimento.'
		);
		check(
			'complete-thematic-evidence',
			plan.blocks.length === 0,
			plan.blocks.length
				? plan.blocks.join(' ')
				: 'Os relatos e fatores disponíveis permitem todas as partes do método temático.'
		);
		check(
			'contextual-contract-delivery',
			plan.extra.every((extra) =>
				reading.sections.some(
					(s) =>
						s.id === extra.id &&
						extra.refs.every((id) => s.evidenceIds.includes(id)) &&
						extra.paragraphs.every((text) => s.paragraphs.includes(text))
				)
			),
			'Situações, acordo, observação, oferta ou três combinações usam somente o contexto declarado.'
		);
	} catch {
		check(
			'selected-natal-geometry',
			false,
			'Escopo, fatores ou relações sem origem geométrica válida.'
		);
	}
	return checks;
}
