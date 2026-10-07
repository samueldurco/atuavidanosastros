import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from './reading';
import { bodyEditorial, signEditorial } from './content';

type Fact = CalculationSnapshot['facts'][number];
type Section = TrialReading['sections'][number];
const s = (title: string, text: string, facts: Fact[] = []): Section => ({
	title,
	text,
	factIds: facts.map((f) => f.id)
});
const sign = (f?: Fact) => f && Object.keys(signEditorial).find((name) => f.display.includes(name));
const useful = (base: TrialReading) =>
	base.sections.filter(
		(x) =>
			!/Como esta leitura foi organizada|Base e método|Rastreabilidade|Prática de integração|O fio da sua leitura/.test(
				x.title
			)
	);
const chapter = (base: TrialReading, f: Fact) =>
	useful(base).find((x) => x.factIds.length === 1 && x.factIds[0] === f.id) ??
	useful(base).find((x) => x.factIds.includes(f.id));
const personal = (facts: Fact[]) =>
	facts.filter((f) =>
		/^(?:position-|natal-|return-)(?:sun|moon|mercury|venus|mars)$|^angle-/.test(f.id)
	);

function birth(calc: CalculationSnapshot, base: TrialReading): Section[] {
	const roles: Record<string, string> = {
		'position-sun': 'Expressão e autoria',
		'position-moon': 'Necessidades e recuperação',
		'angle-ascendant': 'Primeiro contato com o mundo',
		'position-mercury': 'Aprendizado e comunicação',
		'angle-midheaven': 'Contribuição pública'
	};
	const factors = Object.keys(roles)
		.map((id) => calc.facts.find((f) => f.id === id))
		.filter((f): f is Fact => !!f);
	const text = factors
		.map((f) => {
			const value = sign(f);
			return `${roles[f.id]} — ${f.display}. ${value ? `Explore ${signEditorial[value][0]}; observe também quando ${signEditorial[value][2]} cobra um custo.` : 'Confira este fator na imagem e no capítulo correspondente.'}`;
		})
		.join('\n\n');
	return [
		s(
			'Seu mapa em cinco referências',
			`${text}\n\nEscolha uma referência que reconhece e outra que deseja investigar. Os capítulos aprofundam funções distintas; nenhum fator resume sua identidade.`,
			factors
		),
		...useful(base)
	];
}

function angle(calc: CalculationSnapshot, base: TrialReading, asc: boolean): Section[] {
	const f = calc.facts.find((x) => x.id === (asc ? 'angle-ascendant' : 'angle-midheaven'));
	const value = sign(f);
	if (!f || !value) return useful(base);
	return [
		s(
			asc ? 'Seu primeiro movimento' : 'A contribuição que deseja tornar visível',
			chapter(base, f)?.text ?? f.display,
			[f]
		),
		s(
			asc ? 'Uma resposta para experimentar' : 'Reconhecimento com critérios',
			asc
				? `Ao entrar em uma situação nova, observe a presença de ${signEditorial[value][0]}. Antes de responder automaticamente, identifique o que percebeu e o que ainda precisa perguntar.\n\nO recurso de ${signEditorial[value][1]} pode ajudar; o excesso de ${signEditorial[value][2]} merece uma pausa. Em um encontro desta semana, mude apenas uma resposta e anote o efeito. Este recorte trata do Ascendente; não descreve todas as áreas do mapa.`
				: `No MC em ${value}, ${signEditorial[value][0]} é uma hipótese de contribuição. Compare com uma entrega real: o que você fez, para quem teve valor e qual retorno recebeu?\n\nObserve ${signEditorial[value][2]} quando a busca de reconhecimento ultrapassa seus limites. Escolha um critério verificável para a próxima entrega. Este recorte usa o MC; uma análise profissional completa também precisa de regente, planetas, recursos e rotina.`,
			[f]
		)
	];
}

function solar(calc: CalculationSnapshot, base: TrialReading): Section[] {
	const facts = calc.facts,
		sun = facts.find((f) => f.id === 'return-sun'),
		moon = facts.find((f) => f.id === 'return-moon');
	const start = facts.find((f) => f.id === 'return-instant');
	const chosen = personal(facts).filter((f) => !f.id.startsWith('natal-'));
	const existing = useful(base).filter(
		(x) =>
			x.factIds.some((id) => chosen.some((f) => f.id === id)) &&
			!/início|compartilhou/.test(x.title)
	);
	const a = sign(sun),
		b = sign(moon);
	return [
		s(
			'Uma intenção para este ciclo',
			`${start?.display ?? 'Confira o instante de retorno nas referências'}.\n\n${sun?.display ?? ''}. ${a ? `A expressão solar convida a investigar ${signEditorial[a][0]}.` : ''} ${moon?.display ?? ''}. ${b ? `O cuidado emocional ganha uma lente de ${signEditorial[b][1]}.` : ''}\n\nEscreva uma intenção que relacione expressão e cuidado. Ela é uma escolha sua; o retorno não determina acontecimentos do ano.`,
			[start, sun, moon].filter((f): f is Fact => !!f)
		),
		...existing,
		s(
			'Oportunidades e pontos de atenção',
			`${a ? `Como oportunidade, experimente ${signEditorial[a][1]} em uma área real da sua vida. Como ponto de atenção, observe ${signEditorial[a][2]}.` : 'Escolha uma oportunidade e o limite necessário para explorá-la.'}\n\n${b ? `Para sustentar a intenção, cuide de ${signEditorial[b][1]} e registre quando ${signEditorial[b][2]} aparece.` : ''} Um mesmo fator admite respostas diferentes; compare os capítulos com suas condições atuais.`,
			[sun, moon].filter((f): f is Fact => !!f)
		),
		s(
			'Quatro revisões ao longo do ano',
			'Esta é uma agenda editorial de acompanhamento, sem datas astrológicas de eventos.\n\nInício: que intenção cabe nos recursos atuais?\nApós três meses: que experiência confirmou ou contrariou a intenção?\nApós seis meses: que prioridade, acordo ou limite precisa mudar?\nApós nove meses: o que deseja concluir e o que prefere levar para o próximo ciclo?\n\nAo fim do ciclo, releia suas próprias respostas antes de avaliar a interpretação.'
		)
	];
}

function calendar(input: WorkflowInput, calc: CalculationSnapshot, base: TrialReading): Section[] {
	if (input.productId === 'week-reading') {
		const range = calc.facts.find((f) => f.id === 'week-range');
		// The editorial source ranks the calculated series by their smallest orb,
		// preserving civil dates and the distinct functions of both planets.
		const series = useful(base)
			.filter((section) => section.factIds.some((id) => id.endsWith('-series')))
			.slice(0, 4);
		return [
			s(
				'Como organizar sua semana',
				`${range?.display ?? ''}\n\nEscolha um compromisso central, uma pausa e um assunto que pode esperar. Os capítulos mostram contatos observados nas amostras; não certificam início, exatidão ou fim de um trânsito.`,
				range ? [range] : []
			),
			...series,
			s(
				'Sua revisão no fim da semana',
				'Compare a prioridade escolhida com o que conseguiu fazer. Qual cuidado ajudou? Qual tema não correspondeu à sua experiência? Leve uma mudança concreta de rotina para a próxima semana.'
			)
		];
	}
	const days = calc.facts.filter((f) => /^day-\d+-aspects$/.test(f.id));
	let previousContact = '';
	const practices: Record<string, string> = {
		Sol: 'Defina uma intenção e uma entrega pequena para o compromisso escolhido. Ao final, compare o que queria expressar com o efeito observado.',
		Lua: 'Reserve uma pausa antes de responder a uma situação emocional. Nomeie a necessidade e peça um cuidado específico, em vez de esperar que alguém adivinhe.',
		Mercúrio:
			'Antes de uma conversa ou decisão, escreva a pergunta principal. Confira o que foi entendido e separe informação confirmada de suposição.',
		Vênus:
			'Explicite uma preferência e um limite em uma troca real. Observe se o acordo permite reciprocidade sem exigir que ambos desejem a mesma coisa.',
		Marte:
			'Escolha uma ação proporcional aos recursos de hoje e uma condição de pausa. Avalie se a iniciativa protege seu limite e respeita o de outras pessoas.',
		Júpiter:
			'Confronte uma possibilidade de expansão com tempo, custo e apoio disponíveis. Faça uma primeira verificação antes de assumir uma promessa maior.',
		Saturno:
			'Divida uma responsabilidade entre o que cabe hoje e o que precisa ser renegociado. Inclua descanso no critério de continuidade.'
	};
	return [
		s(
			'Seu mês, um dia por vez',
			'Cada data contém uma amostra às 12h UTC. Use as referências para preparar compromissos e registrar observações. Não são horários favoráveis, janelas certificadas nem garantias de acontecimentos. Seus marcos pessoais continuam separados dos fatores calculados.'
		),
		...days.map((f) => {
			const [date, ...parts] = f.display.split(' — ');
			const contacts = parts
				.join(' — ')
				.split('; ')
				.sort((a, b) => {
					const priority = (text: string) =>
						(text.match(/Sol|Lua|Mercúrio|Vênus|Marte/g) ?? []).length * 10 -
						Number(text.match(/orbe ([\d.]+)/)?.[1] ?? 9);
					return priority(b) - priority(a);
				})
				.slice(0, 3);
			const main = contacts[0],
				names =
					main.match(/Sol|Lua|Mercúrio|Vênus|Marte|Júpiter|Saturno|Urano|Netuno|Plutão/g) ?? [];
			const [moving, natal] = names;
			const signature = main.replace(/, orbe .*/, '');
			const repeated = signature === previousContact;
			previousContact = signature;
			const dynamic = /conjunção/.test(main)
				? 'Os dois temas aparecem próximos na leitura simbólica: observe se um intensifica o outro e quando é útil tratá-los separadamente.'
				: /quadratura/.test(main)
					? 'Investigue um atrito entre essas duas necessidades. Que ajuste de ritmo ou prioridade permite cuidar de uma sem abandonar a outra?'
					: /oposição/.test(main)
						? 'Experimente olhar a situação pelas duas perspectivas. Uma conversa pode tornar o contraste mais claro sem obrigar você a escolher um único lado.'
						: /trígono/.test(main)
							? 'Procure uma forma concreta de cooperação entre esses temas. Uma facilidade percebida só se torna recurso quando você a usa e verifica o resultado.'
							: 'Teste um gesto pequeno que conecte esses assuntos. A oportunidade simbólica pede participação e condições reais; não garante um resultado.';
			const interpretation =
				moving && natal
					? `Tema central: ${moving} em trânsito põe em foco ${bodyEditorial[moving]}; ${natal} natal oferece como referência ${bodyEditorial[natal]}. ${dynamic}\n\n${practices[moving] ?? 'Escolha uma situação real relacionada aos dois temas e registre uma hipótese, uma evidência e uma alternativa.'}${repeated ? '\n\nEste mesmo contato foi selecionado na amostra anterior. Retome sua anotação: houve continuidade, mudança ou nenhuma relação com a experiência? A repetição entre amostras não certifica uma janela contínua.' : ''}`
					: 'A amostra não selecionou um contato maior. Organize o dia pelos seus compromissos e recursos reais; a ausência de um aspecto não prevê tranquilidade nem falta de acontecimentos.';
			return s(date, `${contacts.join('\n')}\n\n${interpretation}`, [f]);
		}),
		s(
			'Reveja o mês',
			'Quais compromissos pediram mais preparação? Que pausas funcionaram? Compare suas observações com as referências do calendário e escolha um ajuste para o mês seguinte.'
		)
	];
}

function atlas(input: WorkflowInput, calc: CalculationSnapshot, base: TrialReading): Section[] {
	const priorities = calc.facts.filter((f) => /^priority-/.test(f.id));
	const factors = personal(calc.facts);
	return [
		s(
			'Suas prioridades, na ordem que escolheu',
			`${priorities.map((f) => f.display).join('\n')}\n\nA ordem registra sua escolha atual. Comece pela primeira prioridade e confronte as lentes do mapa com uma situação concreta. Você pode revisar a ordem ao gerar outra edição.`,
			priorities
		),
		...factors.map((f) =>
			s(chapter(base, f)?.title ?? f.display, chapter(base, f)?.text ?? f.display, [f])
		),
		...priorities.map((f, i) => {
			return s(
				`Prioridade ${i + 1} · ${f.display.replace(/^Prioridade \d+:?\s*/i, '')}`,
				`${f.display}.\n\nDescreva uma situação atual ligada a essa prioridade. Escolha, entre os capítulos anteriores, uma função do mapa que ajude a formular uma pergunta sobre ela: expressão, cuidado, comunicação ou iniciativa. A associação é uma escolha sua; o cálculo não atribui um planeta ao tema que você escreveu.\n\nQual ação sob seu controle aproxima essa prioridade da vida real? Defina um passo, o apoio necessário e uma data de revisão. Registre também o que precisará esperar para que esse passo seja viável.`,
				[f]
			);
		}),
		s(
			'Um mapa de escolhas para trinta dias',
			'Primeira semana: experimente uma ação ligada à prioridade principal.\nSegunda semana: observe o efeito nas demais prioridades.\nTerceira semana: ajuste tempo, apoio ou escopo.\nQuarta semana: reveja a ordem e decida o que continuar, mudar ou deixar para depois.\n\nGuarde uma evidência de cada tentativa. A experiência tem mais autoridade sobre sua escolha do que a interpretação simbólica.'
		)
	];
}

function tarot(input: WorkflowInput, calc: CalculationSnapshot, base: TrialReading): Section[] {
	const cards = calc.facts.filter((f) => f.kind === 'drawn');
	const questions = calc.facts.filter((f) => /^question-/.test(f.id));
	const labels =
		input.productId === 'tarot-journey'
			? ['Situação presente', 'Recurso disponível', 'Experimento possível']
			: ['Sua pergunta', 'Segunda pergunta', 'Terceira pergunta'];
	const entries = cards.map((f, i) =>
		s(
			`${labels[i] ?? `Posição ${i + 1}`} · ${f.display.replace(/^Posição \d+: /, '')}`,
			`${questions[i]?.display ?? questions[0]?.display ?? 'Uma observação para hoje'}\n\n${chapter(base, f)?.text ?? f.display}`,
			[f, ...(questions[i] ? [questions[i]] : [])]
		)
	);
	const ending =
		input.productId === 'tarot-yes-no'
			? s(
					'Antes de responder sim ou não',
					'Escreva duas condições que apoiariam um sim e duas que pediriam um não. Qual informação ainda falta? Que alternativa pequena permite testar sua intenção sem assumir todo o compromisso?\n\nA carta não decide por você nem garante o resultado. Estabeleça um prazo e um critério para sua própria resposta.'
				)
			: input.productId === 'tarot-journey'
				? s(
						'Reabra esta mesma abertura',
						'Hoje: registre uma situação concreta e uma ação pequena.\nNa primeira revisão: compare a ação com o resultado observado.\nNa revisão seguinte: ajuste o experimento e descreva o que aprendeu.\n\nAs cartas permanecem as mesmas nesta edição. Suas anotações mostram como a experiência mudou; uma nova abertura terá outro registro.'
					)
				: s(
						input.productId === 'three-questions'
							? 'Uma ação que conecta as perguntas'
							: 'Um gesto para levar à vida real',
						input.productId === 'three-questions'
							? 'Releia as três respostas e escolha uma ação que dependa de você. Que pergunta ela ajuda a esclarecer primeiro? Qual informação ou conversa ainda é necessária? Registre o resultado antes de abrir outra leitura.'
							: 'Escolha um gesto pequeno ligado à pergunta da carta. Registre a intenção e observe o resultado. Se a imagem não conversa com sua experiência, anote a discordância sem forçar um significado.'
					);
	return [...entries, ending];
}

function dreams(input: WorkflowInput, calc: CalculationSnapshot, base: TrialReading): Section[] {
	const existing = useful(base);
	if (input.productId === 'dream-journal')
		return [
			s(
				'Seu registro, com suas palavras',
				calc.facts
					.filter((f) => f.kind === 'reported')
					.map((f) => f.display)
					.join('\n\n'),
				calc.facts.filter((f) => f.kind === 'reported')
			),
			s(
				'O que deseja guardar deste sonho?',
				'Qual cena, emoção ou associação merece voltar a ser lida? Acrescente uma nota sem corrigir o relato original. Se lembrar de outro detalhe depois, registre quando ele surgiu. O diário preserva seu relato; não precisa chegar a uma interpretação.'
			)
		];
	if (input.productId === 'dream-dossier') {
		const continuity = calc.facts.filter((f) =>
			/continuity|recurr|history|source|previous/.test(f.id)
		);
		return [
			...existing,
			s(
				'Continuidades e diferenças',
				`${continuity.map((f) => f.display).join('\n\n') || 'Confira nas referências quais registros anteriores você selecionou. A ausência de registros não permite concluir repetição ou mudança.'}\n\nCompare uma cena, uma emoção e uma associação com suas próprias palavras. O que se repete literalmente? O que mudou de contexto? Um elemento semelhante pode ter sentidos diferentes; uma lacuna continua sendo uma lacuna.`,
				continuity
			),
			s(
				'Uma hipótese que pode ser contrariada',
				'Escolha uma das hipóteses da leitura. Anote o que a apoia, o que não combina com sua experiência e uma explicação alternativa. Se conversar sobre o sonho, apresente as hipóteses como perguntas. A leitura não diagnostica nem descobre fatos sobre outras pessoas.'
			)
		];
	}
	if (input.productId === 'dream-atlas')
		return [
			s(
				'O alcance dos trinta dias',
				'Este atlas considera somente os registros selecionados no período. Dias sem anotação não são sonhos ausentes nem dados a completar. Compare frequência de registros, emoções e associações literais antes de atribuir um padrão.'
			),
			...existing.filter((x) => !/Duas hipóteses/.test(x.title)),
			s(
				'Uma pergunta para o próximo período',
				'Que emoção ou associação você deseja observar com mais cuidado? Escolha uma pergunta aberta, preserve novos relatos com suas palavras e reveja a hipótese ao fim do período. Não trate a repetição literal como prova de um significado oculto.'
			)
		];
	return [
		...existing,
		s(
			'Volte às suas associações',
			'Qual hipótese encontra apoio no que você relatou? O que ficou de fora? Escreva uma associação alternativa e uma pergunta que continua aberta. Você pode guardar o sonho sem escolher uma interpretação definitiva.'
		)
	];
}

function direction(calc: CalculationSnapshot): Section[] {
	const goal = calc.facts.find((f) => f.id === 'declared-goal');
	return [
		s(
			'O objetivo que vai acompanhar',
			`${goal?.display ?? 'Confira o objetivo nas referências'}.\n\nEscolha uma evidência simples de avanço e um limite que precisa respeitar. O percurso organiza revisões; não calcula um destino profissional.`,
			goal ? [goal] : []
		),
		...[7, 14, 30].map((day, i) => {
			const f = calc.facts.find((x) => x.id === `civil-check-in-day-${day}`);
			return s(
				`Revisão do dia ${day}`,
				`${f?.display ?? ''}\n\n${['O que conseguiu começar? Compare intenção, tempo e dificuldade. Reduza o escopo se necessário e escolha a próxima tentativa.', 'O que aprendeu ao repetir a tentativa? Procure uma evidência e um retorno concreto. Ajuste uma condição do ambiente ou da rotina.', 'O que mudou? Compare o ponto de partida com as evidências reunidas. Decida entre continuar, ajustar ou encerrar, sem tratar encerramento como fracasso.'][i]}\n\nRegistre: observação, aprendizado, próximo passo e data.`,
				f ? [f] : []
			);
		})
	];
}

/** Product-specific selection. Every omitted source fact remains available in the appendix. */
export function curateExperience(
	input: WorkflowInput,
	calc: CalculationSnapshot,
	base: TrialReading
): Section[] {
	if (input.productId === 'birth-chart') return birth(calc, base);
	if (['ascendant', 'midheaven'].includes(input.productId))
		return angle(calc, base, input.productId === 'ascendant');
	if (input.productId === 'solar-return') return solar(calc, base);
	if (['week-reading', 'personal-calendar'].includes(input.productId))
		return calendar(input, calc, base);
	if (input.productId === 'life-atlas') return atlas(input, calc, base);
	if (input.productId === 'direction-journey') return direction(calc);
	if (
		['daily-card', 'tarot-focus', 'tarot-yes-no', 'three-questions', 'tarot-journey'].includes(
			input.productId
		)
	)
		return tarot(input, calc, base);
	if (input.productId.startsWith('dream-')) return dreams(input, calc, base);
	return useful(base);
}
