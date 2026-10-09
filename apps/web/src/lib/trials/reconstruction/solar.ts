import type { AspectCalculation, CrossAspectCalculation } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { CANON_VERSION, bodyNames, functions, signs, modernRulers } from './canon';
import { houseAreas, natalStyles } from './natal-canon';
import { normalizeFactGraph } from './fact-graph';
import { aspectNames } from './date-facts';
import { assertSolarProjection, solarHouseAt, type SolarMonth } from './solar-facts';

const graphVersion = 'atv-solar-annual-and-daily-observed-relations/1.0.0';
const unique = (ids: string[]) => [...new Set(ids)];
const date = (d: string) => d.slice(0, 10).split('-').reverse().join('/');
const slow = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const relations: Record<string, string> = {
	conjunction:
		'As duas funções se aproximam. Dar nome à necessidade de cada uma ajuda a perceber quando uma passa a ocupar todo o espaço.',
	sextile:
		'Há uma cooperação possível entre as funções. Ela pede uma iniciativa concreta e uma resposta observável, em vez de esperar uma oportunidade pronta.',
	square:
		'As funções colocam exigências em atrito. Uma mudança de ritmo, recurso ou prioridade pode permitir que ambas participem sem aumentar a cobrança.',
	trine:
		'A passagem entre as funções tende a parecer familiar. Use essa familiaridade como apoio, mas confira se ela também preserva um hábito que merece revisão.',
	opposition:
		'Dois polos pedem espaço. Explicitar o que cada um precisa costuma ser mais útil que fazer uma escolha definitiva entre eles.'
};
const actions: Record<string, string> = {
	sun: 'Escolha uma contribuição que tenha sua assinatura e defina como reconhecer participação suficiente, sem depender só da aprovação recebida.',
	moon: 'Observe qual necessidade de descanso, proximidade ou segurança está presente antes de responder à situação. Combine um cuidado concreto e confira seu efeito.',
	mercury:
		'Diferencie a informação confirmada da interpretação que você fez dela. Reformule uma pergunta e confira o entendimento antes de fechar um acordo.',
	venus:
		'Explicite o que torna a troca satisfatória para você e pergunte pelas condições da outra pessoa. Procure uma combinação que ambos possam sustentar.',
	mars: 'Divida a iniciativa em um passo reversível. Combine um limite de esforço e um momento de avaliação antes de aumentar a pressão.',
	jupiter:
		'Compare a possibilidade de ampliação com tempo, recursos e apoio disponíveis. Faça um teste pequeno antes de assumir uma promessa maior.',
	saturn:
		'Escolha um compromisso que merece continuidade. Dê a ele prazo, apoio e critério de suficiência, para diferenciar responsabilidade de cobrança sem medida.',
	uranus:
		'Teste uma alternativa reversível. Preserve o que ainda funciona e combine como avaliar a mudança antes de tratar uma ruptura como única saída.',
	neptune:
		'Acolha a impressão inicial e procure fatos que ajudem a examiná-la. Dê forma a uma inspiração sem atribuir certeza à intenção de ninguém.',
	pluto:
		'Distinga a escolha que é sua da resposta que pertence ao outro. Reduza uma tentativa de controle e observe o que a relação permite negociar.'
};
function contextFor(input: WorkflowInput) {
	const text = (input.context || '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	if (/relacion|casal|parceir|amor|vinculo/.test(text))
		return {
			key: 'relationships' as const,
			bodies: ['venus', 'moon', 'mercury'],
			houses: [5, 7, 8],
			focus: 'reciprocidade e condições dos acordos',
			practice:
				'Escolha um acordo que deseja acompanhar neste ciclo. Registre o que oferece, o que precisa receber e como saberá se a combinação continua possível. Converse sobre essas condições e retome o registro uma vez por mês, incluindo o que contrariou sua expectativa.'
		};
	if (/estud|aprend|curso|formacao/.test(text))
		return {
			key: 'study' as const,
			bodies: ['mercury', 'jupiter', 'saturn'],
			houses: [3, 9],
			focus: 'aprendizagem aplicada e continuidade do estudo',
			practice:
				'Escolha uma pergunta de aprendizagem para o ciclo. Faça uma primeira aplicação, guarde o resultado e retome a mesma pergunta a cada mês. Avalie o que passou a conseguir fazer, a dúvida que permaneceu e o ajuste de método que os fatos pedem.'
		};
	if (/trabalh|carreira|prazo|taref|carga|prioridade|organizacao/.test(text))
		return {
			key: 'workload' as const,
			bodies: ['sun', 'mars', 'saturn', 'mercury'],
			houses: [2, 6, 10],
			focus: 'autoria, capacidade de trabalho e compromissos sustentáveis',
			practice:
				'Escolha uma contribuição que deseja desenvolver no ciclo. Registre recursos, apoio, carga possível e um critério de suficiência. Ao final de cada mês, compare o esforço previsto e o realizado; ajuste o acordo com quem participa, em vez de tomar a leitura como um prazo obrigatório.'
		};
	return {
		key: 'general' as const,
		bodies: ['sun', 'moon', 'mercury', 'venus', 'mars'],
		houses: [] as number[],
		focus: 'escolhas pessoais e relação com as condições do ciclo',
		practice:
			'Escolha uma situação que deseja acompanhar neste ciclo. Registre sua resposta habitual e uma alternativa possível. Ao final de cada mês, compare o que tentou, o resultado observado e o que contrariou sua hipótese; preserve o registro para a revisão do próximo aniversário.'
	};
}
function selection(input: WorkflowInput, c: CalculationSnapshot) {
	const context = contextFor(input),
		natal = normalizeFactGraph(c);
	const positions = c.data.returnPositions as {
		body: string;
		longitude: number;
		retrograde: boolean;
	}[];
	const houses = c.data.returnHouses as {
		status: string;
		cusps: number[];
		ascendant: number;
		midheaven: number;
	};
	const ruler = houses.status === 'ok' ? modernRulers[Math.floor(houses.ascendant / 30)] : null;
	const score = (first: string, second: string, orb: number) =>
		(context.bodies.includes(first) ? 14 : 0) +
		(context.bodies.includes(second) ? 10 : 0) +
		([first, second].includes('sun') ? 8 : 0) +
		([first, second].includes('moon') ? 7 : 0) +
		([first, second].includes(ruler || '') ? 6 : 0) +
		4 -
		orb;
	const annual = (c.data.annualGeometry as AspectCalculation).aspects
		.map((a, i) => ({ a, id: `solar-annual-${i}`, score: score(a.first, a.second, a.orbDegrees) }))
		.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
		.slice(0, 3);
	const natalLinks = (c.data.natalGeometry as CrossAspectCalculation).aspects
		.map((a, i) => ({
			a,
			id: `solar-natal-${i}`,
			score:
				score(a.first, a.second, a.orbDegrees) +
				(context.houses.includes(natal.positions.find((p) => p.body === a.second)?.house ?? 0)
					? 9
					: 0)
		}))
		.filter((x) => !(x.a.first === 'sun' && x.a.second === 'sun' && x.a.kind === 'conjunction'))
		.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
		.slice(0, 2);
	const months = (c.data.months as SolarMonth[]).map((m) => {
		const sorted = m.contacts
			.map((contact) => ({
				contact,
				score:
					score(contact.transit, contact.natal, contact.minOrb) +
					(context.houses.includes(
						natal.positions.find((p) => p.body === contact.natal)?.house ?? 0
					)
						? 9
						: 0) +
					Math.min(contact.observedDates, 10) / 2
			}))
			.sort((a, b) => b.score - a.score || a.contact.id.localeCompare(b.contact.id));
		const chosen = [
			sorted.find((x) => slow.has(x.contact.transit)),
			sorted.find((x) => !slow.has(x.contact.transit))
		].filter((x): x is NonNullable<typeof x> => !!x);
		for (const x of sorted) if (chosen.length < 2 && !chosen.includes(x)) chosen.push(x);
		return { month: m, chosen };
	});
	return { context, natal, positions, houses, ruler, annual, natalLinks, months };
}
export function composeReconstructedSolar(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	assertSolarProjection(input, c);
	const { context, natal, positions, houses, ruler, annual, natalLinks, months } = selection(
		input,
		c
	);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		sections.push({ title, text, factIds: unique(factIds) });
		plan.push({ title, factIds: unique(factIds), role });
	};
	const position = (body: string) => positions.find((p) => p.body === body)!;
	const annualPlace = (body: string) => {
		const p = position(body),
			house = houses.status === 'ok' ? solarHouseAt(p.longitude, houses.cusps) : null;
		return {
			p,
			sign: Math.floor(p.longitude / 30),
			house,
			ids: [`return-${body}`, ...(house ? [`return-house-${house}`] : [])]
		};
	};
	const area = (house: number | null) =>
		house
			? `na casa ${house}, campo de ${houseAreas[house - 1]}`
			: 'sem atribuição de casa, porque Placidus não está disponível neste local';
	const sun = annualPlace('sun'),
		moon = annualPlace('moon');
	const linkText = (first: string, second: string, kind: string, overlay: boolean) =>
		`${bodyNames[first]} do retorno se relaciona por ${aspectNames[kind]} com ${bodyNames[second]} ${overlay ? 'natal' : 'do retorno'}. Isso põe ${functions[first]} em diálogo com ${functions[second]}. ${relations[kind]} ${actions[first]}`;
	add(
		'O eixo do seu ciclo anual',
		`O retorno foi calculado em ${date(c.data.returnInstant as string)} às ${(c.data.returnInstant as string).slice(11, 19)} UTC, para ${input.returnLocation!.city}. O Sol em ${signs[sun.sign]}, ${area(sun.house)}, destaca uma pergunta de autoria: como ${natalStyles[sun.sign].aim}? O signo solar se repete por definição do retorno; a casa e suas relações formam o recorte anual.\n\nPara o contexto de ${context.focus}, trate esse campo como uma prioridade a experimentar. ${actions.sun} O excesso a observar é ${natalStyles[sun.sign].excess}; o ajuste é ${natalStyles[sun.sign].adjustment}. A carta descreve possibilidades simbólicas do ciclo, sem determinar o que acontecerá.`,
		['return-instant', 'solar-cycle', ...sun.ids],
		'solar-theme'
	);
	add(
		'Lua: o que ajuda a sustentar o ano',
		`A Lua do retorno está em ${signs[moon.sign]}, ${area(moon.house)}. Ela convida a observar a necessidade de ${natalStyles[moon.sign].need}. Uma escolha anual pode ser coerente com seus objetivos e ainda exigir um modo de cuidar da disponibilidade emocional.\n\nO Sol chama atenção para ${sun.house ? houseAreas[sun.house - 1] : 'autoria sem localização por casas'}; a Lua para ${moon.house ? houseAreas[moon.house - 1] : 'cuidado sem localização por casas'}. ${sun.house && sun.house === moon.house ? 'As duas funções ocupam o mesmo campo anual: reserve espaço para produzir e para se recompor, em vez de pedir que uma atividade satisfaça todas as necessidades.' : 'São funções distintas: verifique que acordo permite participar sem abandonar a necessidade de apoio.'} ${actions.moon} Isso é uma pergunta para observar ao longo do ciclo, sem inferir como você se sentirá em cada mês.`,
		[...sun.ids, ...moon.ids],
		'solar-moon'
	);
	if (houses.status === 'ok') {
		const sign = Math.floor(houses.ascendant / 30),
			regent = annualPlace(ruler!);
		add(
			'Ascendente e regência: como entrar no ciclo',
			`O Ascendente anual em ${signs[sign]} sugere experimentar a entrada por ${natalStyles[sign].entry}. Seu regente moderno, ${bodyNames[ruler!]}, está em ${signs[regent.sign]}, ${area(regent.house)}. Essa ligação conduz a maneira de começar a um campo concreto do mapa anual.\n\n${actions[ruler!]} Observe o excesso de ${natalStyles[sign].excess}. Em vez de adotar o Ascendente como uma nova identidade, experimente ${natalStyles[sign].adjustment} na situação que você escolheu acompanhar. A cidade declarada participa do cálculo desses ângulos e casas; a leitura não recomenda deslocamentos para obter uma carta diferente.`,
			['return-ascendant', ...regent.ids],
			'solar-ascendant'
		);
	} else
		add(
			'Ascendente e casas: limite deste local',
			'O cálculo não oferece casas Placidus disponíveis para o local declarado. Por isso, esta leitura não atribui um Ascendente anual, regente do Ascendente ou campos anuais por casas. As posições dos corpos e suas relações permanecem disponíveis. Confira as prioridades pelos temas e pelas observações mensais, sem preencher a ausência com casas de outro sistema.',
			['return-instant', 'birthday-city'],
			'solar-ascendant'
		);
	const mcSign = Math.floor(houses.midheaven / 30),
		mcRuler = annualPlace(modernRulers[mcSign]);
	add(
		'Meio do Céu: contribuição e responsabilidade',
		`O Meio do Céu anual em ${signs[mcSign]} abre uma pergunta sobre contribuição: como ${natalStyles[mcSign].aim} em uma responsabilidade que outras pessoas possam reconhecer? ${bodyNames[modernRulers[mcSign]]}, regente moderno, está ${area(mcRuler.house)} e liga a direção pública a esse campo do ciclo.\n\n${actions[modernRulers[mcSign]]} Separe reconhecimento desejado de compromisso possível. Este eixo não indica uma profissão, promoção ou renda; ele ajuda a examinar uma forma de participar e responder por ela. Para ${context.focus}, combine um critério de suficiência antes de assumir que toda oportunidade precisa virar obrigação.`,
		['return-midheaven', ...mcRuler.ids],
		'solar-midheaven'
	);
	const personal = positions.filter((p) =>
		['sun', 'moon', 'mercury', 'venus', 'mars'].includes(p.body)
	);
	const groups = Array.from({ length: 12 }, (_, i) => ({
		house: i + 1,
		members: personal.filter((p) => solarHouseAt(p.longitude, houses.cusps) === i + 1)
	}))
		.filter((g) => g.members.length >= 2)
		.sort((a, b) => b.members.length - a.members.length || a.house - b.house);
	add(
		'A distribuição das prioridades',
		groups.length
			? groups
					.map(
						(g) =>
							`${g.members.map((p) => bodyNames[p.body]).join(', ')} se encontram na casa ${g.house}, campo de ${houseAreas[g.house - 1]}. A concentração de funções pessoais torna esse campo relevante para a síntese anual, sem transformar todos os corpos em uma única necessidade. Escolha uma situação desse campo e diferencie o que deseja criar, compreender, trocar ou iniciar. Observe onde duas exigências podem cooperar e onde precisam de acordos separados.`
					)
					.join('\n\n')
			: `A carta não concentra dois ou mais dos cinco corpos pessoais em uma casa disponível. Por isso, a leitura não elege uma área dominante por esse critério. O eixo solar e o cuidado lunar oferecem duas referências para distribuir a atenção. Compare essas perguntas com ${context.focus} e com os recursos que de fato existem; concentração e dispersão não medem qualidade do ano.`,
		groups.length
			? groups.flatMap((g) => [
					`return-house-${g.house}`,
					...g.members.map((p) => `return-${p.body}`)
				])
			: [...sun.ids, ...moon.ids],
		'solar-pattern'
	);
	add(
		'As relações que organizam a carta anual',
		annual.length
			? annual
					.map(
						(x) =>
							`${linkText(x.a.first, x.a.second, x.a.kind, false)} O afastamento calculado é ${x.a.orbDegrees.toFixed(2)}° dentro da política anual de 4°. Confronte essa hipótese com uma situação concreta, sem esperar que a relação produza um evento por si.\n\n`
					)
					.join('')
					.trim()
			: 'Nenhum aspecto da política anual selecionada foi encontrado entre os dez corpos. O eixo solar, a Lua e os ângulos disponíveis sustentam a síntese; não há razão para inventar uma relação para preencher a seleção.',
		annual.length ? annual.map((x) => x.id) : ['solar-cycle', ...sun.ids, ...moon.ids],
		'solar-annual-links'
	);
	add(
		'O retorno em relação ao seu mapa natal',
		natalLinks.length
			? natalLinks
					.map((x) => {
						const receiver = natal.positions.find((p) => p.body === x.a.second)!;
						return `${linkText(x.a.first, x.a.second, x.a.kind, true)} ${bodyNames[x.a.second]} natal em ${signs[receiver.sign]}${receiver.house ? `, casa ${receiver.house}, campo de ${houseAreas[receiver.house - 1]}` : ', sem atribuição de casa natal'} é a referência de origem. A carta anual propõe um recorte para uma função já presente, sem substituir seu mapa natal ou descrever uma nova personalidade. Afastamento calculado: ${x.a.orbDegrees.toFixed(2)}°.`;
					})
					.join('\n\n')
			: 'Além da igualdade solar que define o retorno, a política não oferece outra ligação selecionável ao natal. A síntese anual permanece apoiada em sua própria arquitetura. A leitura não cria um contato extra para justificar um tema.',
		natalLinks.length
			? unique(natalLinks.flatMap((x) => [x.id, `return-${x.a.first}`, `position-${x.a.second}`]))
			: ['natal-sun', 'return-sun'],
		'solar-natal-links'
	);
	const prior = new Map<string, number>();
	for (const { month: m, chosen } of months) {
		const prose = chosen
			.map(({ contact: c }) => {
				const receiver = natal.positions.find((p) => p.body === c.natal)!,
					signature = `${c.transit}/${c.natal}/${c.aspect}`,
					earlier = prior.get(signature);
				prior.set(signature, m.number);
				return `${bodyNames[c.transit]} em ${aspectNames[c.aspect]} com ${bodyNames[c.natal]} natal aparece em ${c.observedDates} das ${m.sampleCount} datas observadas, entre ${date(c.firstDate)} e ${date(c.lastDate)}. O menor afastamento observado é ${c.minOrb.toFixed(2)}° em ${date(c.minimumDate)} às 12h UTC; isso não certifica a passagem exata. ${earlier ? `Essa relação já apareceu no mês ${earlier}. Retome o registro anterior e compare o que permaneceu e o que mudou, sem tratá-la como uma nova promessa.` : `A relação aproxima ${functions[c.transit]} de ${functions[c.natal]}${receiver.house ? ` no campo natal de ${houseAreas[receiver.house - 1]}` : ''}. ${relations[c.aspect]}`} ${actions[c.transit]}`;
			})
			.join('\n\n');
		const important = m.importantDateIds.map((id) => c.facts.find((f) => f.id === id)!.display);
		add(
			`Mês ${m.number} · a partir de ${date(m.startDate)}`,
			`De ${date(m.startDate)} até antes de ${date(m.endDateExclusive)}. Este recorte civil reúne ${m.sampleCount} observações diárias do céu em relação ao natal; ele complementa a carta anual, sem repetir suas casas como uma previsão mensal.\n\n${prose || 'Nenhum contato entra na seleção mensal. Use a pergunta anual e as condições reais do período, sem interpretar a ausência de aspecto como ausência de acontecimentos.'}${important.length ? `\n\nVocê declarou para este mês: ${important.join('; ')}. Use esse relato para preparar uma pergunta ou acordo; a data informada não recebeu valor preditivo nem gerou alerta.` : ''}\n\nAo fechar o mês, anote uma tentativa, o efeito observado e o que contrariou a hipótese. Leve esse registro à próxima etapa do ciclo.`,
			[`solar-month-${m.number}`, ...chosen.map((x) => x.contact.id), ...m.importantDateIds],
			`solar-month-${m.number}`
		);
	}
	const boundary = (c.data.calendar as { boundaryImportantDateIds: string[] })
		.boundaryImportantDateIds;
	add(
		'Seu contexto e a revisão do ciclo',
		`${input.context || 'Você não declarou um contexto adicional.'}\n\nA seleção privilegiou ${context.focus}. O relato orienta prioridades e perguntas, sem alterar a geometria anual ou mensal. ${context.practice}${boundary.length ? `\n\nA data ${boundary.map((id) => c.facts.find((f) => f.id === id)!.display).join('; ')} está no aniversário de fechamento e pertence à fronteira do próximo ciclo. Ela foi preservada como relato e não incluída nas observações deste ano.` : ''} No próximo aniversário, reveja primeiro sua experiência: o que foi útil, o que não descreveu sua situação e que prioridade merece uma formulação diferente?`,
		['solar-cycle', ...(natal.contextFactId ? [natal.contextFactId] : []), ...boundary],
		'solar-context'
	);
	add(
		'Referências desta leitura',
		`A leitura relaciona a carta anual própria, o mapa natal e a grade diária preservada. Os fatos de cada capítulo podem ser consultados no resultado salvo. As observações diárias são evidência amostrada, sem certificar eventos ou horários exatos.\n\n${[...new Set(c.facts.map((f) => f.source))].join('\n')}`,
		c.facts.map((f) => f.id),
		'references'
	);
	const selected = [...annual, ...natalLinks].map((x) => ({
		factId: x.id,
		score: x.score,
		reason: `Arquitetura anual e ligação ao natal; contexto ${context.key}; identidade solar definidora excluída da seleção.`
	}));
	return {
		version: RECONSTRUCTION_VERSION,
		productId: 'solar-return',
		title: 'Revolução Solar',
		opening: `Seu ciclo de ${date(input.targetDate!)} até ${date((c.data.calendar as { endDateExclusive: string }).endDateExclusive)}: direção anual, relações com o natal e doze meses para acompanhar suas escolhas.`,
		source: `${CANON_VERSION}; ${graphVersion}; carta anual própria, regências modernas, cinco aspectos maiores anuais até 4° e observações diárias mensais até 2°.`,
		sections,
		questions: [
			'Que prioridade anual tem relação com sua situação e qual precisa ser reformulada?',
			'Que acordo permite sustentar autoria e cuidado ao longo do ciclo?',
			'O que mudou entre os registros mensais e o que contrariou sua hipótese inicial?'
		],
		practice: context.practice,
		limits: [
			'A carta do retorno usa o instante calculado e a cidade que você declarou. Ela tem uma arquitetura própria e é comparada ao natal; a precisão do motor ainda está em validação.',
			'Os doze meses começam no aniversário civil. Cada data tem uma observação às 12h UTC; confira o horário no seu local. Contatos breves entre observações podem não aparecer.',
			'Contagens e menores afastamentos descrevem a grade diária, sem certificar duração contínua ou hora exata. As datas destacadas não prometem acontecimentos nem dias favoráveis.',
			'Contexto e datas importantes orientam perguntas. As interpretações são hipóteses simbólicas para confrontar com a experiência; não determinam destino, decisões, diagnósticos ou intenções de outras pessoas.'
		],
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: graphVersion,
			selection: selected,
			patterns: [
				{
					kind: 'annual-personal-house-distribution',
					factIds: sections.find((s) => s.title === 'A distribuição das prioridades')!.factIds
				}
			],
			themes: [
				{
					id: 'annual-architecture',
					factIds: unique([...sun.ids, ...moon.ids, ...selected.map((x) => x.factId)])
				},
				...months.map((m) => ({
					id: `solar-month-${m.month.number}`,
					factIds: sections.find((s) => s.title.startsWith(`Mês ${m.month.number} ·`))!.factIds
				}))
			],
			context: { key: context.key, factId: natal.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedSolar(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
) {
	try {
		assertSolarProjection(input, c);
	} catch {
		return ['Base anual ou mensal adulterada.'];
	}
	const errors: string[] = [],
		known = new Set(c.facts.map((f) => f.id)),
		{ months, annual, natalLinks, context } = selection(input, c);
	if (
		r.editorial?.graph !== graphVersion ||
		r.editorial.canon !== CANON_VERSION ||
		r.editorial.context.key !== context.key
	)
		errors.push('Autoridade editorial anual divergente.');
	if (r.sections.some((s) => !s.factIds.length || s.factIds.some((id) => !known.has(id))))
		errors.push('Capítulo anual sem fatos conhecidos.');
	if (
		r.editorial?.selection.map((x) => x.factId).join('|') !==
		[...annual, ...natalLinks].map((x) => x.id).join('|')
	)
		errors.push('Seleção anual sem geometria verificável.');
	for (const { month, chosen } of months) {
		const entries = r.editorial?.plan.filter((p) => p.role === `solar-month-${month.number}`) || [];
		if (
			entries.length !== 1 ||
			!entries[0].title.includes(date(month.startDate)) ||
			chosen.some((x) => !entries[0].factIds.includes(x.contact.id)) ||
			!entries[0].factIds.includes(`solar-month-${month.number}`)
		)
			errors.push('Mês sem correspondência com observações próprias.');
	}
	if (
		r.sections.some((s) =>
			/(?:vai|irá) (?:acontecer|receber|conquistar)|dia (?:garantido|favorável)|exatidão certificada/i.test(
				s.text
			)
		)
	)
		errors.push('Promessa ou precisão não sustentada.');
	return errors;
}
