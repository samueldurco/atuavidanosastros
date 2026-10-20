import { bodyNames, modernRulers, signs } from '../reconstruction/canon';
import type { FactGraph, Position } from '../reconstruction/fact-graph';
import {
	houseScenes,
	interpretNatalPair,
	pairAspect,
	positionFor,
	type CurrentPassage
} from './natal-language';
import { planetParticipation } from './natal-roles';

const resources = [
	'a autonomia material ganha valor quando permite começar por conta própria; a pressa de conquistar independência pode, porém, antecipar um compromisso antes de conhecer seu custo',
	'a segurança se liga à continuidade e ao uso concreto do que se constrói; conservar ajuda quando protege uma base, mas pode dificultar abandonar um investimento que já não serve',
	'a autonomia pode ser procurada em conhecimentos, trocas e alternativas; a variedade abre saídas, mas também pode dispersar a atenção entre muitas frentes pequenas',
	'a base material se liga à sensação de ter onde se apoiar e a quem se vincular; proteger o que é importante pede distinguir necessidade presente de obrigação herdada',
	'o investimento ganha sentido quando permite participar de algo próprio; reconhecimento e prazer podem mobilizar recursos, mas não substituem a avaliação de seu custo',
	'a segurança se constrói pela atenção ao uso e à manutenção dos recursos; aperfeiçoar sua administração ajuda enquanto não torna toda escolha uma busca impossível de ausência de perdas',
	'os recursos se ligam a escolhas compartilháveis e a critérios de valor; considerar o outro ajuda na cooperação, mas não deve tornar o próprio limite dependente de concordância',
	'a autonomia envolve distinguir o que é seu do que depende de trocas e vínculos; aprofundar essa distinção pode trazer clareza onde controle e confiança se confundem',
	'os recursos ganham sentido como meios para ampliar experiências; a abertura de possibilidades precisa de uma base que não seja consumida pela promessa do próximo horizonte',
	'a segurança se apoia na construção gradual e na capacidade de sustentar compromissos; o horizonte longo ajuda, mas pode adiar indefinidamente o uso do que se conquista',
	'a autonomia material se liga à liberdade de escolher uma forma própria de viver e participar; projetos diferentes podem merecer espaço sem depender da ruptura de toda base anterior',
	'o valor pode incluir cuidado, criação e experiências difíceis de medir; essa sensibilidade precisa de limites materiais claros para que generosidade ou inspiração não absorvam o que sustenta você'
] as const;
const routines = [
	'a rotina precisa de margem para iniciativa e resposta rápida; uma tarefa inteiramente prescrita pode consumir mais energia do que sua dificuldade indica',
	'a repetição pode ajudar a ganhar consistência e domínio; o ponto delicado é quando manter o ritmo impede adaptar um método que já deixou de funcionar',
	'a variedade de tarefas e a circulação de informação podem manter a atenção viva; interrupções demais, porém, fragmentam o tempo necessário para concluir',
	'o modo de trabalhar tende a considerar o ambiente e as pessoas envolvidas; atender necessidades reais perde sustentabilidade quando toda demanda vira responsabilidade sua',
	'o trabalho cotidiano ganha sentido quando permite reconhecer uma contribuição própria; tarefas de bastidor também precisam de valor, mesmo quando não recebem atenção imediata',
	'a rotina se orienta pela precisão, pela utilidade e pelo aperfeiçoamento; perceber o que falta é um recurso que pode se tornar desgaste se a entrega nunca alcançar um ponto suficiente',
	'a rotina precisa coordenar pessoas e expectativas; negociar facilita o trabalho, mas pode consumir o tempo da própria execução quando todo detalhe pede consenso',
	'o trabalho cotidiano tende a pedir envolvimento e compreensão do que está por trás do problema; profundidade ajuda enquanto não transforma cada tarefa em algo que precisa ser controlado integralmente',
	'a rotina ganha força quando sua finalidade permanece visível; procedimentos muito estreitos podem perder sentido, mesmo quando ainda têm uma função necessária',
	'a rotina se apoia em sequência, responsabilidade e resultados que amadurecem; assumir continuidade ajuda desde que cumprir não se torne a única medida possível de participação',
	'o trabalho pede espaço para questionar processos e experimentar soluções; renovar um método também exige considerar as pessoas que dependem de sua continuidade',
	'a rotina precisa acomodar sensibilidade e oscilações de atenção; essa flexibilidade ganha sustentação quando o limite de uma tarefa não depende apenas do clima do momento'
] as const;

// The other planet changes what the ruler's contact means in this particular field.
// A supportive Neptune contact, for example, concerns imagination and value, not earning capacity.
const contactMeanings: Record<string, { resources: [string, string]; work: [string, string] }> = {
	sun: {
		resources: [
			'Investir no que representa você pode dar propósito ao uso dos recursos.',
			'A vontade de se reconhecer numa escolha pode comprometer uma base que também precisa de proteção.'
		],
		work: [
			'Reconhecer sua contribuição dá sentido à continuidade de uma tarefa.',
			'A tarefa pode virar uma prova de valor pessoal, tornando difícil aceitar uma entrega suficiente.'
		]
	},
	moon: {
		resources: [
			'O uso dos recursos pode servir a uma necessidade de amparo que às vezes fica fora das contas.',
			'A urgência de recuperar segurança emocional pode pressionar decisões materiais antes que seu custo esteja claro.'
		],
		work: [
			'Perceber o efeito emocional do ambiente ajuda a organizar um ritmo em que seja possível permanecer.',
			'Responder às necessidades do ambiente e concluir a tarefa podem disputar a mesma disponibilidade.'
		]
	},
	mercury: {
		resources: [
			'Dar nome às condições de uma escolha ajuda a distinguir o que importa do que apenas parece atraente.',
			'As explicações que tornam uma escolha convincente podem avançar antes de seus limites materiais ficarem claros.'
		],
		work: [
			'Compreender a finalidade e a sequência das tarefas pode tornar o esforço mais bem direcionado.',
			'Planejar, responder e executar podem disputar a mesma atenção, deixando pouco tempo contínuo para concluir.'
		]
	},
	venus: {
		resources: [
			'Reconhecer o que tem valor para você ajuda a dar finalidade aos recursos.',
			'Preservar uma aproximação ou algo desejado pode pedir concessões que tornam menos claro o próprio limite material.'
		],
		work: [
			'A qualidade das trocas e o apreço pelo que se faz podem sustentar a participação cotidiana.',
			'Manter a harmonia pode levar a aceitar tarefas cujo custo não aparece na concordância inicial.'
		]
	},
	mars: {
		resources: [
			'A iniciativa pode ajudar a dar meios concretos a algo que você considera valioso.',
			'O impulso de agir pode antecipar o uso de recursos antes de definir o que precisa continuar disponível.'
		],
		work: [
			'Compreensão e iniciativa podem colaborar: uma tarefa ganha movimento quando a ideia encontra uma ação possível.',
			'A urgência de agir pode romper a sequência de trabalho; tentar recuperar essa sequência apenas acelerando tende a ampliar a pressão.'
		]
	},
	jupiter: {
		resources: [
			'Um horizonte mais amplo pode dar propósito ao que você preserva ou decide investir.',
			'O tamanho da possibilidade imaginada pode crescer antes da base que permitiria sustentá-la.'
		],
		work: [
			'A rotina ganha sentido quando cada tarefa se liga a algo que vale a pena aprender ou construir.',
			'Ampliar projetos e oportunidades pode aumentar a carga antes de haver espaço para recebê-la.'
		]
	},
	saturn: {
		resources: [
			'Medida e continuidade podem ajudar a dar sustentação ao que tem valor.',
			'Proteger a base pode se transformar em adiar indefinidamente o uso do que se constrói.'
		],
		work: [
			'Sequência e limites podem dar duração ao esforço sem depender sempre do impulso inicial.',
			'O critério de responsabilidade pode tornar cada pausa ou ajuste uma sensação de insuficiência.'
		]
	},
	uranus: {
		resources: [
			'Uma alternativa ao modo habitual de usar os recursos pode abrir espaço para maior autonomia.',
			'A necessidade de liberdade pode pedir uma ruptura material antes de outra base estar disponível.'
		],
		work: [
			'Questionar um procedimento pode revelar uma forma mais adequada de realizar a tarefa.',
			'A vontade de mudar o método e a necessidade de manter entregas podem entrar em ritmos diferentes.'
		]
	},
	neptune: {
		resources: [
			'Imaginação e sensibilidade podem ampliar o que você reconhece como valioso, incluindo experiências que não cabem apenas numa medida de utilidade.',
			'A força de uma imagem desejada pode tornar menos nítida a diferença entre o valor imaginado e as condições materiais de lhe dar espaço.'
		],
		work: [
			'Imaginação e atenção ao que é difícil de medir podem dar sentido a tarefas de criação e cuidado.',
			'O envolvimento com uma necessidade ou ideal pode deixar o ponto de término da tarefa pouco definido.'
		]
	},
	pluto: {
		resources: [
			'Rever vínculos de dependência pode esclarecer quais recursos ampliam sua autonomia e quais mantêm um acordo que perdeu sentido.',
			'A proteção da autonomia pode se transformar em controle, especialmente quando recursos próprios e compartilhados se misturam.'
		],
		work: [
			'Investigar a causa de um problema pode permitir uma mudança mais profunda na forma de trabalhar.',
			'A necessidade de compreender e controlar o processo inteiro pode tornar difícil delegar ou encerrar uma tarefa.'
		]
	}
};

export function careerContactMeaning(body: string, house: 2 | 6, kind: string): string {
	const meaning = contactMeanings[body]?.[house === 2 ? 'resources' : 'work'];
	if (!meaning) return '';
	if (['square', 'opposition'].includes(kind)) return meaning[1];
	return kind === 'conjunction'
		? `${meaning[0]} Ao concentrar essas buscas, porém, ${meaning[1][0].toLowerCase()}${meaning[1].slice(1)}`
		: meaning[0];
}

function linkToDirection(
	g: FactGraph,
	ruler: Position,
	house: 2 | 6
): { text: string; factIds: string[] } {
	const mc = g.mc,
		professional = mc ? positionFor(g, mc.ruler) : undefined;
	if (!mc || !professional) return { text: '', factIds: [] };
	const common = ruler.body === professional.body;
	const aspect = common ? undefined : pairAspect(g, ruler.body, professional.body);
	const hard = aspect && ['square', 'opposition'].includes(aspect.kind);
	const text = common
		? `${bodyNames[ruler.body]} também rege o Meio do Céu. ${house === 2 ? 'A base material' : 'A rotina'} e a direção pública passam, portanto, pela mesma maneira de participar. Um compromisso que dá forma à carreira pode organizar ${house === 2 ? 'sua base' : 'o cotidiano'}; se exigir disponibilidade ilimitada, pesa nas duas áreas ao mesmo tempo.`
		: `${bodyNames[ruler.body]} conduz esta área, enquanto ${bodyNames[professional.body]} rege o Meio do Céu em ${signs[mc.sign]}. ${aspect ? (hard ? `A ${aspect.kind === 'square' ? 'quadratura' : 'oposição'} entre esses regentes torna relevante o custo de conciliar ${planetParticipation(ruler)} com ${planetParticipation(professional)}. Uma direção pode ser significativa e ainda exigir uma forma de sustentação que precisa ser renegociada.` : `O ${aspect.kind === 'trine' ? 'trígono' : aspect.kind === 'sextile' ? 'sextil' : 'encontro em conjunção'} entre os regentes liga ${planetParticipation(ruler)} a ${planetParticipation(professional)}. Essa passagem pode ajudar a transformar condições de sustentação em meios para a contribuição, sem garantir oportunidades ou rendimento.`) : `São duas referências complementares para uma escolha: nesta área, ${planetParticipation(ruler)}; na direção pública, ${planetParticipation(professional)}. A identificação com uma contribuição precisa caber nas condições que a primeira referência procura preservar.`}`;
	return {
		text,
		factIds: [...mc.factIds, professional.factId, ...(aspect ? [aspect.factId] : [])]
	};
}

export function interpretCareerField(g: FactGraph, house: 2 | 6): CurrentPassage | null {
	const fallback = interpretNatalPair(g, house === 2 ? 'resources' : 'effort');
	const cusp = g.houses.find((h) => h.house === house);
	if (!fallback || !cusp) return fallback;
	const ruler = positionFor(g, modernRulers[cusp.sign]);
	if (!ruler) return fallback;
	const claim = `${house === 2 ? 'A casa 2 descreve a relação com recursos e sustentação material' : 'A casa 6 descreve a relação com tarefas e organização do trabalho'}. Com sua entrada em ${signs[cusp.sign]}, ${house === 2 ? resources[cusp.sign] : routines[cusp.sign]}.`;
	const direction = linkToDirection(g, ruler, house);
	const placement = `${bodyNames[ruler.body]} em ${signs[ruler.sign]} rege essa casa e acrescenta um modo de realizar essa busca: ${planetParticipation(ruler)}.${ruler.house ? ` Sua posição na casa ${ruler.house} torna ${houseScenes[ruler.house - 1]} parte dessa busca. ${house === 2 ? 'Assim, sustentar a vida envolve também negociar o lugar desses assuntos nas escolhas materiais; não é apenas uma questão de conservar ou gastar.' : 'O cotidiano ganha coerência quando suas tarefas servem a esse campo; pode perder sentido quando a organização se torna um fim em si mesma.'}` : ''}`;
	const other = g.houses.find((h) => h.house === (house === 2 ? 6 : 2));
	const otherRuler = other ? positionFor(g, modernRulers[other.sign]) : undefined;
	const shared = otherRuler?.body === ruler.body;
	const contact = g.aspects
		.filter((a) => a.first === ruler.body || a.second === ruler.body)
		.sort((a, b) => a.orb - b.orb)[0];
	const partner = contact
		? positionFor(g, contact.first === ruler.body ? contact.second : contact.first)
		: undefined;
	const contactText =
		contact && partner
			? `A ${contact.kind === 'square' ? 'quadratura' : contact.kind === 'opposition' ? 'oposição' : contact.kind === 'conjunction' ? 'conjunção' : contact.kind === 'trine' ? 'ligação em trígono' : 'ligação em sextil'} de ${bodyNames[ruler.body]} com ${bodyNames[partner.body]} em ${signs[partner.sign]} modifica essa busca. ${careerContactMeaning(partner.body, house, contact.kind)}`
			: '';
	const bridge =
		house === 6 && otherRuler
			? `A casa 2, regida por ${bodyNames[otherRuler.body]}, acrescenta o critério material a essa organização. ${shared ? 'O mesmo regente conduz recursos e rotina: a maneira de organizar o trabalho participa diretamente da base que se tenta manter. Um método excessivamente custoso pode comprometer as duas áreas.' : `Enquanto o cotidiano pede ${planetParticipation(ruler)}, a sustentação material passa por ${planetParticipation(otherRuler)}. A melhor organização não é necessariamente a que produz mais tarefas: é a que permite realizar sem consumir as condições que tornam esse esforço viável.`}`
			: '';
	return {
		title:
			house === 2
				? 'O que a autonomia material precisa sustentar'
				: 'Uma rotina que serve à contribuição e à vida',
		claim,
		text: [claim, placement, contactText, fallback.claim, direction.text, bridge]
			.filter(Boolean)
			.join('\n\n'),
		factIds: [
			...new Set([
				cusp.factId,
				ruler.factId,
				...fallback.factIds,
				...direction.factIds,
				...(contact && partner ? [contact.factId, partner.factId] : []),
				...(house === 6 && other && otherRuler ? [other.factId, otherRuler.factId] : [])
			])
		],
		relation: `Casa ${house}/${signs[cusp.sign]} → ${ruler.body}/${signs[ruler.sign]}/casa${ruler.house}; ${fallback.relation}; conexão ao regente do MC e, na rotina, à sustentação material.`
	};
}
