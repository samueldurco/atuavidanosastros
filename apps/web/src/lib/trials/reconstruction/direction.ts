import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { canonical, type TrialReading } from '../reading';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { assertDirectionProjection, directionMethod } from './direction-facts';

type Binding = {
	key: EditorialTrace['context']['key'];
	match: RegExp;
	title: string;
	criterion: string;
	tasks: [string, string, string];
};
const bindings: Binding[] = [
	{
		key: 'transition',
		match: /mudar|mudança|transiç|nova área|trocar|recomeç/,
		title: 'Testar uma mudança preservando o que sustenta você',
		criterion:
			'Compare uma atividade da direção desejada com uma condição atual que precisa manter. Interesse e viabilidade são perguntas separadas.',
		tasks: [
			'Escolha uma tarefa real da área que considera e descreva como poderia conhecê-la usando materiais já disponíveis. Separe atração pelo tema de interesse pelo trabalho cotidiano.',
			'Faça uma amostra privada de uma parte dessa tarefa por até 30 minutos. Não peça desligamento, compre formação ou assuma compromisso para realizar a amostra.',
			'Se houver uma pessoa disponível e você quiser conversar, pergunte sobre uma dificuldade cotidiana da atividade, sem pedir vaga ou compartilhar informações sensíveis. Sem interlocutor, revise a amostra usando dois critérios explícitos.'
		]
	},
	{
		key: 'study',
		match: /estud|formaç|aprend|\bcursos?\b/,
		title: 'Aprender antes de ampliar o compromisso',
		criterion:
			'Diferencie vontade de estudar, compreensão do conteúdo e possibilidade de aplicá-lo. Uma dificuldade pode apontar a condição de aprendizagem, sem definir capacidade.',
		tasks: [
			'Escolha uma pergunta de aprendizagem e um material gratuito que já consegue acessar. Em 20 minutos, anote o que compreendeu e uma dúvida específica.',
			'Aplique uma ideia do material em uma tarefa privada de até 30 minutos. Registre a diferença entre acompanhar a explicação e fazer sem ajuda.',
			'Explique a ideia com suas palavras em um parágrafo e confira no material onde a explicação precisa mudar. Se quiser pedir retorno, combine uma pergunta pequena e aceite a indisponibilidade da pessoa.'
		]
	},
	{
		key: 'leadership',
		match: /lider|equipe|gestão|coorden/,
		title: 'Experimentar responsabilidade com limites claros',
		criterion:
			'Observe clareza de acordo, distribuição do esforço e espaço para discordar. Resultado individual não comprova funcionamento de uma equipe inteira.',
		tasks: [
			'Descreva um acordo pequeno que esteja sob sua responsabilidade: resultado, participantes, prazo e limite. Não inclua informações da equipe no registro privado.',
			'Em até 30 minutos, prepare uma proposta que reduza uma ambiguidade do acordo. Antes de aplicá-la a alguém, obtenha consentimento; sem ele, faça apenas a simulação privada.',
			'Compare o combinado com um exemplo observado. Se houver retorno consentido, registre a pergunta e a resposta sem identificar terceiros; considere também a hipótese de que o ajuste não ajudou.'
		]
	},
	{
		key: 'independent',
		match: /autônom|autonom|freela|negócio|empreend/,
		title: 'Conhecer o trabalho e sua administração',
		criterion:
			'Separe execução, administração e limite de disponibilidade. Uma experiência curta não demonstra demanda, preço ou renda futura.',
		tasks: [
			'Descreva uma entrega pequena, o que ficaria fora dela e quais recursos já tem. Faça a descrição em até 20 minutos, sem anúncio público ou compromisso com cliente.',
			'Produza uma amostra privada em até 30 minutos. Anote execução e administração separadamente, incluindo preparação e revisão.',
			'Revise a amostra por dois critérios: clareza da entrega e esforço necessário para repeti-la. Se pedir retorno a alguém, combine previamente a pergunta; não venda nem contrate nada como parte deste teste.'
		]
	},
	{
		key: 'workload',
		match: /descans|rotina|horário|sobrecarg|cansa|saúde|tempo/,
		title: 'Abrir espaço sem comprometer o descanso',
		criterion:
			'Trate energia, disponibilidade e apoio como condições observáveis. O objetivo pode precisar diminuir para caber na vida; isso não mede seu valor.',
		tasks: [
			'Observe um período habitual e anote uma tarefa, sua duração aproximada e uma interrupção. Use até 15 minutos de registro, sem monitorar toda a rotina.',
			'Reserve uma janela já disponível de até 20 minutos para uma parte da atividade desejada. Defina antes o horário de parar e preserve descanso, cuidado e obrigações.',
			'Compare duas tentativas curtas ou, se só houve uma, descreva por que a segunda não coube. Escolha um ajuste de horário, escopo ou apoio; a ausência de tempo é informação válida.'
		]
	},
	{
		key: 'general',
		match: /.*/,
		title: 'Transformar intenção em uma pergunta verificável',
		criterion:
			'Escolha um comportamento que depende de você e uma condição que permita observá-lo. O relato do objetivo indica uma intenção, sem demonstrar resultado ou aptidão.',
		tasks: [
			'Divida o objetivo em uma ação observável e escolha a menor parte que pode testar com recursos que já tem. Em até 20 minutos, registre o que espera aprender.',
			'Realize uma amostra privada de até 30 minutos, se as condições permitirem. Defina horário de parar, custo zero e uma condição para interromper a tentativa.',
			'Compare o resultado com a expectativa. Use um exemplo favorável e um contrário, ou registre que ainda não encontrou um deles. Escolha um ajuste pequeno antes de repetir.'
		]
	}
];
export function directionBinding(input: WorkflowInput) {
	const goal = input.journey?.goal ?? '';
	const matchedGoal = bindings.find((b) => b.key !== 'general' && b.match.test(goal));
	const binding = matchedGoal ?? bindings.find((b) => b.match.test(input.context ?? ''))!;
	return {
		binding,
		factId: matchedGoal ? 'declared-goal' : input.context ? 'reported-context' : 'declared-goal'
	};
}
export function composeReconstructedDirection(
	input: WorkflowInput,
	calc: CalculationSnapshot
): TrialReading {
	assertDirectionProjection(input, calc);
	const d = calc.data,
		{ binding: b, factId } = directionBinding(input);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (role: string, title: string, text: string, factIds: string[]) => {
		sections.push({ title, text, factIds: [...new Set(factIds)] });
		plan.push({ role, title, factIds: [...new Set(factIds)] });
	};
	add(
		'initial',
		'Seu ponto de partida e uma pergunta de trinta dias',
		`Você declarou: “${d.goal}”. O percurso começa em ${d.startDate}. Essa frase será a referência das revisões; ela não prova capacidade, dificuldade ou resultado futuro. Escolha a parte da intenção que depende de você e escreva uma pergunta que caiba numa experiência pequena.\n\n${b.criterion} O que você precisa conhecer para tomar a próxima decisão? Uma resposta possível ao final é que ainda falta informação. Antes de começar, anote uma expectativa, uma condição que precisa preservar e algo que contrariaria sua hipótese. Esse registro permite comparar o que imaginava com o que de fato ocorreu.`,
		['declared-goal', 'declared-start']
	);
	add(
		'context',
		b.title,
		`${input.context ? `Seu contexto declarado: “${input.context}”.` : 'Você não acrescentou contexto. Use as propostas como opções e defina seus próprios limites; a ausência de relato não permite concluir como está sua vida.'}\n\n${b.criterion} A escolha deste eixo usa ${factId === 'declared-goal' ? 'palavras do objetivo' : 'o contexto informado'}, sem diagnóstico ou inferência de personalidade. Se ele não representar sua pergunta, reformule o objetivo antes de iniciar outra edição.\n\nFormação, território, classe, saúde, oportunidade e acesso a apoio alteram o que é praticável. Liste uma condição disponível, uma restrição e uma ajuda possível. Não atribua à disposição individual o que depende de recursos, de outra pessoa ou de uma instituição.`,
		[factId, 'declared-goal', ...(input.context ? ['reported-context'] : [])]
	);
	add(
		'baseline',
		'Combine limites e sinais de revisão',
		`No ponto de partida, escreva o que espera observar ao testar “${d.goal}”. Use um exemplo concreto, sem transformar o objetivo numa exigência de desempenho. Escolha um sinal favorável, um sinal contrário e uma condição que exigiria pausar.\n\nCada experiência proposta tem custo financeiro zero e dura até 45 minutos, podendo ser reduzida ou substituída. Não abandone emprego, tratamento, estudo ou responsabilidades; não exponha dados privados nem comprometa descanso para cumprir o percurso. Se o objetivo exigir dinheiro, exposição pública ou risco para ser testado, observe ou simule uma parte dele com segurança. Se nem isso couber, registre a restrição e pause.\n\nTempo empregado, apoio disponível e custo de recuperação importam tanto quanto a tarefa. Ausência de execução não é falha pessoal: descreva a condição que impediu a tentativa.`,
		['declared-goal']
	);
	b.tasks.forEach((task, i) =>
		add(
			`experiment-${i + 1}`,
			[
				'Experimento 1: conhecer a tarefa',
				'Experimento 2: fazer uma amostra',
				'Experimento 3: comparar e ajustar'
			][i],
			`${task}\n\nAntes: escreva a hipótese e uma pergunta ligada a “${d.goal}”. Durante: observe uma ação, o tempo aproximado e uma condição que facilitou ou dificultou. Depois: registre o resultado, o esforço e algo que poderia contrariar sua expectativa. Um resultado favorável sem condições de repetição pede ajuste; uma dificuldade isolada não decide uma carreira.\n\nEscolha livremente fazer, reduzir ou pular esta proposta. Preserve o limite combinado e evite transformar uma experiência curta numa promessa de resultado. Se a atividade ultrapassar 45 minutos, pare e escolha uma parte menor.`,
			['declared-goal', factId]
		)
	);
	for (const { day, date } of d.milestones) {
		const specific =
			day === 7
				? 'Compare o ponto de partida com a primeira tentativa. O que conseguiu observar, quanto tempo usou e o que impediu ou facilitou começar? Se não houve tentativa, registre a restrição e reduza a próxima ação.'
				: day === 14
					? 'Compare a primeira tentativa com a repetição, se ela aconteceu. Que mudança de escopo, horário ou apoio alterou a experiência? Se só existe uma observação, não invente tendência. Escolha a variável que deseja testar na segunda metade.'
					: 'Compare sua expectativa inicial com as observações reunidas. Que tarefa passou a fazer sentido, qual condição continua faltando e o que contraria a hipótese inicial? Escolha continuar, ajustar, pausar ou encerrar, com um próximo passo proporcional às condições reais.';
		add(
			`check-in-${day}`,
			`Dia ${day} · ${date}: ${day === 7 ? 'começar e calibrar' : day === 14 ? 'comparar tentativas' : 'rever a direção'}`,
			`${specific}\n\nUse o formulário desta etapa para separar observação, condições e esforço, evidência contrária e próximo passo. Registre o que ocorreu com suas palavras. Uma data do cronograma não confirma que você fez a experiência; você pode responder depois e a gravação conserva sua data real.\n\nRelacione a resposta ao objetivo “${d.goal}”. Se sua pergunta mudou, preserve o objetivo original nesta edição e explique a mudança no próximo passo. A síntese reúne apenas respostas salvas, sem completar lacunas ou afirmar progresso em seu nome.`,
			['declared-goal', `civil-check-in-day-${day}`]
		);
	}
	add(
		'synthesis',
		'Síntese: expectativa, observação e escolha',
		`Ao registrar o dia 30, a área de acompanhamento coloca lado a lado sua expectativa inicial e sua observação final. Reúne as condições descritas nos dias 7 e 14, a evidência contrária do encerramento e a decisão que você escolher. Sem o ponto de partida ou sem o dia 30, a comparação permanece incompleta.\n\nNão há nota de sucesso nem previsão. Uma tentativa pode revelar interesse com condições inviáveis, viabilidade sem interesse, necessidade de apoio ou falta de informação. Essas são perguntas para examinar nos registros, não conclusões automáticas. Se houve mudança, descreva o exemplo que a sustenta e uma explicação alternativa.\n\nContinuar pede uma próxima experiência pequena. Ajustar pede uma variável diferente. Pausar pede uma condição para retomar. Encerrar permite guardar o aprendizado e escolher outra pergunta. Sua decisão, inclusive parar, permanece sua.`,
		['declared-goal', 'civil-check-in-day-30']
	);
	add(
		'continuity',
		'Um próximo caminho no ATV+',
		`Guarde esta edição, suas respostas e a decisão final na Biblioteca privada. O objetivo original e o cronograma permanecem associados à leitura; corrigir os dados cria uma nova edição e preserva a anterior. Você pode reabrir o percurso sem gerar outra leitura.\n\nA continuidade faz parte do ATV+ existente: escolher outra pergunta, voltar aos registros ou iniciar um novo percurso consentido. Ela não exige assinatura independente, compra, crédito ou cumprimento obrigatório de etapas. Uma leitura de Propósito ou da Bússola pode ser consultada por você como referência separada; esta Jornada não importa fatos natais, notas ou histórico de outro produto sem seleção e consentimento.\n\nAntes de repetir, examine se a próxima pergunta está diferente o suficiente para produzir aprendizado. Repetir a mesma tarefa sem mudança de condições pode trazer pouca informação; também é válido conservar o registro e esperar.`,
		['declared-goal', 'declared-start']
	);
	const editorial: EditorialTrace = {
		version: RECONSTRUCTION_VERSION,
		canon: directionMethod.version,
		graph: 'atv-direction-civil-facts/1.0.0',
		selection: [
			{
				factId,
				score: 1,
				reason: 'Objetivo primeiro, contexto depois; sem inferência psicológica.'
			}
		],
		patterns: [
			{
				kind: 'expectation-observation-counterevidence-choice',
				factIds: [
					'declared-goal',
					'civil-check-in-day-7',
					'civil-check-in-day-14',
					'civil-check-in-day-30'
				]
			}
		],
		themes: [{ id: 'reversible-experiments', factIds: ['declared-goal'] }],
		context: { key: b.key, factId: input.context ? 'reported-context' : null },
		plan
	};
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Jornada de Direção — 30 dias',
		opening: `“${d.goal}” será uma pergunta a testar, com experiências pequenas e revisões em datas civis. Compare expectativa, condições e observações antes de escolher o próximo caminho.`,
		source: `Método editorial aprovado na reconstrução autorizada: ${directionMethod.version}; fatos civis ${calc.data.native.version}; sem cálculo astrológico.`,
		sections,
		questions: [
			'Que parte do objetivo depende de uma ação sua e cabe nas condições atuais?',
			'Que observação contrariaria sua expectativa?',
			'Que condição precisa existir para continuar, ajustar ou retomar?'
		],
		practice:
			'Registre o ponto de partida; escolha uma experiência de custo zero, até 45 minutos, e revise nos dias 7, 14 e 30. Compare expectativa, observação, condições e evidência contrária antes de escolher continuar, ajustar, pausar ou encerrar.',
		limits: calc.limits,
		editorial
	};
}
export function reviewReconstructedDirection(
	input: WorkflowInput,
	calc: CalculationSnapshot,
	reading: TrialReading
): string[] {
	try {
		assertDirectionProjection(input, calc);
	} catch {
		return ['Base da Jornada inválida.'];
	}
	const expected = composeReconstructedDirection(input, calc);
	return canonical(reading) === canonical(expected)
		? []
		: ['Leitura da Jornada não corresponde ao método, fatos ou contexto autorizado.'];
}
