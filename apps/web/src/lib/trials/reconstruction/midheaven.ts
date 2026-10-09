import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, aspectNames, bodyNames, functions, signMeanings, signs } from './canon';
import type { EditorialTrace } from './career';
import { birthContext } from './birth';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import { houseAreas, natalStyles } from './natal-canon';
import {
	assertMidheavenProjection,
	MIDHEAVEN_READING_VERSION,
	midheavenMethod
} from './midheaven-facts';

const publicTasks = {
	workload:
		'delimite uma responsabilidade atual e apresente o que consegue concluir com os recursos disponíveis',
	relationships:
		'explique a parte de um compromisso compartilhado pela qual você pode responder e peça que a outra pessoa esclareça a dela',
	study:
		'mostre um pequeno resultado de aprendizagem e peça retorno sobre um critério de qualidade',
	leadership:
		'torne explícito um critério de conclusão e confirme quem decide, quem executa e quem precisa ser ouvido',
	independent:
		'apresente uma amostra pequena de sua iniciativa com alcance e condição de conclusão definidos',
	transition:
		'conheça uma responsabilidade de uma alternativa que considera e compare suas exigências com sua disponibilidade atual',
	general:
		'escolha uma contribuição pequena, diga como será reconhecida sua conclusão e peça um retorno concreto'
};
const unique = (ids: readonly string[]) => [...new Set(ids)];
const required = (g: FactGraph, body: string) => {
	const p = g.positions.find((p) => p.body === body);
	if (!p) throw Error(`Fator necessário ao Meio do Céu ausente: ${body}.`);
	return p;
};
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const sort = <T extends { orb: number; factId: string }>(items: readonly T[]) =>
	[...items].sort((a, b) => a.orb - b.orb || a.factId.localeCompare(b.factId));
export function midheavenModifiers(g: FactGraph) {
	if (!g.mc) throw Error('Meio do Céu necessário.');
	return {
		rulerAspects: sort(
			g.aspects.filter((a) => a.first === g.mc!.ruler || a.second === g.mc!.ruler)
		),
		contacts: sort(g.angleContacts.filter((a) => a.angle === 'midheaven')),
		tenth: g.positions.filter((p) => p.house === 10)
	};
}
function relation(kind: string, firstFunction: string, secondFunction: string) {
	const first = `“${firstFunction}”`,
		second = `“${secondFunction}”`;
	switch (kind) {
		case 'conjunction':
			return `A conjunção reúne ${first} e ${second} em uma mesma decisão. Verifique se a aproximação entre ${first} e ${second} torna sua contribuição reconhecível ou se uma função está recebendo toda a atenção. Diferencie as duas antes de definir o que vai entregar.`;
		case 'sextile':
			return `O sextil permite investigar uma cooperação entre ${first} e ${second}. A cooperação entre ${first} e ${second} pede uma etapa delimitada e a confirmação da condição externa que a torna possível.`;
		case 'trine':
			return `O trígono oferece uma imagem de continuidade entre ${first} e ${second}. Confira o resultado da ligação entre ${first} e ${second} por um critério definido: essa facilidade pode precisar de atualização quando a responsabilidade muda.`;
		case 'square':
			return `A quadratura convida a negociar exigências de ${first} e ${second}. Diante de um pedido público, descreva o custo das exigências de ${first} e de ${second} e decida uma sequência possível. Essa tensão entre ${first} e ${second}, quando reconhecida, pode ajudar a esclarecer o alcance do compromisso.`;
		case 'opposition':
			return `A oposição propõe um diálogo entre ${first} e ${second}. Pergunte qual parte de ${first} você assume e como ${second} depende de um acordo com outras pessoas. Confirmar a divisão entre ${first} e ${second} evita atribuir ao público uma exigência ainda não discutida.`;
		default:
			throw Error('Aspecto não previsto para o Meio do Céu.');
	}
}
function rulerAspect(g: FactGraph, ruler: Position, a: Aspect) {
	const other = required(g, a.first === ruler.body ? a.second : a.first);
	return {
		text: `${bodyNames[ruler.body]} — ${bodyNames[other.body]}: ${aspectNames[a.kind]}, orbe ${a.orb.toFixed(3)}°. ${relation(a.kind, functions[ruler.body], functions[other.body])} Com ${label(other)}, uma hipótese para a segunda função é ${natalStyles[other.sign].aim}. Compare uma ocasião em que ${bodyNames[other.body]} ajudou a função do regente com outra em que essa combinação exigiu uma revisão do acordo.`,
		ids: [a.factId, ruler.factId, other.factId]
	};
}
export function composeReconstructedMidheaven(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	assertMidheavenProjection(input, c);
	const g = normalizeFactGraph(c),
		mc = g.mc!,
		ruler = required(g, mc.ruler),
		sun = required(g, 'sun'),
		moon = required(g, 'moon'),
		direction = signMeanings[mc.sign],
		rulerStyle = natalStyles[ruler.sign],
		binding = birthContext(input.context),
		modifiers = midheavenModifiers(g);
	const rulerIds = unique([
		...mc.factIds,
		ruler.factId,
		'midheaven-ruler-house',
		...(ruler.house ? [`house-${ruler.house}`] : [])
	]);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (role: string, title: string, text: string, ids: readonly string[]) => {
		const factIds = unique(ids);
		sections.push({ title, text, factIds });
		plan.push({ role, title, factIds });
	};
	add(
		'orientation',
		'Uma direção pública que pode ser construída',
		`O Meio do Céu marca o meridiano superior do nascimento. Nesta leitura, ele oferece uma pergunta sobre a direção pela qual você assume responsabilidades e torna uma contribuição reconhecível. MC em ${signs[mc.sign]} será examinado com seu regente, ${bodyNames[ruler.body]}, a posição desse planeta, seus aspectos e os contatos próximos ao ângulo. Os fatores disponíveis da casa dez e as luminárias ajudam a qualificar a hipótese.\n\nPense em uma situação em que alguém depende de uma entrega sua: um trabalho, uma tarefa de estudo, uma iniciativa ou um acordo coletivo. Como foi definido o resultado? Por qual parte você realmente respondeu? Que retorno recebeu? A leitura acompanha essas perguntas sem determinar cargo, profissão, popularidade ou renda. Uma trajetória pode mudar de forma e manter uma preocupação reconhecível; também pode revelar que uma direção anterior deixou de fazer sentido. Use os capítulos para distinguir uma responsabilidade escolhida de uma expectativa que ainda precisa ser negociada.`,
		[...rulerIds, sun.factId, moon.factId]
	);
	add(
		'public-direction',
		'O signo do MC e o sentido de uma contribuição',
		`Com MC em ${signs[mc.sign]}, uma hipótese de contribuição é ${direction.contribution}. Isso pode aparecer no modo de apresentar uma proposta, responder por um resultado ou definir o que deseja tornar útil para outras pessoas. O signo oferece uma linguagem simbólica para observar essas escolhas; não comprova aptidão, experiência nem adequação a uma ocupação. Duas pessoas podem expressar essa mesma direção por atividades muito diferentes.\n\nProcure um episódio em que sua participação deixou algo reconhecível: uma decisão mais clara, um procedimento, um vínculo, uma ideia ou uma entrega. O que foi observado por quem recebeu essa contribuição? Compare esse retorno com a imagem que você queria comunicar. Um cuidado possível é ${direction.cost}. Quando essa tendência aparece, defina um critério concreto de conclusão e confira se a responsabilidade continua compatível com suas condições. Ser reconhecido por um resultado exige também que o acordo permita saber quem fez o quê e com quais recursos.`,
		mc.factIds
	);
	add(
		'ruler-function',
		'O regente transforma direção em uma via de ação',
		`A regência moderna relaciona MC em ${signs[mc.sign]} a ${bodyNames[ruler.body]}. A função de ${functions[ruler.body]} oferece uma via para desenvolver a direção pública. Com ${label(ruler)}, essa via pode envolver ${rulerStyle.aim}; uma ação a experimentar seria ${rulerStyle.action}. O regente ajuda a perguntar como a intenção chega a uma decisão praticável, em vez de deixar a contribuição apenas no plano de uma imagem desejada.\n\n${ruler.body === 'sun' || ruler.body === 'moon' ? 'O regente é uma luminária e voltará a aparecer nos capítulos de intenção ou apoio. Trata-se da mesma posição desempenhando funções relacionadas, sem contar duas vezes a mesma evidência.' : 'A posição do regente acrescenta uma função específica ao signo do ângulo. Ela pode introduzir um caminho diferente daquele que primeiro parece associado à sua direção pública.'} Observe também a possibilidade de ${rulerStyle.excess}. Se esse excesso atrapalhar a entrega, experimente ${rulerStyle.adjustment}. Uma mudança pequena no modo de agir pode preservar a direção escolhida e reduzir um custo que antes parecia obrigatório.`,
		rulerIds
	);
	add(
		'ruler-field',
		'A casa do regente localiza um campo de experiência',
		ruler.house === null
			? `${label(ruler)} está disponível, mas a casa de seu regente não foi estabelecida nesta base. Por isso, nenhum campo específico será atribuído a essa posição. Signo, função e aspectos calculados continuam oferecendo perguntas úteis sobre como você desenvolve uma responsabilidade. Escolha por seu relato uma situação concreta e observe qual ação de ${functions[ruler.body]} participa dela. A ausência da casa limita a localização simbólica; não permite deduzir um setor profissional, uma origem familiar ou um acontecimento para preencher o dado. Uma conferência da hora e do local de nascimento pode esclarecer a entrada, mas nenhum desses dados deve ser inventado para obter uma interpretação mais completa.`
			: `O regente ${bodyNames[ruler.body]} ocupa a casa ${ruler.house}, associada aqui a ${houseAreas[ruler.house - 1]}. Esse campo oferece uma hipótese sobre onde a direção do MC encontra experiência e precisa ganhar forma. Com ${label(ruler)}, vale investigar se ${rulerStyle.action} ajuda a transformar algo desse campo em uma responsabilidade que você consegue sustentar. A casa descreve um tema simbólico; não estabelece onde você deve trabalhar ou o que acontecerá.\n\nRecorde uma situação desse campo que tenha produzido uma consequência visível para outras pessoas. Qual recurso precisou desenvolver? Houve diferença entre o papel que esperavam de você e a parte que conseguiu assumir? Se a associação não corresponder à sua experiência, registre essa distância. A posição do regente amplia a pergunta sobre direção pública, enquanto os fatos de sua trajetória mostram como — e se — essa pergunta tem utilidade no presente.`,
		rulerIds
	);
	const selectedAspects = modifiers.rulerAspects
		.slice(0, midheavenMethod.selection.maximumRulerAspects)
		.map((a) => rulerAspect(g, ruler, a));
	add(
		'ruler-aspects',
		'As relações que qualificam o caminho do regente',
		selectedAspects.length
			? `As relações abaixo envolvem diretamente ${bodyNames[ruler.body]}. São aprofundados até três aspectos por menor orbe, com desempate estável. Essa escolha organiza a leitura; o capítulo de conferência preserva todos os aspectos calculados do regente.\n\n${selectedAspects.map((a) => a.text).join('\n\n')}\n\nEscolha uma relação que ajude a compreender uma responsabilidade atual. Descreva uma mudança possível no acordo, no ritmo ou no critério de conclusão. Verifique o efeito antes de ampliar a tarefa: um aspecto tenso pode esclarecer uma negociação, enquanto um aspecto fluente também pode favorecer a repetição de um procedimento que já precisa ser revisto.`
			: `Nenhum aspecto maior do regente entrou nos orbes adotados: conjunção, quadratura, trígono e oposição até 6°, sextil até 4°. Essa ausência limita as relações geométricas que podem ser interpretadas aqui. Ela não indica falta de capacidade, isolamento ou menor possibilidade de participação pública. A posição por signo${ruler.house ? ' e casa' : ''} permanece disponível para investigar o caminho de ${functions[ruler.body]}. Escolha uma decisão em que essa função teve efeito reconhecível e descreva como ela ajudou a responder pelo resultado. Aspectos menores, aplicação, separação e outras regências não serão acrescentados para preencher a ausência.`,
		[...rulerIds, ...selectedAspects.flatMap((a) => a.ids)]
	);
	const contacts = modifiers.contacts.slice(0, midheavenMethod.selection.maximumMcContacts),
		proximity = modifiers.contacts.find((a) => a.kind === 'conjunction');
	add(
		'mc-contacts',
		'Planetas em relação direta com o MC',
		`${proximity ? `${bodyNames[proximity.body]} está em conjunção ao MC, a ${proximity.orb.toFixed(3)}°. A função de ${functions[proximity.body]} recebe destaque angular para investigação: pergunte como ela participa daquilo pelo qual você aceita responder.` : 'Nenhum planeta está em conjunção ao MC dentro dos 3° adotados. O ângulo permanece disponível; apenas não será atribuído a um planeta esse destaque por proximidade.'}\n\n${
			contacts.length
				? contacts
						.map((a) => {
							const p = required(g, a.body);
							return `${bodyNames[a.body]} — MC: ${aspectNames[a.kind]}, orbe ${a.orb.toFixed(3)}°. ${relation(a.kind, 'a direção pública', functions[a.body])} ${label(p)} permite observar a qualidade de ${natalStyles[p.sign].action} no modo de apresentar ou revisar uma contribuição.`;
						})
						.join('\n\n')
				: 'Também não há outro contato maior ao MC dentro desse limite. A direção será examinada pelo signo, pelo regente e pelos fatores disponíveis, sem criar um vínculo angular ausente.'
		}\n\nO orbe indica proximidade geométrica, e não grau de sucesso ou valor pessoal. Compare o contato com uma entrega efetiva e com o retorno de quem participou dela.`,
		[...mc.factIds, ...contacts.flatMap((a) => [a.factId, `position-${a.body}`])]
	);
	add(
		'tenth-house',
		'O campo da responsabilidade e seus fatores disponíveis',
		g.houses.length !== 12
			? 'As casas Placidus não estão disponíveis para este nascimento. O Meio do Céu pode ser calculado sem que essa divisão das casas seja utilizável; por isso, nenhum planeta será colocado na casa dez nesta leitura. O signo do MC e seu regente continuam sendo examinados por suas posições e relações disponíveis. Você pode escolher uma responsabilidade atual e investigar como foi combinado o resultado, sem usar essa escolha para fabricar uma casa. A indisponibilidade desse campo é um limite do método adotado e deve permanecer visível na conferência. Ela não significa ausência de direção pública nem impede que você discuta responsabilidades a partir de sua experiência.'
			: `Na divisão Placidus disponível, a cúspide da casa dez corresponde ao MC e situa o campo simbólico de responsabilidade pública. ${modifiers.tenth.length ? `Os fatores calculados nesse campo são: ${modifiers.tenth.map(label).join('; ')}. ${modifiers.tenth.map((p) => `${bodyNames[p.body]} permite perguntar como a função de ${functions[p.body]} participa das responsabilidades que se tornam visíveis.`).join(' ')}` : 'Nenhum dos dez corpos calculados ocupa essa casa. Isso não esvazia o tema: o signo de sua cúspide e a posição do regente continuam disponíveis.'}\n\nUm planeta na casa dez e um aspecto ao MC são relações diferentes. A primeira usa a divisão das cúspides; a segunda usa a distância angular e o orbe definido. Um corpo pode participar de ambas ou apenas de uma. Observe, no episódio escolhido, quem define a responsabilidade, quais condições permitem executá-la e como o resultado é reconhecido. Esse campo pode ser investigado em trabalho, estudo ou participação coletiva, sem restringi-lo a um cargo.`,
		[
			...mc.factIds,
			...(g.houses.length === 12 ? ['house-10'] : []),
			...modifiers.tenth.map((p) => p.factId)
		]
	);
	const sunContact = modifiers.contacts.find((a) => a.body === 'sun'),
		sunLink = modifiers.rulerAspects.find((a) => a.first === 'sun' || a.second === 'sun');
	add(
		'sun-direction',
		'A direção pública e a intenção que a sustenta',
		`${label(sun)} propõe investigar a vontade de ${natalStyles[sun.sign].aim}. Essa intenção pode dialogar com a direção de ${direction.contribution}, mas não precisa caber inteira no papel que outras pessoas reconhecem. Compare o que deseja sustentar com o resultado pelo qual está sendo solicitado a responder. Uma diferença entre os dois pode pedir mudança de tarefa, de linguagem ou de limite, antes de qualquer decisão maior.\n\n${sunContact ? `O Sol forma ${aspectNames[sunContact.kind]} ao MC, com orbe de ${sunContact.orb.toFixed(3)}°. Esse vínculo calculado permite aprofundar como autoria e direção pública se encontram na mesma escolha.` : 'O Sol não forma contato maior ao MC dentro dos 3° adotados. A comparação de funções permanece uma pergunta interpretativa, sem ser apresentada como um aspecto calculado.'} ${ruler.body === 'sun' ? 'O Sol também rege este MC: a via do regente e a intenção solar partem do mesmo fator.' : sunLink ? `Há ainda ${aspectNames[sunLink.kind]} entre o Sol e o regente, com orbe de ${sunLink.orb.toFixed(3)}°; examine essa relação com a negociação descrita no capítulo dos aspectos.` : 'O regente não forma aspecto maior com o Sol na política adotada. Essa ausência deve ser preservada ao discutir a articulação entre as funções.'}\n\nAntes de aceitar uma exposição maior, escreva qual parte da proposta você deseja assinar e qual ainda precisa compreender. O retorno sobre a entrega pode orientar uma revisão sem definir seu valor pessoal.`,
		[
			...rulerIds,
			sun.factId,
			...(sunContact ? [sunContact.factId] : []),
			...(sunLink ? [sunLink.factId] : [])
		]
	);
	add(
		'support-and-recognition',
		'Sustentar a responsabilidade sem depender só do reconhecimento',
		`${label(moon)} convida a reconhecer a necessidade de ${natalStyles[moon.sign].need}. Uma responsabilidade visível pede também condições para ser sustentada fora do momento de apresentação. Pergunte qual apoio, ritmo ou acordo torna possível continuar depois do retorno inicial. O mapa não descreve o que seu público pensa de você; essa informação vem de conversas, critérios e respostas efetivamente recebidas.\n\nCom MC em ${signs[mc.sign]}, a direção de ${direction.contribution} pode ganhar consistência quando o compromisso inclui espaço para essa necessidade lunar. Se o papel público exige uma disponibilidade que você não tem, delimite a parte negociável e a parte que precisa ser preservada. Não é preciso expor toda a vida privada para explicar uma condição de trabalho ou participação. Você pode comunicar um limite de prazo, alcance ou acesso de maneira concreta.\n\nCompare duas ocasiões: uma em que o reconhecimento ajudou a continuar e outra em que, mesmo havendo retorno favorável, a tarefa deixou um custo alto. O contraste ajuda a avaliar a qualidade do acordo, sem confundir visibilidade com sustentação.`,
		[...mc.factIds, moon.factId]
	);
	add(
		'context',
		'A responsabilidade presente no seu relato',
		`${input.context ? `Você trouxe este contexto:\n“${input.context}”\n` : 'Você não declarou um contexto específico. Escolha uma responsabilidade pequena e atual para observar.'} Nesta situação, vale ${binding.use.toLocaleLowerCase('pt-BR')} Para o Meio do Céu, delimite a parte pela qual você responde, o resultado que precisa ficar reconhecível e a condição necessária para sustentá-lo.\n\nMC em ${signs[mc.sign]} oferece a hipótese de ${direction.contribution}; ${label(ruler)} propõe investigar a via de ${rulerStyle.action}. Use essas duas imagens para formular uma pergunta sobre o episódio, e confronte a resposta com o que de fato aconteceu. O relato orienta a aplicação e não altera posição, signo, casa ou aspecto. Se outra pessoa participa, diferencie o que ela disse de uma expectativa sua. Uma boa pergunta pode esclarecer um critério de conclusão ou uma divisão de responsabilidade, mesmo quando a linguagem astrológica não corresponde à experiência.`,
		[...rulerIds, ...(g.contextFactId ? [g.contextFactId] : [])]
	);
	add(
		'reversible-practice',
		'Uma entrega pequena para testar sua direção',
		`Reserve até vinte minutos, com custo zero. Para o tema atual, ${publicTasks[binding.key]}. Escolha uma tarefa já ao seu alcance; escreva o resultado esperado e um limite de tempo ou escopo. A hipótese do MC é ${direction.contribution}; a via do regente sugere ${rulerStyle.action}. Defina o que permitiria reconhecer a conclusão sem depender de aprovação genérica.\n\nFaça uma amostra, um esclarecimento de acordo ou uma revisão pequena, conforme o contexto permitir. Peça retorno sobre um critério observável e registre quatro itens: a contribuição apresentada, a resposta concreta, o custo para sustentá-la e uma evidência contrária à interpretação. Pergunte também qual condição lunar de apoio foi preservada. Se não houver interlocutor disponível, compare a amostra com o critério escrito e deixe a conversa para uma oportunidade possível.\n\nDepois decida se vale repetir, ajustar ou encerrar a tentativa. Não assuma um compromisso maior para provar a leitura. No ATV+, você pode guardar a observação com consentimento e comparar uma segunda experiência; este exercício já pode terminar com a decisão que produziu.`,
		[...rulerIds, moon.factId]
	);
	add(
		'verification',
		'Posições, relações e método para conferência',
		`${g.facts.map((f) => f.display).join('\n')}\n\nZodíaco tropical; regência moderna, incluindo Plutão para Escorpião, Urano para Aquário e Netuno para Peixes. Casas Placidus quando calculáveis, com limites visíveis. Aspectos maiores: conjunção, quadratura, trígono e oposição até 6°; sextil até 4°; contatos ao MC até 3°. São aprofundados até três aspectos do regente e três contatos ao ângulo por menor orbe, com desempate por identificador. Todas as relações calculadas permanecem listadas para conferência.\n\nAs relações são nominais, sem certificação de aplicação ou separação. A hora e o local de nascimento influenciam MC e casas: confira os dados antes de usar essas posições. O relato não modifica a geometria. A base local permanece experimental; direção pública, responsabilidade e reconhecimento são hipóteses simbólicas, abertas à revisão, sem indicação de profissão obrigatória ou previsão de prestígio.`,
		g.facts.map((f) => f.id)
	);
	return {
		version: MIDHEAVEN_READING_VERSION,
		productId: 'midheaven',
		title: 'Meio do Céu — direção pública e responsabilidade',
		opening:
			'Uma direção ganha forma quando encontra uma contribuição reconhecível e condições para sustentá-la. Examine seu MC pelo regente, pela casa e pelas relações calculadas.',
		source:
			'Método ATVNA humanista de Meio do Céu: direção pública, regência moderna, posição e aspectos do regente, contatos ao MC e fatores disponíveis da casa dez.',
		sections,
		questions: [
			binding.question,
			`Como a função de ${functions[ruler.body]} ajuda a dar forma a uma responsabilidade que você escolhe sustentar?`,
			'Qual retorno concreto esclarece sua contribuição e qual evidência pede outra explicação?'
		],
		practice: `Como primeira tentativa, ${publicTasks[binding.key]}. Registre resultado, resposta, custo e contraponto antes de ampliar o compromisso.`,
		limits: c.limits,
		editorial: {
			version: MIDHEAVEN_READING_VERSION,
			canon: CANON_VERSION,
			graph: midheavenMethod.version,
			selection: [
				...selectedAspects.flatMap((a) => a.ids.slice(0, 1)),
				...contacts.map((a) => a.factId)
			].map((factId) => ({ factId, score: 1, reason: 'menor orbe; desempate por ID' })),
			patterns: [
				{
					kind: 'mc-ruler-public-responsibility',
					factIds: unique([...rulerIds, sun.factId, moon.factId])
				}
			],
			themes: midheavenMethod.themes.map((id) => ({
				id,
				factIds: plan.find((p) => p.role === id)!.factIds
			})),
			context: { key: binding.key, factId: g.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedMidheaven(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertMidheavenProjection(input, c);
	} catch {
		return ['midheaven-source-mismatch'];
	}
	const errors: string[] = [],
		g = normalizeFactGraph(c),
		modifiers = midheavenModifiers(g);
	if (
		r.productId !== 'midheaven' ||
		r.version !== MIDHEAVEN_READING_VERSION ||
		r.editorial?.canon !== CANON_VERSION ||
		r.editorial.graph !== midheavenMethod.version
	)
		errors.push('midheaven-edition');
	if (r.sections.length !== 12 || r.sections.some((s) => s.text.length < 250))
		errors.push('midheaven-depth');
	if (
		r.editorial?.plan.length !== 12 ||
		r.sections.some(
			(s, i) =>
				s.title !== r.editorial?.plan[i].title ||
				JSON.stringify(s.factIds) !== JSON.stringify(r.editorial?.plan[i].factIds)
		)
	)
		errors.push('midheaven-plan');
	if (midheavenMethod.themes.some((id) => !r.editorial?.themes.some((t) => t.id === id)))
		errors.push('midheaven-themes');
	if (
		input.context &&
		!r.sections.some(
			(s) => s.factIds.includes('personal-context') && s.text.includes(input.context!)
		)
	)
		errors.push('midheaven-context');
	const used = new Set(r.sections.flatMap((s) => s.factIds));
	if (
		[
			...g.mc!.factIds,
			`position-${g.mc!.ruler}`,
			'position-sun',
			'position-moon',
			'midheaven-ruler-house',
			...modifiers.rulerAspects.map((a) => a.factId),
			...modifiers.contacts.map((a) => a.factId),
			...modifiers.tenth.map((p) => p.factId)
		].some((id) => !used.has(id))
	)
		errors.push('midheaven-coverage');
	if (
		r.questions.length !== 3 ||
		!r.sections.some(
			(s) => s.text.includes('vinte minutos') && s.text.includes('evidência contrária')
		)
	)
		errors.push('midheaven-practice');
	const narrative = r.sections.slice(0, -1),
		sentences = [...narrative.map((s) => s.text), r.practice].flatMap((t) =>
			t
				.split(/(?<=[.!?])\s+/)
				.map((s) => s.trim())
				.filter((s) => s.length > 100)
		);
	if (new Set(sentences).size !== sentences.length) errors.push('repeated-long-sentence');
	if (new Set(narrative.map((s) => s.text.slice(0, 100))).size !== narrative.length)
		errors.push('repeated-opening');
	if (
		/destino inevitável|sucesso garantido|sua alma|nasceu para|pipeline|fact graph|contrato interpretativo/i.test(
			[r.opening, ...narrative.map((s) => s.text)].join('\n')
		)
	)
		errors.push('voice-or-unsupported-claim');
	return errors;
}
