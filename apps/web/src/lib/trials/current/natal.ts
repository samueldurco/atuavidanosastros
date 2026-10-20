import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { assertBirthProjection } from '../reconstruction/birth-facts';
import { assertPillarsProjection } from '../reconstruction/pillars-facts';
import { assertPurposeProjection } from '../reconstruction/purpose-facts';
import { assertAtlasProjection, type AtlasData } from '../reconstruction/atlas-facts';
import { assertSynastryProjection } from '../reconstruction/synastry-facts';
import { assertDossierProjection } from '../reconstruction/dossier-facts';
import { normalizeFactGraph, type FactGraph } from '../reconstruction/fact-graph';
import { bodyNames, CANON_VERSION, signs } from '../reconstruction/canon';
import { natalStyles } from '../reconstruction/natal-canon';
import { atlasPriorityFor, type AtlasPriorityId } from '../../atlas-priorities';
import { composeRelationshipPassages } from './natal-relationships';
import { planetParticipation } from './natal-roles';
import { interpretCareerField } from './natal-career';
import { atlasPriorityLink } from './natal-atlas-links';
import { aspectNames } from '../reconstruction/date-facts';
import {
	houseScenes,
	interpretAngle,
	interpretNatalPair,
	pairAspect,
	positionFor,
	type CurrentPassage,
	type NatalTheme
} from './natal-language';

export const CURRENT_NATAL_VERSION = 'atv-current-reading/1.0.0';
const supported = [
	'birth-chart',
	'three-pillars',
	'life-atlas',
	'purpose-career',
	'synastry',
	'couple-dossier'
] as const;
type Product = (typeof supported)[number];
type EvidenceReading = TrialReading & {
	interpretation: {
		version: 'atv-interpretation-evidence/1';
		family: string;
		conclusions: { section: number; claim: string; factIds: string[]; relation: string }[];
	};
};
const present = <T>(x: T | null): x is T => x !== null;

function integration(g: FactGraph, career = false): CurrentPassage {
	const sun = positionFor(g, 'sun')!,
		moon = positionFor(g, 'moon')!,
		ruler = g.asc ? positionFor(g, g.asc.ruler) : undefined;
	if (!sun || !moon) throw Error('Síntese exige Sol e Lua.');
	const contact = pairAspect(g, 'sun', 'moon'),
		hard = contact && ['square', 'opposition'].includes(contact.kind);
	const sunMoonSame = sun.sign === moon.sign,
		entranceDifferent = g.asc && g.asc.sign % 4 !== sun.sign % 4;
	const claim = career
		? `Uma contribuição pode fazer sentido ao permitir ${natalStyles[sun.sign].aim}. Para caber na vida, ela também precisa dar espaço à necessidade de ${natalStyles[moon.sign].need}. ${hard ? 'O contato entre Sol e Lua torna especialmente relevante negociar o custo emocional dessa direção: identificação com um trabalho não elimina a necessidade de recomposição.' : sunMoonSame ? 'Como Sol e Lua estão no mesmo signo, identificação e conforto podem procurar referências parecidas; isso dá coerência à escolha, mas pode fazer uma alternativa familiar parecer suficiente antes de suas condições serem examinadas.' : 'Sentido e sustentação pessoal não são a mesma pergunta: uma proposta pode interessar e ainda precisar de condições diferentes para caber no cotidiano.'}`
		: `Ao reunir o mapa, aparece uma distinção entre querer ${natalStyles[sun.sign].aim} e precisar ${natalStyles[moon.sign].need}. ${hard ? 'A tensão calculada entre Sol e Lua torna essa diferença parte central da leitura: o caminho que mobiliza sua vontade pode exigir ajustes para não consumir o apoio emocional de que ele próprio depende.' : sunMoonSame ? 'O mesmo signo aproxima essas duas buscas: uma escolha pode reunir entusiasmo e conforto, mas também prolongar uma resposta conhecida porque ela atende aos dois ao mesmo tempo.' : contact ? 'O contato entre Sol e Lua oferece uma ligação entre essas buscas, sem torná-las idênticas: aquilo que sustenta você pode servir de base a uma direção, em vez de precisar determinar toda escolha.' : 'Sem um aspecto maior entre Sol e Lua nesta política, a leitura conserva essas duas referências distintas: nem todo desejo precisa oferecer conforto imediato, e nem todo conforto precisa virar direção de vida.'}`;
	const entrance =
		g.asc && ruler
			? `O Ascendente em ${signs[g.asc.sign]} acrescenta ${natalStyles[g.asc.sign].entry} como maneira de começar. ${entranceDifferent ? 'Isso pode tornar o primeiro movimento diferente daquilo que você procura desenvolver depois: a entrada numa situação não resume seu modo de permanecer nela.' : 'A entrada encontra uma disposição próxima da direção solar, mas o regente mostra o trabalho necessário para sustentar essa continuidade.'} Com ${bodyNames[ruler.body]} em ${signs[ruler.sign]}, continuar envolve ${planetParticipation(ruler)}. ${ruler.house ? `A casa ${ruler.house} desloca esse trabalho para ${houseScenes[ruler.house - 1]}; portanto, a iniciativa precisa encontrar espaço nesse campo para ganhar continuidade.` : ''}`
			: '';
	const limitation = career
		? 'A conclusão é uma combinação de critérios para reconhecer uma contribuição: identificação, condições para sustentá-la e espaço para decidir. Ela pode orientar a comparação entre caminhos reais, mas formação, acesso, remuneração e necessidades materiais precisam entrar nessa decisão com seu próprio peso.'
		: 'Essa composição não pede uma versão de você que funcione sempre do mesmo modo. Ela oferece uma explicação para ritmos que podem coexistir: o começo, o envolvimento e a sustentação de uma escolha. A nuance está em reconhecer qual necessidade está sendo atendida e qual está pagando o custo, sem reduzir toda a experiência a um traço de personalidade.';
	return {
		title: career
			? 'Uma direção que precisa caber na vida'
			: 'A dinâmica que aparece quando as partes se encontram',
		claim,
		text: [claim, entrance, limitation].filter(Boolean).join('\n\n'),
		factIds: [
			...new Set([
				sun.factId,
				moon.factId,
				...(contact ? [contact.factId] : []),
				...(g.asc && ruler ? [...g.asc.factIds, ruler.factId] : [])
			])
		],
		relation: `Sol ${signs[sun.sign]} + Lua ${signs[moon.sign]} ${contact?.kind ?? 'sem aspecto maior'}; ${g.asc && ruler ? `entrada ${signs[g.asc.sign]} e continuidade pelo regente ${ruler.body}/${signs[ruler.sign]}` : 'ângulos indisponíveis'}. Integra direção, recomposição e execução; ${hard ? 'custo emocional modifica direção' : sunMoonSame ? 'convergência pode fixar familiaridade' : 'necessidades distintas preservadas'}.`
	};
}

type ContextLens = { theme: NatalTheme; title: string; conclusion: string };
function contextLens(context: string): ContextLens | null {
	const text = context
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	const workload = /esgot|sobrecarg|cans|exaust|descans/.test(text);
	if (
		/transic|(?:mudar|trocar) de (?:area|carreira|trabalho)|mudanca (?:profissional|de area)|demiss|(?:novo|outro) emprego/.test(
			text
		)
	)
		return {
			theme: 'vocation',
			title: 'Mudar de direção sem transformar a escolha numa prova de valor',
			conclusion:
				'No contexto de uma mudança profissional, esta combinação coloca em primeiro plano a diferença entre ter capacidade para continuar numa função e reconhecer nela o que deseja construir. O compromisso já assumido merece consideração, mas não constitui, sozinho, motivo suficiente para definir toda a direção futura.' +
				(workload
					? ' Como sua pergunta também inclui cansaço ou descanso, a nova direção precisa fazer sentido pelo ritmo que permite sustentar, além do interesse que desperta. Mudar o conteúdo do trabalho sem rever a exigência de disponibilidade pode preservar uma parte do incômodo que motivou a busca.'
					: '')
		};
	if (workload)
		return {
			theme: 'effort',
			title: 'Quando continuar exige rever o tamanho do esforço',
			conclusion:
				'Ao ler esta composição a partir de uma preocupação com cansaço ou sobrecarga, a questão deixa de ser apenas como produzir mais. O que importa é como a iniciativa se encontra com a exigência: uma estrutura útil distribui esforço; uma cobrança sem término pode consumir a energia que tenta organizar. O mapa não determina a causa do cansaço nem substitui avaliar as condições concretas da rotina.'
		};
	if (/estud|aprend|faculdade|curso|concentr|dispers/.test(text))
		return {
			theme: 'learning',
			title: 'Dar uma direção ao interesse sem empobrecer a curiosidade',
			conclusion:
				'Diante do tema de aprendizagem que você trouxe, esta combinação ajuda a distinguir falta de interesse de falta de ligação entre a ideia ampla e o próximo passo compreensível. Um assunto pode mobilizar pela promessa e perder clareza na execução; o ponto interpretativo é como encontrar uma escala em que a curiosidade consiga se aprofundar.'
		};
	if (/dinheir|renda|financ|recurso|autonomia/.test(text))
		return {
			theme: 'resources',
			title: 'O que vale preservar e o que custa sustentar',
			conclusion:
				'Ao aproximar esta composição do tema de recursos, a leitura diferencia o valor que você reconhece em algo do compromisso necessário para conservá-lo. Essa distinção pode tornar mais claro por que uma escolha agradável pesa, ou por que uma condição segura já não satisfaz. Ela não prevê renda nem orienta investimentos.'
		};
	if (/relacion|casal|amor|vincul|parceir|afeto|famil/.test(text))
		return {
			theme: 'affection',
			title: 'A relação entre o cuidado oferecido e o cuidado necessário',
			conclusion:
				'No tema dos vínculos, esta composição permite distinguir a forma de demonstrar carinho daquilo que ajuda você a se sentir acolhido. Essa diferença importa porque dedicação e satisfação não são equivalentes: um vínculo pode conter gestos valiosos e ainda precisar de uma linguagem de cuidado mais compreensível para quem os recebe.'
		};
	return null;
}
function contextualPassage(input: WorkflowInput, g: FactGraph): CurrentPassage | null {
	if (!input.context?.trim() || !g.contextFactId) return null;
	const lens = contextLens(input.context);
	if (!lens) return null;
	const basis = interpretNatalPair(g, lens.theme);
	if (!basis) return null;
	return {
		title: lens.title,
		claim: lens.conclusion,
		text: `${lens.conclusion}\n\n${basis.claim}\n\nO contexto foi informado por você e orienta a relevância deste trecho; ele não é uma ocorrência deduzida do mapa.`,
		factIds: [...basis.factIds, g.contextFactId],
		relation: `Contexto relatado orienta ${lens.theme}. ${basis.relation}`
	};
}

const atlasThemes: Record<
	AtlasPriorityId,
	{ theme: NatalTheme; houses: number[]; meaning: string }
> = {
	work: {
		theme: 'vocation',
		houses: [2, 6, 10],
		meaning:
			'No trabalho, a questão é como reconhecer uma contribuição própria e assumir responsabilidade por ela, sem tornar toda entrega uma avaliação do seu valor.'
	},
	relationships: {
		theme: 'desire',
		houses: [7, 11],
		meaning:
			'Nos vínculos, esta prioridade reúne a aproximação que você deseja cultivar e a vontade própria que precisa continuar existindo dentro dela. O interesse ganha qualidade quando encontra reciprocidade.'
	},
	resources: {
		theme: 'resources',
		houses: [2, 8],
		meaning:
			'Ao olhar para recursos e autonomia, o centro da leitura é a diferença entre conservar o que importa e manter uma obrigação que já perdeu sentido. A segurança ganha significado quando também serve à vida que você quer sustentar.'
	},
	home: {
		theme: 'affection',
		houses: [4],
		meaning:
			'Na casa e no pertencimento, acolhimento e cuidado se encontram no cotidiano. Um ambiente pode ser familiar sem atender às necessidades atuais; dar continuidade a um vínculo também pode exigir mudar a forma de participar dele.'
	},
	learning: {
		theme: 'learning',
		houses: [3, 5, 9],
		meaning:
			'Em aprendizagem e expressão, a interpretação acompanha a passagem entre compreender uma ideia e encontrar um horizonte que mantenha o interesse. Acumular informação e construir entendimento são resultados diferentes.'
	},
	care: {
		theme: 'effort',
		houses: [6, 12],
		meaning:
			'No autocuidado e na rotina, agir e estabelecer um limite precisam colaborar. Uma organização que permite realizar mas não permite recompor energia perde parte de sua função. Esta é uma leitura simbólica da relação com o esforço, sem avaliação de saúde.'
	},
	identity: {
		theme: 'identity',
		houses: [1, 5],
		meaning:
			'Na identidade e nas escolhas, a pergunta é como uma direção própria convive com aquilo de que você precisa para se sentir à vontade. Coerência não exige que desejo e conforto sejam idênticos.'
	},
	networks: {
		theme: 'growth',
		houses: [9, 11],
		meaning:
			'Nas redes e nos projetos, a possibilidade se amplia ao encontrar outras pessoas, mas também passa a depender de compromissos. A participação ganha consistência quando o alcance desejado tem uma forma que o grupo consegue sustentar.'
	}
};

function atlasPassages(
	input: WorkflowInput,
	c: CalculationSnapshot,
	g: FactGraph
): CurrentPassage[] {
	const data = c.data as unknown as AtlasData;
	const selected = data.priorities.map((label, index) => {
		const priority = atlasPriorityFor(label);
		if (!priority) throw Error('Prioridade do Atlas sem correspondência.');
		const spec = atlasThemes[priority.id],
			base = interpretNatalPair(g, spec.theme);
		if (!base) throw Error('Base temática do Atlas ausente.');
		const local = g.positions.filter(
			(p) =>
				p.house !== null &&
				spec.houses.includes(p.house) &&
				['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].includes(p.body)
		);
		const dominant = local.find((p) => !base.factIds.includes(p.factId));
		const modulation = dominant
			? `Há ainda uma nuance ligada ao campo dessa prioridade: ${bodyNames[dominant.body]} em ${signs[dominant.sign]}, na casa ${dominant.house}, traz a importância de ${planetParticipation(dominant)}. ${dominant.body === 'moon' ? 'Uma escolha pode estar bem organizada e ainda precisar de condições diferentes para ser emocionalmente habitável.' : dominant.body === 'mercury' ? 'A possibilidade ganha forma à medida que pode ser compreendida, explicada e revista; decidir não encerra esse trabalho de elaboração.' : dominant.body === 'venus' ? 'Sustentar essa área não depende apenas de cumprir: também importa reconhecer o que faz você desejar continuar participando dela.' : dominant.body === 'mars' ? 'O interesse precisa encontrar espaço para uma atitude própria; concordar com uma direção não substitui poder agir dentro dela.' : dominant.body === 'saturn' ? 'O compromisso dá duração à escolha, mas precisa de uma medida para não se tornar a única forma possível de envolvimento.' : 'O horizonte procurado modifica a escolha dos meios: avançar nessa área também significa decidir que tipo de experiência vale a pena ampliar.'}`
			: '';
		return {
			id: priority.id,
			label: priority.label,
			passage: {
				title: priority.label,
				claim: base.claim,
				text: [spec.meaning, base.text, modulation].filter(Boolean).join('\n\n'),
				factIds: [
					...new Set([
						...base.factIds,
						`priority-${index + 1}`,
						...(dominant ? [dominant.factId] : [])
					])
				],
				relation: `Prioridade ${index + 1}/${priority.id}; ${base.relation}; ${dominant ? `ênfase local ${dominant.body} casa${dominant.house}` : 'sem ênfase planetária local selecionada'}`
			} satisfies CurrentPassage
		};
	});
	const first = selected[0],
		second = selected[1];
	const claim = `Você colocou ${first.label.toLocaleLowerCase('pt-BR')} antes de ${second.label.toLocaleLowerCase('pt-BR')}. ${atlasPriorityLink(first.id, second.id)}`;
	const bridges = selected.slice(1).map((current, index) => {
		const previous = selected[index];
		const previousBodies = g.positions.filter((p) => previous.passage.factIds.includes(p.factId));
		const currentBodies = g.positions.filter((p) => current.passage.factIds.includes(p.factId));
		const common = previousBodies.find((p) => currentBodies.some((q) => q.body === p.body));
		const contact = common
			? undefined
			: g.aspects
					.filter(
						(a) =>
							(previousBodies.some((p) => p.body === a.first) &&
								currentBodies.some((p) => p.body === a.second)) ||
							(previousBodies.some((p) => p.body === a.second) &&
								currentBodies.some((p) => p.body === a.first))
					)
					.sort((a, b) => a.orb - b.orb)[0];
		const a = contact ? positionFor(g, contact.first) : undefined,
			b = contact ? positionFor(g, contact.second) : undefined;
		const connection = common
			? `${bodyNames[common.body]} em ${signs[common.sign]} participa das duas áreas: ${planetParticipation(common)} é uma condição que elas compartilham. Isso pode permitir que uma escolha ajude ambas; também explica por que tentar responder a tudo ao mesmo tempo pode sobrecarregar a mesma necessidade.`
			: contact && a && b
				? `No mapa, ${bodyNames[a.body]} forma ${aspectNames[contact.kind] ?? contact.kind} com ${bodyNames[b.body]}, aproximando essas duas áreas. ${['square', 'opposition'].includes(contact.kind) ? `A tensão envolve ${planetParticipation(a)} e ${planetParticipation(b)}: ampliar uma frente sem medida pode deixar a outra sem condições de participação.` : `A passagem entre ${planetParticipation(a)} e ${planetParticipation(b)} permite procurar meios que atendam às duas, sem exigir que tenham a mesma finalidade.`}`
				: `Essas áreas mobilizam referências diferentes: ${previousBodies[0] ? planetParticipation(previousBodies[0]) : 'dar forma à primeira escolha'} e ${currentBodies[0] ? planetParticipation(currentBodies[0]) : 'sustentar a segunda'}. Uma decisão que funciona num campo precisa, portanto, ser ajustada antes de servir ao outro.`;
		return {
			text: `${index === 0 ? '' : `O encontro entre ${previous.label.toLocaleLowerCase('pt-BR')} e ${current.label.toLocaleLowerCase('pt-BR')} acrescenta outra consequência. ${atlasPriorityLink(previous.id, current.id)} `}${connection}`,
			factIds: contact ? [contact.factId] : []
		};
	});
	const synthesis: CurrentPassage = {
		title: 'Como suas prioridades se encontram',
		claim,
		text: [
			claim,
			...bridges.map((b) => b.text),
			'A ordem informada dá precedência a uma escolha, sem eliminar as condições que as outras oferecem. Avançar na primeira prioridade se torna mais sustentável quando as demais continuam possíveis.'
		].join('\n\n'),
		factIds: [
			...new Set([
				...selected.flatMap((x) => x.passage.factIds),
				...bridges.flatMap((b) => b.factIds)
			])
		],
		relation: `Ordem relatada ${selected.map((x) => x.id).join(' > ')}; integração das quatro prioridades por condições compartilhadas ou contatos calculados, sem previsão temporal.`
	};
	const context = contextualPassage(input, g);
	return [...selected.map((x) => x.passage), synthesis, ...(context ? [context] : [])];
}

const titles: Record<Product, string> = {
	'birth-chart': 'Mapa Astral',
	'three-pillars': 'Sol, Lua & Ascendente',
	'life-atlas': 'Atlas da Vida',
	'purpose-career': 'Mapa de Propósito & Carreira',
	synastry: 'Sinastria',
	'couple-dossier': 'Dossiê do Casal'
};
const openings: Record<Product, string> = {
	'birth-chart':
		'Esta leitura acompanha como direção, sentimento, pensamento e iniciativa se encontram no seu mapa. O significado aparece nas relações entre as posições: uma facilidade pode carregar seu próprio custo, e ritmos diferentes podem coexistir sem que um invalide o outro.',
	'three-pillars':
		'Sol, Lua e Ascendente mostram perspectivas diferentes de uma mesma pessoa: o que dá sentido às escolhas, o que oferece acolhimento e a maneira de começar. Esta leitura reúne os três para mostrar tanto suas aproximações quanto as diferenças entre entrar numa experiência e conseguir permanecer nela.',
	'life-atlas':
		'Suas quatro prioridades organizam esta leitura. Cada área recebe uma interpretação própria, e o encontro entre elas mostra onde uma escolha pode apoiar outra ou disputar as mesmas condições de sustentação.',
	'purpose-career':
		'Esta leitura procura os critérios que tornam uma contribuição significativa para você e as condições necessárias para sustentá-la. Ela aproxima identificação, forma de trabalhar, aprendizagem e compromisso, sem reduzir sua direção a uma lista de profissões.',
	synastry:
		'Esta leitura acompanha o encontro entre duas formas de sentir, conversar, desejar e assumir compromissos. A identifica a pessoa do primeiro mapa; B, a do segundo. As diferenças recebem uma interpretação, preservando a voz de cada pessoa sobre o que efetivamente vive.',
	'couple-dossier':
		'As perguntas que você trouxe organizam a leitura do encontro entre os dois mapas. A identifica a pessoa do primeiro mapa; B, a do segundo. O dossiê desenvolve as dinâmicas relevantes para os assuntos informados, sem tomar o relato de uma pessoa como consenso do casal.'
};

/** Versioned entry point for newly generated readings. Historical composers remain immutable. */
export function composeCurrentNatal(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading | null {
	if (!(supported as readonly string[]).includes(input.productId)) return null;
	const product = input.productId as Product;
	const assertions: Record<Product, (i: WorkflowInput, c: CalculationSnapshot) => void> = {
		'birth-chart': assertBirthProjection,
		'three-pillars': assertPillarsProjection,
		'life-atlas': assertAtlasProjection,
		'purpose-career': assertPurposeProjection,
		synastry: assertSynastryProjection,
		'couple-dossier': assertDossierProjection
	};
	assertions[product](input, calculation);
	let passages: CurrentPassage[];
	if (product === 'synastry' || product === 'couple-dossier')
		passages = composeRelationshipPassages(input, calculation);
	else {
		const g = normalizeFactGraph(calculation);
		if (product === 'life-atlas') passages = atlasPassages(input, calculation, g);
		else if (product === 'three-pillars')
			passages = [
				interpretNatalPair(g, 'identity'),
				interpretAngle(g, 'asc'),
				contextualPassage(input, g),
				integration(g)
			].filter(present);
		else if (product === 'purpose-career')
			passages = [
				interpretAngle(g, 'mc'),
				interpretNatalPair(g, 'vocation'),
				interpretNatalPair(g, 'learning'),
				interpretCareerField(g, 2),
				interpretCareerField(g, 6),
				contextualPassage(input, g),
				integration(g, true)
			].filter(present);
		else
			passages = [
				interpretNatalPair(g, 'identity'),
				interpretAngle(g, 'asc'),
				interpretNatalPair(g, 'learning'),
				interpretNatalPair(g, 'affection'),
				interpretNatalPair(g, 'desire'),
				interpretNatalPair(g, 'effort'),
				interpretNatalPair(g, 'growth'),
				interpretAngle(g, 'mc'),
				contextualPassage(input, g),
				integration(g)
			].filter(present);
	}
	const ids = new Set(calculation.facts.map((f) => f.id));
	for (const p of passages) {
		if (!p.text.includes(p.claim) || !p.factIds.length || p.factIds.some((id) => !ids.has(id)))
			throw Error(`Evidência interpretativa inválida: ${p.title}`);
	}
	const reading: EvidenceReading = {
		version: CURRENT_NATAL_VERSION,
		productId: product,
		title: titles[product],
		opening: openings[product],
		source: `Composição editorial original ATVNA; ${CANON_VERSION}; atv-current-natal/1.0.0. Posições, casas e contatos provenientes da projeção verificada desta solicitação.`,
		sections: passages.map(({ title, text, factIds }) => ({ title, text, factIds })),
		questions:
			product === 'couple-dossier' || product === 'synastry'
				? [
						'Qual diferença descrita aqui merece uma conversa em que cada pessoa possa dizer como a vive?'
					]
				: ['Qual combinação desta leitura esclarece melhor uma escolha que importa para você?'],
		practice:
			product === 'life-atlas'
				? 'Escolha uma decisão já presente na sua primeira prioridade e dê a ela um alcance que preserve uma condição importante da segunda. O objetivo é aplicar a composição descrita, sem tentar reorganizar as quatro áreas de uma só vez.'
				: product === 'purpose-career'
					? 'Ao comparar uma possibilidade de trabalho, use a interpretação para nomear uma contribuição que deseja desenvolver e uma condição de que precisa para sustentá-la. Considere também as informações concretas de formação, remuneração, acesso e rotina.'
					: product === 'synastry' || product === 'couple-dossier'
						? 'Se ambos quiserem, levem uma das dinâmicas descritas a uma conversa breve. Cada pessoa pode dizer que gesto reconhece como cuidado ou compromisso; a leitura serve de apoio à conversa, sem decidir a resposta do outro.'
						: 'Escolha uma dinâmica que já tenha ficado clara na leitura e dê espaço às duas necessidades que ela descreve em uma decisão pequena. Não é necessário concordar com todo o texto para aproveitar uma distinção que faça sentido.',
		limits: [
			...calculation.limits,
			'Interpretação simbólica e contextual, sem diagnóstico, previsão de acontecimentos ou comprovação de traços pessoais.',
			'As aproximações temáticas não pressupõem um aspecto entre os fatores; quando um contato calculado modifica a interpretação, ele é identificado no trecho correspondente.'
		],
		interpretation: {
			version: 'atv-interpretation-evidence/1',
			family: product === 'synastry' || product === 'couple-dossier' ? 'relational' : 'natal',
			conclusions: passages.map((p, section) => ({
				section,
				claim: p.claim,
				factIds: p.factIds,
				relation: p.relation
			}))
		}
	};
	return reading;
}
