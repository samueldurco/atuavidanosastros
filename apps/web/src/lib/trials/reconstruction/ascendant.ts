import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, aspectNames, bodyNames, functions, signs } from './canon';
import type { EditorialTrace } from './career';
import { birthContext } from './birth';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import { houseAreas, natalStyles } from './natal-canon';
import {
	assertAscendantProjection,
	ASCENDANT_READING_VERSION,
	ascendantMethod
} from './ascendant-facts';

const entryTasks = {
	workload:
		'combine um limite de tempo antes de aceitar uma demanda pequena e observe como a outra parte responde',
	relationships:
		'abra uma conversa breve com uma intenção e uma pergunta sobre a disponibilidade da outra pessoa',
	study:
		'apresente uma dúvida delimitada a alguém ou a um material de estudo e observe qual resposta permite continuar',
	leadership:
		'proponha uma primeira etapa a uma equipe e confirme as condições antes de distribuir responsabilidades',
	independent:
		'apresente uma iniciativa pequena e confirme a condição externa necessária antes do próximo compromisso',
	transition:
		'faça um primeiro contato para conhecer uma alternativa sem abandonar seu caminho atual',
	general:
		'inicie uma conversa ou tarefa pequena e espere uma resposta concreta antes do compromisso seguinte'
};
const unique = (ids: readonly string[]) => [...new Set(ids)];
const required = (g: FactGraph, body: string) => {
	const p = g.positions.find((p) => p.body === body);
	if (!p) throw Error(`Fator necessário ao Ascendente ausente: ${body}.`);
	return p;
};
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const sort = <T extends { orb: number; factId: string }>(items: readonly T[]) =>
	[...items].sort((a, b) => a.orb - b.orb || a.factId.localeCompare(b.factId));
export function ascendantModifiers(g: FactGraph) {
	if (!g.asc) throw Error('Ascendente necessário.');
	return {
		rulerAspects: sort(
			g.aspects.filter((a) => a.first === g.asc!.ruler || a.second === g.asc!.ruler)
		),
		contacts: sort(g.angleContacts.filter((a) => a.angle === 'ascendant'))
	};
}
function connection(kind: string, first: string, second: string): string {
	switch (kind) {
		case 'conjunction':
			return `A conjunção aproxima “${first}” e “${second}”. Observe se “${first}” apoia “${second}” na tentativa atual ou se ocupa um espaço que essa outra função precisa para participar.`;
		case 'sextile':
			return `O sextil sugere uma oportunidade de aproximar “${first}” e “${second}” por uma ação deliberada. Faça um convite pequeno para verificar como o recurso de “${first}” encontra uma contribuição de “${second}” na experiência presente.`;
		case 'trine':
			return `O trígono oferece uma imagem de circulação entre “${first}” e “${second}”. Peça uma resposta concreta sobre o efeito de “${first}”: uma facilidade com “${second}” pode sustentar a tentativa ou apenas repetir um hábito.`;
		case 'square':
			return `A quadratura coloca “${first}” e “${second}” em exigências que podem disputar a mesma decisão. Experimente dedicar um momento a “${first}” e outro a “${second}”; compare o resultado com a tentativa de responder às duas exigências de uma vez.`;
		case 'opposition':
			return `A oposição convida a reconhecer “${first}” e “${second}” como posições de um diálogo. Formule o que “${first}” está pedindo e o que “${second}” precisa receber antes de atribuir uma dessas posições à outra pessoa.`;
		default:
			throw Error('Relação não prevista no método do Ascendente.');
	}
}
function rulerAspect(g: FactGraph, ruler: Position, a: Aspect) {
	const other = required(g, a.first === ruler.body ? a.second : a.first);
	return {
		text: `${bodyNames[ruler.body]} — ${bodyNames[other.body]}: ${aspectNames[a.kind]}, orbe ${a.orb.toFixed(3)}°. ${connection(a.kind, functions[ruler.body], functions[other.body])} Com ${label(other)}, a participação dessa segunda função pode tomar a forma de ${natalStyles[other.sign].aim}. Pergunte qual atitude permitiria reconhecer as duas contribuições na situação atual.`,
		ids: [a.factId, ruler.factId, other.factId]
	};
}
function luminary(g: FactGraph, ruler: Position, p: Position, role: 'sun' | 'moon') {
	const asc = g.asc!,
		style = natalStyles[p.sign],
		contact = g.angleContacts.find((a) => a.angle === 'ascendant' && a.body === p.body),
		rulerLink = g.aspects.find(
			(a) =>
				(a.first === ruler.body && a.second === p.body) ||
				(a.second === ruler.body && a.first === p.body)
		);
	const direct = contact
		? `${bodyNames[p.body]} forma ${aspectNames[contact.kind]} ao ASC, com orbe de ${contact.orb.toFixed(3)}°. ${role === 'sun' ? 'Retome essa relação examinando se a intenção que você desejava comunicar chegou a ser reconhecida no primeiro gesto. Compare o que pretendia sustentar com o que conseguiu apresentar.' : 'Nesse contato, observe se sua necessidade de apoio teve espaço desde a entrada ou só foi percebida depois. Uma mudança no ritmo pode ajudar a apresentar essa condição de modo mais claro.'}`
		: `Não há contato maior de ${bodyNames[p.body]} ao ASC dentro dos 3° adotados. A comparação entre essas funções continua útil, mas não será apresentada como um aspecto geométrico.`;
	const viaRuler =
		ruler.body === p.body
			? `${bodyNames[p.body]} também rege este Ascendente. Há uma concentração de função: o caminho de aproximação passa pelo mesmo fator examinado aqui, e não por um segundo planeta independente.`
			: rulerLink
				? `O regente oferece outra ligação: ${bodyNames[ruler.body]} — ${bodyNames[p.body]}, ${aspectNames[rulerLink.kind]}, orbe ${rulerLink.orb.toFixed(3)}°. ${role === 'sun' ? 'Essa relação permite perguntar se a maneira de dar continuidade ao encontro oferece espaço à intenção que você deseja expressar.' : 'Use esse vínculo para investigar se a continuidade da aproximação respeita sua necessidade de apoio, inclusive quando isso exige renegociar o ritmo.'}`
				: `O regente e ${bodyNames[p.body]} não formam aspecto maior na política adotada. Investigue pela experiência a articulação com ${functions[p.body]}, preservando a diferença entre uma pergunta interpretativa e uma relação calculada.`;
	const same =
		asc.sign === p.sign
			? `O mesmo signo aparece nas duas posições. Isso pode dar continuidade à linguagem usada para ${role === 'sun' ? 'apresentar uma intenção' : 'pedir apoio'}, embora grau, casa e função mantenham suas diferenças.`
			: `A entrada em ${signs[asc.sign]} e ${label(p)} oferecem linguagens distintas: você pode começar por ${natalStyles[asc.sign].entry} e, depois, precisar ${role === 'sun' ? style.aim : style.need}. Observe a passagem entre esses dois momentos.`;
	return {
		text: `${role === 'sun' ? 'A intenção não precisa caber inteira na primeira impressão.' : 'O que oferece apoio pode aparecer depois do primeiro contato.'} ${label(p)} ${role === 'sun' ? `propõe investigar a vontade de ${style.aim}` : `convida a reconhecer a necessidade de ${style.need}`}. ${same}\n\n${direct}\n\n${viaRuler}\n\n${role === 'sun' ? 'Em uma apresentação breve, diferencie o gesto que abre a conversa da intenção que deseja sustentar depois. Uma resposta favorável ao começo ainda precisa ser acompanhada por condições para continuar.' : 'Antes de aceitar um convite, dê tempo para perceber como ficou após a aproximação. Pedir uma condição de apoio, rever o ritmo ou recusar uma parte do pedido permite testar se a entrada respeita sua disponibilidade.'}`,
		ids: unique([
			...asc.factIds,
			p.factId,
			ruler.factId,
			...(p.house ? [`house-${p.house}`] : []),
			...(contact ? [contact.factId] : []),
			...(rulerLink ? [rulerLink.factId] : [])
		])
	};
}
export function composeReconstructedAscendant(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	assertAscendantProjection(input, c);
	const g = normalizeFactGraph(c),
		asc = g.asc!,
		ruler = required(g, asc.ruler),
		sun = required(g, 'sun'),
		moon = required(g, 'moon'),
		style = natalStyles[asc.sign],
		rulerStyle = natalStyles[ruler.sign],
		binding = birthContext(input.context),
		modifiers = ascendantModifiers(g);
	const rulerIds = unique([
		...asc.factIds,
		ruler.factId,
		'ascendant-ruler-house',
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
		'Uma entrada, vários caminhos de resposta',
		`O Ascendente marca um ponto do horizonte no nascimento e oferece uma pergunta sobre como você entra nas experiências. Aqui, ASC em ${signs[asc.sign]} se liga ao regente ${bodyNames[ruler.body]}, a seus aspectos e aos contatos próximos ao ângulo. Sol e Lua ajudam a verificar se essa forma de começar oferece espaço para sua intenção e sua necessidade de apoio.\n\nPercorra a leitura lembrando de uma situação recente: uma conversa, um convite, uma tarefa ou a chegada a um grupo. Observe a primeira atitude, a resposta recebida e o ajuste que veio depois. A interpretação ganha utilidade quando permite reconhecer diferenças entre ocasiões, inclusive quando um trecho não descreve sua experiência. Uma primeira impressão não encerra a história de uma relação, e o mapa não determina o que as outras pessoas pensam de você.`,
		[...rulerIds, sun.factId, moon.factId]
	);
	add(
		'entry-style',
		'Como você começa a se aproximar',
		`ASC em ${signs[asc.sign]}: uma possibilidade de entrada é ${style.entry}. Essa imagem descreve um gesto a observar, como abrir uma conversa ou reagir a uma proposta. Ela não estabelece aparência, temperamento obrigatório nem competência social. O recurso dessa abordagem aparece quando você percebe o que a situação permite e consegue ajustar o primeiro passo à resposta recebida.\n\nO excesso a investigar seria ${style.excess}. Ele pode surgir quando a maneira habitual de começar continua sendo usada depois que o encontro passou a pedir outra atitude. O ajuste sugerido é ${style.adjustment}. Recorde uma ocasião em que esse modo de aproximação ajudou e outra em que você preferiu responder de outro jeito. Comparar as duas situações vale mais do que procurar uma descrição que pareça verdadeira em todos os casos.`,
		asc.factIds
	);
	add(
		'ruler-function',
		'O regente dá continuidade ao primeiro gesto',
		`Na regência moderna adotada aqui, ${bodyNames[ruler.body]} rege o ASC em ${signs[asc.sign]}. Sua função de ${functions[ruler.body]} oferece uma via para acompanhar o que acontece depois da aproximação. Com ${label(ruler)}, essa continuidade pode envolver ${rulerStyle.aim}. Assim, começar por ${style.entry} pode abrir uma experiência que pede outra qualidade: ${rulerStyle.action}.\n\n${ruler.body === 'sun' || ruler.body === 'moon' ? 'Como o regente é uma luminária, este mesmo fator reaparece na integração com Sol ou Lua. As duas funções serão relacionadas sem contar a posição como duas provas independentes.' : 'A função do regente oferece uma ligação entre a porta de entrada e uma ação que pode amadurecer no encontro. Observe o que permite passar do primeiro gesto a uma participação mais sustentada.'} Uma dificuldade possível seria ${rulerStyle.excess}. Experimente ${rulerStyle.adjustment} antes de concluir que precisa repetir sempre a mesma forma de se apresentar.`,
		rulerIds
	);
	add(
		'ruler-field',
		'Onde essa continuidade encontra experiência',
		ruler.house === null
			? `${label(ruler)} está disponível, mas a casa do regente não foi estabelecida nesta base. Por isso, nenhum campo específico será atribuído à sua posição. Você ainda pode investigar o estilo de ${functions[ruler.body]} e os aspectos efetivamente calculados, levando uma situação escolhida por você para a observação. A falta de casa impede essa localização simbólica; ela não autoriza deduzir profissão, família, saúde ou qualquer outro tema a partir do signo. Escolha um encontro recente e registre em qual circunstância o primeiro gesto precisou ganhar continuidade.`
			: `O regente ${bodyNames[ruler.body]} está na casa ${ruler.house}, associada aqui a ${houseAreas[ruler.house - 1]}. Esse campo oferece um lugar simbólico para observar como o primeiro contato ganha consequência. Por exemplo, uma aproximação pode começar pelo estilo do ASC e exigir, nesse campo, a atitude de ${rulerStyle.action}. A casa indica um tema de investigação; não prevê um evento nem restringe essa função a uma única área da vida.\n\nEscolha uma ocasião desse campo em que você precisou entrar, esperar uma resposta e continuar. O que ajudou: conhecer as condições, apresentar uma intenção, estabelecer um limite ou rever uma expectativa? Verifique se a função de ${functions[ruler.body]} explica alguma parte concreta desse percurso. Se a associação não for útil, registre a diferença; o significado da casa precisa ser confrontado com a vida que você relata.`,
		rulerIds
	);
	const selectedAspects = modifiers.rulerAspects
		.slice(0, ascendantMethod.selection.maximumRulerAspects)
		.map((a) => rulerAspect(g, ruler, a));
	add(
		'ruler-aspects',
		'O que modifica o caminho do regente',
		selectedAspects.length
			? `Os aspectos abaixo envolvem diretamente ${bodyNames[ruler.body]}. A prioridade usa o menor orbe, com desempate estável, e destaca até três relações para aprofundamento. Todas as relações calculadas do regente aparecem no capítulo de conferência; a seleção organiza a leitura sem apagar as demais.\n\n${selectedAspects.map((a) => a.text).join('\n\n')}\n\nEscolha a relação mais reconhecível em um episódio recente. Descreva a escolha que ela ajuda a esclarecer e qual observação pediria uma explicação diferente. Um aspecto difícil pode abrir uma negociação útil, e um aspecto fluente também precisa de atenção ao efeito produzido.`
			: `Nenhum aspecto maior do regente ${bodyNames[ruler.body]} entrou nos orbes adotados: conjunção, quadratura, trígono e oposição até 6°, sextil até 4°. Isso limita a articulação geométrica que esta leitura pode apresentar. Não significa isolamento, falta de recursos ou menor importância do planeta. A posição por signo${ruler.house ? ' e casa' : ''} continua disponível para observar como a aproximação ganha continuidade. Investigue uma escolha concreta em que ${functions[ruler.body]} teve participação e compare o primeiro gesto com o ajuste que veio depois. Aspectos menores e outros sistemas de regência não estão sendo inferidos.`,
		[...rulerIds, ...selectedAspects.flatMap((a) => a.ids)]
	);
	const selectedContacts = modifiers.contacts.slice(
		0,
		ascendantMethod.selection.maximumAscContacts
	);
	const proximity = modifiers.contacts.find((a) => a.kind === 'conjunction');
	add(
		'asc-contacts',
		'Contatos ao ASC e proximidade do horizonte',
		`${proximity ? `${bodyNames[proximity.body]} está a ${proximity.orb.toFixed(3)}° do ASC em conjunção. Sua função de ${functions[proximity.body]} merece atenção especial na maneira de começar um encontro, sem se tornar uma descrição obrigatória de sua presença.` : 'Não há planeta em conjunção ao ASC dentro dos 3° adotados. A ausência dessa proximidade não enfraquece o ângulo; apenas impede atribuir a um planeta esse destaque específico.'}\n\n${
			selectedContacts.length
				? selectedContacts
						.map((a) => {
							const p = required(g, a.body);
							return `${bodyNames[a.body]} — ASC: ${aspectNames[a.kind]}, orbe ${a.orb.toFixed(3)}°. ${connection(a.kind, 'a aproximação', functions[a.body])} ${label(p)} acrescenta a possibilidade de ${natalStyles[p.sign].action}.`;
						})
						.join('\n\n')
				: 'Também não há outro contato maior ao ASC dentro desse limite. A leitura seguirá pelo signo, pelo regente e pela comparação com as luminárias, sem criar uma relação ausente.'
		}\n\nObserve o que aparece logo no começo e o que só ganha espaço após alguma confiança. O orbe ordena a proximidade angular, não a importância de uma pessoa ou a intensidade de uma experiência.`,
		unique([
			...asc.factIds,
			...(proximity ? [proximity.factId, `position-${proximity.body}`] : []),
			...selectedContacts.flatMap((a) => [a.factId, `position-${a.body}`])
		])
	);
	const solar = luminary(g, ruler, sun, 'sun'),
		lunar = luminary(g, ruler, moon, 'moon');
	add('sun-relation', 'A entrada e a intenção que deseja sustentar', solar.text, solar.ids);
	add('moon-relation', 'A entrada e a condição de apoio', lunar.text, lunar.ids);
	add(
		'integrated-adjustment',
		'Da primeira resposta a uma escolha mais inteira',
		`A hipótese central aproxima três momentos: começar por ${style.entry}; buscar continuidade pela função de ${functions[ruler.body]}; verificar se há espaço para ${natalStyles[sun.sign].aim} e para ${natalStyles[moon.sign].need}. Eles podem aparecer em uma mesma conversa, mas não precisam ser resolvidos no mesmo instante. O primeiro gesto abre uma possibilidade; a resposta do encontro mostra o que ainda precisa ser ajustado.\n\nUma alternativa é desacelerar entre aproximação e compromisso. Depois de apresentar uma proposta, confira a condição de apoio e só então escolha a parte que deseja sustentar. Outra é explicitar uma intenção antes de adaptar demais o gesto à reação recebida. Use o regente como pergunta sobre o próximo recurso disponível, sem transformar qualquer dessas alternativas em regra. A síntese se confirma pela qualidade da decisão e pela possibilidade de revê-la, inclusive quando a experiência contradiz a imagem astrológica.`,
		[
			...rulerIds,
			sun.factId,
			moon.factId,
			...selectedAspects.flatMap((a) => a.ids),
			...selectedContacts.map((a) => a.factId)
		]
	);
	add(
		'context',
		'A situação que você trouxe para esta leitura',
		`${input.context ? `Você trouxe este contexto:\n“${input.context}”\n` : 'Você não declarou um contexto específico. Escolha uma situação pequena e atual para tornar a leitura observável.'} Nesta situação, vale ${binding.use.toLocaleLowerCase('pt-BR')} Para este produto, a pergunta é como você entra nessa situação, que resposta encontra e o que precisa ajustar antes de dar continuidade.\n\nCom o ASC em ${signs[asc.sign]}, observe em que momento você pode ${style.entry}. Em seguida, considere ${label(ruler)} como via para ${rulerStyle.action}. O relato ajuda a escolher onde observar essa ligação, mas não altera signo, posição, casa ou aspectos. Se o tema envolver outra pessoa, use apenas o que ela efetivamente disse ou fez; as posições deste nascimento não descrevem suas intenções. Procure uma decisão sob seu alcance e uma condição que possa negociar antes de ampliar o compromisso.`,
		[...rulerIds, ...(g.contextFactId ? [g.contextFactId] : [])]
	);
	add(
		'reversible-practice',
		'Uma experiência breve de aproximação',
		`Reserve até vinte minutos, com custo zero. Para o tema atual, ${entryTasks[binding.key]}. Escolha uma conversa ou tarefa de baixo risco e escreva uma frase sobre o que deseja iniciar. Identifique também uma condição de apoio que precisa preservar e a ação seguinte pela qual pode dar continuidade. Para seu ASC em ${signs[asc.sign]}, a hipótese de entrada é ${style.entry}; a via do regente sugere ${rulerStyle.action}.\n\nDurante a tentativa, faça uma proposta pequena e observe a resposta antes de prometer o passo seguinte. Registre quatro itens: o gesto que fez, o retorno concreto, o custo em tempo ou energia e uma evidência contrária à interpretação. Depois compare: o começo permitiu expressar sua intenção? Houve espaço para a necessidade de apoio? Qual ajuste seria possível sem aumentar o compromisso? Pare ou reformule se a experiência exigir recursos que você não tem.\n\nSe desejar continuar no ATV+, guarde sua observação com consentimento e retome o mesmo episódio após uma segunda tentativa. A continuidade serve para comparar experiências; você pode encerrar este exercício com o registro que já produziu.`,
		[...rulerIds, sun.factId, moon.factId]
	);
	const sourceIds = unique([
		...rulerIds,
		sun.factId,
		moon.factId,
		...modifiers.rulerAspects.flatMap((a) => [
			a.factId,
			`position-${a.first}`,
			`position-${a.second}`
		]),
		...modifiers.contacts.flatMap((a) => [a.factId, `position-${a.body}`])
	]);
	const remaining = g.facts.filter((f) => !sourceIds.includes(f.id));
	add(
		'verification',
		'Posições, relações e método para conferência',
		`${sourceIds.map((id) => g.facts.find((f) => f.id === id)!.display).join('\n')}\n\nOutras posições e relações da base natal, disponíveis para conferir a origem dos dados:\n${remaining.map((f) => f.display).join('\n')}\n\nZodíaco tropical; regência moderna, incluindo Plutão para Escorpião, Urano para Aquário e Netuno para Peixes; casas Placidus quando disponíveis. Aspectos maiores: 6° para conjunção, quadratura, trígono e oposição; sextil 4°; contatos ao ASC 3°. Os contatos são nominais, sem certificação de aplicação ou separação. São interpretados até três aspectos do regente e três contatos ao ASC por menor orbe; as demais relações relevantes estão listadas acima.\n\nOs dados de nascimento sustentam a geometria, enquanto o relato orienta a aplicação. Uma hora aproximada pode alterar o Ascendente e as casas: confira sua entrada antes de usar essas posições. A base local permanece experimental e as propostas são simbólicas, abertas à revisão pela experiência.`,
		g.facts.map((f) => f.id)
	);
	return {
		version: ASCENDANT_READING_VERSION,
		productId: 'ascendant',
		title: 'Ascendente — aproximação, regente e resposta',
		opening:
			'Uma forma de começar pode ganhar caminhos diferentes quando encontra intenção, necessidade e resposta. Esta leitura acompanha seu Ascendente pelo regente, pelos contatos calculados e pela relação com Sol e Lua.',
		source:
			'Método ATVNA humanista de Ascendente: regência moderna, posição e aspectos do regente, contatos ao ASC e integração com as luminárias.',
		sections,
		questions: [
			binding.question,
			`Como a função de ${functions[ruler.body]} ajuda a continuar sem ultrapassar sua condição de apoio?`,
			'Que resposta concreta confirmou sua hipótese e qual evidência contrária merece ser considerada?'
		],
		practice: `Como primeira tentativa, ${entryTasks[binding.key]}. Registre gesto, resposta, custo e contraponto; use ${bodyNames[ruler.body]} como pergunta sobre o recurso para continuar.`,
		limits: c.limits,
		editorial: {
			version: ASCENDANT_READING_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-ascendant-ruler-dynamics/1.0.0',
			selection: [
				...selectedAspects.flatMap((a) => a.ids.slice(0, 1)),
				...selectedContacts.map((a) => a.factId)
			].map((factId) => ({ factId, score: 1, reason: 'menor orbe; desempate por ID' })),
			patterns: [
				{ kind: 'asc-ruler-sun-moon', factIds: unique([...rulerIds, sun.factId, moon.factId]) }
			],
			themes: ascendantMethod.themes.map((id) => ({
				id,
				factIds: plan.find((p) => p.role === id)!.factIds
			})),
			context: { key: binding.key, factId: g.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedAscendant(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertAscendantProjection(input, c);
	} catch {
		return ['ascendant-source-mismatch'];
	}
	const errors: string[] = [],
		g = normalizeFactGraph(c),
		modifiers = ascendantModifiers(g);
	if (
		r.productId !== 'ascendant' ||
		r.version !== ASCENDANT_READING_VERSION ||
		r.editorial?.canon !== CANON_VERSION ||
		r.editorial.graph !== 'atv-ascendant-ruler-dynamics/1.0.0'
	)
		errors.push('ascendant-edition');
	if (r.sections.length !== 12 || r.sections.some((s) => s.text.length < 250))
		errors.push('ascendant-depth');
	if (
		r.editorial?.plan.length !== 12 ||
		r.sections.some(
			(s, i) =>
				s.title !== r.editorial?.plan[i].title ||
				JSON.stringify(s.factIds) !== JSON.stringify(r.editorial?.plan[i].factIds)
		)
	)
		errors.push('ascendant-plan');
	if (ascendantMethod.themes.some((id) => !r.editorial?.themes.some((t) => t.id === id)))
		errors.push('ascendant-themes');
	if (
		input.context &&
		!r.sections.some(
			(s) => s.factIds.includes('personal-context') && s.text.includes(input.context!)
		)
	)
		errors.push('ascendant-context');
	const used = new Set(r.sections.flatMap((s) => s.factIds));
	if (
		[
			...g.asc!.factIds,
			`position-${g.asc!.ruler}`,
			'position-sun',
			'position-moon',
			...modifiers.rulerAspects.map((a) => a.factId),
			...modifiers.contacts.map((a) => a.factId)
		].some((id) => !used.has(id))
	)
		errors.push('ascendant-coverage');
	if (
		r.questions.length !== 3 ||
		!r.sections.some(
			(s) => s.text.includes('vinte minutos') && s.text.includes('evidência contrária')
		)
	)
		errors.push('ascendant-practice');
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
