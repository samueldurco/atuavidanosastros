import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, bodyNames, functions, modernRulers, signMeanings, signs } from './canon';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import { assertPurposeProjection, type PurposeData } from './purpose-facts';
import { houseAreas } from './natal-canon';

const unique = (values: string[]) => [...new Set(values)];
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const position = (g: FactGraph, body: string) => g.positions.find((p) => p.body === body)!;
const context = (
	input: WorkflowInput
): {
	key: EditorialTrace['context']['key'];
	title: string;
	task: string;
	criterion: string;
	question: string;
} => {
	const text = (input.context ?? '').toLocaleLowerCase('pt-BR');
	if (/transi|mudar|mudança|desempreg|recoloca/.test(text))
		return {
			key: 'transition',
			title: 'Rever uma direção sem perder o chão',
			task: 'compare uma possibilidade atual com uma alternativa acessível; converse com alguém sobre o trabalho concreto e teste uma tarefa pequena antes de decidir',
			criterion: 'custo da transição, acesso à formação e apoio durante a mudança',
			question:
				'Qual hipótese de mudança pode ser testada sem comprometer as condições de que você depende?'
		};
	if (/lider|equipe|gestão|gestao|coordena/.test(text))
		return {
			key: 'leadership',
			title: 'Contribuição e autoridade na equipe',
			task: 'combine com a equipe uma entrega, a autonomia de cada pessoa e o momento de revisão; peça um retorno sobre a clareza do acordo',
			criterion:
				'responsabilidade proporcional à autonomia, critérios de decisão e distribuição da carga',
			question: 'Qual responsabilidade pede um acordo mais claro sobre autonomia e recursos?'
		};
	if (/estud|formaç|\bcursos?\b|aprend/.test(text))
		return {
			key: 'study',
			title: 'Aprender para uma possibilidade concreta',
			task: 'escolha uma habilidade de uma tarefa real e faça um exercício curto; peça retorno a alguém que conheça essa atividade',
			criterion: 'custo, tempo, pré-requisitos e possibilidade de aplicar o que aprende',
			question:
				'Qual tarefa pequena permite verificar o interesse antes de assumir uma formação longa?'
		};
	if (/autônom|autonom|empreend|freela|próprio|proprio/.test(text))
		return {
			key: 'independent',
			title: 'Autonomia com condições de sustentação',
			task: 'descreva uma proposta limitada, quem poderia usá-la e o que você consegue entregar com os recursos atuais; obtenha retorno sem assumir compromisso financeiro',
			criterion: 'tempo disponível, rede de apoio, recursos e limites da entrega',
			question: 'Que parte da proposta pode ser avaliada sem aumentar seu risco financeiro?'
		};
	if (/cansa|sobrecarg|exaust|limite|esgot/.test(text))
		return {
			key: 'workload',
			title: 'Reduzir carga antes de ampliar a direção',
			task: 'registre a carga de uma semana e identifique uma responsabilidade negociável; combine uma redução ou um apoio antes de acrescentar uma meta',
			criterion: 'capacidade disponível, descanso, saúde e acesso a apoio',
			question: 'O que precisa diminuir para uma escolha voltar a ser possível?'
		};
	return {
		key: 'general',
		title: 'Transformar interesse em critério de escolha',
		task: 'selecione uma tarefa acessível que represente a contribuição proposta; defina um resultado pequeno e peça retorno sobre sua utilidade',
		criterion: 'formação, condições materiais, acesso e margem real de escolha',
		question: 'Qual tarefa permite observar essa contribuição nas condições que você possui hoje?'
	};
};

export function purposeSelection(g: FactGraph) {
	const ruler = g.mc!.ruler,
		relevant = new Set(['sun', 'mercury', 'mars', 'jupiter', 'saturn', ruler]);
	return g.aspects
		.filter((a) => relevant.has(a.first) && relevant.has(a.second))
		.map((a) => ({
			aspect: a,
			score:
				(a.first === ruler || a.second === ruler ? 14 : 0) +
				(a.first === 'sun' || a.second === 'sun' ? 8 : 0) +
				(a.kind === 'square' || a.kind === 'opposition' ? 6 : 3) +
				6 -
				a.orb
		}))
		.sort((a, b) => b.score - a.score || a.aspect.factId.localeCompare(b.aspect.factId))
		.slice(0, 4);
}
function aspectText(g: FactGraph, a: Aspect) {
	const first = position(g, a.first),
		second = position(g, a.second),
		one = signMeanings[first.sign],
		two = signMeanings[second.sign];
	const relation =
		a.kind === 'conjunction'
			? 'As duas funções tendem a entrar juntas na situação. Separe o que cada uma precisa para evitar que uma resposta automática decida por ambas.'
			: a.kind === 'square'
				? 'A relação simboliza um atrito entre procedimentos. Ela se torna útil quando você define o problema que cada procedimento resolve, em vez de exigir que ambos funcionem ao mesmo tempo.'
				: a.kind === 'opposition'
					? 'A relação pede negociação entre duas prioridades. Observe quando você atribui toda a responsabilidade a uma delas e perde a informação oferecida pela outra.'
					: a.kind === 'trine'
						? 'A relação sugere familiaridade entre os procedimentos. A facilidade precisa de uso deliberado: algo que parece natural pode ficar pouco desenvolvido por falta de desafio e retorno.'
						: 'A relação sugere uma possibilidade de cooperação que depende de iniciativa. Defina uma tarefa em que as duas funções possam contribuir e verifique se a combinação ajuda.';
	return `${label(first)} relaciona ${functions[first.body]} ao modo de ${one.method}. ${label(second)} acrescenta ${functions[second.body]} e a possibilidade de ${two.method}. ${relation}\n\nNo trabalho concreto, combine um critério para a primeira função e outro para a segunda. Observe se a entrega melhora quando você distingue esses critérios. A hipótese perde força se a dificuldade desaparece apenas com mais recursos, descanso ou instruções claras; nesse caso, trate primeiro a condição observada.`;
}

export function composeReconstructedPurpose(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertPurposeProjection(input, calculation);
	const d = calculation.data as unknown as PurposeData,
		g = normalizeFactGraph(calculation),
		mc = g.mc!;
	const sun = position(g, 'sun'),
		mercury = position(g, 'mercury'),
		mars = position(g, 'mars'),
		jupiter = position(g, 'jupiter'),
		saturn = position(g, 'saturn'),
		ruler = position(g, mc.ruler);
	const direction = signMeanings[mc.sign],
		authorship = signMeanings[sun.sign],
		regency = signMeanings[ruler.sign],
		binding = context(input),
		selected = purposeSelection(g);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [],
		patterns: EditorialTrace['patterns'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const refs = unique(factIds);
		sections.push({ title, text, factIds: refs });
		plan.push({ title, factIds: refs, role });
	};
	const core = unique([...mc.factIds, sun.factId, ruler.factId]);
	const houseOfRuler =
		ruler.house === null
			? 'A casa do regente está indisponível nesta base. Sua ausência limita a ligação com uma área de experiência; o signo e os aspectos continuam disponíveis.'
			: `O regente está na casa ${ruler.house}, ligada a ${houseAreas[ruler.house - 1]}. Assim, a hipótese de contribuição pública encontra um campo de exercício nessa área. Isso não descreve um cargo: procure uma situação em que esse tema participa de uma entrega.`;
	add(
		'Propósito como contribuição que se verifica',
		`A direção do Meio do Céu em ${signs[mc.sign]} sugere investigar a possibilidade de ${direction.contribution}. ${label(sun)} qualifica essa direção com a motivação de ${authorship.motivation}. O regente do MC, ${label(ruler)}, propõe um caminho de execução: ${regency.method}. Juntos, esses fatores descrevem uma hipótese de participação, que precisa encontrar uma tarefa e alguém a quem seja útil.\n\nRecursos, rotina e reconhecimento não são a mesma dimensão. Uma atividade pode interessar e ainda exigir formação, tempo ou acesso indisponíveis; outra pode oferecer estabilidade sem permitir a contribuição que você quer desenvolver. Use esta leitura para distinguir essas dimensões, reconhecer escolhas possíveis e formular um próximo teste. Propósito pode se modificar ao longo da vida e existir também fora do emprego.`,
		core,
		'integrated-purpose'
	);
	add(
		'A direção pública e o caminho de seu regente',
		`O MC em ${signs[mc.sign]} descreve uma linguagem simbólica de contribuição: ${direction.contribution}. O modo de trabalho precisa oferecer condições para ${direction.environment}. Seu regente moderno é ${bodyNames[ruler.body]}, em ${signs[ruler.sign]}: ${regency.method}. A direção e seu caminho ${mc.sign === ruler.sign ? 'compartilham o mesmo procedimento, o que pode facilitar a coerência e também tornar menos visíveis outras soluções' : 'trazem procedimentos diferentes; explicite como o modo do regente pode dar forma ao que o MC propõe'}.\n\n${houseOfRuler}\n\nUm excesso a observar é ${direction.cost}; outro é ${regency.cost}. Escolha uma entrega atual e pergunte se esses modos ajudam quem a recebe. Se a hipótese não descreve sua experiência, mantenha a divergência no registro e revise o critério com fatos do trabalho.`,
		[
			...mc.factIds,
			ruler.factId,
			'purpose-ruler-house',
			...(ruler.house ? [`house-${ruler.house}`] : [])
		],
		'mc-regent-house'
	);
	for (const [house, title, focus, test] of [
		[
			2,
			'Recursos: o que sustenta sua margem de escolha',
			'recursos, habilidades exercidas e valores que você deseja preservar',
			'faça um inventário de habilidades comprovadas, recursos disponíveis e lacunas de acesso; escolha uma lacuna que possa reduzir'
		],
		[
			6,
			'Rotina: como o trabalho cabe na vida',
			'tarefas, acordos cotidianos, aprendizagem prática e capacidade disponível',
			'acompanhe uma tarefa repetida durante uma semana; registre tempo, interrupções e apoio necessário antes de mudar o procedimento'
		],
		[
			10,
			'Contribuição: visibilidade e responsabilidade',
			'participação pública, reconhecimento e relação com a autoridade',
			'descreva uma contribuição observável, para quem ela importa e como será avaliada; negocie responsabilidade e autonomia no mesmo acordo'
		]
	] as const) {
		const cusp = g.houses.find((h) => h.house === house),
			occupants = g.positions.filter((p) => p.house === house);
		if (!cusp) {
			add(
				title,
				`A casa ${house} está indisponível nesta base Placidus. Não atribuímos signo, regente ou planetas a ela. Ainda é possível investigar ${focus} por meio do seu relato e de observações diretas.\n\nComo exercício de contexto, ${test}. Esse registro não repõe a geometria ausente e não é apresentado como conclusão do mapa. Use-o para distinguir interesse, necessidade e condição material.`,
				['ascendant-unavailable', ...(g.contextFactId ? [g.contextFactId] : [])],
				'unavailable-house'
			);
			continue;
		}
		const hr = position(g, modernRulers[cusp.sign]),
			hm = signMeanings[cusp.sign];
		add(
			title,
			`A cúspide da casa ${house} em ${signs[cusp.sign]} associa ${focus} à possibilidade de ${hm.method}. Seu regente moderno, ${label(hr)}, desloca a atenção para ${signMeanings[hr.sign].method}${hr.house ? `, no campo de ${houseAreas[hr.house - 1]}` : ''}. O conjunto sugere um procedimento para avaliar, sem medir sua capacidade ou suas condições materiais.\n\n${occupants.length ? `Nesta área aparecem ${occupants.map((p) => `${bodyNames[p.body]} (${functions[p.body]})`).join(' e ')}. A presença destaca funções para relacionar à experiência; não garante que a área seja fácil nem que deva virar profissão.` : 'Não há planetas nesta casa entre os dez corpos calculados. A cúspide e o regente continuam participando da leitura; a ausência de planetas não representa falta de recursos ou importância.'}\n\nPara confrontar a hipótese, ${test}. Observe também o custo de ${hm.cost}. Um resultado diferente do esperado é informação para ajustar o procedimento, não sinal de fracasso pessoal.`,
			[
				cusp.factId,
				hr.factId,
				...(hr.house ? [`house-${hr.house}`] : []),
				...occupants.map((p) => p.factId)
			],
			`house-${house}`
		);
	}
	const workOccupants = g.positions.filter((p) => [2, 6, 10].includes(p.house ?? 0));
	if (workOccupants.length >= 3) {
		patterns.push({
			kind: 'resources-routine-contribution-emphasis',
			factIds: workOccupants.map((p) => p.factId)
		});
		add(
			'Quando os temas de trabalho se encontram',
			`Há ${workOccupants.length} dos dez corpos calculados nas casas 2, 6 e 10: ${workOccupants.map((p) => `${bodyNames[p.body]} na casa ${p.house}`).join(', ')}. Essa concentração simbólica torna útil observar como recursos, tarefas e responsabilidade pública se afetam. Não indica quantidade de trabalho, sucesso ou importância maior da carreira.\n\nProcure uma situação em que melhorar uma dessas dimensões prejudicou outra: uma responsabilidade que trouxe reconhecimento e retirou tempo de aprendizagem, ou uma rotina que preservou recursos mas estreitou a escolha. Escolha um ajuste que beneficie duas dimensões sem exigir que a terceira suporte todo o custo.`,
			workOccupants.map((p) => p.factId),
			'cross-house-pattern'
		);
	}
	add(
		'Autoria: o que torna a participação sua',
		`Com ${label(sun)}, a motivação de ${authorship.motivation} qualifica a direção de ${direction.contribution}. ${sun.house ? `O Sol na casa ${sun.house} situa essa investigação em ${houseAreas[sun.house - 1]}.` : 'A casa do Sol está indisponível, por isso não localizamos essa função em uma área natal.'} Procure o que você acrescenta quando tem condições de participar, sem transformar reconhecimento público em medida do próprio valor.\n\nUm modo de testar é ${authorship.test}. Compare o resultado com o retorno de quem recebeu a entrega. Observe se a tarefa permite autoria ou exige apenas corresponder à expectativa alheia. O excesso de ${authorship.cost} pode aparecer como um procedimento pouco útil; contexto, segurança e possibilidade de negociação também participam dessa resposta.`,
		[sun.factId, ...mc.factIds, ...(sun.house ? [`house-${sun.house}`] : [])],
		'solar-authorship'
	);
	add(
		'Compreender, comunicar e executar',
		`A contribuição precisa atravessar a passagem entre ideia e ação. ${label(mercury)} associa análise e comunicação a ${signMeanings[mercury.sign].method}. ${label(mars)} associa iniciativa e limites a ${signMeanings[mars.sign].method}. ${mercury.sign === mars.sign ? 'Os dois procedimentos compartilham um modo de agir; explicitar o resultado esperado ajuda a perceber quando a repetição deixou de servir.' : 'Os procedimentos diferem; defina o que precisa estar compreendido antes de agir e o que pode ser aprendido durante uma tentativa.'}\n\nEscolha uma tarefa que travou e separe três perguntas: a solicitação estava clara, havia recursos para executá-la e você podia negociar o limite? Só depois investigue os custos simbólicos de ${signMeanings[mercury.sign].cost} e de ${signMeanings[mars.sign].cost}. Essa ordem evita atribuir à pessoa um problema de organização ou de acesso.`,
		[mercury.factId, mars.factId],
		'thought-action'
	);
	add(
		'Aprender, ampliar e sustentar',
		`${label(jupiter)} propõe crescimento por meio de ${signMeanings[jupiter.sign].method}. ${label(saturn)} acrescenta o trabalho de ${signMeanings[saturn.sign].method}. A combinação permite formular uma ampliação com condições de continuidade: o que você quer aprender e qual estrutura permite praticar?\n\nDiante de uma oportunidade, descreva o aprendizado, o tempo de adaptação, o apoio e a responsabilidade exigida. Observe o custo de ${signMeanings[jupiter.sign].cost}, sem usar entusiasmo como prova de viabilidade. Observe também ${signMeanings[saturn.sign].cost}, sem tratar toda cautela como impedimento. Se o acesso à formação ou ao descanso é limitado, ajuste o tamanho do passo; isso não reduz seu valor ou sua contribuição.`,
		[jupiter.factId, saturn.factId],
		'growth-structure'
	);
	const axes: Record<string, string> = {
		ASC: 'modo de entrar e se apresentar',
		DSC: 'negociação com outras pessoas',
		MC: 'contribuição e exposição pública',
		IC: 'base privada e condições de sustentação'
	};
	add(
		'Funções próximas dos eixos',
		d.angular.length
			? d.angular
					.map((a) => {
						const p = position(g, a.body);
						return `${label(p)} está a ${a.orb.toFixed(2)}° do ${a.angle}, por distância em longitude. Relacionamos ${functions[p.body]} ao ${axes[a.angle]}. Uma hipótese prática é observar ${signMeanings[p.sign].method} nesse encontro. Compare a participação dessa função numa situação de trabalho e numa situação fora dele, para evitar reduzir sua vida à carreira.`;
					})
					.join('\n\n') +
					'\n\nO destaque angular descreve proximidade geométrica, sem medir força, talento ou garantia de reconhecimento. Só os eixos disponíveis entram neste critério de até 3°.'
			: 'Nenhum dos dez corpos está a até 3° em longitude dos eixos disponíveis. Isso não indica pouca força, vocação ou relevância profissional. A síntese continua baseada no MC, em seu regente, nas posições e nos aspectos calculados.\n\nAngularidade é um recorte de proximidade, diferente de ocupar uma casa angular. Evite ampliar o orbe para produzir um destaque. Se uma função é importante no seu relato, ela pode ser investigada como experiência declarada, com essa origem identificada.',
		[
			...d.angular.flatMap((a) => [a.factId, position(g, a.body).factId]),
			...mc.factIds,
			...(g.asc ? [...g.asc.factIds] : ['ascendant-unavailable'])
		],
		'angular-functions'
	);
	selected.forEach((s, i) =>
		add(
			`Relação ${i + 1}: ${bodyNames[s.aspect.first]} e ${bodyNames[s.aspect.second]}`,
			aspectText(g, s.aspect),
			[s.aspect.factId, position(g, s.aspect.first).factId, position(g, s.aspect.second).factId],
			'selected-purpose-aspect'
		)
	);
	add(
		binding.title,
		`O contexto informado participa da escolha do exercício, sem alterar o cálculo. ${input.context ? `Você trouxe: “${input.context}”.` : 'Você não informou um contexto profissional; os exercícios ficam abertos para você situá-los.'} Nesta etapa, investigue ${binding.criterion}. Relacione a direção de ${direction.contribution} à possibilidade de ${regency.method}, respeitando as condições que você conhece.\n\nComo primeiro teste, ${binding.task}. Registre o que esperava, o que ocorreu e qual condição ajudou ou dificultou. Se o relato envolve violência, discriminação, precariedade ou adoecimento, o mapa não explica a causa nem substitui apoio adequado; a decisão começa pelas condições de segurança e cuidado.`,
		[...core, ...(g.contextFactId ? [g.contextFactId] : [])],
		'reported-context'
	);
	add(
		'Condições que o mapa não mede',
		'Formação, território, classe social, saúde, responsabilidades de cuidado, discriminação, acesso a oportunidades e escolhas pessoais participam da vida profissional. O mapa não mede essas condições nem define o que você merece. Uma dificuldade de acesso pede recurso, negociação ou apoio; não deve virar diagnóstico de falta de propósito.\n\nFaça duas listas: condições que consegue negociar agora e condições que dependem de outras pessoas ou instituições. Escolha um passo apenas na primeira lista e identifique o apoio necessário para a segunda. Considere trabalho remunerado, estudo, cuidado, criação e participação comunitária conforme sua realidade. Você pode reconhecer contribuição em mais de uma dessas áreas, sem precisar reuni-las numa profissão ideal.',
		core,
		'material-conditions'
	);
	add(
		'Três experiências para comparar possibilidades',
		`Experiência de recursos: identifique uma habilidade comprovada e uma lacuna para a tarefa desejada. Use uma atividade pequena para ${authorship.test}; registre o esforço, o apoio e o que aprendeu.\n\nExperiência de rotina: durante sete dias, observe uma tarefa recorrente. Anote tempo, interrupções e margem para ${regency.method}. Negocie um ajuste possível e compare a execução antes e depois.\n\nExperiência de contribuição: escolha uma entrega que permita ${direction.contribution}. Combine quem recebe, qual é o resultado mínimo e como haverá retorno. Não assuma dívida, abandono de emprego ou compromisso financeiro para testar a hipótese. Ao final, compare interesse, condições e utilidade; esses três critérios podem apontar para passos diferentes.`,
		[...core, mercury.factId, mars.factId],
		'three-experiments'
	);
	add(
		'Como rever a hipótese com o que acontecer',
		`A leitura ganha utilidade quando admite revisão. Antes do teste, escreva: “Espero que este procedimento me ajude a ${direction.contribution}”. Depois, registre uma evidência favorável e uma evidência contrária. Pergunte se a diferença veio do procedimento, da tarefa ou das condições disponíveis.\n\nSe ${regency.method} não ajudou, teste outro modo sem tentar provar que o mapa estava certo. Se ajudou apenas com orientação, recursos ou descanso, mantenha essas condições no plano. Escolha entre continuar, ajustar, adiar ou abandonar a hipótese com base no que observou. A decisão continua sendo sua e pode mudar quando sua vida mudar.`,
		core,
		'counterfactual-review'
	);
	const used = new Set(sections.flatMap((s) => s.factIds)),
		remaining = g.facts.filter((f) => !used.has(f.id));
	if (remaining.length)
		add(
			'Base preservada e referências de cálculo',
			remaining.map((f) => f.display).join('\n') +
				'\n\nOs fatos acima permanecem disponíveis para auditoria. A seleção editorial prioriza os vínculos com a direção, seus meios de execução e o contexto informado; não transforma todos os fatores num diagnóstico de carreira.',
			remaining.map((f) => f.id),
			'technical-reference'
		);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Mapa de Propósito & Carreira',
		opening: `Investigue como ${direction.contribution} pode ganhar forma por meio de ${regency.method}, sem perder a motivação de ${authorship.motivation}. Recursos, rotina e condições de acesso ajudam a transformar essa hipótese num teste possível.`,
		source:
			'Síntese simbólica natal do método ATVNA de Propósito & Carreira, com regência moderna, casas disponíveis, seleção de aspectos e contexto declarado.',
		sections,
		questions: [
			binding.question,
			`Em qual tarefa você já conseguiu ${direction.contribution}, e quem se beneficiou?`,
			'Qual condição material precisa estar presente para o próximo teste?',
			'Que resultado faria você ajustar ou abandonar a hipótese?'
		],
		practice: `Escolha uma das três experiências e registre hipótese, tarefa, prazo curto, recursos, retorno e evidência contrária. Comece por esta pergunta: ${binding.question} Revise o registro em sete dias e escolha um próximo passo proporcional às condições disponíveis.`,
		limits: calculation.limits,
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: g.version,
			selection: selected.map((s) => ({
				factId: s.aspect.factId,
				score: Math.round(s.score * 1000) / 1000,
				reason: 'mc-regent+solar-authorship+relevant-function+relation+orb'
			})),
			patterns,
			themes: [{ id: 'purpose-resources-routine-contribution', factIds: core }],
			context: { key: binding.key, factId: g.contextFactId },
			plan
		}
	};
}

export function reviewReconstructedPurpose(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	const errors: string[] = [];
	try {
		assertPurposeProjection(input, c);
	} catch {
		return ['purpose-source-mismatch'];
	}
	if (
		r.productId !== 'purpose-career' ||
		r.version !== RECONSTRUCTION_VERSION ||
		r.editorial?.canon !== CANON_VERSION
	)
		errors.push('purpose-edition');
	if (r.sections.length < 15 || r.sections.filter((s) => s.text.length >= 220).length < 15)
		errors.push('purpose-depth');
	for (const role of [
		'integrated-purpose',
		'mc-regent-house',
		'solar-authorship',
		'thought-action',
		'growth-structure',
		'angular-functions',
		'reported-context',
		'material-conditions',
		'three-experiments',
		'counterfactual-review'
	])
		if (!r.editorial?.plan.some((p) => p.role === role)) errors.push(`purpose-missing-${role}`);
	if (
		r.editorial?.plan.length !== r.sections.length ||
		r.sections.some(
			(s, i) =>
				s.title !== r.editorial?.plan[i].title ||
				JSON.stringify(s.factIds) !== JSON.stringify(r.editorial?.plan[i].factIds)
		)
	)
		errors.push('purpose-plan');
	if (
		input.context &&
		!r.sections.some(
			(s) => s.factIds.includes('personal-context') && s.text.includes(input.context!)
		)
	)
		errors.push('purpose-context');
	if (r.questions.length < 4 || !r.sections.some((s) => s.text.includes('evidência contrária')))
		errors.push('purpose-review');
	return errors;
}
