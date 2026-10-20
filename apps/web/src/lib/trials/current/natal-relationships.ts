import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { bodyNames, signs } from '../reconstruction/canon';
import { aspectNames } from '../reconstruction/date-facts';
import { normalizeFactGraph, type Position } from '../reconstruction/fact-graph';
import { natalStyles } from '../reconstruction/natal-canon';
import type { HouseOverlay } from '../reconstruction/synastry-facts';
import { houseScenes, signBridge, type CurrentPassage } from './natal-language';

const unlinkedPairs: Record<string, string> = {
	'moon/moon':
		'As necessidades de acolhimento podem ser comparadas sem afirmar uma ligação especialmente forte ou um conflito. A diferença entre elas esclarece por que oferecer aquilo que conforta você nem sempre responde ao pedido da outra pessoa.',
	'mercury/mercury':
		'Cada pessoa pode chegar à compreensão por um caminho próprio. Uma conversa fica mais clara quando permite reconhecer como a outra constrói uma ideia, em vez de tratar uma conclusão diferente como falta de atenção.',
	'mercury/moon':
		'A compreensão de uma explicação e a sensação de acolhimento são respostas diferentes. Uma pessoa pode organizar bem o assunto e ainda deixar sem resposta o sentimento que levou a outra a falar.',
	'moon/saturn':
		'O cuidado e o compromisso precisam de formas reconhecíveis para ambos. Cumprir um acordo pode oferecer segurança, mas não substitui toda demonstração de acolhimento; uma necessidade emocional também não define sozinha o que a outra pessoa pode assumir.',
	'moon/venus':
		'Carinho e acolhimento não são pedidos idênticos. Uma pessoa pode querer compartilhar uma experiência agradável enquanto a outra precisa de presença diante de um sentimento difícil; perceber essa diferença permite que ambos os movimentos tenham lugar.',
	'mars/venus':
		'A forma de tomar iniciativa precisa encontrar a maneira pela qual a outra pessoa deseja se aproximar. O convite se torna mais compreensível quando deixa espaço para resposta, sem tomar interesse, desejo ou disponibilidade como fatos conhecidos.',
	'saturn/venus':
		'O afeto procura uma razão para continuar desejando a companhia; o compromisso procura uma forma que possa ser sustentada. Um acordo consistente precisa acomodar ambas as perguntas: o que mantém a proximidade significativa e o que cada pessoa pode assumir. Permanecer por obrigação não responde à primeira, e depender apenas da espontaneidade deixa a segunda sem apoio.',
	'mars/saturn':
		'A vontade de agir e a medida de um compromisso precisam encontrar um ritmo possível. Começar não torna alguém responsável por sustentar tudo, assim como pedir cautela não deveria reservar à outra pessoa todo o poder de decidir.',
	'mars/mercury':
		'Explicar e decidir têm tempos diferentes. Uma conversa pode precisar de perguntas antes de virar ação; uma decisão também precisa reconhecer quando continuar discutindo já não acrescenta compreensão.',
	'mercury/saturn':
		'Uma ideia pode precisar de elaboração antes de receber uma avaliação de viabilidade. A responsabilidade dá qualidade à conversa quando ajuda a definir meios, sem exigir que toda proposta nasça pronta.',
	'venus/venus':
		'As formas de cultivar companhia precisam ser reconhecidas pelo valor que têm para cada pessoa. Compartilhar afeto não exige preferências iguais, mas torna relevante que ambos possam oferecer e pedir algo significativo.',
	'mars/mars':
		'As duas pessoas precisam de espaço para iniciativa. Cooperar não exige agir no mesmo instante ou do mesmo modo; exige que a vontade de uma não determine permanentemente a margem de ação da outra.',
	'jupiter/saturn':
		'Ampliar um projeto e sustentar seu custo são trabalhos que precisam circular entre ambos. A diferença pode ser produtiva quando ninguém fica encarregado de representar sempre a esperança ou sempre a restrição.'
};

type Contact = { first: string; second: string; kind: string; orbDegrees: number };
export type RelationshipTheme = 'care' | 'dialogue' | 'desire' | 'commitment' | 'direction';
const themes: Record<
	RelationshipTheme,
	{ title: string; pairs: [string, string][]; opening: string }
> = {
	care: {
		title: 'O cuidado precisa chegar numa linguagem reconhecível',
		pairs: [
			['moon', 'moon'],
			['moon', 'venus'],
			['venus', 'moon'],
			['moon', 'saturn'],
			['saturn', 'moon']
		],
		opening:
			'Acolhimento não depende apenas da intenção de cuidar: o gesto precisa encontrar uma necessidade que a outra pessoa reconheça.'
	},
	dialogue: {
		title: 'Entender a frase e compreender o efeito da conversa',
		pairs: [
			['mercury', 'mercury'],
			['mercury', 'moon'],
			['moon', 'mercury'],
			['mercury', 'mars'],
			['mars', 'mercury'],
			['mercury', 'saturn'],
			['saturn', 'mercury']
		],
		opening:
			'Duas pessoas podem conversar sobre o mesmo assunto e estar tentando resolver problemas diferentes: compreender, ser acolhidas, tomar uma decisão ou delimitar um compromisso.'
	},
	desire: {
		title: 'A aproximação precisa deixar espaço para resposta',
		pairs: [
			['venus', 'mars'],
			['mars', 'venus'],
			['venus', 'venus'],
			['mars', 'mars']
		],
		opening:
			'A leitura da aproximação distingue aquilo que desperta interesse da forma como cada pessoa toma iniciativa. Ela não comprova atração ou disponibilidade.'
	},
	commitment: {
		title: 'Dar continuidade sem transformar o vínculo em obrigação',
		pairs: [
			['venus', 'saturn'],
			['saturn', 'venus'],
			['mars', 'saturn'],
			['saturn', 'mars'],
			['moon', 'saturn'],
			['saturn', 'moon']
		],
		opening:
			'Um compromisso ajuda quando torna a relação mais confiável. Ele pesa quando substitui a participação voluntária ou exige de uma pessoa algo que só a outra consegue definir.'
	},
	direction: {
		title: 'Ter um projeto em comum sem precisar querer tudo igual',
		pairs: [
			['sun', 'sun'],
			['sun', 'jupiter'],
			['jupiter', 'sun'],
			['jupiter', 'saturn'],
			['saturn', 'jupiter']
		],
		opening:
			'Um projeto compartilhado precisa abrigar duas formas de encontrar sentido. A concordância sobre um objetivo não garante que o custo ou o ritmo sejam iguais para ambos.'
	}
};
const roles: Record<string, { label: string; style: keyof (typeof natalStyles)[number] }> = {
	sun: { label: 'a direção que torna uma escolha significativa', style: 'aim' },
	moon: { label: 'a necessidade de acolhimento', style: 'need' },
	mercury: { label: 'a forma de compreender e conversar', style: 'thought' },
	venus: { label: 'a forma de demonstrar apreço', style: 'affection' },
	mars: { label: 'a maneira de agir e defender uma vontade', style: 'action' },
	jupiter: { label: 'a busca de possibilidades', style: 'aim' },
	saturn: { label: 'a forma de assumir um compromisso', style: 'thought' }
};
const sortedPair = (a: string, b: string) => [a, b].sort().join('/');
const hard = (kind?: string) => kind === 'square' || kind === 'opposition';

/** The meaning depends on both planetary functions, not merely the aspect category. */
export function relationshipMechanism(a: string, b: string, kind: string | undefined): string {
	const pair = sortedPair(a, b),
		difficult = hard(kind),
		joined = kind === 'conjunction';
	if (!kind)
		return (
			unlinkedPairs[pair] ??
			'Duas formas de encontrar sentido podem caber num projeto sem se tornarem idênticas. A direção compartilhada ganha consistência quando oferece lugar ao desenvolvimento de cada pessoa e deixa claro o que ambas escolhem sustentar juntas.'
		);
	if (pair === 'moon/moon')
		return difficult
			? 'O que recompõe uma pessoa pode não recompor a outra. Quando cada uma oferece o cuidado que gostaria de receber, pode haver dedicação dos dois lados e ainda assim sensação de desencontro. A diferença pede distinguir presença, espaço e resposta, em vez de medir afeto pela semelhança das reações.'
			: joined
				? 'As necessidades de acolhimento encontram uma referência próxima. Isso pode facilitar reconhecimento emocional, mas também fazer ambos reagirem ao mesmo ponto sensível ao mesmo tempo. A semelhança ajuda a compreender; não garante que um tenha disponibilidade para amparar o outro em toda ocasião.'
				: 'As necessidades emocionais podem encontrar passagem entre si. Há uma possibilidade de reconhecer o que conforta a outra pessoa sem exigir uma resposta idêntica. A facilidade não elimina a necessidade de tornar explícito o cuidado desejado quando a situação muda.';
	if (pair === 'mercury/mercury')
		return difficult
			? 'Uma explicação clara para uma pessoa pode parecer incompleta ou deslocada para a outra. A conversa tende a perder precisão quando cada uma responde à conclusão antes de compreender o caminho usado para chegar a ela. A divergência pode ampliar a compreensão se houver espaço para um exemplo concreto e para a diferença entre discordar e não ter entendido.'
			: joined
				? 'As formas de organizar uma conversa se aproximam, o que pode dar rapidez à troca. Essa familiaridade também permite que duas pessoas suponham ter entendido quando apenas reconhecem palavras parecidas. O encontro ganha profundidade quando a facilidade inclui espaço para uma discordância real.'
				: 'As formas de elaborar uma ideia podem se complementar. Uma pessoa encontra na outra uma passagem para explicar ou reconsiderar uma questão. O risco da fluidez é deixar suposições sem esclarecimento porque a conversa parece já estar funcionando.';
	if (pair === 'mercury/moon')
		return difficult
			? 'Explicar uma situação pode ser a forma de uma pessoa participar, enquanto a outra precisa primeiro sentir que o efeito emocional foi acolhido. Uma análise pode então ser recebida como distanciamento, e uma reação emocional como falta de clareza. O desencontro nasce da ordem da conversa: compreender o sentimento e resolver o problema não precisam acontecer no mesmo instante.'
			: 'A conversa pode ajudar a dar palavras a uma experiência emocional. Quem organiza a explicação e quem traz a necessidade de acolhimento oferecem contribuições diferentes; a troca fica mais rica quando nomear o sentimento não significa decidir pela pessoa que o sente.';
	if (pair === 'moon/saturn')
		return difficult
			? 'Uma pessoa pode procurar acolhimento justamente onde a outra oferece responsabilidade, orientação ou contenção. O gesto pode ter intenção de ajudar e ser recebido como cobrança. O limite ganha qualidade quando vem acompanhado de reconhecimento do sentimento, sem exigir que compromisso substitua toda forma de cuidado.'
			: 'A constância de uma pessoa pode oferecer apoio à necessidade emocional da outra. Isso favorece confiabilidade quando a responsabilidade é proporcional; perde reciprocidade quando alguém fica encarregado de organizar permanentemente o sentimento de ambos.';
	if (pair === 'moon/venus')
		return difficult
			? 'A forma de demonstrar carinho pode tocar um ponto diferente daquele em que a outra pessoa precisa de acolhimento. Um encontro agradável não resolve necessariamente uma necessidade de cuidado, e cuidar não precisa ser a única forma de estar junto. O vínculo ganha clareza quando esses pedidos deixam de ficar escondidos dentro do mesmo gesto.'
			: 'O apreço de uma pessoa pode encontrar a necessidade de acolhimento da outra. Gestos de afeto ganham valor quando chegam de uma forma reconhecível, embora essa aproximação não torne ninguém responsável por preencher todas as necessidades do vínculo.';
	if (pair === 'mars/venus')
		return difficult
			? 'A iniciativa de uma pessoa pode avançar num ritmo diferente da aproximação desejada pela outra. Uma quer tornar o interesse mais concreto; a outra pode precisar de outra forma de convite. A tensão pode dar vivacidade à troca, mas nunca autoriza insistência: o interesse precisa conservar espaço para recusa, pausa e mudança de vontade.'
			: 'A iniciativa de uma pessoa pode dar forma ao interesse da outra. Essa combinação sugere uma possível passagem entre aproximação e atitude, sem provar atração. A fluidez é valiosa quando ambos podem responder livremente, inclusive desacelerando.';
	if (pair === 'saturn/venus')
		return difficult
			? 'A busca de afeto encontra um critério de compromisso que pode ser vivido como exigência. Uma pessoa pode oferecer constância quando a outra espera leveza, ou interpretar um gesto espontâneo como insuficiente. A continuidade se torna mais recíproca quando carinho não funciona como pagamento de uma obrigação.'
			: 'O compromisso de uma pessoa pode ajudar a dar continuidade ao afeto da outra. O recurso é a confiabilidade; a nuance é preservar prazer e participação voluntária para que a estabilidade não se reduza a manter um acordo por hábito.';
	if (pair === 'mars/saturn')
		return difficult
			? 'A iniciativa de uma pessoa encontra a medida ou a cautela da outra. Quem quer avançar pode sentir impedimento; quem procura sustentar a decisão pode sentir pressão. A leitura localiza o desacordo no ritmo e no alcance do compromisso, sem transformar uma pessoa em obstáculo e a outra em solução.'
			: 'A iniciativa de uma pessoa pode encontrar estrutura na outra. Essa colaboração funciona quando quem organiza o limite também deixa espaço para a vontade alheia, e quem começa participa da continuidade. Apoio não precisa virar autorização permanente para agir.';
	if (pair === 'mars/mercury')
		return difficult
			? 'A conversa pode ganhar velocidade antes de haver compreensão suficiente. Uma pessoa tenta esclarecer enquanto a outra já procura uma decisão, e a insistência pode ser ouvida como confronto. O conteúdo fica mais acessível quando responder depressa deixa de ser a medida de interesse pela conversa.'
			: 'Uma ideia pode encontrar iniciativa na outra pessoa: conversar abre caminho para agir. A colaboração perde qualidade se a rapidez de chegar a uma solução encerrar cedo demais uma pergunta que ainda precisava ser compreendida.';
	if (pair === 'mercury/saturn')
		return difficult
			? 'Uma explicação pode encontrar um filtro exigente na outra pessoa. A revisão ajuda quando aponta um problema concreto; pode fechar a conversa quando toda ideia precisa nascer pronta para receber consideração. O encontro pede espaço entre ouvir uma proposta e julgar sua viabilidade.'
			: 'Uma pessoa pode ajudar a outra a dar forma e continuidade a uma ideia. O recurso está em tornar a conversa mais precisa, preservando a diferença entre examinar uma proposta e avaliar o valor de quem a apresentou.';
	if (pair === 'venus/venus')
		return difficult
			? 'As duas pessoas podem valorizar formas diferentes de companhia e demonstração de afeto. Um gesto significativo para uma pode parecer pequeno para a outra. Reciprocidade exige reconhecer o valor do gesto recebido e também tornar possível um pedido diferente.'
			: 'As formas de cultivar companhia podem encontrar afinidade. Essa aproximação favorece interesses compartilhados, mas não exige preferências idênticas nem informa a qualidade real da relação.';
	if (pair === 'mars/mars')
		return difficult
			? 'As iniciativas podem disputar espaço quando ambas querem definir o ritmo da ação. A energia conjunta ganha direção se o desacordo sobre como fazer não precisar virar uma disputa sobre quem decide tudo.'
			: 'As maneiras de entrar em ação podem se apoiar e dar movimento a um projeto comum. O entusiasmo compartilhado precisa de espaço para ritmos diferentes quando um dos dois já não tem a mesma disponibilidade.';
	if (pair === 'jupiter/saturn')
		return difficult
			? 'Uma pessoa amplia as possibilidades enquanto a outra procura garantir as condições para sustentá-las. A diferença pode polarizar entusiasmo e cautela. O projeto fica mais justo quando ambos participam tanto do sonho quanto de seu custo, sem reservar esperança para um e responsabilidade para o outro.'
			: 'A visão de possibilidades de uma pessoa pode encontrar medida e continuidade na outra. O projeto ganha consistência quando planejamento e entusiasmo circulam entre ambos, em vez de fixar papéis permanentes.';
	return difficult
		? 'As formas de encontrar sentido podem apontar para ritmos ou prioridades diferentes. Um projeto em comum perde reciprocidade quando crescer para uma pessoa exige que a outra adie indefinidamente sua direção. A diferença pode ampliar o projeto se houver participação dos dois na definição do que ele pede.'
		: 'As formas de encontrar sentido podem oferecer apoio mútuo. A afinidade se torna mais fecunda quando permite que cada pessoa desenvolva uma contribuição própria, sem tomar entusiasmo compartilhado como promessa de concordância permanente.';
}

export function relationshipOverlayMeaning(
	body: string,
	house: number,
	theme: RelationshipTheme
): string {
	const invitations = [
		'apresentar uma vontade própria e escolher como entrar nas situações',
		'reconhecer o que tem valor e o que precisa ser preservado',
		'conversar, aprender e dar nome ao que acontece no cotidiano',
		'construir familiaridade e um lugar na convivência privada',
		'brincar, criar e expressar interesse de uma forma pessoal',
		'dividir tarefas e tornar o cotidiano possível',
		'negociar a reciprocidade e o lugar de cada pessoa no encontro',
		'lidar com confiança, intimidade e responsabilidades compartilhadas',
		'ampliar perspectivas e conversar sobre o sentido das escolhas',
		'dar uma forma pública aos compromissos e à direção de vida',
		'participar de amizades, grupos e projetos em comum',
		'respeitar o recolhimento e sentimentos que ainda não encontraram palavras'
	];
	const movement: Record<string, string> = {
		sun: 'a maneira de A afirmar uma direção pode tornar mais visível para B a importância de',
		moon: 'o modo como A procura acolhimento pode mobilizar em B a necessidade de',
		mercury: 'as perguntas e explicações de A podem abrir para B uma maneira de',
		venus: 'o modo como A demonstra apreço pode dar, para B, um valor afetivo à experiência de',
		mars: 'a iniciativa de A pode incentivar B a agir para',
		jupiter: 'as possibilidades que A apresenta podem ampliar para B o horizonte de',
		saturn: 'os compromissos e limites trazidos por A podem pedir de B maior definição ao'
	};
	const consequence: Record<RelationshipTheme, string> = {
		care:
			house === 4
				? 'Nesse campo, o carinho ganha força em gestos de convivência e familiaridade. A presença pode acolher sem supor que intimidade dá acesso irrestrito ao tempo ou ao sentimento de B.'
				: house === 8
					? 'Nesse campo, cuidar envolve respeitar o tempo de confiar. Demonstrar proximidade não dispensa combinar o que será compartilhado e o que cada pessoa precisa conservar para si.'
					: 'O cuidado pode chegar por esse assunto concreto, mas precisa reconhecer a necessidade de B em vez de usar a intenção de A como medida suficiente do gesto.',
		dialogue:
			house === 5
				? 'A conversa pode ganhar espontaneidade ao deixar lugar para humor, criação e expressão pessoal. Criticar uma ideia nesse espaço pede cuidado para que examinar o conteúdo não pareça desqualificar a vontade de se mostrar.'
				: house === 3
					? 'As trocas pequenas do cotidiano podem ter um peso próprio: perguntar, lembrar e explicar tornam a presença reconhecível. Acumular mensagens não garante que a questão principal tenha encontrado escuta.'
					: 'Conversar sobre esse campo pode aproximar as pessoas quando uma explicação não encerra cedo demais a experiência que B ainda está formulando.',
		desire:
			house === 4
				? 'A familiaridade pode compor a aproximação: sentir lugar na vida privada pode importar tanto quanto a novidade. Isso não transforma conforto em prova de atração, nem convivência em disponibilidade automática.'
				: house === 5
					? 'O prazer de brincar e criar junto pode dar uma forma mais pessoal à aproximação. A possibilidade de desejar continua dependendo de resposta livre, não de corresponder à expectativa criada pelo convite.'
					: 'A aproximação pode ganhar expressão nesse campo quando o convite abre espaço para participação. O interesse de A não informa, por si só, desejo ou consentimento de B.',
		commitment:
			house === 4
				? 'Construir uma base de convivência pede acordos sobre presença e responsabilidade. O acolhimento perde liberdade quando receber cuidado passa a significar dever permanência ou disponibilidade.'
				: house === 6
					? 'Os compromissos aparecem em tarefas repetidas, horários e cuidados práticos. Constância ajuda quando a distribuição pode ser revista, sem transformar uma pessoa em administradora permanente da vida da outra.'
					: 'A continuidade pede acordos claros nesse assunto. A colaboração fica mais justa quando cada pessoa pode nomear o que oferece, o que espera e o que já não consegue sustentar.',
		direction:
			house === 9
				? 'O projeto comum pode crescer pela aprendizagem e pelo encontro de perspectivas. Ter um horizonte compartilhado não exige a mesma crença: a diferença pode ampliar a direção se ambos participarem de sua definição.'
				: house === 10
					? 'Uma direção pública pode aproximar projetos, mas também aumentar expectativas de desempenho. A relação precisa de espaço além do que ambos conseguem realizar ou mostrar juntos.'
					: 'Esse campo pode oferecer um lugar concreto para o projeto compartilhado. A parceria ganha alcance quando permite uma contribuição própria de cada pessoa, em vez de pedir adesão integral ao caminho da outra.'
	};
	return `${bodyNames[body]} de A na casa ${house} de B situa esta parte do encontro ${house === 1 ? 'na maneira de B se apresentar' : `num campo da vida de B: ${houseScenes[house - 1]}`}. Nesse campo, ${movement[body]} ${invitations[house - 1]}. ${consequence[theme]}`;
}

function lunarCare(a: Position, b: Position): string {
	const first = a.sign % 4,
		second = b.sign % 4;
	const fire = first === 0 ? 'A' : 'B',
		earth = first === 1 ? 'A' : 'B',
		air = first === 2 ? 'A' : 'B',
		water = first === 3 ? 'A' : 'B';
	const key = [first, second].sort().join('/');
	const bridges: Record<string, string> = {
		'0/1': `Uma resposta rápida pode dar alívio a ${fire}, enquanto ${earth} pode precisar de continuidade e de um gesto concreto. Pressa e constância oferecem cuidados diferentes; nenhuma delas mede sozinha a dedicação.`,
		'0/2': `Para ${fire}, recuperar espaço de ação pode aliviar a tensão; para ${air}, conversar pode fazer parte do próprio acolhimento. A explicação não precisa impedir uma resposta, e a resposta não precisa encerrar a conversa.`,
		'0/3': `Dar espaço pode ser um gesto de cuidado para ${fire} e parecer distância para ${water}. A presença fica mais compreensível quando permite autonomia sem deixar o vínculo indefinido.`,
		'1/2': `Uma providência prática pode oferecer conforto a ${earth}, enquanto ${air} pode precisar compreender e conversar. Resolver a tarefa não substitui necessariamente a escuta, assim como uma explicação não substitui toda presença.`,
		'1/3': `A constância pode ser um sinal de amparo para ${earth}; para ${water}, também pode importar perceber o envolvimento afetivo no gesto. O cuidado chega com mais clareza quando sua utilidade não apaga o sentimento que o motivou.`,
		'2/3': `Para ${air}, encontrar palavras pode trazer alívio; para ${water}, a primeira necessidade pode ser sentir que a emoção foi recebida. Explicar cedo demais pode parecer encerramento do assunto, mesmo quando a intenção era ajudar.`
	};
	return `O encontro entre as duas Luas acrescenta a necessidade de cada pessoa: a Lua de A em ${signs[a.sign]} procura ${natalStyles[a.sign].need}; a Lua de B em ${signs[b.sign]} procura ${natalStyles[b.sign].need}. ${a.sign === b.sign ? 'A referência semelhante pode facilitar o reconhecimento do pedido, mas também tornar ambos sensíveis ao mesmo ponto ao mesmo tempo. Reconhecer o sentimento não garante ter disponibilidade para cuidar dele imediatamente.' : (bridges[key] ?? 'As duas necessidades têm uma afinidade de ritmo, embora procurem formas distintas de expressão. A semelhança pode ajudar a reconhecer um pedido; não elimina a diferença entre como cada pessoa deseja recebê-lo.')}`;
}

export function interpretRelationship(
	calculation: CalculationSnapshot,
	theme: RelationshipTheme
): CurrentPassage {
	const graphs = (calculation.data.sources as [CalculationSnapshot, CalculationSnapshot]).map(
		normalizeFactGraph
	);
	const geometry = calculation.data.relationshipGeometry as { aspects: Contact[] };
	const spec = themes[theme];
	const selected = geometry.aspects
		.filter((a) => spec.pairs.some((p) => p[0] === a.first && p[1] === a.second))
		.sort(
			(a, b) =>
				a.orbDegrees +
				spec.pairs.findIndex((p) => p[0] === a.first && p[1] === a.second) * 0.6 -
				(b.orbDegrees + spec.pairs.findIndex((p) => p[0] === b.first && p[1] === b.second) * 0.6)
		)[0];
	const pair = selected ? [selected.first, selected.second] : spec.pairs[0];
	const a = graphs[0].positions.find((p) => p.body === pair[0])!,
		b = graphs[1].positions.find((p) => p.body === pair[1])!;
	if (!a || !b) throw Error('Posições relacionais ausentes.');
	const mechanism = relationshipMechanism(a.body, b.body, selected?.kind);
	const claim = `${bodyNames[a.body]} de A em ${signs[a.sign]} ${selected ? `forma ${aspectNames[selected.kind] ?? selected.kind} com` : 'entra nesta leitura ao lado de'} ${bodyNames[b.body]} de B em ${signs[b.sign]}. ${mechanism}`;
	const style = (p: Position) => natalStyles[p.sign][roles[p.body].style];
	const direction = `Para A, ${roles[a.body].label} envolve ${style(a)}. Para B, ${roles[b.body].label} envolve ${style(b)}. ${theme === 'commitment' ? 'A continuidade precisa preservar a forma de proximidade que ainda faz sentido e dar uma medida ao que se promete. Um acordo pode ser estável e, ao mesmo tempo, permitir rever como cada pessoa participa dele.' : signBridge(a.sign, b.sign)}`;
	const overlays = calculation.data.houseOverlays as HouseOverlay[];
	const overlay = overlays.find((o) => o.from === 'person-a' && o.body === a.body);
	const overlayText = overlay ? relationshipOverlayMeaning(a.body, overlay.house, theme) : '';
	const moonA = theme === 'care' ? graphs[0].positions.find((p) => p.body === 'moon') : undefined;
	const moonB = theme === 'care' ? graphs[1].positions.find((p) => p.body === 'moon') : undefined;
	const factIds = [
		`person-a-${a.factId}`,
		`person-b-${b.factId}`,
		...(selected ? [`cross-${a.body}-${b.body}`] : []),
		...(moonA && moonB ? [`person-a-${moonA.factId}`, `person-b-${moonB.factId}`] : []),
		...(overlay ? [overlay.factId, overlay.positionFactId, overlay.cuspFactId] : [])
	];
	return {
		title: spec.title,
		claim,
		text: [
			spec.opening,
			claim,
			theme === 'care' && a.body === 'moon' && b.body === 'moon' ? '' : direction,
			moonA && moonB ? lunarCare(moonA, moonB) : '',
			overlayText
		]
			.filter(Boolean)
			.join('\n\n'),
		factIds: [...new Set(factIds)],
		relation: `${theme}: A/${a.body}/${signs[a.sign]} → B/${b.body}/${signs[b.sign]}; ${selected?.kind ?? 'comparação temática sem aspecto maior selecionado'}. ${mechanism}${overlay ? ` Campo receptor B/casa${overlay.house}.` : ''}`
	};
}

export function relationshipQuestionTheme(text: string): RelationshipTheme | null {
	const s = text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	if (/convers|comunic|discut|entend|escut|dialog/.test(s)) return 'dialogue';
	if (/desej|sexo|sexual|intim|atra|carinh/.test(s)) return 'desire';
	if (/cuid|emoc|acolh|sent|ciume|segur|distancia|distante/.test(s)) return 'care';
	if (/comprom|respons|dinheiro|financ|rotina|tarefa|confi|acordo/.test(s)) return 'commitment';
	if (/futur|projet|casar|morar|mudan|filh|dire|trabalh|continu|termin/.test(s)) return 'direction';
	return null;
}

export function composeRelationshipPassages(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): CurrentPassage[] {
	const all = (['care', 'dialogue', 'desire', 'commitment', 'direction'] as const).map((theme) => ({
		theme,
		passage: interpretRelationship(calculation, theme)
	}));
	if (input.productId !== 'couple-dossier') {
		const contextTheme = input.context ? relationshipQuestionTheme(input.context) : null;
		return contextTheme
			? [
					...all.filter((x) => x.theme === contextTheme),
					...all.filter((x) => x.theme !== contextTheme)
				].map((x) => x.passage)
			: all.map((x) => x.passage);
	}
	const questions = (input.questions ?? []).map((q, i): CurrentPassage => {
		const theme = relationshipQuestionTheme(q),
			selected = theme
				? all.find((x) => x.theme === theme)!
				: all.find((x) => x.theme === 'direction')!;
		const focus: Record<RelationshipTheme, string> = {
			care: 'Para o assunto que você trouxe, a distinção central é entre oferecer um gesto e conseguir que ele seja recebido como cuidado. A interpretação localiza essa diferença; a experiência de cada pessoa é necessária para dizer se ela está presente no vínculo.',
			dialogue:
				'Para a sua pergunta, a conclusão útil é separar o entendimento de uma frase do efeito que a conversa produz. O contato abaixo mostra por que a mesma troca pode atender a uma necessidade e deixar outra sem resposta.',
			desire:
				'Para a sua pergunta, esta leitura distingue o ritmo da aproximação da disponibilidade de cada pessoa. Ela oferece uma interpretação do encontro; desejo, consentimento e satisfação precisam ser expressos por quem os vive.',
			commitment:
				'Para o assunto que você trouxe, o compromisso precisa ser entendido pelo que sustenta e pelo que custa a cada pessoa. O contato abaixo ajuda a distinguir apoio de uma distribuição fixa de obrigações.',
			direction:
				'Para a sua pergunta, a leitura examina como duas direções podem caber num projeto comum. Ela não decide continuidade, separação ou acontecimentos futuros; esclarece quais diferenças o projeto precisaria conseguir abrigar.'
		};
		const claim = theme
			? focus[theme]
			: 'A pergunta informada não tem uma correspondência temática inequívoca nesta edição. A leitura oferece a composição das direções de A e B como referência ampla, sem apresentar essa associação como resposta específica ao que você perguntou.';
		return {
			title: `Sua pergunta ${i + 1}: ${q}`,
			claim: selected.passage.claim,
			text: `${claim}\n\n${selected.passage.text}`,
			factIds: [...selected.passage.factIds, `couple-question-${i + 1}`, 'personal-context'],
			relation: `Pergunta informada orienta ${theme ?? 'referência ampla com limite explícito'}; ${selected.passage.relation}`
		};
	});
	const represented = new Set((input.questions ?? []).map(relationshipQuestionTheme));
	return [...questions, ...all.filter((x) => !represented.has(x.theme)).map((x) => x.passage)];
}
