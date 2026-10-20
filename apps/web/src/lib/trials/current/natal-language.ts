import { bodyNames, signs } from '../reconstruction/canon';
import { natalStyles } from '../reconstruction/natal-canon';
import type { Aspect, FactGraph, Position } from '../reconstruction/fact-graph';
import { angleContactMeaning, planetParticipation } from './natal-roles';

export type CurrentPassage = {
	title: string;
	text: string;
	factIds: string[];
	claim: string;
	relation: string;
};
export type NatalTheme =
	'identity' | 'learning' | 'affection' | 'desire' | 'effort' | 'growth' | 'vocation' | 'resources';
type Tone = 'conjunction' | 'square' | 'opposition' | 'trine' | 'sextile' | 'none';
type Recipe = {
	bodies: [string, string];
	title: string;
	roles: [string, string];
	styles: [keyof (typeof natalStyles)[number], keyof (typeof natalStyles)[number]];
	read: Record<Tone, string>;
};

// Original editorial development of the approved psychological/humanistic canon.
// Every relation has a subject-specific meaning: aspect labels alone never supply a conclusion.
const recipes: Record<NatalTheme, Recipe> = {
	identity: {
		bodies: ['sun', 'moon'],
		title: 'O que faz sentido precisa também caber na sua vida',
		roles: ['o que dá direção às suas escolhas', 'o que ajuda você a se sentir à vontade'],
		styles: ['aim', 'need'],
		read: {
			conjunction:
				'Desejo de participação e necessidade de acolhimento caminham muito próximos: uma escolha pode parecer pessoalmente certa justamente porque é emocionalmente familiar. Isso dá inteireza à decisão, mas pode dificultar perceber quando o conforto já não acompanha o que você quer construir.',
			square:
				'Aquilo que você quer construir pode exigir uma exposição ou um ritmo diferente daquele em que consegue relaxar. O impasse não se resolve escolhendo entre ambição e sentimento: quando uma escolha ignora o modo como você se recompõe, o custo emocional começa a disputar espaço com o próprio desejo de realizá-la.',
			opposition:
				'Há duas exigências que podem ganhar voz em momentos diferentes: seguir uma direção própria e preservar o que oferece amparo. Uma decisão pode entusiasmar enquanto é imaginada e parecer exigente quando entra no cotidiano. A composição pede espaço real para as duas necessidades, sem fazer de uma delas a prova de que a outra era falsa.',
			trine:
				'O que você procura construir encontra um caminho relativamente familiar na maneira de sentir. Essa continuidade pode facilitar escolhas coerentes; também pode fazer uma resposta conhecida parecer a única possível. O conforto funciona melhor como apoio para explorar do que como critério suficiente para decidir.',
			sextile:
				'Sua maneira de sentir pode oferecer pistas úteis para uma escolha de direção, mas essa colaboração precisa de ocasião para acontecer. Ao transformar uma intenção em algo que cabe na vida cotidiana, você aproxima vontade e acolhimento sem exigir que tudo esteja emocionalmente resolvido antes de começar.',
			none: 'Vontade e conforto descrevem necessidades diferentes, mesmo quando apontam para um tema parecido. A direção de uma escolha pode fazer sentido sem oferecer alívio imediato; uma experiência acolhedora pode recompor você sem precisar virar um projeto. Essa distinção permite reconhecer ambas sem forçar uma concordância.'
		}
	},
	learning: {
		bodies: ['mercury', 'jupiter'],
		title: 'Entre entender o detalhe e enxergar mais longe',
		roles: [
			'o caminho pelo qual uma ideia se torna compreensível',
			'o horizonte que faz valer a pena aprendê-la'
		],
		styles: ['thought', 'aim'],
		read: {
			conjunction:
				'Compreender e ampliar uma ideia acontecem quase no mesmo movimento. Uma explicação pode logo virar uma visão de conjunto, o que favorece conexões, mas encurta a distância entre o que foi entendido e o que ainda está sendo suposto. A força dessa combinação cresce quando uma boa hipótese conserva espaço para ser revista.',
			square:
				'A visão de conjunto pode chegar antes de a explicação estar pronta para sustentá-la. Isso produz uma tensão fértil entre encontrar uma ideia promissora e conseguir demonstrar por que ela funciona. Quando a promessa cresce mais depressa que a verificação, os detalhes passam a parecer obstáculos; quando só os detalhes contam, a ideia perde o motivo que despertou seu interesse.',
			opposition:
				'Você pode compreender muito bem uma questão de perto e, ao mudar de escala, chegar a uma conclusão que parece contradizê-la. O desafio está em ligar o exemplo à regra sem permitir que um apague o outro. Uma exceção pode melhorar a visão de conjunto, em vez de obrigar você a abandonar tudo o que já entendeu.',
			trine:
				'Detalhes e visão de conjunto encontram passagem entre si: uma informação pode abrir novas conexões sem perder imediatamente seu sentido original. A facilidade também torna uma explicação convincente antes de ela ser suficiente. Aqui, aprofundar significa dar à ideia um limite claro de aplicação, preservando sua capacidade de abrir caminhos.',
			sextile:
				'Uma pergunta concreta pode abrir um campo de estudo maior, e uma visão ampla pode ajudar você a selecionar o que merece atenção. Essa colaboração rende quando existe uma ponte entre interesse e aplicação: um exemplo bem trabalhado pode ensinar mais do que acumular assuntos que ainda não conversam entre si.',
			none: 'Entender uma informação e acreditar que ela leva a algum lugar são movimentos diferentes. A leitura reúne seu modo de elaborar uma ideia e aquilo que amplia seu interesse, sem pressupor que um determine o outro. Uma boa direção de aprendizagem precisa oferecer tanto uma forma compreensível de avançar quanto uma razão para continuar.'
		}
	},
	affection: {
		bodies: ['moon', 'venus'],
		title: 'Receber cuidado e demonstrar afeto nem sempre têm o mesmo ritmo',
		roles: ['o que faz você se sentir acolhido', 'a maneira de se aproximar e demonstrar apreço'],
		styles: ['need', 'affection'],
		read: {
			conjunction:
				'Afeto e acolhimento tendem a procurar uma linguagem próxima. Cuidar de um vínculo pode também ser uma forma de recuperar conforto, o que favorece proximidade, mas torna mais difícil distinguir o gesto oferecido livremente daquele feito para garantir que a relação continue segura.',
			square:
				'O gesto que você oferece por carinho pode não ser exatamente aquilo de que precisa para se sentir cuidado. Essa diferença pode produzir relações nas quais há dedicação e, ainda assim, alguma falta permanece sem nome. A interpretação aponta para separar disponibilidade afetiva de obrigação de satisfazer toda necessidade emocional.',
			opposition:
				'A busca de companhia e a necessidade de recolhimento podem pedir coisas diferentes ao mesmo vínculo. Você pode desejar uma troca e precisar de uma condição de segurança que essa troca, sozinha, não oferece. A proximidade ganha qualidade quando não precisa eliminar todos os intervalos e diferenças.',
			trine:
				'Demonstrar apreço e receber cuidado podem se apoiar com naturalidade. Isso facilita perceber o valor de pequenos gestos, mas também pode manter a relação dentro de uma linguagem confortável para você. O vínculo se amplia quando há curiosidade pela forma de afeto que a outra pessoa reconhece.',
			sextile:
				'Existe uma possibilidade de transformar uma necessidade emocional em um gesto de aproximação compreensível. Ela se realiza na troca: oferecer cuidado pode abrir conversa sobre o que você também precisa, sem transformar o gesto numa cobrança implícita de retribuição.',
			none: 'O que conforta você e o que considera bonito numa relação não precisam ser idênticos. Reconhecer essa diferença ajuda a entender por que uma troca pode ser atraente sem atender a todas as necessidades de acolhimento, ou segura sem reunir tudo o que desperta seu interesse.'
		}
	},
	desire: {
		bodies: ['venus', 'mars'],
		title: 'O que atrai você e o que faz você se mover',
		roles: ['o modo de cultivar uma aproximação', 'o modo de agir quando algo importa'],
		styles: ['affection', 'action'],
		read: {
			conjunction:
				'Atração e iniciativa se aproximam: gostar de algo pode rapidamente mobilizar uma atitude. Essa presença dá força ao encontro, mas pode reduzir o espaço entre perceber um desejo e decidir como expressá-lo. A intensidade do interesse não informa, por si só, a disponibilidade da outra pessoa.',
			square:
				'A forma de procurar o que deseja pode tensionar a própria aproximação que você gostaria de preservar. Uma atitude que parece decidida pode atropelar um acordo; uma busca de harmonia pode conter uma vontade que depois aparece como irritação. O ponto central é dar ao desejo uma forma que também permita resposta.',
			opposition:
				'Aproximar-se e preservar uma vontade própria podem parecer movimentos concorrentes. A relação ganha espaço quando discordar não vira sinônimo de perder afeto, e ceder não vira a única maneira de manter contato. O desejo fica mais claro quando pode ser dito antes de precisar ser defendido.',
			trine:
				'Interesse e iniciativa encontram uma passagem relativamente fluida. Isso pode dar espontaneidade à aproximação, embora a facilidade de agir não substitua perceber o ritmo alheio. O encontro se sustenta melhor quando o entusiasmo também deixa espaço para mudar de ideia.',
			sextile:
				'O interesse pode ganhar uma expressão concreta sem precisar se transformar de imediato em urgência. Pequenas iniciativas ajudam a descobrir se a aproximação tem reciprocidade; o desejo encontra forma na troca, em vez de depender apenas de expectativa.',
			none: 'Gostar de uma possibilidade e agir para torná-la real descrevem etapas distintas. Seu modo de demonstrar apreço pode ser diferente do modo como enfrenta obstáculos. A leitura ganha precisão ao distinguir a intenção de aproximação da força usada para defendê-la.'
		}
	},
	effort: {
		bodies: ['mars', 'saturn'],
		title: 'Começar, sustentar e saber quando basta',
		roles: [
			'a maneira de enfrentar um obstáculo',
			'a maneira de dar continuidade e assumir um limite'
		],
		styles: ['action', 'thought'],
		read: {
			conjunction:
				'O impulso de agir passa perto da exigência de fazer direito. Isso pode concentrar esforço e favorecer persistência, mas também tornar cada começo uma prova de competência. Quando o padrão exigido chega antes da experiência, uma tarefa pequena pode carregar um peso maior do que precisa.',
			square:
				'A vontade de avançar encontra uma cobrança de controle que pode interromper o próprio avanço. Forçar mais nem sempre destrava: às vezes, aumenta o desgaste entre pressa e exigência. O esforço se torna mais consistente quando o limite deixa de ser uma barreira indistinta e ganha tamanho, prazo e finalidade.',
			opposition:
				'A iniciativa e a obrigação podem parecer estar em lados opostos: agir por vontade própria corre o risco de parecer irresponsável, enquanto cumprir tudo pode esvaziar o desejo. A composição permite compromisso sem exigir que toda energia seja consumida por aquilo que precisa ser mantido.',
			trine:
				'A disposição para agir pode encontrar apoio na capacidade de sustentar um processo. Essa combinação favorece continuidade, mas pode tornar suportável por muito tempo um esforço que já perdeu sentido. Persistir ganha valor quando o resultado ainda merece o trabalho que exige.',
			sextile:
				'Uma iniciativa pode amadurecer ao encontrar um limite útil. A estrutura ajuda quando organiza o esforço em etapas possíveis, sem exigir que toda a trajetória esteja garantida. Aqui, responsabilidade pode proteger o começo, em vez de adiá-lo indefinidamente.',
			none: 'Seu modo de entrar em ação e seu modo de lidar com responsabilidade são duas referências diferentes. Uma decisão pode ser fácil de começar e difícil de manter, ou exigir preparação antes de ganhar movimento. O mapa oferece essas duas perspectivas sem presumir um conflito calculado entre elas.'
		}
	},
	growth: {
		bodies: ['jupiter', 'saturn'],
		title: 'Crescer sem perder as condições que sustentam o crescimento',
		roles: ['o que amplia seu horizonte', 'o que dá medida aos compromissos'],
		styles: ['aim', 'thought'],
		read: {
			conjunction:
				'A possibilidade de crescer vem acompanhada da pergunta sobre como sustentar esse crescimento. Isso pode dar consistência a um projeto, mas também fazer cada oportunidade parecer uma responsabilidade antes de poder ser explorada. Uma promessa não precisa virar obrigação inteira no momento em que aparece.',
			square:
				'Ampliar o alcance de uma escolha pode exigir mais tempo, recursos ou responsabilidade do que o entusiasmo inicialmente comporta. A tensão cresce quando o limite é lido apenas como falta de coragem, ou a possibilidade apenas como imprudência. O melhor tamanho de um projeto nasce da negociação entre ambos.',
			opposition:
				'O que parece possível numa visão ampla pode parecer excessivo diante das condições atuais. As duas perspectivas têm informação útil: uma impede que o presente vire horizonte definitivo; a outra impede que a promessa consuma o que já sustenta sua vida.',
			trine:
				'Expansão e continuidade podem colaborar: uma possibilidade ganha corpo sem depender apenas de entusiasmo. A facilidade de planejar, porém, pode fazer um projeto conhecido parecer sempre preferível ao desconhecido. Crescer também envolve reconhecer quais limites são atuais e quais já podem ser revistos.',
			sextile:
				'Um limite bem compreendido pode indicar por onde crescer. A oportunidade fica mais concreta quando encontra uma estrutura que suporta um passo adicional, em vez de exigir uma transformação completa de uma só vez.',
			none: 'A leitura coloca lado a lado sua busca de possibilidades e sua maneira de dar forma a compromissos. Elas ajudam a distinguir uma direção desejável de uma decisão viável agora, sem transformar a condição presente numa sentença sobre o futuro.'
		}
	},
	vocation: {
		bodies: ['sun', 'saturn'],
		title: 'Reconhecer sua contribuição sem transformar valor em desempenho',
		roles: [
			'o que torna uma realização pessoalmente significativa',
			'o critério usado para assumir responsabilidade'
		],
		styles: ['aim', 'thought'],
		read: {
			conjunction:
				'Realização e responsabilidade ficam próximas: participar pode significar assumir uma entrega pela qual você consegue responder. Isso dá seriedade ao trabalho, mas pode fazer o valor pessoal depender demais de cumprir expectativas. A contribuição ganha clareza quando responsabilidade tem alcance definido.',
			square:
				'O desejo de realizar algo próprio pode encontrar um critério tão exigente que o reconhecimento fica sempre adiado. A cobrança pode aperfeiçoar uma entrega e, ao mesmo tempo, impedir que ela seja considerada suficiente. Aqui, maturidade inclui distinguir rigor de uma prova de valor sem término.',
			opposition:
				'Autoria e dever podem disputar a direção do trabalho. Uma função pode oferecer reconhecimento sem espaço para o que você gostaria de construir; um projeto próprio pode parecer difícil de conciliar com obrigações. A interpretação aponta para explicitar essa negociação, em vez de tratar uma escolha como renúncia total à outra.',
			trine:
				'Uma realização própria pode ganhar consistência ao encontrar responsabilidade e continuidade. Isso favorece construir credibilidade ao longo do tempo, mas também pode prender a identidade a uma função bem desempenhada. A capacidade de sustentar algo não obriga você a sustentá-lo para sempre.',
			sextile:
				'Assumir uma responsabilidade delimitada pode ajudar você a reconhecer a própria contribuição. O compromisso funciona como ocasião de desenvolver autoria quando há espaço para aprender e decidir, sem exigir competência completa desde o primeiro momento.',
			none: 'Sentido pessoal e responsabilidade oferecem critérios distintos para o trabalho. Algo pode ser bem executado sem representar aquilo que você quer desenvolver; algo significativo pode ainda precisar de estrutura. A leitura reúne essas perguntas para que competência e identificação não sejam tratadas como equivalentes.'
		}
	},
	resources: {
		bodies: ['venus', 'saturn'],
		title: 'Preservar o que tem valor sem fechar espaço para o prazer',
		roles: ['o que você aprecia e deseja conservar', 'o que pede compromisso e contenção'],
		styles: ['affection', 'thought'],
		read: {
			conjunction:
				'Valor e compromisso ficam próximos: o que merece investimento tende a ser levado a sério. Isso favorece constância, mas pode fazer prazer e afeto parecerem coisas que precisam primeiro ser merecidas. Conservar algo não precisa significar submetê-lo a uma obrigação permanente.',
			square:
				'O desejo de preservar qualidade pode entrar em conflito com o prazo, o custo ou o compromisso necessário para mantê-la. A exigência protege o que importa até o ponto em que elimina o prazer de usufruir. O critério útil é aquele que permite reconhecer uma entrega suficiente, em vez de adiar indefinidamente sua satisfação.',
			opposition:
				'A vontade de desfrutar uma relação ou um recurso pode se alternar com a necessidade de restringir e proteger. O vínculo com o que tem valor fica menos tenso quando compromisso e prazer têm lugar explícito, sem que um precise justificar inteiramente o outro.',
			trine:
				'Constância pode dar segurança ao que você valoriza. O cuidado duradouro é um recurso, embora um hábito estável não seja prova de satisfação atual. A continuidade se renova quando também há espaço para reconhecer que preferências mudam.',
			sextile:
				'Um compromisso proporcional pode proteger o que você aprecia. Limites claros ajudam a dar continuidade ao prazer e à troca, desde que organizem a disponibilidade sem transformar afeto em uma dívida a cumprir.',
			none: 'Preferência e compromisso cumprem papéis diferentes. Uma escolha pode agradar sem ser sustentável nas condições atuais, e uma obrigação pode ser viável sem representar aquilo que você valoriza. A leitura aproxima esses critérios sem confundi-los.'
		}
	}
};

export const houseScenes = [
	'o modo de se apresentar e começar',
	'a sustentação material e os recursos próprios',
	'as conversas, os estudos cotidianos e a circulação de informações',
	'a vida privada e os vínculos de origem',
	'a criação, o prazer e a expressão pessoal',
	'a rotina e a organização do trabalho',
	'as parcerias e os acordos',
	'a intimidade e os recursos compartilhados',
	'os estudos mais amplos e as convicções',
	'a contribuição pública e as responsabilidades profissionais',
	'os grupos e os projetos compartilhados',
	'o recolhimento e aquilo que precisa de elaboração reservada'
] as const;
const elementBridges: Record<string, string> = {
	'0-0':
		'As duas posições procuram movimento e participação. O entusiasmo pode alimentar a iniciativa, mas também deixar pouco intervalo para perceber cansaço ou mudar uma expectativa.',
	'1-1':
		'As duas posições procuram consistência e uma referência concreta. Isso favorece continuidade, embora uma possibilidade nova possa precisar mostrar utilidade antes de receber espaço.',
	'2-2':
		'As duas posições encontram caminho pela troca de ideias. Nomear e comparar pode abrir alternativas, mas prolongar a conversa também pode adiar a experiência que daria uma resposta diferente.',
	'3-3':
		'As duas posições dão peso ao clima emocional e ao envolvimento. Essa sensibilidade aproxima intenção e sentimento, embora um clima passageiro possa ocupar espaço maior que as condições efetivas da situação.',
	'0-1':
		'O desejo de colocar algo em movimento encontra a necessidade de concretude. Uma parte ganha confiança ao começar; a outra, ao perceber o que pode ser sustentado. A diferença está no momento em que cada uma considera haver base suficiente para avançar.',
	'0-2':
		'A iniciativa encontra uma fonte de ideias e alternativas. Isso pode tornar um começo ágil, mas a abertura de possibilidades tende a multiplicar caminhos antes de um deles ter tempo de amadurecer.',
	'0-3':
		'A vontade de agir encontra a necessidade de perceber o que está emocionalmente em jogo. Uma reação rápida pode trazer clareza, mas o sentimento pode precisar de mais tempo para acompanhar a decisão.',
	'1-2':
		'A necessidade de uma referência concreta encontra a abertura para outras explicações. Uma ideia pode parecer intelectualmente promissora antes de se tornar confiável na prática; a diferença pede uma ligação entre modelo e experiência.',
	'1-3':
		'Consistência e envolvimento podem se apoiar: um gesto concreto dá forma a algo que importa emocionalmente. O risco é manter uma condição conhecida apenas porque ela conserva familiaridade, mesmo depois de mudar a necessidade.',
	'2-3':
		'Explicar o que acontece e sentir-se acolhido pelo que acontece são experiências diferentes. A conversa pode esclarecer uma situação sem encerrar seu efeito emocional; o sentimento, por sua vez, pode trazer uma pergunta que ainda não encontrou palavras.'
};
export const positionFor = (g: FactGraph, body: string) => g.positions.find((p) => p.body === body);
export function pairAspect(g: FactGraph, a: string, b: string): Aspect | undefined {
	return g.aspects
		.filter((x) => (x.first === a && x.second === b) || (x.first === b && x.second === a))
		.sort((x, y) => x.orb - y.orb)[0];
}
export function signBridge(a: number, b: number): string {
	return elementBridges[[a % 4, b % 4].sort((x, y) => x - y).join('-')];
}
export function located(p: Position): string {
	return `${bodyNames[p.body] ?? p.body} em ${signs[p.sign]}${p.house ? `, na casa ${p.house}` : ''}`;
}
function fieldBridge(a: Position, b: Position): string {
	if (!a.house || !b.house) return '';
	if (a.house === b.house)
		return `A casa ${a.house} reúne os dois movimentos em um mesmo campo: ${houseScenes[a.house - 1]}. Por isso, uma mesma situação pode mobilizar tanto a intenção descrita quanto sua necessidade de ajuste.`;
	return `As casas dão campos diferentes a essa composição: ${bodyNames[a.body]} leva o primeiro movimento para ${houseScenes[a.house - 1]}; ${bodyNames[b.body]} direciona o segundo para ${houseScenes[b.house - 1]}. Uma escolha feita no primeiro campo pode exigir condições do segundo para ganhar continuidade.`;
}
function aspectText(a?: Aspect): string {
	if (!a) return '';
	const names: Record<string, string> = {
		conjunction: 'conjunção',
		square: 'quadratura',
		opposition: 'oposição',
		trine: 'trígono',
		sextile: 'sextil'
	};
	return `, em ${names[a.kind] ?? a.kind},`;
}

export function interpretNatalPair(g: FactGraph, theme: NatalTheme): CurrentPassage | null {
	const r = recipes[theme],
		a = positionFor(g, r.bodies[0]),
		b = positionFor(g, r.bodies[1]);
	if (!a || !b) return null;
	const aspect = pairAspect(g, a.body, b.body),
		tone = (aspect?.kind ?? 'none') as Tone;
	const mechanism = r.read[tone] ?? r.read.none;
	const claim = `${located(a)} e ${located(b)}${aspectText(aspect)} relacionam ${r.roles[0]} com ${r.roles[1]}: ${mechanism}`;
	const contrast =
		a.sign === b.sign
			? `As duas posições em ${signs[a.sign]} partem de uma orientação semelhante, embora cumpram papéis diferentes. ${signBridge(a.sign, b.sign)}`
			: signBridge(a.sign, b.sign);
	const styles = `Nesta composição, ${bodyNames[a.body]} busca ${natalStyles[a.sign][r.styles[0]]}; ${bodyNames[b.body]} acrescenta a importância de ${natalStyles[b.sign][r.styles[1]]}. ${contrast}`;
	const specific =
		theme === 'learning' && a.sign === 1 && b.sign === 10
			? 'Aqui, a distância ganha uma forma específica: Mercúrio em Touro precisa tornar a ideia palpável, enquanto Júpiter em Aquário amplia a pergunta para sistemas, grupos e possibilidades diferentes das habituais. Uma proposta inovadora pode despertar interesse e, ao mesmo tempo, esbarrar na falta de uma aplicação confiável. O ganho está em transformar a visão ampla em um exemplo concreto, sem reduzir a novidade apenas ao que já é conhecido.'
			: '';
	const houseIds = [a.house, b.house].flatMap((h) =>
		h && g.facts.some((f) => f.id === `house-${h}`) ? [`house-${h}`] : []
	);
	return {
		title: r.title,
		claim,
		text: [claim, styles, specific, fieldBridge(a, b)].filter(Boolean).join('\n\n'),
		factIds: [...new Set([a.factId, b.factId, ...houseIds, ...(aspect ? [aspect.factId] : [])])],
		relation: `${a.body}/${b.body}; ${aspect ? `${aspect.kind}, orbe ${aspect.orb}` : 'composição temática sem aspecto maior'}; signos ${signs[a.sign]}/${signs[b.sign]} modulam ritmos e necessidades; casas ${a.house ?? 'indisponível'}/${b.house ?? 'indisponível'} delimitam campos. ${mechanism}`
	};
}

export function interpretAngle(g: FactGraph, angle: 'asc' | 'mc'): CurrentPassage | null {
	const x = g[angle];
	if (!x) return null;
	const ruler = positionFor(g, x.ruler);
	if (!ruler) return null;
	const isAsc = angle === 'asc',
		contact = g.angleContacts
			.filter((c) => c.angle === (isAsc ? 'ascendant' : 'midheaven'))
			.sort((a, b) => a.orb - b.orb)[0];
	const start = natalStyles[x.sign][isAsc ? 'entry' : 'aim'];
	const continuation = planetParticipation(ruler);
	const same = x.sign % 4 === ruler.sign % 4;
	const claim = `${isAsc ? 'Com o Ascendente' : 'Com o Meio do Céu'} em ${signs[x.sign]}, ${start} descreve ${isAsc ? 'uma forma de entrar nas situações' : 'uma direção simbólica de contribuição'}. Seu regente, ${located(ruler)}, leva essa intenção a ${continuation}. ${same ? (isAsc ? 'Começo e continuidade partem de uma disposição semelhante; a coerência ajuda a sustentar o movimento, mas também pode repetir seu excesso.' : 'A direção desejada e o modo de lhe dar continuidade têm uma disposição semelhante. Essa coerência favorece a identificação com o caminho, mas também pode concentrar expectativas demais numa única forma de participar.') : isAsc ? 'A primeira impressão não conta toda a história: o modo de iniciar e o trabalho necessário para sustentar essa intenção têm ritmos diferentes.' : 'O ideal de contribuição e os meios para sustentá-lo têm ritmos diferentes. Dar espaço a ambos evita que a identificação com um resultado torne invisível o trabalho necessário para construí-lo.'}`;
	const concrete =
		isAsc && x.sign === 0 && ruler.sign === 5
			? 'Áries dá ao começo uma resposta direta; Marte em Virgem quer descobrir como executar melhor. Assim, a rapidez de decidir pode conviver com demora para considerar algo pronto. Isso não torna a iniciativa falsa: mostra que abrir o caminho e aceitar a qualidade do resultado são momentos distintos. Quando a revisão não tem medida, o impulso que abriu a possibilidade pode acabar preso ao acabamento.'
			: `${signBridge(x.sign, ruler.sign)} ${ruler.house ? `A casa ${ruler.house} direciona esse trabalho para ${houseScenes[ruler.house - 1]}. É nesse campo simbólico que a intenção precisa encontrar meios de se realizar, em vez de permanecer apenas uma imagem de si.` : 'Sem casas disponíveis, essa interpretação permanece no contraste entre as duas posições.'}`;
	const contactPosition = contact ? positionFor(g, contact.body) : undefined;
	const emphasis =
		contact && contactPosition ? angleContactMeaning(contactPosition, angle, contact.kind) : '';
	return {
		title: isAsc
			? 'A maneira de começar e o trabalho de continuar'
			: 'Uma direção de contribuição, várias formas de realizá-la',
		claim,
		text: [
			claim,
			concrete,
			emphasis,
			isAsc
				? ''
				: 'Essa composição descreve critérios de identificação com uma contribuição. Não escolhe uma profissão por você, nem mede aptidão, oportunidades, renda ou reconhecimento. Uma mesma direção pode aparecer em trabalhos diferentes, conforme formação, condições e interesses.'
		]
			.filter(Boolean)
			.join('\n\n'),
		factIds: [
			...new Set([
				...x.factIds,
				ruler.factId,
				...(contact && contactPosition ? [contact.factId, contactPosition.factId] : [])
			])
		],
		relation: `${isAsc ? 'Ascendente' : 'MC'} em ${signs[x.sign]} lido com regente ${ruler.body} em ${signs[ruler.sign]}, casa ${ruler.house}; ${same ? 'continuidade elemental' : 'mudança de ritmo entre intenção e execução'}${contact ? `; contato ${contact.body}/${contact.kind}` : ''}.`
	};
}
