import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, aspectNames, bodyNames, functions, signs } from './canon';
import type { EditorialTrace } from './career';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import { houseAreas } from './natal-canon';
import {
	assertPillarsProjection,
	PILLARS_READING_VERSION,
	pillarsMethod,
	type PillarsData
} from './pillars-facts';

// Function-specific vocabulary: these are symbolic possibilities, not personality diagnoses.
const ways = [
	{
		choose: 'assumir uma iniciativa delimitada',
		need: 'espaço para reagir e recuperar autonomia',
		start: 'propor uma tentativa concreta',
		cost: 'responder antes de escutar o que a situação pede'
	},
	{
		choose: 'construir algo que possa ganhar continuidade',
		need: 'tempo, previsibilidade e contato com recursos disponíveis',
		start: 'verificar o terreno antes de avançar',
		cost: 'preservar uma rotina depois que ela perdeu utilidade'
	},
	{
		choose: 'ligar informações e abrir uma conversa',
		need: 'palavras, circulação e mais de uma perspectiva',
		start: 'perguntar e comparar alternativas',
		cost: 'multiplicar explicações sem escolher o que testar'
	},
	{
		choose: 'participar cuidando do vínculo e da história',
		need: 'acolhimento, familiaridade e respeito ao próprio ritmo',
		start: 'perceber se há espaço para criar confiança',
		cost: 'cuidar sem verificar se existe disponibilidade ou reciprocidade'
	},
	{
		choose: 'dar forma própria a uma participação visível',
		need: 'calor, reconhecimento e liberdade para brincar',
		start: 'mostrar uma intenção e buscar uma resposta',
		cost: 'medir o valor da experiência apenas pela reação recebida'
	},
	{
		choose: 'aperfeiçoar uma contribuição por meio da prática',
		need: 'clareza, organização e possibilidade de fazer ajustes',
		start: 'observar detalhes e identificar o próximo procedimento',
		cost: 'adiar a participação até eliminar toda imperfeição'
	},
	{
		choose: 'participar de uma escolha que considere as partes',
		need: 'troca, escuta e acordos que possam ser revistos',
		start: 'procurar uma medida comum antes de decidir',
		cost: 'buscar concordância quando uma diferença precisa ser assumida'
	},
	{
		choose: 'investigar o que importa e sustentar uma transformação',
		need: 'confiança, privacidade e profundidade na troca',
		start: 'perceber o que merece aproximação e o que pede limite',
		cost: 'transformar cautela em teste permanente de lealdade'
	},
	{
		choose: 'explorar um sentido e ampliar a experiência',
		need: 'horizonte, movimento e uma razão para continuar',
		start: 'propor uma possibilidade e experimentar o percurso',
		cost: 'prometer uma expansão sem medir os recursos atuais'
	},
	{
		choose: 'construir uma realização com responsabilidade',
		need: 'estrutura, limites claros e continuidade possível',
		start: 'identificar o compromisso e ordenar as etapas',
		cost: 'tratar toda necessidade de apoio como falta de competência'
	},
	{
		choose: 'participar com autonomia e revisar o que se tornou hábito',
		need: 'espaço próprio, amizade e liberdade de perspectiva',
		start: 'perceber alternativas ao acordo mais conhecido',
		cost: 'manter distância mesmo quando uma aproximação seria possível'
	},
	{
		choose: 'dar lugar à imaginação e à sensibilidade na experiência',
		need: 'pausa, permeabilidade e espaço para elaborar impressões',
		start: 'acolher o clima e procurar uma forma de expressão',
		cost: 'absorver pedidos sem distinguir o que é possível oferecer'
	}
];
const elements = ['fogo', 'terra', 'ar', 'água'];
const modalities = ['cardinal', 'fixa', 'mutável'];
const elementUse = [
	'mobilizar uma tentativa',
	'dar consistência ao que existe',
	'comparar e comunicar perspectivas',
	'perceber vínculo e significado afetivo'
];
const modalityUse = ['iniciar uma mudança', 'sustentar um curso', 'adaptar o percurso'];
const unique = (ids: readonly string[]) => [...new Set(ids)];
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const required = (g: FactGraph, body: string) => {
	const p = g.positions.find((p) => p.body === body);
	if (!p) throw Error(`Função natal ausente dos Três Pilares: ${body}.`);
	return p;
};
export function pillarsContext(text = '') {
	const lower = text.toLocaleLowerCase('pt-BR');
	if (/cansa|descanso|sobrecarg|esgot/.test(lower))
		return {
			key: 'workload' as const,
			focus:
				'A pergunta sobre descanso pede separar o que você gostaria de realizar da capacidade disponível hoje.',
			task: 'reduza uma demanda pequena, explicite a necessidade de pausa e observe como apresenta esse limite',
			question: 'Que necessidade precisa ser atendida antes de insistir no primeiro impulso?'
		};
	if (/relaç|vínculo|conversa|confiança|conviv/.test(lower))
		return {
			key: 'relationships' as const,
			focus:
				'A pergunta sobre convivência pede comparar intenção, necessidade e a forma de apresentar ambas à outra pessoa.',
			task: 'prepare uma conversa breve, distinguindo o que deseja propor, o que precisa preservar e como fará o convite',
			question:
				'Como apresentar uma intenção sem pedir que a outra pessoa adivinhe sua necessidade?'
		};
	if (/estud|aprender|curso/.test(lower))
		return {
			key: 'study' as const,
			focus:
				'A pergunta sobre aprendizagem pede observar interesse, condição para aprender e a maneira de entrar na atividade.',
			task: 'escolha um exercício gratuito já acessível, formule uma intenção e reserve uma condição de apoio antes de começar',
			question: 'Que condição torna uma pequena tentativa de aprendizagem possível hoje?'
		};
	return {
		key: 'general' as const,
		focus:
			'Uma situação cotidiana permite comparar o que você escolhe, o que precisa e como dá o primeiro passo.',
		task: 'escolha uma situação reversível já disponível e descreva a intenção, a necessidade e a forma de começar',
		question:
			'Em qual situação sua intenção, sua necessidade e o primeiro movimento pedem respostas diferentes?'
	};
}
export function pillarsSelection(g: FactGraph) {
	const ruler = g.asc!.ruler;
	return g.aspects
		.filter(
			(a) =>
				[a.first, a.second].some((b) => ['sun', 'moon', ruler].includes(b)) &&
				!([a.first, a.second].includes('sun') && [a.first, a.second].includes('moon'))
		)
		.map((aspect) => ({
			aspect,
			score:
				[aspect.first, aspect.second].filter((b) => ['sun', 'moon'].includes(b)).length *
					pillarsMethod.selection.luminaryWeight +
				([aspect.first, aspect.second].includes(ruler) ? pillarsMethod.selection.rulerWeight : 0) +
				6 -
				aspect.orb
		}))
		.sort((a, b) => b.score - a.score || a.aspect.factId.localeCompare(b.aspect.factId))
		.slice(0, pillarsMethod.selection.maximumAspects);
}
function relation(g: FactGraph, a: Aspect) {
	const one = required(g, a.first),
		two = required(g, a.second);
	const move = (p: typeof one) =>
		p.body === 'moon' ? `preservar ${ways[p.sign].need}` : ways[p.sign].choose;
	const first = move(one),
		second = move(two),
		source = `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]}, com orbe de ${a.orb.toFixed(2)}°.`;
	const dynamics: Record<string, string> = {
		conjunction: `Dois pedidos se aproximam no mesmo gesto: ${first} e ${second}. Pode ser difícil perceber qual vem primeiro. A função de ${functions[a.first]} aparece junto da de ${functions[a.second]}; nomear cada uma oferece espaço para escolher. ${source} Observe o que muda ao experimentar separadamente esses pedidos. A comparação com o gesto conjunto ajuda a perceber a contribuição de cada função.`,
		sextile: `Há uma oportunidade de aproximar dois pedidos: ${first} e ${second}. A cooperação entre a função de ${functions[a.first]} e a de ${functions[a.second]} depende de uma ocasião em que ambas possam participar. ${source} Escolha uma tentativa pequena e observe se a segunda condição oferece apoio à primeira. Registre também o que ainda depende de iniciativa ou aprendizado.`,
		square: `Ao tentar ${first}, a função de ${functions[a.first]} pode disputar tempo ou recursos com a de ${functions[a.second]}, que procura ${second}. A dificuldade prática pode estar em decidir a sequência e o limite de cada pedido. ${source} Verifique qual pedido fica sem espaço quando você tenta responder a ambos de uma só vez. Uma mudança de ordem pode ser mais útil que insistir na simultaneidade.`,
		trine: `Uma rota de continuidade liga dois movimentos: ${first} e ${second}. A função de ${functions[a.first]} pode encontrar apoio na de ${functions[a.second]}, inclusive quando essa colaboração já parece habitual. ${source} Examine o resultado dessa familiaridade. Ela conserva um recurso útil ou prolonga uma resposta que perdeu sentido? Compare o efeito com a intenção inicial.`,
		opposition: `De um lado, ${first}; do outro, ${second}. O par entre a função de ${functions[a.first]} e a de ${functions[a.second]} convida a examinar quem representa cada pedido em uma situação concreta. ${source} Se uma exigência parecer vir somente de fora, descreva o acordo ou limite efetivo. Reconhecer os dois pedidos permite negociar o que pode ser atendido agora.`
	};
	return dynamics[a.kind];
}
export function composeReconstructedPillars(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	assertPillarsProjection(input, c);
	const g = normalizeFactGraph(c),
		data = c.data as unknown as PillarsData;
	if (!g.asc) throw Error('Ascendente necessário para integrar os Três Pilares.');
	const sun = required(g, 'sun'),
		moon = required(g, 'moon'),
		ruler = required(g, g.asc.ruler),
		solar = ways[sun.sign],
		lunar = ways[moon.sign],
		asc = ways[g.asc.sign],
		regency = ways[ruler.sign],
		binding = pillarsContext(input.context),
		core = unique([sun.factId, moon.factId, ...g.asc.factIds]);
	const selected = pillarsSelection(g),
		luminary = g.aspects.find(
			(a) => [a.first, a.second].includes('sun') && [a.first, a.second].includes('moon')
		);
	const trio = [
		{ name: 'Sol', sign: sun.sign },
		{ name: 'Lua', sign: moon.sign },
		{ name: 'Ascendente', sign: g.asc.sign }
	];
	const pairs = [
		[trio[0], trio[1]],
		[trio[0], trio[2]],
		[trio[1], trio[2]]
	];
	const similarities = pairs
		.map(([a, b]) => {
			const sameElement = a.sign % 4 === b.sign % 4,
				sameMode = a.sign % 3 === b.sign % 3;
			return `${a.name} e ${b.name}: ${sameElement ? `compartilham ${elements[a.sign % 4]}, uma afinidade com ${elementUse[a.sign % 4]}` : `combinam ${elements[a.sign % 4]} e ${elements[b.sign % 4]}, pedindo lugar para ${elementUse[a.sign % 4]} e para ${elementUse[b.sign % 4]}`}; ${sameMode ? `ambos têm modalidade ${modalities[a.sign % 3]}, com ênfase em ${modalityUse[a.sign % 3]}` : `suas modalidades ${modalities[a.sign % 3]} e ${modalities[b.sign % 3]} sugerem ritmos diferentes: ${modalityUse[a.sign % 3]} e ${modalityUse[b.sign % 3]}`}.`;
		})
		.join('\n\n');
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const ids = unique(factIds);
		sections.push({ title, text, factIds: ids });
		plan.push({ title, factIds: ids, role });
	};
	add(
		'Uma cena, três funções em relação',
		`${label(sun)}, ${label(moon)} e Ascendente em ${signs[g.asc.sign]} participam da mesma experiência com tarefas diferentes. Como hipótese, uma intenção pode procurar ${solar.choose}; a necessidade de apoio pode pedir ${lunar.need}; o primeiro movimento pode ser ${asc.start}. A integração começa ao dar lugar às três funções antes de exigir uma resposta única. Não é necessário sentir as três com a mesma força ou concordar com todos os termos.\n\nImagine uma situação pequena que você realmente viveu. Descreva o que quis fazer, o que tornou a participação possível e como entrou em contato com a situação. Uma iniciativa pode parecer coerente com o desejo e ainda consumir um recurso necessário; uma pausa pode proteger a necessidade e adiar uma participação desejada. Compare a sequência concreta, sem converter a diferença em falha pessoal.\n\nO regente do Ascendente, ${bodyNames[ruler.body]}, acrescenta uma via de ${functions[ruler.body]} a esse primeiro movimento. Seu signo, sua casa calculada e suas relações serão examinados junto do trio. A pergunta central é qual ajuste permite começar sem perder de vista tanto a intenção quanto a necessidade.`,
		core,
		'integrated-trio'
	);
	add(
		'Distinguir intenção, necessidade e apresentação',
		`A função solar organiza autoria e participação; a lunar trata de segurança e pertencimento; o Ascendente descreve uma hipótese sobre a entrada na experiência. São funções relacionadas, não três personagens obrigatórios. Neste trio, escolher ${solar.choose} não significa que a necessidade de ${lunar.need} desapareça. Começar por ${asc.start} também não revela, por si só, tudo o que você deseja ou sente.\n\nUma pessoa pode receber seu primeiro gesto e interpretar esse gesto como uma intenção definitiva. Antes de aceitar essa descrição, verifique se a forma de começar comunica o que importa. Por exemplo, uma resposta rápida pode precisar de um segundo momento de escuta; uma entrada cautelosa pode precisar de uma frase que torne o interesse visível. O ajuste deve partir do ocorrido, sem presumir que esse exemplo seja seu hábito.\n\nUse três frases separadas: “quero participar desta maneira”, “para isso preciso desta condição” e “posso começar por este gesto”. Depois procure uma ação que respeite as três. Se o contexto impedir uma delas, explicite o limite em vez de concluir que o mapa exige adaptação a qualquer custo.`,
		core,
		'function-distinction'
	);
	add(
		'Afinidades e diferenças de ritmo no trio',
		`${similarities}\n\nEssas comparações pertencem à linguagem de elementos e modalidades. Uma afinidade simbólica não é um aspecto geométrico; signos de mesmo elemento não garantem um trígono entre as posições exatas. A seção seguinte usa longitudes e orbes para verificar a relação Sol–Lua.\n\nNo cotidiano, uma afinidade pode facilitar o entendimento e também repetir uma preferência sem revisão. Uma diferença pode exigir negociação e oferecer um recurso que a outra função não estava usando. Em vez de classificar o trio como fácil ou difícil, observe se a situação precisa de iniciativa, continuidade ou adaptação e qual das três funções está recebendo menos espaço. Encontre também um caso em que o ritmo sugerido não apareceu. Esse contraste ajuda a distinguir a hipótese simbólica dos hábitos aprendidos e das condições concretas da situação.`,
		core,
		'trio-rhythm'
	);
	add(
		'Sol e Lua: a escolha encontra sua condição de apoio',
		`${luminary ? relation(g, luminary) : 'Não há aspecto maior Sol–Lua dentro dos orbes desta edição. Isso limita a afirmação geométrica: não será inventada uma ligação por aparência dos signos. A ausência de aspecto selecionado também não significa ausência de relação entre intenção e necessidade na vida cotidiana.'}\n\nAqui, a intenção de ${solar.choose} deve conversar com a necessidade de ${lunar.need}. Pergunte se uma escolha desejada dispõe de uma condição mínima de apoio e se a busca de proteção deixa espaço para alguma participação. A resposta pode ser uma sequência: primeiro reconhecer a necessidade, depois testar um gesto pequeno e finalmente conferir o efeito.\n\nNão existe obrigação de equilibrar tudo imediatamente. Se os recursos faltam, ajustar o tamanho da tentativa pode ser mais útil que insistir. Se há apoio, mas a intenção continua vaga, explicitar o que você quer experimentar oferece informação nova. Registre um exemplo em que desejo e necessidade cooperaram e outro em que pediram decisões diferentes; use ambos para revisar esta interpretação.`,
		unique([...core, ...(luminary ? [luminary.factId] : [])]),
		'sun-moon'
	);
	add(
		'O Ascendente faz a ponte entre intenção e necessidade',
		`Ascendente em ${signs[g.asc.sign]} sugere observar a entrada por ${asc.start}. Esse primeiro gesto encontra o Sol, que pode buscar ${solar.choose}, e a Lua, que pode precisar de ${lunar.need}. Uma ponte útil torna a intenção compreensível e preserva uma condição de apoio; ela não precisa exibir toda a sua experiência no primeiro contato.\n\nO custo a observar nesta forma de começar é ${asc.cost}. Trate isso como uma pergunta a conferir, sem concluir que acontece com você. Procure uma situação em que o primeiro gesto ajudou o vínculo com a intenção e outra em que produziu uma impressão incompleta. Talvez falte explicar o objetivo, pedir um tempo ou dizer qual limite precisa ser respeitado. Escolha o ajuste pelo efeito observado.\n\nA proximidade de um planeta ao Ascendente será distinguida de outros contatos angulares. Nenhum contato transforma o ângulo em uma descrição total da pessoa. Aprendizagem, ambiente e a resposta de quem participa também mudam a forma de entrar na experiência.`,
		core,
		'asc-bridge'
	);
	add(
		'Regente do Ascendente: por onde a ponte ganha prática',
		`${bodyNames[ruler.body]} rege modernamente o Ascendente em ${signs[g.asc.sign]} e ocupa ${signs[ruler.sign]}${data.regent.house === null ? ', com casa indisponível' : `, na casa ${data.regent.house}`}. A função de ${functions[ruler.body]} acrescenta uma via para começar: ${regency.choose}. ${data.regent.house === null ? 'Sem casa calculável, esta edição não atribui um campo de experiência ao regente.' : `O campo de ${houseAreas[data.regent.house - 1]} oferece uma hipótese de onde observar essa função, sem exigir um evento nessa área.`}\n\nLeve essa via de volta ao trio. Ela ajuda a apresentar a intenção de ${solar.choose} ou ocupa o lugar da escolha? Ela permite pedir ${lunar.need} ou tenta resolver essa necessidade sem nomeá-la? O regente funciona como modificador da entrada, e não como um quarto personagem que substitui Sol e Lua.\n\nObserve ainda o custo possível de ${regency.cost}. Um recurso usado em excesso pode perder utilidade. Escolha uma ocorrência concreta em que essa função ofereceu apoio e outra em que precisou de limite. Se nenhuma corresponder, conserve a pergunta sobre entrada e retire o peso da hipótese que não encontrou evidência.`,
		unique([...core, ruler.factId, 'pillars-ruler-house']),
		'asc-ruler'
	);
	const contacts = g.angleContacts.filter((a) => a.angle === 'ascendant');
	add(
		'Modificadores: relações que ganham prioridade',
		`${selected.length ? selected.map((s) => relation(g, s.aspect)).join('\n\n') : 'Não há outro aspecto maior ligado a Sol, Lua ou regente dentro desta política. A leitura preserva essa ausência e permanece no trio, sem buscar uma tensão artificial em fatores distantes.'}\n\n${contacts.length ? contacts.map((a) => `${bodyNames[a.body]} faz ${aspectNames[a.kind]} ao Ascendente, orbe ${a.orb.toFixed(2)}°: ${a.kind === 'conjunction' ? 'há proximidade longitudinal ao ângulo' : 'é um contato angular; não é proximidade ao ângulo'}. A função de ${functions[a.body]} pode modificar a forma de entrar, devendo ser comparada com a intenção solar e a necessidade lunar.`).join('\n') : 'Nenhum contato maior ao Ascendente está dentro de 3°. Sem proximidade calculada, nenhum planeta será chamado de angular nesta leitura.'}\n\nEsses vínculos ajudam a comparar o que facilita a integração do trio e o que pede negociação entre suas funções. Retome uma cena concreta: qual relação esclarece sua escolha, sua necessidade de apoio ou a maneira de começar? Se nenhuma ajudar a compreender o ocorrido, preserve essa diferença ao revisar a leitura.`,
		unique([
			...core,
			...selected.map((s) => s.aspect.factId),
			...selected.flatMap((s) => [
				required(g, s.aspect.first).factId,
				required(g, s.aspect.second).factId
			]),
			...contacts.map((a) => a.factId),
			...contacts.map((a) => required(g, a.body).factId)
		]),
		'modifiers'
	);
	add(
		'Sua pergunta orienta o uso da leitura',
		`${input.context ? `Você declarou: “${input.context}”.` : 'Nenhum contexto pessoal foi declarado; use uma situação cotidiana que você possa escolher livremente.'} ${binding.focus}\n\nO relato orienta a pergunta e o experimento. Ele não muda a posição do Sol ou da Lua, o Ascendente, o regente, os aspectos nem seus orbes. Também não autoriza deduzir sentimentos, intenções de outras pessoas ou acontecimentos que você não contou.\n\nNeste recorte, observe a intenção de ${solar.choose}, a necessidade de ${lunar.need} e a entrada por ${asc.start}. Escreva qual delas está clara e qual ainda precisa de informação. Se a situação envolver outra pessoa, formule um convite ou pedido que possa receber uma resposta diferente da esperada. Se envolver uma condição material, confirme sua disponibilidade antes de organizar a tentativa.\n\nA leitura é útil quando ajuda a formular uma pergunta melhor ou um ajuste observável. Se uma palavra não servir, substitua-a por uma descrição do ocorrido e mantenha o vínculo com a função examinada. Uma hipótese que não encontra apoio pode ser abandonada sem invalidar sua experiência.`,
		unique([...core, ...(g.contextFactId ? [g.contextFactId] : [])]),
		'declared-context'
	);
	add(
		'Experimento de integração: uma tentativa observável',
		`Reserve até vinte minutos, sem despesa: ${binding.task}. Nos primeiros cinco minutos, descreva a situação e as três frases: intenção, necessidade e primeiro gesto. Use o Sol como pergunta sobre participação, a Lua como pergunta sobre apoio e o Ascendente como pergunta sobre entrada. Não é preciso atuar de acordo com um signo.\n\nNos dez minutos seguintes, prepare ou faça apenas a parte reversível da tentativa. Experimente uma alteração pequena que aproxime ${solar.choose} da condição de ${lunar.need}; na apresentação, observe se ${asc.start} torna a proposta compreensível. A via de ${functions[ruler.body]} pode ser um recurso, desde que não substitua a escuta da situação.\n\nNos cinco minutos finais, registre o resultado, a condição disponível, o custo e uma evidência contrária à hipótese. Diferencie o que aconteceu do que você interpretou. Se houve impedimento externo, registre-o sem convertê-lo em falha do trio. Escolha entre repetir, ajustar ou abandonar o experimento; qualquer decisão deve depender do efeito observado e respeitar seus limites.`,
		unique([...core, ruler.factId]),
		'integration-experiment'
	);
	add(
		'Revisão: o trio muda de uso com a experiência',
		`Retome a cena escolhida e verifique se você conseguiu distinguir vontade, necessidade e apresentação. O valor do exercício está nessa distinção e nos ajustes possíveis. A função solar não precisa vencer a lunar, e o Ascendente não precisa esconder nenhuma das duas. Se a sequência ficou pesada, reduza a tentativa ou procure uma condição de apoio antes de repetir.\n\nPara este trio, compare a intenção de ${solar.choose} com o cuidado de ${lunar.need}. Depois examine se a entrada por ${asc.start} ajudou a comunicar ambas. O regente em ${signs[ruler.sign]} oferece a hipótese de ${regency.choose}; verifique se ela foi útil na prática, sem transformar o recurso em obrigação.\n\nGuarde uma observação que sustente a leitura e uma que a limite. Em outra situação, as funções podem receber prioridades diferentes porque o contexto mudou. O cálculo natal permanece o mesmo, enquanto o uso da interpretação pode ser revisto. Qualquer continuidade no ATV+ depende do seu consentimento próprio e deve partir das suas anotações; esta leitura não presume acompanhamento, mudança pessoal ou aceite de uma hipótese.`,
		unique([...core, ruler.factId]),
		'reflection'
	);
	const used = new Set(sections.flatMap((s) => s.factIds)),
		remaining = g.facts.filter((f) => !used.has(f.id));
	add(
		'Base natal preservada para conferência',
		remaining.map((f) => f.display.replace(/ da candidata\b/g, '')).join('\n') +
			'\n\nOs dez corpos, os ângulos disponíveis, as casas e os aspectos permanecem na base natal integral. A seleção editorial integra três funções e seus modificadores; não converte todos os fatores em uma afirmação sobre personalidade. Regência moderna, casas Placidus disponíveis e orbes nominais seguem o método registrado. Sem aplicação ou separação certificada. Afinidades de elementos e modalidades não acrescentam aspectos. Hipóteses podem ser revistas diante de evidência contrária.',
		remaining.map((f) => f.id),
		'technical-reference'
	);
	return {
		version: PILLARS_READING_VERSION,
		productId: 'three-pillars',
		title: 'Três Pilares',
		opening: `Uma cena integra três movimentos: ${solar.choose}, preservar ${lunar.need} e ${asc.start}. ${binding.focus}`,
		source:
			'Método ATVNA de integração Sol–Lua–Ascendente: leitura humanista com regência moderna, relações calculadas e contexto declarado.',
		sections,
		questions: [
			binding.question,
			`Como a via de ${functions[ruler.body]} ajuda a comunicar sua intenção e preservar a condição de apoio?`,
			'Que evidência faria você ajustar ou abandonar esta hipótese?'
		],
		practice: `Experimento privado de até vinte minutos, sem despesa: ${binding.task}. Compare intenção, necessidade e entrada; registre resultado, custo e evidência contrária.`,
		limits: c.limits,
		editorial: {
			version: PILLARS_READING_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-pillars-integrated-graph/1.0.0',
			selection: selected.map((s) => ({
				factId: s.aspect.factId,
				score: Math.round(s.score * 1000) / 1000,
				reason: 'luminary-endpoints*10+asc-ruler*7+6-orb'
			})),
			patterns: [
				...pairs.map(([a, b]) => ({
					kind: `element-${a.sign % 4 === b.sign % 4 ? 'convergence' : 'difference'}-modality-${a.sign % 3 === b.sign % 3 ? 'convergence' : 'difference'}`,
					factIds: core
				})),
				...contacts.map((a) => ({
					kind: a.kind === 'conjunction' ? 'asc-proximity' : 'asc-contact',
					factIds: [a.factId, `position-${a.body}`, 'angle-ascendant']
				}))
			],
			themes: pillarsMethod.themes.map((id) => ({
				id,
				factIds: plan.find((p) => p.role === id)!.factIds
			})),
			context: { key: binding.key, factId: g.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedPillars(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertPillarsProjection(input, c);
	} catch {
		return ['pillars-source-mismatch'];
	}
	const errors: string[] = [];
	if (
		r.productId !== 'three-pillars' ||
		r.version !== PILLARS_READING_VERSION ||
		r.editorial?.canon !== CANON_VERSION ||
		r.editorial.graph !== 'atv-pillars-integrated-graph/1.0.0'
	)
		errors.push('pillars-edition');
	if (r.sections.length !== 11 || r.sections.some((s) => s.text.length < 220))
		errors.push('pillars-depth');
	if (
		r.editorial?.plan.length !== r.sections.length ||
		r.sections.some(
			(s, i) =>
				s.title !== r.editorial?.plan[i].title ||
				JSON.stringify(s.factIds) !== JSON.stringify(r.editorial?.plan[i].factIds)
		)
	)
		errors.push('pillars-plan');
	if (pillarsMethod.themes.some((id) => !r.editorial?.themes.some((t) => t.id === id)))
		errors.push('pillars-themes');
	if (
		input.context &&
		!r.sections.some(
			(s) => s.factIds.includes('personal-context') && s.text.includes(input.context!)
		)
	)
		errors.push('pillars-context');
	if (
		r.questions.length !== 3 ||
		!r.sections.some(
			(s) => s.text.includes('evidência contrária') && s.text.includes('vinte minutos')
		)
	)
		errors.push('pillars-review');
	const narrative = r.sections.filter((s) => s.title !== 'Base natal preservada para conferência');
	const sentences = [...narrative.map((s) => s.text), r.practice].flatMap((text) =>
		text
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 100)
	);
	if (new Set(sentences).size !== sentences.length) errors.push('repeated-long-sentence');
	if (new Set(narrative.map((s) => s.text.slice(0, 100))).size !== narrative.length)
		errors.push('repeated-opening');
	if (
		/destino inevitável|sucesso garantido|sua alma|nasceu para|pipeline|fact graph|contrato interpretativo/i.test(
			[r.opening, ...narrative.map((s) => s.text), r.practice].join('\n')
		)
	)
		errors.push('voice-or-unsupported-claim');
	return errors;
}
