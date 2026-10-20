import type { Position } from '../reconstruction/fact-graph';
import type { TemporalContact } from './temporal-canon';

type Modes = { tension: string; connection: string; concentration: string };
type CareerMeaning = { claim: string; text: string; factIds: string[]; relation: string };
export type CareerContact = { contact: TemporalContact; natal: Position };

/** Explain the exact geometry once in the period, alongside its actual professional relation. */
export function careerAspectNuance(aspect: TemporalContact['aspect']): string {
	const nuances: Record<TemporalContact['aspect'], string> = {
		sextile:
			'No sextil, essa possibilidade profissional depende de participação: uma conversa, uma proposta ou um primeiro passo pode dar forma à ligação, que não se realiza apenas por estar disponível.',
		trine:
			'No trígono, a ligação pode parecer familiar e exigir menos esforço de ajuste. No trabalho, essa facilidade ajuda a dar continuidade, mas também pode manter uma maneira conhecida de fazer mesmo quando outra resposta seria mais adequada.',
		square:
			'Na quadratura, as duas necessidades interferem na maneira de realizar o trabalho: insistir no mesmo método pode aumentar o atrito. Rever a forma de agir permite atender ao que cada lado exige sem reduzir a questão a trabalhar mais.',
		opposition:
			'Na oposição, a escolha profissional pode oscilar entre duas exigências que parecem excluir uma à outra. Dar toda a razão a uma delas tende a deixar a outra como insatisfação; negociar uma medida entre ambas difere de escolher de uma vez um único lado. O aspecto não identifica outra pessoa como causa da tensão.',
		conjunction:
			'Na conjunção, as necessidades se concentram no mesmo movimento profissional. Essa proximidade pode dar força à iniciativa, mas distinguir o que cada uma pede evita esperar que uma única escolha resolva tudo.'
	};
	return nuances[aspect];
}

// Relations describe choices in work, including study, independent projects and a change
// of direction. They never establish that a job, offer or negotiation actually exists.
const relations: Record<string, Modes> = {
	'saturn:sun': {
		tension:
			'A vontade de demonstrar capacidade pode levar você a aceitar mais responsabilidade do que consegue sustentar. No trabalho, o atrito está entre construir uma direção própria e precisar provar que dá conta: delimitar uma entrega preserva a autoria que o excesso de obrigação acabaria apagando.',
		connection:
			'Dar forma e continuidade a uma escolha ajuda sua participação a ganhar consistência. No trabalho, assumir uma responsabilidade delimitada permite que a direção desejada apareça no que você sustenta, sem depender apenas de reconhecimento imediato.',
		concentration:
			'Responsabilidade e identidade profissional ficam próximas: cumprir bem uma tarefa pode parecer uma maneira de confirmar quem você é. O ganho está em construir consistência; o limite aparece quando rever uma obrigação começa a parecer uma perda de valor pessoal.'
	},
	'pluto:neptune': {
		tension:
			'Uma imagem de realização pode continuar orientando o esforço mesmo quando custa mais do que oferece. A tensão profissional está em reconhecer o apego a esse ideal sem concluir que todo o caminho perdeu sentido: mudar o que se promete é diferente de abandonar o que ainda inspira.',
		connection:
			'A disposição para rever um apego pode ajudar a distinguir o que inspira um projeto da imagem que ele deveria produzir. Isso abre espaço para transformar a maneira de trabalhar sem descartar o sentido que tornou aquela direção importante.',
		concentration:
			'A força de um ideal e o apego a ele se misturam. Uma direção profissional pode mobilizar muito esforço por representar algo maior; justamente por isso, reconhecer seus custos permite preservar o sentido do projeto sem ficar preso à imagem de realização que o iniciou.'
	},
	'neptune:neptune': {
		tension:
			'O desejo de encontrar sentido no trabalho pode tornar difícil distinguir uma direção inspiradora de uma expectativa sem contorno. O ponto delicado é decidir o que aquela visão exige na prática, sem preencher com esperança os recursos ou acordos que ainda não existem.',
		connection:
			'A imaginação pode ajudar você a reconhecer possibilidades de trabalho que uma definição rígida de sucesso deixaria de fora. Essa abertura ganha forma quando a inspiração encontra uma contribuição identificável: o que você deseja oferecer, a quem e com quais limites.',
		concentration:
			'O sentido atribuído ao trabalho ganha relevo, junto da dificuldade de medir uma aspiração ainda pouco definida. Dar uma forma provisória à contribuição desejada permite experimentar um caminho sem tratá-lo como vocação definitiva.'
	},
	'mars:saturn': {
		tension:
			'A vontade de avançar encontra a necessidade de cumprir uma estrutura ou respeitar um limite. Aumentar a força pode transformar uma restrição de prazo, método ou capacidade numa disputa pessoal; separar o que pode ser negociado do que precisa de preparação torna a iniciativa mais efetiva.',
		connection:
			'Iniciativa e disciplina podem trabalhar juntas: a energia para começar encontra um modo de sustentar a execução. Uma etapa bem delimitada ajuda a converter esforço em avanço, sem tomar persistência como obrigação de nunca ajustar o método.',
		concentration:
			'A pressa de executar e a cobrança por consistência se concentram no mesmo gesto. No trabalho, isso pode favorecer firmeza, mas também rigidez: organizar o esforço em etapas evita exigir que uma única ação resolva o projeto inteiro.'
	},
	'moon:sun': {
		tension:
			'A reação a uma tarefa ou à maneira como sua participação é recebida pode pesar sobre a avaliação do caminho profissional inteiro. O desconforto merece lugar, mas não precisa decidir sozinho o valor do trabalho: diferenciar uma necessidade de acolhimento de uma escolha de direção dá medida à resposta.',
		connection:
			'Sentir-se mais à vontade com o que faz pode ajudar você a apresentar uma contribuição com menos esforço para provar seu valor. Essa confiança favorece a participação, desde que uma sensação momentânea de conforto não se torne a única medida para assumir um compromisso duradouro.',
		concentration:
			'O modo como você se sente e a importância atribuída à própria participação ficam próximos. Um retorno sobre o trabalho pode parecer falar de você por inteiro; reconhecer a necessidade emocional envolvida ajuda a receber esse retorno sem entregar a ele toda a direção profissional.'
	},
	'sun:jupiter': {
		tension:
			'O desejo de dar alcance ao trabalho pode ampliar a promessa antes de esclarecer como realizá-la. A questão profissional é escolher onde crescer sem usar o tamanho da ambição como prova de capacidade: uma proposta consistente liga o horizonte desejado às etapas que realmente cabem.',
		connection:
			'Uma direção mais ampla pode ajudar você a reconhecer onde sua contribuição tem espaço para crescer. Mostrar o sentido de uma proposta junto de sua forma de realização torna a ambição comunicável, sem precisar garantir antecipadamente todos os resultados.',
		concentration:
			'Participação e expansão se aproximam: um projeto pode representar tanto algo que você quer fazer quanto uma oportunidade de ocupar mais espaço. Distinguir contribuição de prestígio ajuda a dimensionar a promessa sem esvaziar a ambição.'
	},
	'moon:neptune': {
		tension:
			'Uma impressão sobre o ambiente de trabalho pode se misturar ao que você espera ou teme daquele caminho. A sensação importa para reconhecer um limite, mas não esclarece sozinha a intenção de outra pessoa ou as condições de um projeto; dar nome ao incômodo reduz a necessidade de adivinhar o restante.',
		connection:
			'A sensibilidade ao ambiente pode ajudar a perceber como uma proposta afeta as pessoas e a encontrar uma forma mais cuidadosa de apresentá-la. Essa percepção enriquece o trabalho quando acompanha uma explicação clara, sem transformar afinidade em garantia de que todos entenderam ou concordaram.',
		concentration:
			'Expectativas profissionais e sensibilidade ao ambiente se misturam. Algo que inspira também pode tornar você mais permeável a demandas pouco definidas; reconhecer o que deseja oferecer ajuda a colaborar sem absorver uma responsabilidade que ainda não foi combinada.'
	},
	'venus:neptune': {
		tension:
			'O encanto por uma proposta ou a vontade de preservar uma boa relação pode suavizar perguntas sobre troca e responsabilidade. A dificuldade profissional está em gostar do caminho sem usar esse gosto para preencher condições ausentes: afinidade não define, por si, o valor, o prazo ou o alcance da contribuição.',
		connection:
			'Afinidade e imaginação podem ajudar a dar uma forma atraente a uma contribuição e aproximar pessoas em torno dela. Explicitar o que cada parte oferece preserva essa qualidade da troca, sem depender de que o entusiasmo substitua o acordo.',
		concentration:
			'O que parece agradável e o que parece inspirador se confundem com facilidade. No trabalho, uma proposta pode ganhar valor pela imagem que desperta; separar essa atração das condições da troca permite preservar o desejo sem aceitar uma participação indefinida.'
	},
	'sun:neptune': {
		tension:
			'Uma imagem de realização pode disputar espaço com a contribuição que você consegue assumir agora. Tentar corresponder ao ideal inteiro torna qualquer limite uma decepção; escolher uma entrega identificável permite trabalhar na direção desejada sem representar uma certeza que ainda não existe.',
		connection:
			'Uma inspiração pode dar sentido à maneira como você apresenta e desenvolve o trabalho. A contribuição ganha força quando você consegue explicar o que deseja realizar, mantendo espaço para a visão amadurecer durante a execução.',
		concentration:
			'A direção profissional se aproxima de uma imagem de realização que mobiliza o desejo. Esse encontro pode dar sentido ao esforço, mas também dificultar admitir dúvidas; uma proposta provisória permite participar sem precisar encarnar desde já o ideal inteiro.'
	},
	'moon:jupiter': {
		tension:
			'Entusiasmo e necessidade de se sentir amparado podem ampliar o tamanho de uma escolha profissional. A promessa de um horizonte maior pode aliviar uma inquietação sem resolver sua causa; distinguir o que anima do que cabe na rotina evita assumir expansão como resposta para todo desconforto.',
		connection:
			'Um pouco mais de confiança pode ajudar você a considerar possibilidades de trabalho que pareciam distantes. Esse ânimo favorece a exploração quando permite formular uma próxima etapa, sem exigir que uma sensação favorável confirme o caminho inteiro.',
		concentration:
			'O desejo de ampliar possibilidades encontra a necessidade de sentir que existe um caminho. No trabalho, uma perspectiva pode confortar antes de estar definida; acolher o entusiasmo sem antecipar o compromisso preserva a abertura para conhecer melhor suas condições.'
	},
	'sun:sun': {
		tension:
			'A maneira de se apresentar pode entrar em atrito com a direção profissional que você procura sustentar. Defender uma posição só para manter coerência com uma imagem anterior pode dificultar a escolha; revisar a forma de participar permite preservar o propósito sem precisar repetir o mesmo papel.',
		connection:
			'Há uma ligação entre a maneira de se posicionar e a direção que você deseja construir. Isso pode ajudar a apresentar uma contribuição com clareza: mostrar o que você assume e por que aquilo importa torna sua participação reconhecível sem prometer mais do que oferece.',
		concentration:
			'A vontade de participar se concentra na definição de uma direção própria. No trabalho, explicitar o que você quer assumir ajuda a transformar presença em contribuição, sem precisar ocupar todos os espaços para confirmar seu valor.'
	},
	'sun:saturn': {
		tension:
			'A vontade de afirmar uma direção pode esbarrar numa obrigação que já exige muito. O conflito profissional pede separar o compromisso que dá sustentação daquele que continua apenas pelo custo de abandoná-lo; rever o alcance de uma responsabilidade pode proteger o trabalho que ainda importa.',
		connection:
			'Assumir uma posição com clareza pode ajudar a dar forma a um compromisso. A confiança profissional se constrói pela correspondência entre o que você apresenta e o que consegue manter, deixando explícitos os limites que tornam a entrega confiável.',
		concentration:
			'A maneira de se posicionar fica próxima da responsabilidade assumida. Isso pode dar consistência à participação, mas também fazer o dever ocupar toda a definição de valor; cumprir uma parte clara permite sustentar o trabalho sem precisar responder por tudo.'
	},
	'venus:jupiter': {
		tension:
			'O desejo de uma troca satisfatória encontra a vontade de ampliar possibilidades. Algo pode parecer valer a pena pelo alcance que promete, mesmo exigindo concessões difíceis de manter; negociar o tamanho da contribuição preserva o entusiasmo sem deixar que ele decida sozinho o preço da participação.',
		connection:
			'Afinidade e visão de crescimento podem ajudar você a reconhecer uma troca com espaço para desenvolver o trabalho. A expansão ganha consistência quando o benefício esperado acompanha uma participação proporcional, em vez de depender apenas da boa impressão inicial.',
		concentration:
			'O prazer de participar e a promessa de crescimento se reforçam. No trabalho, isso pode tornar atraente uma proposta ampla; dar medida ao que cada parte oferece permite aproveitar a abertura sem confundir generosidade com disponibilidade ilimitada.'
	},
	'mercury:sun': {
		tension:
			'Explicar uma proposta pode se confundir com defender o próprio valor. Quando uma dúvida sobre a entrega parece uma contestação pessoal, a conversa perde detalhes úteis; distinguir a contribuição de quem a apresenta permite rever termos sem abandonar a autoria.',
		connection:
			'Encontrar palavras para o que você quer realizar ajuda a tornar sua contribuição reconhecível. No trabalho, explicar a proposta e delimitar a responsabilidade dá forma à autoria: a outra parte pode compreender o que está sendo oferecido sem precisar adivinhar sua intenção.',
		concentration:
			'A maneira de explicar o trabalho se aproxima da maneira de se definir. Esse encontro pode dar clareza a uma proposta, desde que reformular a explicação não pareça trair a própria direção; ajustar as palavras ajuda a tornar a contribuição mais precisa.'
	},
	'jupiter:jupiter': {
		tension:
			'O desejo de crescer pode ampliar uma aposta que já parecia promissora. A questão profissional é verificar se o novo alcance acrescenta possibilidades reais ou apenas aumenta a promessa: dividir a expansão em etapas preserva a ambição sem comprometer de uma vez todos os recursos.',
		connection:
			'Uma perspectiva de crescimento pode encontrar apoio naquilo que já dá sentido ao trabalho. A abertura permite ampliar uma contribuição com continuidade, desde que o alcance desejado venha acompanhado do tempo, dos recursos e dos acordos necessários para realizá-lo.',
		concentration:
			'A vontade de expandir encontra suas próprias expectativas de futuro. O trabalho pode parecer pedir uma escala maior; distinguir crescimento de excesso permite escolher o que merece ser ampliado e o que precisa primeiro ganhar sustentação.'
	}
};

const targets: Record<string, { work: string; tension: string; opening: string }> = {
	sun: {
		work: 'a autoria e a direção que você assume no trabalho',
		tension: 'defender uma imagem de competência antes de esclarecer a contribuição',
		opening: 'mostrar uma contribuição delimitada e assumir a parte que lhe pertence'
	},
	moon: {
		work: 'as condições emocionais que permitem sustentar uma rotina de trabalho',
		tension: 'buscar segurança aceitando uma rotina que não comporta suas necessidades',
		opening: 'reconhecer o apoio necessário para participar com continuidade'
	},
	mercury: {
		work: 'o entendimento de informações, propostas e combinados de trabalho',
		tension: 'fechar um acordo com uma parte importante ainda subentendida',
		opening: 'transformar uma ideia em termos que possam ser compreendidos e revistos'
	},
	venus: {
		work: 'o valor atribuído ao que você oferece e recebe pelo trabalho',
		tension:
			'preservar uma relação agradável por meio de concessões que desvalorizam a contribuição',
		opening: 'negociar uma troca que inclua tanto interesse quanto reciprocidade'
	},
	mars: {
		work: 'a iniciativa necessária para tirar uma proposta do papel',
		tension: 'responder a cada resistência como se fosse preciso conquistar tudo pela força',
		opening: 'delimitar uma ação que faça o projeto avançar sem consumir toda a energia disponível'
	},
	jupiter: {
		work: 'o alcance que você deseja dar a uma contribuição',
		tension: 'assumir uma expansão antes de saber como sustentá-la',
		opening: 'ligar o horizonte de crescimento a uma etapa realizável'
	},
	saturn: {
		work: 'a responsabilidade que dá continuidade ao trabalho',
		tension: 'confundir confiabilidade com aceitar toda exigência',
		opening: 'definir os limites que tornam um compromisso possível de cumprir'
	},
	uranus: {
		work: 'a liberdade para escolher métodos e formas de participação',
		tension: 'romper uma estrutura inteira para mudar uma regra específica',
		opening: 'experimentar outra forma de trabalhar preservando o que ainda oferece sustentação'
	},
	neptune: {
		work: 'o sentido e a inspiração que você procura no trabalho',
		tension: 'preencher com expectativa uma condição que ainda não foi esclarecida',
		opening: 'dar uma forma verificável à contribuição que uma inspiração sugere'
	},
	pluto: {
		work: 'o espaço de decisão e os apegos envolvidos numa direção profissional',
		tension: 'manter uma disputa pelo controle mesmo quando ela consome o propósito do trabalho',
		opening: 'renegociar uma posição sem precisar controlar a resposta inteira'
	}
};
const movements: Record<string, { verb: string; noun: string; excess: string }> = {
	sun: {
		verb: 'afirmar sua participação',
		noun: 'a necessidade de se posicionar',
		excess: 'fazer da entrega uma prova de valor pessoal'
	},
	moon: {
		verb: 'acolher uma reação ao ambiente',
		noun: 'a necessidade de conforto e pertencimento',
		excess: 'dar a uma impressão passageira o poder de decidir um compromisso duradouro'
	},
	mercury: {
		verb: 'formular perguntas e esclarecer uma proposta',
		noun: 'o esclarecimento dos termos',
		excess: 'prolongar a discussão sem chegar a uma definição suficiente'
	},
	venus: {
		verb: 'reconhecer uma afinidade e negociar uma troca',
		noun: 'o interesse em preservar uma boa relação',
		excess: 'concordar para manter a harmonia e ocultar o custo da concessão'
	},
	mars: {
		verb: 'agir e abrir espaço para uma iniciativa',
		noun: 'a urgência de fazer avançar',
		excess: 'acelerar a execução antes de compreender a resistência'
	},
	jupiter: {
		verb: 'ampliar o alcance de uma proposta',
		noun: 'o desejo de crescer',
		excess: 'aumentar a promessa além do que a execução comporta'
	},
	saturn: {
		verb: 'dar estrutura e limite ao esforço',
		noun: 'a cobrança por consistência',
		excess: 'medir comprometimento apenas pela quantidade de obrigação aceita'
	},
	uranus: {
		verb: 'experimentar uma alternativa ao modo habitual',
		noun: 'a necessidade de autonomia',
		excess: 'tratar toda continuidade como impedimento à mudança'
	},
	neptune: {
		verb: 'imaginar outro sentido para a contribuição',
		noun: 'a abertura à inspiração',
		excess: 'tomar uma visão desejável como condição já garantida'
	},
	pluto: {
		verb: 'rever um apego ou uma posição de controle',
		noun: 'a pressão para transformar uma posição',
		excess: 'intensificar uma disputa para evitar reconhecer uma perda de sentido'
	}
};

function mode(c: TemporalContact): keyof Modes {
	return c.aspect === 'square' || c.aspect === 'opposition'
		? 'tension'
		: c.aspect === 'conjunction'
			? 'concentration'
			: 'connection';
}
function professionalRelation(c: TemporalContact) {
	const direct = relations[`${c.transit}:${c.natal}`];
	if (direct) return direct[mode(c)];
	const a = movements[c.transit],
		b = targets[c.natal];
	if (!a || !b) throw new Error('Corpo sem relação profissional disponível.');
	if (mode(c) === 'tension')
		return `Ao tentar ${a.verb}, você pode encontrar um limite que envolve ${b.work}. O atrito está em ${b.tension}: ${a.noun} tende a aumentar o problema quando leva a ${a.excess}. A mudança útil é ${b.opening}, para que a resposta contribua para o trabalho em vez de apenas aliviar a pressão.`;
	if (mode(c) === 'concentration')
		return `Neste contato, ${a.noun} se concentra neste ponto: ${b.work}. A iniciativa de ${a.verb} pode ganhar importância justamente por tocar uma escolha profissional; distinguir as duas necessidades permite ${b.opening}, sem precisar ${a.excess}.`;
	return `A possibilidade de ${a.verb} pode apoiar ${b.work}. Esse encontro favorece ${b.opening}; a facilidade tem alcance quando vira uma participação definida, sem se perder na tendência a ${a.excess}.`;
}

const houseApplications: Record<number, string> = {
	1: 'Como o alvo está na casa 1, a escolha profissional passa pela maneira de se apresentar e iniciar. A questão ganha forma no que você assume por decisão própria, sem depender de que a reação do ambiente defina de antemão seu lugar.',
	2: 'Com o alvo na casa 2, essa dinâmica toca o que você consegue oferecer e sustentar com seus recursos. A escolha profissional precisa caber no tempo, na energia e no valor atribuídos à contribuição; desejar o caminho e conseguir mantê-lo são partes do mesmo acordo.',
	3: 'Na casa 3, a relação ganha forma nas conversas, na aprendizagem próxima e na circulação de informação. A maneira de explicar uma tarefa ou uma proposta interfere no trabalho possível: esclarecer uma diferença de entendimento pode mudar a execução antes de exigir mais esforço.',
	4: 'Com o alvo na casa 4, a sustentação do trabalho inclui a base a partir da qual você participa. Uma direção profissional precisa encontrar lugar na vida privada; preservar essa base pode mudar o ritmo ou o alcance de uma escolha sem retirar seu valor.',
	5: 'Na casa 5, a questão profissional passa pelo espaço para criar e reconhecer sua marca no que faz. Uma contribuição pode precisar de experimentação antes de virar entrega; dar forma ao gesto autoral evita medir sua potência apenas pela aprovação imediata.',
	6: 'Com o alvo na casa 6, a relação se torna concreta na organização das tarefas e na repetição do esforço. Uma escolha só se sustenta se couber na rotina: ajustar método, divisão de trabalho ou carga pode resolver algo que mais empenho, sozinho, não resolveria.',
	7: 'Na casa 7, essa dinâmica toca a participação de outra pessoa nos acordos de trabalho. A própria intenção não estabelece a parte do outro; explicitar o que cada lado assume permite negociar uma diferença sem transformar a parceria numa disputa por quem cede mais.',
	8: 'Com o alvo na casa 8, a escolha profissional envolve o que depende de contribuição, confiança ou recursos compartilhados. É preciso distinguir o que você decide do que exige acordo: essa diferença dá forma à interdependência sem exigir controle sobre todas as respostas.',
	9: 'Na casa 9, a questão toca a formação e o horizonte que orientam uma direção profissional. Um caminho pode fazer sentido antes de estar viável; relacionar a visão maior à aprendizagem necessária permite ampliar a perspectiva sem tratar convicção como preparo concluído.',
	10: 'Com o alvo na casa 10, essa relação participa diretamente da direção profissional e da responsabilidade visível. O que você aceita representar precisa corresponder ao que consegue assumir: tornar essa medida clara dá consistência à presença sem exigir disponibilidade total.',
	11: 'Na casa 11, a questão profissional passa por redes, projetos coletivos e expectativas de futuro. Encontrar afinidade com uma proposta não define sua função nela; uma contribuição delimitada permite pertencer sem diluir a própria responsabilidade na vontade do grupo.',
	12: 'Com o alvo na casa 12, a elaboração reservada e o trabalho pouco visível também participam dessa escolha. Dar tempo ao que ainda precisa ganhar forma pode proteger a contribuição; isso difere de permanecer indefinidamente numa preparação que nunca encontra lugar para aparecer.'
};

/** Additional product-specific interpretation; the caller supplies the natal/sign reading. */
export function careerContactMeaning(c: TemporalContact, natal: Position): CareerMeaning {
	if (c.natal !== natal.body)
		throw new Error('O alvo profissional não corresponde à posição natal.');
	const claim = professionalRelation(c);
	const house = natal.house ? houseApplications[natal.house] : undefined;
	if (natal.house && !house) throw new Error('Casa profissional inválida.');
	return {
		claim,
		text: `${claim}${house ? `\n\n${house}` : ''}`,
		factIds: [c.id, natal.factId, ...(natal.house ? [`house-${natal.house}`] : [])],
		relation: `Aplicação profissional de ${c.transit}→${c.natal}; ${c.aspect} muda a relação entre as necessidades; ${natal.house ? `casa natal ${natal.house} delimita onde a escolha ganha forma` : 'sem localização por casa indisponível'}.`
	};
}

/** Inputs are the selected continuities, never all daily contacts or invented durations. */
export function careerPeriodSynthesis(entries: readonly CareerContact[]): CareerMeaning | null {
	const contacts = entries.slice(0, 3);
	if (!contacts.length) return null;
	contacts.forEach(({ contact, natal }) => {
		if (contact.natal !== natal.body) throw new Error('Alvo divergente na síntese profissional.');
	});
	const transit = (body: string) => contacts.find(({ contact }) => contact.transit === body);
	const saturn = transit('saturn');
	const ideal =
		transit('neptune') ??
		contacts.find((entry) => entry !== saturn && entry.contact.natal === 'neptune');
	const hasTension = contacts.some(({ contact }) => mode(contact) === 'tension');
	let basis: CareerContact[];
	let authoredCombination = true;
	let claim: string;
	if (saturn && ideal && saturn !== ideal) {
		basis = [saturn, ideal];
		claim = hasTension
			? 'O conjunto aproxima duas perguntas profissionais: o que você consegue sustentar e que sentido vale preservar nesse esforço. A cobrança por consistência não resolve, sozinha, uma dúvida sobre o caminho; uma visão inspiradora também não elimina os limites da execução. Rever o ideal e delimitar o compromisso permite construir uma direção que tenha sentido sem exigir que você prove seu valor aceitando tudo.'
			: 'O conjunto liga a construção de um compromisso à busca de sentido no trabalho. Dar contorno à contribuição ajuda a inspiração a encontrar continuidade: a direção desejada pode ganhar forma numa responsabilidade que você consegue manter, sem precisar ficar inteiramente definida antes do primeiro passo.';
	} else if (saturn && transit('jupiter')) {
		basis = [saturn, transit('jupiter')!];
		claim = hasTension
			? 'A expansão e a necessidade de sustentação colocam ritmos diferentes na mesma escolha profissional. Crescer de uma vez pode comprometer a continuidade; limitar tudo ao que já está garantido pode esvaziar a direção desejada. Uma ampliação por etapas preserva a ambição enquanto torna visível o esforço que cada novo compromisso exige.'
			: 'A possibilidade de ampliar o trabalho encontra apoio na construção de estrutura. O conjunto favorece uma expansão com continuidade: acrescentar alcance a uma contribuição já delimitada permite crescer sem depender apenas de entusiasmo nem transformar prudência em imobilidade.';
	} else if (saturn && transit('uranus')) {
		basis = [saturn, transit('uranus')!];
		claim = hasTension
			? 'O conjunto coloca liberdade de método e continuidade do compromisso em atrito. Mudar a maneira de trabalhar pode preservar uma responsabilidade que o formato antigo já não comporta; distinguir o propósito da regra permite experimentar sem tratar toda mudança como abandono ou toda permanência como prisão.'
			: 'A possibilidade de experimentar outro método encontra apoio numa estrutura que oferece continuidade. A mudança pode tornar um compromisso mais viável, em vez de exigir que você escolha entre manter tudo como está ou começar do zero.';
	} else if (transit('mars') && transit('venus')) {
		basis = [transit('mars')!, transit('venus')!];
		claim = hasTension
			? 'Agir e preservar uma troca satisfatória podem pedir respostas diferentes. Avançar sem combinar o alcance da participação tende a criar um custo que depois aparece na relação; negociar o que cada parte oferece permite sustentar a iniciativa sem fazer da harmonia uma obrigação de ceder.'
			: 'A iniciativa encontra apoio na definição de uma troca que faça sentido. Explicitar o que você quer oferecer e o que precisa receber permite que o impulso de agir se transforme numa participação negociável, com espaço tanto para desejo quanto para reciprocidade.';
	} else if (contacts.length === 1) {
		authoredCombination = false;
		basis = [contacts[0]];
		claim = professionalRelation(contacts[0].contact);
	} else {
		authoredCombination = false;
		const first = contacts[0],
			second = contacts[1];
		basis = [first, second];
		const a = targets[first.contact.natal],
			b = targets[second.contact.natal];
		if (!a || !b) throw new Error('Alvo sem síntese profissional.');
		claim =
			first.contact.natal === second.contact.natal
				? `As continuidades convergem sobre ${a.work}. Nesse ponto, ${movements[first.contact.transit].noun} e ${movements[second.contact.transit].noun} participam da mesma escolha: ${a.opening} ajuda a dar lugar a ambas, sem fazer de ${movements[first.contact.transit].excess} a resposta automática à outra exigência.`
				: `O conjunto aproxima duas frentes: ${a.work} e ${b.work}. Nesse encontro, ${a.opening} modifica as condições para ${b.opening}: o que você decide numa dessas frentes precisa caber no compromisso assumido na outra. ${hasTension ? 'O atrito torna importante rever a forma de participação, em vez de apenas acrescentar esforço às duas demandas.' : 'Essa ligação oferece uma continuidade possível entre intenção e execução, sem dispensar a definição do alcance de cada parte.'}`;
	}
	if (authoredCombination) {
		const a = targets[basis[0].contact.natal],
			b = targets[basis[1].contact.natal];
		if (!a || !b) throw new Error('Alvo sem ligação profissional disponível.');
		claim +=
			basis[0].contact.natal === basis[1].contact.natal
				? ` As duas continuidades alcançam ${a.work}: ${a.opening} dá uma forma comum às exigências, enquanto ${a.tension} tende a concentrar o custo delas numa única escolha.`
				: ` A relação se torna concreta entre ${a.work} e ${b.work}. Nesse encontro, ${a.opening} depende também de ${b.opening}: as duas frentes precisam caber na mesma proposta para que uma não prometa o que a outra não consegue sustentar.`;
	}
	for (const entry of contacts.filter((entry) => !basis.includes(entry))) {
		claim += `\n\n${thirdContinuity(entry.contact, basis)}`;
	}
	const houses = [
		...new Set(contacts.map(({ natal }) => natal.house).filter((v): v is number => v !== null))
	];
	let setting = '';
	if (contacts.every(({ natal }) => natal.house === 10))
		setting =
			' Como esses alvos se reúnem na casa 10, o ponto de encontro é a direção que você assume diante do mundo: definir o que representa e o que entrega ajuda a aproximar a imagem profissional das condições reais de participação.';
	else if (houses.includes(2) && houses.includes(10))
		setting =
			' A ligação entre as casas 2 e 10 torna concreta a relação entre recursos e direção profissional: ocupar um lugar precisa caber no valor, no tempo e nos meios que você pode oferecer.';
	else if (houses.includes(6) && houses.includes(10))
		setting =
			' A ligação entre as casas 6 e 10 aproxima a direção desejada da rotina que a torna possível: ajustar a execução pode sustentar uma escolha profissional sem exigir que o cotidiano comporte esforço ilimitado.';
	else if (
		houses.length === 1 &&
		contacts.every(({ natal }) => natal.house !== null) &&
		houseApplications[houses[0]]
	)
		setting = ` ${houseApplications[houses[0]]}`;
	claim += setting;
	return {
		claim,
		text: claim,
		factIds: [
			...new Set(
				contacts.flatMap(({ contact, natal }) => [
					contact.id,
					natal.factId,
					...(natal.house ? [`house-${natal.house}`] : [])
				])
			)
		],
		relation: `Síntese profissional das continuidades fornecidas: ${contacts.map(({ contact }) => `${contact.transit}→${contact.natal}/${contact.aspect}`).join('; ')}. Relação entre os compromissos; casas usadas somente quando presentes nos fatos.`
	};
}

function thirdContinuity(c: TemporalContact, basis: readonly CareerContact[]): string {
	const target = targets[c.natal];
	const movement = movements[c.transit];
	if (!target || !movement) throw new Error('Corpo sem continuidade profissional disponível.');
	if (c.transit === 'pluto' && c.natal === 'neptune') {
		return mode(c) === 'connection'
			? 'A revisão dos apegos acrescenta uma possibilidade a esse encontro: transformar a imagem de realização pode liberar o sentido do trabalho de uma única forma de alcançá-lo. Isso ajuda a delimitar um compromisso sem sentir que toda mudança de formato abandona o ideal.'
			: 'O apego a uma imagem de realização torna essa revisão mais delicada: reconhecer o custo de um ideal pode parecer perder o próprio caminho. A distinção decisiva é preservar o sentido que ainda inspira e transformar a forma de alcançá-lo; assim, delimitar o compromisso não precisa significar desistir do que importa.';
	}
	const shared = basis.some(({ contact }) => contact.natal === c.natal);
	const setting = shared
		? `Essa mesma escolha também recebe ${movement.noun}.`
		: `O conjunto alcança ainda ${target.work}: ${movement.noun} também participa dessa escolha.`;
	if (mode(c) === 'tension') {
		return `${setting} A tentativa de ${movement.verb} pode acrescentar pressão quando se transforma em ${movement.excess}. Por isso, ${target.opening} modifica o alcance dos compromissos anteriores: uma decisão que ignora esse custo pode parecer coerente no plano e tornar-se difícil de sustentar.`;
	}
	if (mode(c) === 'concentration') {
		return `${setting} Como esse impulso se mistura à importância da própria escolha, ${target.opening} permite dar a ele uma forma delimitada. Isso evita resolver todas as exigências com o mesmo gesto e ajuda a distribuir a responsabilidade sem perder a direção comum.`;
	}
	return `${setting} A possibilidade de ${movement.verb} oferece apoio para ${target.opening}. Essa contribuição torna mais viável o acordo anterior, desde que a facilidade não seja usada para ampliar outra vez o compromisso além do que pode ser mantido.`;
}
