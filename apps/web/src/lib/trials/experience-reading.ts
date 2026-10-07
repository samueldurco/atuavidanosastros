import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { composeTrialReading as composeV2 } from './editorial-reading';
import { bodyEditorial, signEditorial } from './content';
import { experienceFor } from './experience';
import { curateExperience } from './experience-curation';
import { personalizePositions } from './position-interpretation';
import type { TrialReading } from './reading';

import { CONTENT_VERSION } from './versions';
export { CONTENT_VERSION, POLICY_VERSION } from './versions';
type Fact = CalculationSnapshot['facts'][number];
type Section = TrialReading['sections'][number];
const signs = Object.keys(signEditorial);
const bodies = Object.keys(bodyEditorial);
const signOf = (f?: Fact) => f && signs.find((s) => f.display.includes(s));
const bodyOf = (f: Fact) =>
	bodies.find((b) => new RegExp(`${b}(?: natal| no retorno| do retorno)?:`).test(f.display));
const section = (title: string, text: string, facts: Fact[] = []): Section => ({
	title,
	text,
	factIds: facts.map((f) => f.id)
});
const position = (facts: Fact[], body: string) =>
	facts.find((f) => f.kind === 'calculated' && bodyOf(f) === body && !f.id.startsWith('sample-'));
const angleSign = (f?: Fact) => signOf(f);
const reference = (f?: Fact) =>
	f
		? `${bodyOf(f) ?? 'Referência'} em ${signOf(f) ?? 'signo não informado'}`
		: 'Referência indisponível';
const aspect = (f: Fact) =>
	f.kind === 'calculated' &&
	!/^day-|series$/.test(f.id) &&
	/conjunção|sextil|quadratura|trígono|oposição/.test(f.display) &&
	!/nenhum aspecto/i.test(f.display);
const sourceChapter = (base: TrialReading, f: Fact) => {
	const chapters = base.sections.filter(
		(s) =>
			!/Como esta leitura foi organizada|Base e método|Rastreabilidade|O fio da sua leitura/.test(
				s.title
			)
	);
	return (
		chapters.find((s) => s.factIds.length === 1 && s.factIds[0] === f.id) ??
		chapters.find((s) => s.factIds.includes(f.id))
	);
};
const rank = (f: Fact) =>
	(f.display.match(/Sol|Lua|Mercúrio|Vênus|Marte/g) ?? []).length * 10 -
	Number(f.display.match(/(?:orbe|desvio nominal) ([\d.]+)/)?.[1] ?? 9);

function career(input: WorkflowInput, calc: CalculationSnapshot, base: TrialReading): Section[] {
	const facts = calc.facts;
	const mc = facts.find((f) => f.id === 'angle-midheaven'),
		mcSign = angleSign(mc);
	const ruler = facts.find((f) => f.id === 'career-mc-ruler');
	if (!ruler || !mcSign)
		return [
			section(
				'O alcance desta edição',
				'Esta leitura foi calculada com a base antiga, limitada ao Meio do Céu. Ela permite rever aquela referência, mas não sustenta a nova síntese profissional. Gere uma nova leitura para incluir regente, planetas, casas disponíveis e aspectos; suas anotações anteriores continuam preservadas.',
				mc ? [mc] : []
			),
			...base.sections
		];
	const rulerName = bodies.find((b) => ruler.display.endsWith(b));
	const rulerPosition = rulerName ? position(facts, rulerName) : undefined;
	const sun = position(facts, 'Sol'),
		mercury = position(facts, 'Mercúrio'),
		mars = position(facts, 'Marte'),
		jupiter = position(facts, 'Júpiter'),
		saturn = position(facts, 'Saturno');
	const resource = (f: Fact | undefined, role: string) => {
		const sign = signOf(f);
		return f && sign
			? `${reference(f)}: ${role}, explorando ${signEditorial[sign][0]}. Observe se a experiência real confirma esse recurso e se aparece o custo de ${signEditorial[sign][2]}.`
			: `${role}: este fator não está disponível nesta edição.`;
	};
	const selected = facts
		.filter(aspect)
		.filter((f) => /Sol|Mercúrio|Marte|Júpiter|Saturno/.test(f.display))
		.sort((a, b) => rank(b) - rank(a))
		.slice(0, 3);
	const houses = [2, 6, 10]
		.map((n) => facts.find((f) => f.id === `house-${n}`))
		.filter((f): f is Fact => !!f);
	const bodySections = selected.map((f) =>
		section(
			f.display,
			`${f.display}.\n\n${sourceChapter(base, f)?.text ?? 'Compare este contato com uma escolha profissional concreta, sem tratar a combinação simbólica como competência comprovada.'}`,
			[f]
		)
	);
	return [
		section(
			'Sua direção em cinco minutos',
			`O MC em ${mcSign} abre a pergunta sobre ${signEditorial[mcSign][0]} como contribuição pública. A regência tradicional é de ${rulerName}; ${rulerPosition ? reference(rulerPosition) : 'sua posição não foi disponibilizada'} mostra uma segunda lente para examinar como sustentar essa direção.\n\n${resource(sun, 'autoria e identificação com a tarefa')}\n\n${resource(saturn, 'responsabilidade, limites e continuidade')}\n\nCompare essas lentes com uma decisão profissional concreta. Uma combinação promissora precisa caber nas suas habilidades, condições de vida e oportunidades atuais.`,
			[mc, ruler, rulerPosition, sun, saturn].filter((f): f is Fact => !!f)
		),
		section(
			'Ambientes em que vale fazer um teste',
			`No MC em ${mcSign}, ${signEditorial[mcSign][1]} é uma hipótese para o modo de contribuir. Procure um ambiente que permita observar essa contribuição em uma tarefa real, com escopo, autonomia e retorno claros.\n\n${resource(mercury, 'aprender, explicar e negociar')}\n\n${resource(mars, 'iniciar, defender limites e executar')}\n\nAo conversar sobre uma oportunidade, peça um exemplo de como a equipe toma decisões, lida com desacordos e reconhece um trabalho bem feito. Compare as respostas com sua experiência; o signo não escolhe uma ocupação.`,
			[mc, mercury, mars].filter((f): f is Fact => !!f)
		),
		section(
			'Recursos, rotina e reconhecimento',
			houses.length === 3
				? houses
						.map(
							(f, i) =>
								`${f.display}. ${['Casa 2: que habilidade demonstrável e recurso sustentam a escolha?', 'Casa 6: qual rotina consegue manter sem ultrapassar seus limites?', 'Casa 10: qual contribuição quer tornar visível?'][i]}`
						)
						.join('\n\n') +
						'\n\nAs cúspides localizam temas; não afirmam ocupação de um planeta. Compare remuneração real, tempo, cuidado pessoal e possibilidades de aprendizado antes de decidir.'
				: 'As casas profissionais não estão disponíveis neste cálculo. A síntese usa os planetas e o MC disponíveis; não atribui casas presumidas. Compare os recursos que possui, a rotina que consegue sustentar e o reconhecimento que deseja construir.',
			houses
		),
		section(
			'Crescimento com limites',
			`${resource(jupiter, 'ampliar repertório e reconhecer oportunidades')}\n\n${resource(saturn, 'transformar aprendizado em compromisso sustentável')}\n\nSe uma oportunidade parece ampla demais para os recursos atuais, reduza o primeiro compromisso. Defina o que precisa aprender, o apoio necessário e um limite de tempo ou custo antes de expandir.`,
			[jupiter, saturn].filter((f): f is Fact => !!f)
		),
		...bodySections,
		section(
			'Sua página de decisão',
			`Três forças para verificar:\n1. Contribuição: onde ${signEditorial[mcSign][0]} já aparece em um trabalho seu?\n2. Comunicação: que explicação ou entrega mostra seu modo de aprender?\n3. Continuidade: que compromisso você conseguiu sustentar?\n\nTrês armadilhas para observar:\n1. ${signEditorial[mcSign][2]}.\n2. Confundir uma possibilidade simbólica com uma habilidade já demonstrada.\n3. Aceitar uma rotina sem conhecer seus custos.\n\nTrês critérios para uma oportunidade:\n1. Uma tarefa que permita demonstrar contribuição e receber retorno específico.\n2. Recursos, remuneração e condições verificáveis.\n3. Espaço para aprender com limites e revisar a decisão.`,
			[mc, mercury, saturn].filter((f): f is Fact => !!f)
		),
		section(
			'Um experimento de trinta dias',
			`Dias 1–7: escolha uma tarefa pequena ligada à contribuição que deseja testar. Registre interesse, dificuldade, tempo e recursos; produza uma evidência do trabalho.\n\nDias 8–14: peça retorno específico a alguém que conheça a tarefa. Compare o que você pretendia comunicar com o que a pessoa recebeu.\n\nDias 15–21: ajuste um aspecto do ambiente ou da rotina. Repita uma tarefa comparável para distinguir entusiasmo inicial de interesse sustentável.\n\nDias 22–30: reveja suas anotações. Decida entre continuar, ajustar ou encerrar o experimento. Nenhuma dessas decisões exige confirmar o mapa. ${input.context ? 'O contexto que você registrou permanece na base desta leitura; use-o para definir a decisão concreta.' : 'Escreva a decisão concreta antes de começar.'}`,
			[]
		)
	];
}

function pillars(facts: Fact[], base: TrialReading): Section[] {
	const sun = position(facts, 'Sol'),
		moon = position(facts, 'Lua'),
		asc = position(facts, 'Ascendente');
	const selected = [sun, moon, asc].filter((f): f is Fact => !!f);
	if (selected.length !== 3) return base.sections;
	const ss = signOf(sun)!,
		ms = signOf(moon)!,
		as = signOf(asc)!;
	return [
		section(
			'Como seus três pilares se encontram',
			`O Sol em ${ss} trata da expressão que você escolhe construir: ${signEditorial[ss][0]}. A Lua em ${ms} trata da recuperação de segurança: ${signEditorial[ms][1]}. O Ascendente em ${as} trata da resposta inicial ao ambiente: ${signEditorial[as][1]}.\n\n${ss === ms ? `Sol e Lua compartilham ${ss}, mas cumprem funções diferentes. O que você gosta de mostrar pode ter o mesmo estilo do que precisa para se recompor; isso não significa que visibilidade substitua descanso ou acolhimento.` : `Expressar ${signEditorial[ss][0]} pode pedir um ritmo diferente de ${signEditorial[ms][1]}. Observe se uma escolha que entusiasma você também deixa espaço para a necessidade emocional.`}\n\nAo chegar a um encontro, comece pela lente do Ascendente; durante a conversa, reconheça o que quer expressar; depois, observe do que precisou para recuperar equilíbrio. A assinatura nasce dessa relação, não da soma de três rótulos.`,
			selected
		),
		...base.sections.filter(
			(s) =>
				s.factIds.length === 1 &&
				!/O fio|Como esta leitura foi organizada|Base e método/.test(s.title) &&
				s.factIds.some((id) => selected.some((f) => f.id === id))
		)
	];
}

function daily(facts: Fact[], base: TrialReading): Section[] {
	const selected = facts
		.filter(aspect)
		.sort((a, b) => rank(b) - rank(a))
		.slice(0, 3);
	if (!selected.length)
		return [
			section(
				'Seu tema de observação',
				'A amostra das 12h UTC não encontrou aspectos maiores dentro dos orbes definidos. Isso não descreve um dia vazio nem permite concluir que tudo será tranquilo. Escolha uma situação real para observar e anote o que depende da sua preparação.'
			),
			section(
				'Uma pergunta para o dia',
				'Que pequeno cuidado ajudaria você a lidar com o compromisso mais importante de hoje? Ao fim do dia, compare a intenção com o que aconteceu.'
			)
		];
	const main = selected[0];
	const personal = sourceChapter(base, main);
	const fast = selected.filter((f) =>
		/^(?:Amostra · )?(?:Lua|Sol|Mercúrio|Vênus|Marte)(?: em trânsito)?[ —/]/.test(f.display)
	);
	const background = selected.filter((f) => !fast.includes(f));
	return [
		section(
			'O tema principal de hoje',
			`${main.display}.\n\n${personal?.text ?? 'Este contato nominal relaciona um fator em trânsito com um fator natal. Escolha um exemplo concreto para investigar os dois temas.'}`,
			[main]
		),
		section(
			'O que muda mais rápido e o que pede perspectiva',
			`${fast.length ? `Entre os contatos selecionados, os fatores de movimento mais rápido são: ${fast.map((f) => f.display).join('; ')}. Eles ajudam a escolher uma observação próxima.` : 'Os contatos selecionados não incluem um fator rápido em primeiro plano.'}\n\n${background.length ? `Para uma perspectiva mais ampla: ${background.map((f) => f.display).join('; ')}. O corpo mais lento sugere uma escala de observação maior, sem certificar duração.` : 'Nenhum contato lento adicional foi selecionado para este resumo.'}\n\nEste cálculo é uma fotografia às 12h UTC. Não determina início, exatidão, fim nem duração dos contatos.`,
			selected
		),
		section(
			'Leve uma pergunta, faça uma observação',
			'Qual dos temas acima já aparece em um compromisso real? Escolha uma ação pequena sob seu controle, registre o resultado e reveja a hipótese amanhã. Uma previsão não substitui preparação nem revela a decisão de outra pessoa.'
		)
	];
}

function relationship(facts: Fact[], base: TrialReading, brief: boolean): Section[] {
	const themes: [string, RegExp, string][] = [
		[
			'Afeto e aproximação',
			/Vênus|Sol/,
			'Cada pessoa nomeia um gesto de afeto que reconhece e um que costuma passar despercebido.'
		],
		[
			'Necessidades emocionais',
			/Lua/,
			'Cada pessoa descreve o apoio que prefere depois de um dia difícil; a outra confirma o que entendeu.'
		],
		[
			'Comunicação e escuta',
			/Mercúrio/,
			'Escolham um assunto pequeno. Uma pessoa fala, a outra resume e pergunta se compreendeu antes de responder.'
		],
		[
			'Desejo, iniciativa e limites',
			/Marte|Vênus/,
			'Conversem sobre ritmo e consentimento, sem presumir disponibilidade ou intenção a partir do mapa.'
		],
		[
			'Atrito e reparação',
			/quadratura|oposição/,
			'Lembrem um desacordo e negociem uma pausa, uma forma de retomar e um limite que os dois aceitam.'
		],
		[
			'Crescer juntos',
			/Júpiter|Saturno/,
			'Escolham um projeto pequeno com responsabilidades explícitas e uma data para rever o acordo.'
		]
	];
	const used = new Set<string>();
	const selectedThemes = brief ? [themes[0], themes[1], themes[3]] : themes;
	return selectedThemes.map(([title, pattern, action]) => {
		const selected = brief
			? facts
					.filter((f) => /^person-[ab]-/.test(f.id) && pattern.test(f.display) && !used.has(f.id))
					.slice(0, 2)
			: facts
					.filter(aspect)
					.filter((f) => pattern.test(f.display) && !used.has(f.id))
					.sort((a, b) => rank(b) - rank(a))
					.slice(0, 2);
		selected.forEach((f) => used.add(f.id));
		const text = selected
			.map(
				(f) =>
					`${f.display}.\n${sourceChapter(base, f)?.text ?? 'Leia o primeiro fator como pertencente à Pessoa A e o segundo à Pessoa B. Esta comparação não mede a qualidade da relação.'}`
			)
			.join('\n\n');
		return section(
			title,
			`${text || 'Não foi selecionado um contato específico para este tema dentro da política de aspectos. A conversa abaixo é uma proposta editorial, sem atribuir uma condição ao casal.'}${brief ? '\n\nEstas são referências individuais de cada pessoa. A combinação não calcula aspectos entre os mapas nem mede compatibilidade; comparem suas próprias respostas antes de formular um acordo.' : ''}\n\nConversa a dois: ${action} Registrem também o que não corresponde à experiência de vocês.`,
			selected
		);
	});
}

export function composeTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const base = personalizePositions(composeV2(input, calculation), calculation),
		contract = experienceFor(input.productId);
	let sections: TrialReading['sections'];
	if (['career-compass', 'purpose-career'].includes(input.productId))
		sections = career(input, calculation, base);
	else if (input.productId === 'three-pillars') sections = pillars(calculation.facts, base);
	else if (input.productId === 'horoscope') sections = daily(calculation.facts, base);
	else if (input.productId === 'date-reading')
		sections = daily(calculation.facts, base).map((s) => ({
			...s,
			title: s.title.replace('hoje', 'da data escolhida').replace('para o dia', 'para a data'),
			text: s.text.replace('de hoje', 'da data escolhida').replace('amanhã', 'depois da data')
		}));
	else if (['synastry', 'pair-preview', 'couple-dossier'].includes(input.productId)) {
		sections = relationship(calculation.facts, base, input.productId === 'pair-preview');
		if (input.productId !== 'pair-preview')
			sections.push(
				...base.sections.filter(
					(s) =>
						!/encontro/.test(s.title) &&
						s.factIds.length <= 2 &&
						s.factIds.some((id) => /^person-[ab]-(sun|moon|mercury|venus|mars)$/.test(id))
				)
			);
		if (input.productId === 'couple-dossier')
			sections.push(
				section(
					'Um acordo para experimentar por sete dias',
					'Escolham um único tema das conversas: cuidado, escuta, iniciativa ou reparação. Cada pessoa descreve um gesto que aceita experimentar e um limite que precisa preservar.\n\nDurante sete dias, observem o que aconteceu sem usar o mapa como argumento contra a outra pessoa. Ao final, cada uma nomeia um efeito útil, um desconforto e um ajuste. Mantenham, mudem ou encerrem o acordo com consentimento dos dois.'
				)
			);
	} else {
		sections = curateExperience(input, calculation, base);
	}
	const covered = new Set(sections.flatMap((s) => s.factIds));
	const remaining = calculation.facts.filter((f) => !covered.has(f.id));
	if (remaining.length)
		sections.push(
			section('Referências desta leitura', remaining.map((f) => f.display).join('\n'), remaining)
		);
	return {
		...base,
		version: CONTENT_VERSION,
		opening: contract.benefit,
		sections,
		limits: [
			...new Set([
				...base.limits.filter(
					(l) => !/homologa|teste privado|aprovação|não habilita venda|não libera venda/i.test(l)
				),
				'As propostas de ação são editoriais; os fatores calculados aparecem nas referências. A leitura pode ser aceita, questionada ou rejeitada pela sua experiência.'
			])
		]
	};
}
