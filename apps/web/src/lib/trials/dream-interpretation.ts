import {
	calculateDreamRecord,
	parseDreamAtlasEntryInput,
	type CalculationSnapshot,
	type DreamAtlasFactSource,
	type WorkflowInput
} from '@atv/domain';
import type { TrialReading } from './reading';
import { canonical } from './reconstruction/canonical';

export const DREAM_INTERPRETATION_READING = 'atv-private-dream-interpretation/4.0.0';
export const DREAM_DOSSIER_CALCULATION = 'atv-private-dream-dossier/2.0.0';
const canon = 'atv-personal-dream-associations/2026-10-15';
const normalize = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
const quoted = (values: string[]) => values.map((v) => `“${v}”`).join(', ');
const date = (value: string) => value.split('-').reverse().join('/');
const distinct = (values: string[]) => [...new Set(values)];

// Exact self-reported labels only: a sentence such as "não senti medo" must not match fear.
const feelingLenses = [
	{
		id: 'exploration',
		labels: ['curiosidade', 'interesse', 'entusiasmo', 'animação'],
		hypothesis:
			'Uma hipótese de aproximação merece ser testada: talvez a cena permita explorar algo que desperta seu interesse. Ela ganha apoio se você lembrar de um momento em que quis olhar, perguntar ou continuar; enfraquece se o interesse apareceu apenas depois de acordar.',
		question: 'Que detalhe você quis explorar, e o que manteve sua atenção?',
		practice:
			'Separe o detalhe que despertou interesse daquilo que você apenas observou sem querer continuar.'
	},
	{
		id: 'caution',
		labels: ['medo', 'receio', 'insegurança', 'hesitação', 'preocupação', 'ansiedade'],
		hypothesis:
			'Uma hipótese de cautela merece ser testada: talvez algum momento da cena tenha pedido distância, espera ou mais informação. Ela ganha apoio se você localizar esse momento no relato; enfraquece se a sensação não se ligar a nenhuma ação ou pausa. A emoção não demonstra que exista um perigo fora do sonho.',
		question: 'Em que momento você quis esperar ou se afastar, se houve algum?',
		practice:
			'Anote o que aconteceu antes da hesitação ou do receio; não transforme a sensação em previsão de risco.'
	},
	{
		id: 'friction',
		labels: ['raiva', 'irritação', 'frustração', 'indignação'],
		hypothesis:
			'Uma hipótese de atrito merece ser testada: talvez a cena aproxime algo que você queria fazer de um impedimento. Ela ganha apoio se você descrever o desejo e o obstáculo sem inventá-los; enfraquece se não houver esse contraste. A reação não prova culpa ou intenção de outra pessoa.',
		question: 'O que você queria fazer e o que parecia impedir, se isso apareceu na cena?',
		practice: 'Descreva separadamente sua ação e o impedimento, sem atribuir uma intenção a alguém.'
	},
	{
		id: 'absence',
		labels: ['tristeza', 'saudade', 'luto', 'melancolia'],
		hypothesis:
			'Uma hipótese de ausência merece ser testada: talvez a cena aproxime uma lembrança do que você gostaria de ter por perto. Ela ganha apoio se você reconhecer uma falta concreta nas próprias associações; enfraquece se não houver essa ligação. Uma lembrança recente também pode explicar a cena, sem uma perda escondida.',
		question:
			'Sua associação aponta para algo de que sentiu falta ou apenas para uma lembrança recente?',
		practice:
			'Diferencie aquilo de que sentiu falta de uma lembrança que apareceu sem esse sentimento.'
	},
	{
		id: 'ease',
		labels: ['calma', 'alívio', 'paz', 'tranquilidade', 'segurança', 'acolhimento'],
		hypothesis:
			'Uma hipótese de pausa ou acolhimento merece ser testada: talvez um detalhe da cena tenha permitido baixar a tensão ou permanecer sem pressa. Ela ganha apoio se você reconhecer o que estava diferente naquele momento; enfraquece se a sensação só surgiu ao acordar. Isso não garante estabilidade fora do sonho.',
		question: 'Que detalhe acompanhou a calma ou o alívio, e essa sensação já existia antes dele?',
		practice:
			'Compare um momento anterior à sensação com o momento em que ela apareceu; se não lembrar, preserve a dúvida.'
	}
] as const;

function feelingMethod(emotions: string[]) {
	const selected = feelingLenses.filter((lens) =>
		emotions.some((emotion) => lens.labels.some((label) => normalize(label) === normalize(emotion)))
	);
	const unmatched = emotions.filter(
		(emotion) =>
			!selected.some((lens) => lens.labels.some((label) => normalize(label) === normalize(emotion)))
	);
	const exploratory = selected.some((lens) => lens.id === 'exploration');
	const cautious = selected.some((lens) => lens.id === 'caution');
	const integration =
		exploratory && cautious
			? 'Interesse e cautela podem coexistir: teste a hipótese de querer conhecer algo e, ao mesmo tempo, precisar de uma pausa. Ela só se sustenta se você localizar os dois movimentos na cena; duas palavras na lista não bastam para afirmar um conflito.'
			: selected.length > 1
				? 'As emoções nomeadas permitem mais de uma hipótese. Compare a ordem dos momentos antes de escolher uma: elas podem pertencer a cenas diferentes, e a lista sozinha não demonstra uma mudança emocional.'
				: selected.length === 1
					? `A pergunta central desta hipótese é: ${selected[0].question} Sua associação pessoal pode apoiar essa ligação ou mostrar que outra explicação faz mais sentido.`
					: 'Ainda não há apoio para escolher uma direção emocional. Preserve as palavras que usou e a cena correspondente antes de aproximá-las de uma situação da vida desperta.';
	return { selected, unmatched, integration };
}

/** Sources arrive only from the owner-filtered repository; the snapshot pins every revision. */
export function calculateDreamDossier(
	input: WorkflowInput,
	sources: DreamAtlasFactSource[]
): CalculationSnapshot {
	if (
		input.productId !== 'dream-dossier' ||
		!input.consent.continuity ||
		!sources.length ||
		sources.length > 3
	)
		throw new Error('Autorize de um a três registros anteriores para a comparação.');
	const base = calculateDreamRecord({ ...input, productId: 'dream-reading' });
	const seen = new Set<string>();
	const entries = sources
		.map((source) => {
			const { id, revision, ...value } = source;
			const parsed = parseDreamAtlasEntryInput(value);
			if (
				!parsed ||
				!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ||
				seen.has(id) ||
				!Number.isSafeInteger(revision) ||
				revision < 1 ||
				parsed.dreamDate > input.dream!.date
			)
				throw new Error('Um registro anterior precisa ser revisado.');
			seen.add(id);
			return { ...parsed, id, revision };
		})
		.sort((a, b) => a.dreamDate.localeCompare(b.dreamDate) || a.id.localeCompare(b.id));
	return {
		...base,
		version: DREAM_DOSSIER_CALCULATION,
		facts: [
			...base.facts,
			...entries.map((entry) => ({
				id: `history-${entry.id}`,
				kind: 'reported' as const,
				display: `${entry.dreamDate}: ${entry.narrative}; emoções: ${entry.emotions.join(', ') || 'não informadas'}; associações: ${entry.associations.join(', ') || 'não informadas'}`,
				source: `private-diary:${entry.id}@${entry.revision}`
			}))
		],
		data: {
			...base.data,
			entries,
			sourceIds: entries.map((entry) => entry.id),
			sourceRevisions: Object.fromEntries(entries.map((entry) => [entry.id, entry.revision])),
			continuity: { consent: true, historyLoaded: true, recurrenceAssessed: true }
		},
		limits: [
			...base.limits.filter((limit) => !limit.includes('Nenhum histórico')),
			`Comparação limitada aos ${entries.length} registros selecionados e ao sonho atual.`,
			'Coincidências comparam palavras de emoções e associações separadamente; não descobrem sentidos ocultos nem preenchem lacunas.'
		]
	};
}

function project(input: WorkflowInput, calculation: CalculationSnapshot) {
	if (!['dream-reading', 'dream-dossier'].includes(input.productId) || !input.dream)
		throw new Error('Sonho inválido.');
	const entries =
		input.productId === 'dream-dossier'
			? (calculation.data as unknown as { entries: DreamAtlasFactSource[] }).entries
			: [];
	if (!Array.isArray(entries)) throw new Error('Histórico ausente.');
	const expected =
		input.productId === 'dream-dossier'
			? calculateDreamDossier(input, entries)
			: calculateDreamRecord(input);
	if (canonical(expected) !== canonical(calculation))
		throw new Error('Os fatos divergem do relato ou de suas fontes.');
	return { dream: input.dream, entries };
}

function comparison(current: string[], previous: string[]) {
	return {
		shared: distinct(
			current.filter((label) => previous.some((other) => normalize(other) === normalize(label)))
		),
		currentOnly: distinct(
			current.filter((label) => !previous.some((other) => normalize(other) === normalize(label)))
		),
		previousOnly: distinct(
			previous.filter((label) => !current.some((other) => normalize(other) === normalize(label)))
		)
	};
}
function contrast(label: string, current: string[], previous: string[]) {
	const result = comparison(current, previous);
	if (!current.length || !previous.length)
		return `${label}: ${!current.length && !previous.length ? 'nenhum dos dois relatos traz palavras nesse campo' : !current.length ? 'o sonho atual não traz palavras nesse campo' : 'o registro anterior não traz palavras nesse campo'}. A lacuna impede comparar; não equivale a ausência da experiência.`;
	return `${label}: ${result.shared.length ? `as palavras ${quoted(result.shared)} aparecem nos dois relatos` : 'não há palavras iguais nos dois relatos'}. ${result.currentOnly.length ? `Só no atual: ${quoted(result.currentOnly)}. ` : ''}${result.previousOnly.length ? `Só no anterior: ${quoted(result.previousOnly)}. ` : ''}Palavras diferentes não provam mudança emocional; podem refletir outra maneira de descrever a cena.`;
}

/** Original finite corpus: two falsifiable lenses, grounded in the person's own vocabulary. */
export function composeDreamInterpretation(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const { dream, entries } = project(input, calculation);
	const facts = calculation.facts;
	const ids = (prefix: string) =>
		facts.filter((fact) => fact.id.startsWith(prefix)).map((fact) => fact.id);
	const narrative = ids('dream-narrative-');
	const emotions = ids('dream-emotion-');
	const feeling = feelingMethod(dream.emotions);
	const associations = ids('dream-association-');
	const contextIds = input.context ? ['dream-context'] : [];
	const sourceIds = [...narrative, ...emotions, ...associations, ...contextIds];
	const sections: TrialReading['sections'] = [];
	const roles: string[] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		sections.push({ title, text, factIds: distinct(factIds) });
		roles.push(role);
	};
	add(
		'O sonho que você contou',
		`Em ${date(dream.date)}, você registrou:\n\n${dream.narrative}\n\nO texto acima é o seu relato. Uma fala ou instrução dentro dele faz parte da cena; não orienta esta leitura.`,
		['dream-date', ...narrative],
		'report'
	);
	add(
		'As palavras que acompanham a cena',
		`${dream.emotions.length ? `Você nomeou estas emoções: ${quoted(dream.emotions)}.` : 'Você não informou emoções; a leitura não escolhe uma por você.'}\n\n${dream.associations.length ? `Suas associações pessoais foram: ${quoted(dream.associations)}. Elas indicam o que a cena lembra para você, sem definir o sentido de uma imagem para outras pessoas.` : 'Não foram informadas associações pessoais. Uma imagem, sozinha, não autoriza atribuir um significado; vale começar pelo que ela lembra na sua história.'}`,
		[...narrative, ...emotions, ...associations],
		'personal-meaning'
	);
	const associationLens = dream.associations.length
		? `As associações ${quoted(dream.associations)} abrem uma primeira hipótese: a cena pode reunir lembranças que você aproxima por essas palavras. Escolha uma delas e identifique qual detalhe do relato levou à associação. A hipótese ganha apoio se você conseguir descrever essa ligação com suas próprias lembranças; enfraquece se a palavra foi escolhida apenas porque parece uma interpretação esperada.`
		: 'Sem associações declaradas, falta apoio para uma hipótese sobre o significado da cena. Uma primeira exploração é escolher um detalhe e anotar uma lembrança que ele desperta, incluindo a possibilidade de nenhuma lembrança surgir. Evite completar essa lacuna com um significado pronto.';
	add(
		'Primeira hipótese: uma associação pessoal',
		`${associationLens}\n\nUma alternativa é a cena combinar imagens recentes sem uma ligação importante para você. As duas possibilidades podem permanecer abertas.`,
		[...narrative, ...associations],
		'elements-hypothesis'
	);
	const emotionLens = dream.emotions.length
		? `Uma segunda hipótese parte de ${quoted(dream.emotions)}: talvez essas palavras se aproximem de uma sensação reconhecível fora do sonho. Compare em que momento da cena cada emoção aparece. O mesmo sentimento em situações diferentes não torna essas situações equivalentes.`
		: 'Uma segunda exploração seria observar a emoção ligada a um momento da cena. Como você não a informou, não há base para dizer qual necessidade, medo ou desejo estaria envolvido. Você pode acrescentar uma palavra depois ou manter o campo em aberto.';
	const context = input.context
		? `Você trouxe este contexto, nas suas palavras:\n\n${input.context}\n\nUse somente esse contexto para procurar um exemplo que apoie a hipótese e outro que a contradiga. A proximidade entre sonho e contexto é uma pergunta, não uma causa demonstrada.`
		: 'Você não trouxe um contexto da vida desperta. Não é possível ligar a cena a trabalho, relações ou acontecimentos específicos. Se quiser, escolha uma situação concreta para comparar; o sonho não permite deduzi-la.';
	add(
		'Segunda hipótese: a sensação e o contexto',
		`${emotionLens}\n\n${feeling.selected.map((lens) => lens.hypothesis).join('\n\n')}${feeling.unmatched.length ? `\n\nAs palavras ${quoted(feeling.unmatched)} permanecem com o sentido que você lhes dá. Esta leitura não as encaixa em outra emoção; procure um exemplo da cena antes de propor uma ligação.` : ''}\n\n${context}\n\nOutra explicação é a emoção pertencer apenas à experiência do sonho. Não é preciso decidir entre as alternativas para guardar o que chamou sua atenção.`,
		[...narrative, ...emotions, ...contextIds],
		'context-hypothesis'
	);
	for (const [index, entry] of entries.entries()) {
		const historyId = `history-${entry.id}`;
		const repeatedText = [
			dream.narrative,
			...entries.slice(0, index).map((previous) => previous.narrative)
		].some((text) => normalize(text) === normalize(entry.narrative));
		add(
			`Registro escolhido ${index + 1}: ${date(entry.dreamDate)}`,
			`No registro escolhido ${index + 1}, de ${date(entry.dreamDate)}, você contou:\n\n${entry.narrative}\n\n${contrast('Emoções', dream.emotions, entry.emotions)}\n\n${contrast('Associações', dream.associations, entry.associations)}\n\n${repeatedText ? 'O texto coincide com outro relato desta seleção. Pode ser uma anotação repetida; confira antes de tratá-lo como outra ocorrência do sonho. ' : ''}Leia uma cena de cada relato antes de aproximá-las. O que era parecido no texto pode ter outra função na sua história.`,
			[...sourceIds, historyId],
			'comparison'
		);
	}
	if (entries.length) {
		const sharedAssociations = distinct(
			entries.flatMap((entry) => comparison(dream.associations, entry.associations).shared)
		);
		const sharedEmotions = distinct(
			entries.flatMap((entry) => comparison(dream.emotions, entry.emotions).shared)
		);
		const focus = sharedAssociations.length
			? `As associações ${quoted(sharedAssociations)} reaparecem no sonho atual e em ao menos um registro escolhido. A hipótese a explorar é se uma mesma palavra nomeia experiências parecidas ou sentidos diferentes. Compare os detalhes de cada cena antes de chamar isso de continuidade.`
			: sharedEmotions.length
				? `As emoções ${quoted(sharedEmotions)} reaparecem no sonho atual e em ao menos um registro, mas nenhuma associação foi repetida com a mesma palavra. A pergunta principal é se a sensação aparece em cenas distintas. Isso oferece um ponto de comparação, sem afirmar um tema comum.`
				: 'Nenhuma palavra de emoção ou associação do sonho atual coincide com a mesma categoria nos registros escolhidos. O material não sustenta uma hipótese de repetição literal. Comece pelas diferenças das cenas e pelas lacunas, sem concluir que houve mudança psicológica.';
		add(
			'O que a comparação acrescenta',
			`${focus}\n\nA amostra tem ${entries.length} registro${entries.length === 1 ? '' : 's'} anterior${entries.length === 1 ? '' : 'es'} selecionado${entries.length === 1 ? '' : 's'}, além do sonho atual. Ela não representa todos os seus sonhos. Uma explicação alternativa é a escolha dos registros ter destacado uma semelhança ou uma diferença; procure também um exemplo que não se encaixe.`,
			[...sourceIds, ...entries.map((entry) => `history-${entry.id}`)],
			'comparative-synthesis'
		);
	}
	const anchor = dream.associations[0] ?? dream.emotions[0];
	add(
		'Uma síntese para manter em aberto',
		`${anchor ? `Use “${anchor}”, uma palavra que você informou, como ponto de partida.` : 'Comece pelo detalhe que chamou sua atenção, sem escolher uma interpretação antecipadamente.'} A primeira hipótese pergunta pelas lembranças ligadas à cena; a segunda pergunta pela sensação e pelo contexto. ${entries.length ? 'A comparação acrescenta o que coincide, o que difere e o que não foi informado nos registros escolhidos.' : 'Esta leitura considera apenas este sonho; não afirma recorrência.'}\n\n${feeling.integration}\n\nVocê pode reconhecer uma ligação, discordar dela ou ainda não saber. Anote a observação que apoia sua leitura e um detalhe que a deixa em dúvida. Nenhuma conclusão aqui descreve fatos ocultos sobre outra pessoa.`,
		[...sourceIds, ...entries.map((entry) => `history-${entry.id}`)],
		'synthesis'
	);
	return {
		version: DREAM_INTERPRETATION_READING,
		productId: input.productId,
		title: entries.length ? 'Interpretação Aprofundada do Sonho' : 'Interpretação do Sonho',
		opening: entries.length
			? 'Compare o sonho atual com os registros que você escolheu, preservando semelhanças, diferenças e perguntas abertas.'
			: 'Explore duas hipóteses a partir do seu relato, das emoções e das associações que você informou.',
		source: entries.length
			? 'Seu relato, suas associações e os registros que você autorizou comparar.'
			: 'Seu relato, suas emoções e suas associações pessoais.',
		sections,
		questions: [
			anchor
				? `Qual detalhe do relato você aproxima de “${anchor}”, e qual não combina com essa associação?`
				: 'Que lembrança pessoal um detalhe da cena desperta, se alguma?',
			input.context
				? 'No contexto que você informou, o que apoia a ligação com o sonho e o que a contradiz?'
				: 'Há alguma situação concreta que você queira comparar com a cena, sem deduzi-la do sonho?',
			entries.length
				? 'Qual diferença entre o sonho atual e um registro escolhido impede uma conclusão apressada?'
				: 'Que outra explicação para a cena você deseja manter em aberto?'
		],
		practice: `Reserve alguns minutos para duas colunas: uma observação que apoia sua hipótese e outra que a contraria. ${anchor ? `Comece pela palavra “${anchor}”, preservando a frase em que ela faz sentido para você.` : 'Escolha um detalhe do relato; se não surgir uma associação, registre a dúvida.'}\n\n${feeling.selected.length ? feeling.selected.map((lens) => lens.practice).join(' ') : 'Mantenha o nome que deu à sensação, mesmo que ele não se encaixe em uma emoção conhecida.'}\n\n${entries.length ? 'Acrescente uma diferença entre as duas cenas comparadas.' : 'Você pode encerrar o registro sem decidir o significado do sonho.'}`,
		limits: [
			entries.length
				? `A comparação considera somente os ${entries.length} registros escolhidos e as palavras informadas; não comprova recorrência.`
				: 'Esta leitura considera um único relato e suas associações; não avalia recorrência.',
			'As hipóteses não são diagnóstico, previsão nem acesso às intenções de outras pessoas.'
		],
		editorial: {
			version: DREAM_INTERPRETATION_READING,
			canon,
			graph: calculation.version,
			selection: facts.map((fact) => ({
				factId: fact.id,
				score: 1,
				reason: 'Relato explícito, sem prioridade clínica ou significado universal.'
			})),
			patterns: entries.map((entry) => ({
				kind: 'authorized-record-comparison',
				factIds: [...sourceIds, `history-${entry.id}`]
			})),
			themes: [
				{ id: 'personal-associations', factIds: [...narrative, ...associations] },
				{ id: 'reported-feeling-and-context', factIds: [...narrative, ...emotions, ...contextIds] }
			],
			context: { key: 'general', factId: contextIds[0] ?? null },
			plan: sections.map((section, index) => ({
				title: section.title,
				factIds: section.factIds,
				role: roles[index]
			}))
		}
	};
}

/** Method review precedes canonical integrity; reported hostile text is never an instruction. */
export function reviewDreamInterpretation(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	let projected: ReturnType<typeof project>;
	try {
		projected = project(input, calculation);
	} catch {
		return ['Relato, contexto, fontes ou revisões não correspondem à projeção autorizada.'];
	}
	const issues: string[] = [];
	const { dream, entries } = projected;
	const plan = reading.editorial?.plan ?? [];
	const byRole = (role: string) =>
		plan
			.flatMap((item, index) => (item.role === role ? [reading.sections[index]] : []))
			.filter(Boolean);
	for (const role of [
		'report',
		'personal-meaning',
		'elements-hypothesis',
		'context-hypothesis',
		'synthesis'
	]) {
		if (byRole(role).length !== 1) issues.push(`Papel editorial ausente ou duplicado: ${role}.`);
	}
	if (
		byRole('comparison').length !== entries.length ||
		byRole('comparative-synthesis').length !== (entries.length ? 1 : 0)
	)
		issues.push('A profundidade não corresponde aos registros autorizados.');
	const element = byRole('elements-hypothesis')[0];
	const meaning = byRole('personal-meaning')[0];
	const contextual = byRole('context-hypothesis')[0];
	const report = byRole('report')[0];
	const synthesis = byRole('synthesis')[0];
	const feeling = feelingMethod(dream.emotions);
	for (const lens of feelingLenses) {
		const supported = feeling.selected.some((selected) => selected.id === lens.id);
		if (supported !== Boolean(contextual?.text.includes(lens.hypothesis)))
			issues.push('Uma hipótese emocional foi omitida ou transplantada sem a emoção declarada.');
		if (supported && !reading.practice.includes(lens.practice))
			issues.push('A prática não acompanha a hipótese apoiada pelas emoções declaradas.');
	}
	if (!synthesis?.text.includes(feeling.integration))
		issues.push('A síntese não corresponde à combinação ou à ausência de emoções reconhecidas.');
	if (!report?.text.includes(dream.narrative) || !report.text.includes(date(dream.date)))
		issues.push('O relato integral e sua data precisam permanecer distinguíveis das hipóteses.');
	if (
		!element?.text.includes(dream.associations.length ? 'A hipótese ganha apoio' : 'falta apoio') ||
		!element.text.includes('alternativa')
	)
		issues.push('A hipótese pessoal não admite apoio, lacuna e explicação alternativa.');
	if (
		dream.associations.some(
			(value) => !element?.text.includes(`“${value}”`) || !meaning?.text.includes(`“${value}”`)
		)
	)
		issues.push('Associações pessoais não sustentam a hipótese.');
	if (
		dream.emotions.some(
			(value) => !contextual?.text.includes(`“${value}”`) || !meaning?.text.includes(`“${value}”`)
		)
	)
		issues.push('Emoções declaradas não sustentam a comparação.');
	if (
		!contextual?.text.includes(input.context ?? 'Você não trouxe um contexto') ||
		!contextual.text.includes('Outra explicação')
	)
		issues.push('Contexto e alternativa não estão separados da hipótese.');
	if (
		!dream.emotions.length &&
		!contextual?.text.includes('não há base para dizer qual necessidade')
	)
		issues.push('Uma emoção ausente não autoriza inferir necessidade, medo ou desejo.');
	if (
		!dream.associations.length &&
		!meaning?.text.includes('Não foram informadas associações pessoais')
	)
		issues.push('A ausência de associações pessoais precisa permanecer explícita.');
	const anchor = dream.associations[0] ?? dream.emotions[0];
	if (
		!synthesis?.text.includes('a segunda pergunta pela sensação e pelo contexto') ||
		!synthesis.text.includes('discordar dela ou ainda não saber') ||
		!synthesis.text.includes('um detalhe que a deixa em dúvida') ||
		(anchor && !synthesis.text.includes(`“${anchor}”`))
	)
		issues.push(
			'A síntese precisa integrar as duas hipóteses, a associação disponível e uma possibilidade de discordar.'
		);
	for (const [index, entry] of entries.entries()) {
		const section = byRole('comparison')[index];
		if (
			!section?.text.includes(contrast('Emoções', dream.emotions, entry.emotions)) ||
			!section.text.includes(contrast('Associações', dream.associations, entry.associations)) ||
			!section.text.includes(entry.narrative) ||
			!section.factIds.includes(`history-${entry.id}`)
		)
			issues.push('Comparação não preserva categorias, diferenças, lacunas e fonte.');
	}
	if (entries.length) {
		const sharedAssociations = entries.flatMap(
			(entry) => comparison(dream.associations, entry.associations).shared
		);
		const sharedEmotions = entries.flatMap(
			(entry) => comparison(dream.emotions, entry.emotions).shared
		);
		const comparative = byRole('comparative-synthesis')[0];
		const premise = sharedAssociations.length
			? 'As associações'
			: sharedEmotions.length
				? 'As emoções'
				: 'não sustenta uma hipótese de repetição literal';
		if (
			!comparative?.text.includes(premise) ||
			!comparative.text.includes('não representa todos os seus sonhos') ||
			!comparative.text.includes('Uma explicação alternativa')
		)
			issues.push(
				'A síntese comparativa precisa derivar da categoria recorrente e limitar a seleção.'
			);
	}
	const factIds = new Set(calculation.facts.map((fact) => fact.id));
	if (
		reading.sections.some((section) => section.factIds.some((id) => !factIds.has(id))) ||
		calculation.facts.some(
			(fact) => !reading.sections.some((section) => section.factIds.includes(fact.id))
		)
	)
		issues.push('Cobertura factual incompleta ou com uma fonte inexistente.');
	if (
		reading.questions.length < 3 ||
		new Set(reading.questions).size !== reading.questions.length ||
		reading.questions.some((q) => !q.endsWith('?'))
	)
		issues.push('Perguntas exploratórias insuficientes.');
	if (!reading.practice.includes('contraria'))
		issues.push('Falta uma forma reversível de questionar a hipótese.');
	if (reading.sections.some((section) => !section.factIds.length))
		issues.push('Capítulo interpretativo sem relato de apoio.');
	if (canonical(composeDreamInterpretation(input, calculation)) !== canonical(reading))
		issues.push('Conteúdo ou plano diverge do corpus e da projeção desta edição.');
	return issues;
}
