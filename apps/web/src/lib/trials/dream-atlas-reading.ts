import {
	prepareDreamAtlasFacts,
	parseDreamAtlasEntryInput,
	type CalculationSnapshot,
	type DreamAtlasFactSource,
	type WorkflowInput
} from '@atv/domain';
import type { TrialReading } from './reading';
import { canonical } from './reconstruction/canonical';

export const DREAM_ATLAS_CALCULATION = 'atv-private-dream-atlas/2.0.0';
export const DREAM_ATLAS_READING = 'atv-private-dream-atlas-reading/2.0.0';
// Mirrors the database ceiling; accepted diaries must fit the signed delivery envelope.
export const DREAM_ATLAS_MAX_BYTES = 100_000;
const date = (value: string) => value.split('-').reverse().join('/');

export function calculateDreamAtlasSnapshot(
	startDate: string,
	sources: DreamAtlasFactSource[]
): CalculationSnapshot {
	if (
		sources.reduce(
			(total, entry) => total + new TextEncoder().encode(JSON.stringify(entry)).length,
			0
		) > DREAM_ATLAS_MAX_BYTES
	)
		throw new Error('O diário ultrapassa o limite de texto para a análise final.');
	const atlas = prepareDreamAtlasFacts(
		startDate,
		sources.filter((entry) => entry.includeInSynthesis)
	);
	if (!atlas || !atlas.includedEntryIds.length)
		throw new Error('Autorize ao menos um relato do diário de 30 dias para a análise final.');
	const entries = sources
		.filter((e) => atlas.includedEntryIds.includes(e.id))
		.map((e) => ({
			...parseDreamAtlasEntryInput({
				version: e.version,
				dreamDate: e.dreamDate,
				narrative: e.narrative,
				emotions: e.emotions,
				associations: e.associations,
				includeInSynthesis: e.includeInSynthesis
			})!,
			id: e.id,
			revision: e.revision
		}))
		.sort((a, b) => a.dreamDate.localeCompare(b.dreamDate) || a.id.localeCompare(b.id));
	const facts: CalculationSnapshot['facts'] = [
		{
			id: 'atlas-period',
			kind: 'reported',
			display: `Período do diário: ${atlas.period.startDate} a ${atlas.period.endDate}`,
			source: 'input.dreamAtlas.startDate'
		},
		{
			id: 'atlas-count',
			kind: 'calculated',
			display: `${entries.length} relatos autorizados para a análise`,
			source: atlas.version
		},
		...atlas.windows.map((w) => ({
			id: `atlas-window-${w.index}`,
			kind: 'calculated' as const,
			display: `Janela ${w.startDate} a ${w.endDate}: ${w.includedEntryIds.length} relatos`,
			source: atlas.version
		})),
		...atlas.recurrences.slice(0, 8).map((r, i) => ({
			id: `recurrence-${i}`,
			kind: 'reported' as const,
			display: `${r.label}: informado em ${r.entryIds.length} registros selecionados`,
			source: `${r.source};${r.entryIds.join(',')}`
		})),
		...entries.map((entry) => ({
			id: `entry-${entry.id}`,
			kind: 'reported' as const,
			display: `${entry.dreamDate}: ${entry.narrative}; emoções: ${entry.emotions.join(', ') || 'não informadas'}; associações pessoais: ${entry.associations.join(', ') || 'não informadas'}`,
			source: `private-diary:${entry.id}@${entry.revision}`
		}))
	];
	return {
		version: DREAM_ATLAS_CALCULATION,
		kind: 'dream',
		status: 'recorded',
		facts,
		data: {
			atlas,
			sourceIds: atlas.includedEntryIds,
			sourceRevisions: Object.fromEntries(entries.map((e) => [e.id, e.revision])),
			entries
		},
		limits: [
			'Síntese dos relatos autorizados no ciclo de 30 dias do diário privado.',
			'Repetições usam somente emoções e associações declaradas; nenhuma imagem foi interpretada como significado universal.',
			'Dias sem registros são lacunas; não representam ausência de sonhos.',
			'A leitura apresenta perguntas e hipóteses de reflexão. Não diagnostica nem prevê acontecimentos.'
		]
	};
}

function projection(input: WorkflowInput, calculation: CalculationSnapshot) {
	const data = calculation.data as unknown as { entries: DreamAtlasFactSource[] };
	if (input.productId !== 'dream-atlas' || !input.dreamAtlas || !Array.isArray(data?.entries))
		throw new Error('Diário inválido.');
	const expected = calculateDreamAtlasSnapshot(input.dreamAtlas.startDate, data.entries);
	if (canonical(expected) !== canonical(calculation))
		throw new Error('Os fatos não correspondem aos relatos autorizados.');
	return {
		entries: data.entries,
		atlas: prepareDreamAtlasFacts(input.dreamAtlas.startDate, data.entries)!
	};
}

export function composeDreamAtlas(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const { entries, atlas } = projection(input, calculation);
	const days = new Set(entries.map((e) => e.dreamDate)).size;
	const sections: TrialReading['sections'] = [];
	const add = (title: string, text: string, factIds: string[]) =>
		sections.push({ title, text, factIds });
	add(
		'O conjunto que você reuniu',
		`Entre ${date(atlas.period.startDate)} e ${date(atlas.period.endDate)}, você autorizou ${entries.length} relatos, distribuídos por ${days} dos 30 dias. ${30 - days} dias não têm relatos incluídos. Essa distribuição mostra o que ficou registrado; não mede quanto você sonhou nem a importância de cada noite. A análise abaixo relaciona suas próprias emoções e associações ao longo do período.`,
		['atlas-period', 'atlas-count']
	);
	const recurring = atlas.recurrences.slice(0, 8);
	add(
		'O que reaparece nos seus relatos',
		recurring.length
			? `${atlas.recurrences.length > recurring.length ? 'Estas são oito das repetições encontradas. As demais permanecem nos seus relatos para consulta.\n\n' : ''}${recurring
					.map((r) => {
						const related = entries.filter((e) => r.entryIds.includes(e.id));
						const periods = atlas.windows
							.filter((w) => w.includedEntryIds.some((id) => r.entryIds.includes(id)))
							.map((w) => `${date(w.startDate)} a ${date(w.endDate)}`);
						return `“${r.label}” é ${r.source === 'reported-emotion' ? 'uma emoção que você nomeou' : 'uma associação pessoal que você escreveu'} em ${related.length} relatos (${related.map((e) => date(e.dreamDate)).join(', ')}). ${periods.length > 1 ? `Ela aparece em ${periods.length} partes do diário: ${periods.join('; ')}.` : 'As ocorrências se concentram na mesma parte do diário.'}`;
					})
					.join(
						'\n\n'
					)}\n\nEscolha uma dessas palavras e compare as cenas em que ela aparece: descreve a mesma experiência ou mudou de sentido? A repetição permite essa comparação; não prova uma causa comum.`
			: 'Nenhuma emoção ou associação pessoal se repete literalmente em dois relatos autorizados. Isso não significa que seus sonhos sejam desconectados. A amostra permite comparar as cenas, mas não sustenta apontar uma recorrência como fato.',
		recurring.length ? recurring.map((_, i) => `recurrence-${i}`) : ['atlas-count']
	);
	for (const window of atlas.windows) {
		const records = entries.filter((e) => window.includedEntryIds.includes(e.id));
		const emotions = [...new Set(records.flatMap((e) => e.emotions))];
		const associations = [...new Set(records.flatMap((e) => e.associations))];
		add(
			`${date(window.startDate)} a ${date(window.endDate)}`,
			records.length
				? `${records.length} relatos autorizados nesta parte do diário. ${emotions.length ? `Você nomeou: ${emotions.join('; ')}.` : 'Você não informou emoções nesses relatos.'} ${associations.length ? `As associações pessoais foram: ${associations.join('; ')}.` : 'Não há associações pessoais informadas nesta parte.'}\n\n${records
						.slice(0, 2)
						.map(
							(e) =>
								`Em ${date(e.dreamDate)}, você escreveu: “${e.narrative.slice(0, 400)}${e.narrative.length > 400 ? '…' : ''}”`
						)
						.join('\n\n')}`
				: `De ${date(window.startDate)} a ${date(window.endDate)}, não há relatos autorizados. Esse intervalo permanece como lacuna: não permite concluir que uma emoção desapareceu ou que você deixou de sonhar.`,
			[`atlas-window-${window.index}`, ...records.map((e) => `entry-${e.id}`)]
		);
	}
	const first = atlas.windows.find((w) => w.includedEntryIds.length);
	const last = [...atlas.windows].reverse().find((w) => w.includedEntryIds.length);
	const firstEntries = entries.filter((e) => first?.includedEntryIds.includes(e.id));
	const lastEntries = entries.filter((e) => last?.includedEntryIds.includes(e.id));
	const firstWords = new Set(
		firstEntries.flatMap((e) => e.emotions).map((e) => e.toLocaleLowerCase('pt-BR'))
	);
	const later = [...new Set(lastEntries.flatMap((e) => e.emotions))].filter(
		(e) => !firstWords.has(e.toLocaleLowerCase('pt-BR'))
	);
	add(
		'Uma leitura do percurso',
		first?.index !== last?.index
			? `A primeira parte com registros vai de ${date(first!.startDate)} a ${date(first!.endDate)}; a última, de ${date(last!.startDate)} a ${date(last!.endDate)}. ${later.length ? `Na última parte aparecem emoções que não foram nomeadas na primeira: ${later.join('; ')}. Isso é uma diferença entre os relatos, sem demonstrar uma mudança emocional fora dos sonhos.` : 'A comparação das emoções informadas não acrescenta um termo novo na última parte. Ainda assim, uma mesma palavra pode acompanhar cenas e contextos diferentes.'}\n\nUma hipótese para explorar é que suas associações aproximem alguns relatos de situações que você viveu no período. Outra é que os sonhos reúnam lembranças e imagens sem um tema comum. Compare uma cena do início com outra do fim: o que nas suas palavras apoia cada hipótese? O que as contradiz?`
			: 'Os relatos autorizados se concentram em uma única parte do diário. Esta amostra permite comparar os sonhos registrados, mas não sustenta descrever uma evolução ao longo dos 30 dias. Preserve essa limitação ao formular uma hipótese.',
		atlas.windows.map((w) => `atlas-window-${w.index}`)
	);
	add(
		'Os relatos usados nesta edição',
		entries
			.map(
				(e) =>
					`${date(e.dreamDate)} — ${e.narrative}\nEmoções: ${e.emotions.join('; ') || 'não informadas'}. Associações pessoais: ${e.associations.join('; ') || 'não informadas'}.`
			)
			.join('\n\n'),
		entries.map((e) => `entry-${e.id}`)
	);
	return {
		version: DREAM_ATLAS_READING,
		productId: input.productId,
		title: 'Diário de Sonhos — 30 Dias',
		opening: `${entries.length} relatos para reler em conjunto: o que reaparece, o que muda entre as anotações e o que continua aberto.`,
		source:
			'Relatos, emoções e associações pessoais autorizados no diário. Comparação literal e reflexão simbólica, sem dicionário universal de sonhos.',
		sections,
		questions: [
			'Qual repetição faz sentido no contexto que você viveu?',
			'Que diferença entre dois relatos contraria sua primeira hipótese?',
			'O que você deseja observar, sem antecipar uma conclusão, no próximo período?'
		],
		practice:
			'Escolha dois relatos do período. Sublinhe uma emoção e uma associação pessoal em cada um. Escreva uma hipótese que os aproxime, uma diferença que limite essa hipótese e uma pergunta para acompanhar nos próximos registros.',
		limits: [...calculation.limits]
	};
}

export function reviewDreamAtlas(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
) {
	try {
		projection(input, calculation);
	} catch {
		return ['Relatos, datas, revisões ou recorrências não correspondem ao diário.'];
	}
	return canonical(composeDreamAtlas(input, calculation)) === canonical(reading)
		? []
		: ['A análise diverge dos registros autorizados.'];
}
