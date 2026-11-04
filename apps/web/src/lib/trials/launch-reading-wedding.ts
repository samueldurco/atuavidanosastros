import type { LaunchInput, LaunchCeremonyOption } from '@atv/domain';
import type { LaunchFactCalculation } from '../server/launch-calculation';
import {
	buildLaunchWeddingProfile,
	verifyLaunchWeddingProfile,
	WEDDING_PROFILE_VERSION,
	weddingProfileSources,
	type WeddingProfileInput,
	type WeddingProfileComparison,
	type WeddingCandidateProfile,
	type WeddingProfileEvidence
} from '../server/launch-wedding-profile';
import { bodyNames } from './reconstruction/canon';
import type { LaunchReading, LaunchReadingSection } from './launch-reading';
import { formatLaunchLocalDateTime } from './launch-reading-dates';

const policy = 'atv-launch-private-editorial-policy/1';
const methodSource = 'atv-wedding-original-restricted-method';
export const weddingReadingSources = weddingProfileSources.map((source) => ({
	id: source.id,
	version: WEDDING_PROFILE_VERSION,
	origin:
		source.url ??
		'Método original ATVNA: inclusão de apoios e ausência de ressalvas, sem pesos, aplicado ao mesmo início da cerimônia.'
}));
export const weddingReadingSourceVersions: [string, string][] = weddingReadingSources.map(
	(source) => [source.id, source.version]
);
const q = (value: unknown) => `“${String(value)}”`;
const inputFor = (input: LaunchInput, calculation: LaunchFactCalculation): WeddingProfileInput => ({
	executionId: calculation.executionId,
	inputDigest: calculation.inputDigest,
	options: input.answers.ceremonies as LaunchCeremonyOption[],
	events: calculation.data.events as WeddingProfileInput['events']
});
const familyLabels: Record<WeddingProfileEvidence['family'], string> = {
	'moon-support': 'apoio à disponibilidade simbólica da Lua',
	'moon-caution': 'ressalva ao ritmo e à segurança simbolizados pela Lua',
	'venus-caution': 'ressalva à negociação e à aproximação simbolizadas por Vênus',
	'angular-support': 'destaque simbólico da Lua ou de Vênus junto a um ângulo',
	'angular-caution': 'ressalva pela ênfase de Marte ou Saturno junto a um ângulo'
};
const aspectLabels: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
const angleLabels: Record<string, string> = {
	ascendant: 'Ascendente',
	midheaven: 'Meio do Céu',
	descendant: 'Descendente',
	imumCoeli: 'Fundo do Céu'
};
function evidenceText(evidence: WeddingProfileEvidence): string {
	const g = evidence.geometry;
	const geometry =
		'body' in g
			? `${bodyNames[g.body as string]} a ${Number(g.distanceDegrees).toFixed(3)}° eclípticos do ${angleLabels[g.angle as string]}`
			: `${bodyNames[g.first as string]} em ${aspectLabels[g.kind as string]} com ${bodyNames[g.second as string]}, orbe ${Number(g.orbDegrees).toFixed(3)}°`;
	return `${geometry}: ${familyLabels[evidence.family]}.`;
}
const signatures = (profile: WeddingCandidateProfile) => [
	profile.supports.moon,
	profile.supports.angularMoonVenus,
	profile.cautions.moon,
	profile.cautions.venus,
	profile.cautions.angularMarsSaturn
];
const sameItems = (a: string[], b: string[]) =>
	a.length === b.length && a.every((item) => b.includes(item));
/** Partial order only: no totals, hidden weights, forced tie-break or full election claim. */
function independentlyDominates(a: WeddingCandidateProfile, b: WeddingCandidateProfile): boolean {
	const first = signatures(a),
		second = signatures(b);
	return (
		first.every((items, i) =>
			i < 2
				? second[i]!.every((item) => items.includes(item))
				: items.every((item) => second[i]!.includes(item))
		) && first.some((items, i) => !sameItems(items, second[i]!))
	);
}
const criterionText = (criterion: string): string => {
	const [relation, id] = criterion.split(':');
	const label = id!.startsWith('angular-')
		? `proximidade angular de ${bodyNames[id!.slice(8)]}`
		: id!
				.split('-')
				.map((body) => bodyNames[body] ?? body)
				.join('–');
	return relation === 'additional-support'
		? `apoio adicional ${label}`
		: `ausência da ressalva ${label}`;
};
function outcomeText(profile: WeddingProfileComparison): string {
	if (profile.outcome === 'PREFERENCE_IN_DECLARED_PROFILE') {
		const preferred = profile.profiles.find(
			(option) => option.optionId === profile.preferredOptionId
		)!;
		const comparisons = profile.dominates
			.filter((relation) => relation.optionId === preferred.optionId)
			.map((relation) => {
				const other = profile.profiles.find(
					(option) => option.optionId === relation.otherOptionId
				)!;
				return `frente a ${other.label}: ${relation.criterionIds.map(criterionText).join('; ')}`;
			});
		return `${preferred.label} é a preferência somente neste perfil declarado: preserva todos os apoios e não acrescenta nenhuma ressalva das outras opções, com ao menos uma diferença estrita (${comparisons.join(' | ')}). Isso não escolhe o resultado do casamento nem substitui as prioridades práticas.`;
	}
	if (profile.outcome === 'TIED_IN_DECLARED_PROFILE')
		return `As opções da fronteira (${profile.frontier.map((id) => profile.profiles.find((option) => option.optionId === id)!.label).join(', ')}) empatam no perfil declarado: seus conjuntos de apoios e ressalvas são iguais. Diferenças de coordenadas que não alteram esses critérios não autorizam inventar um desempate; a escolha deve voltar às condições práticas.`;
	if (profile.outcome === 'TRADEOFF_NO_SINGLE_PREFERENCE')
		return `Há trocas entre apoios e ressalvas, sem preferência única. Nenhuma opção preserva todos os apoios e evita todas as ressalvas de cada concorrente com alguma vantagem estrita. A fronteira contém ${profile.frontier.map((id) => profile.profiles.find((option) => option.optionId === id)!.label).join(', ')}; pesos pessoais exigiriam outra regra explicitamente acordada.`;
	return `O perfil é inconclusivo por falta de cobertura: ${profile.reasons.join('; ')}. Não há base para uma preferência ou desempate.`;
}

export async function composeWeddingLaunchReading(
	input: LaunchInput,
	calculation: LaunchFactCalculation
) {
	const expected = await buildLaunchWeddingProfile(inputFor(input, calculation));
	const stored = calculation.data.declaredProfile as WeddingProfileComparison;
	if (!stored || JSON.stringify(expected) !== JSON.stringify(stored))
		throw new Error('launch_wedding_profile_binding_invalid');
	const sections: LaunchReadingSection[] = [],
		claims: LaunchReading['claims'] = [];
	for (const [index, option] of (input.answers.ceremonies as LaunchCeremonyOption[]).entries()) {
		const candidate = stored.profiles.find((profile) => profile.label === option.label)!;
		const id = `option-${index + 1}`;
		const ceremonyTime = formatLaunchLocalDateTime(candidate.localDateTime, candidate.city);
		const first = `${candidate.label}: início da cerimônia em ${ceremonyTime}. ${candidate.evidence.length ? candidate.evidence.map(evidenceText).join(' ') : 'Nenhum apoio ou ressalva do recorte foi encontrado dentro do orbe de 3°. Ausência neste recorte não comprova ausência de dificuldades.'}`;
		const second = `Para ${q(input.answers.priorities)}, ${candidate.label} pede confirmar disponibilidade e deslocamento para ${ceremonyTime}, com quem participa da cerimônia. ${candidate.cautions.moon.length || candidate.cautions.venus.length || candidate.cautions.angularMarsSaturn.length ? 'As ressalvas convidam a discutir ritmo, flexibilidade e responsabilidades antes de confirmar; não anunciam conflito.' : 'A ausência dessas ressalvas não dispensa combinar ritmo, flexibilidade e responsabilidades.'} Apoios são linguagem simbólica para preparar a cerimônia; nenhum fator descreve a disposição real dos noivos.`;
		const evidenceIds = [
			`reported-ceremonies-${index + 1}`,
			`option-${index + 1}-moon`,
			`option-${index + 1}-venus`,
			...candidate.evidence.flatMap((evidence) => evidence.evidenceIds)
		];
		sections.push({
			id,
			title: `${candidate.label}: apoios e ressalvas`,
			paragraphs: [first, second],
			evidenceIds,
			sourceIds: [methodSource, policy]
		});
		claims.push({
			id: `claim-option-${index + 1}`,
			sectionId: id,
			rule: 'declared-profile-candidate-evidence',
			evidenceIds,
			factors: {
				optionId: candidate.optionId,
				utcInstant: candidate.utcInstant,
				evidence: candidate.evidence.map((evidence) => evidence.id)
			},
			interpretation: first
		});
	}
	const comparison = outcomeText(stored);
	sections.push({
		id: 'declared-comparison',
		title: 'Comparação e decisão possível',
		paragraphs: [
			comparison,
			`O método compara conjuntos, sem pontuação. Lua em conjunção, sextil ou trígono com Vênus/Júpiter entra como apoio; Lua ou Vênus em conjunção, quadratura ou oposição com Marte/Saturno entra como ressalva. Proximidade eclíptica de até 3° dos quatro ângulos dá ênfase de Lua/Vênus ou ressalva de Marte/Saturno, sem determinar casa ocupada. Compare sempre o início da cerimônia e submeta qualquer preferência a ${q(input.answers.priorities)}.`
		],
		evidenceIds: sections.flatMap((section) => section.evidenceIds),
		sourceIds: [methodSource, policy]
	});
	claims.push({
		id: 'claim-comparison',
		sectionId: 'declared-comparison',
		rule: 'unweighted-set-partial-order',
		evidenceIds: sections.at(-1)!.evidenceIds,
		factors: {
			outcome: stored.outcome,
			preferredOptionId: stored.preferredOptionId ?? 'none',
			frontier: stored.frontier
		},
		interpretation: comparison
	});
	return {
		summary: `Comparação das ${stored.profiles.length} opções para o mesmo início da cerimônia, pelo perfil simbólico original restrito. ${comparison}`,
		sections,
		claims,
		sources: weddingReadingSources,
		practicalAction: `Confira nas opções que permanecem viáveis a prioridade ${q(input.answers.priorities)}. Anote um acordo concreto sobre horário de chegada, responsabilidades e margem para ajustes; uma preferência restrita só continua útil se essas condições puderem ser confirmadas.`,
		reflection:
			'Qual apoio ou ressalva desta comparação altera uma preparação concreta da cerimônia, e qual condição prática ainda precisa ser confirmada antes da escolha?',
		limits: [
			'Perfil simbólico original e parcial, sem homologação de precisão nem eleição completa.',
			'Não avalia regências, dignidades, casas ocupadas, recepções, aplicação/separação, Lua fora de curso, fase lunar, combustão, eclipses ou mapas natais dos participantes.',
			'As fontes contextualizam a prática eletiva; a regra de comparação sem pesos é original ATVNA e não é atribuída a essas autoras ou autores.'
		]
	};
}

export async function evaluateWeddingLaunchReading(
	input: LaunchInput,
	calculation: LaunchFactCalculation,
	reading: LaunchReading
) {
	const checks: { id: string; passed: boolean; detail: string }[] = [];
	const check = (id: string, passed: boolean, detail: string) =>
		checks.push({ id, passed, detail });
	try {
		const profile = calculation.data.declaredProfile as WeddingProfileComparison;
		check(
			'bound-wedding-profile',
			await verifyLaunchWeddingProfile(inputFor(input, calculation), profile),
			'Perfil completo reconstruído dos eventos e opções originais; preferência e evidências não são autoridade do cliente.'
		);
		check(
			'wedding-derived-facts',
			profile.derivedFacts.every((fact) =>
				calculation.facts.some(
					(actual) =>
						actual.id === fact.id &&
						actual.display === fact.display &&
						actual.source === fact.source
				)
			),
			'Toda relação interpretada conserva seu fato derivado e sua proveniência.'
		);
		const semantic = profile.profiles.every((candidate) => {
			const index = (input.answers.ceremonies as LaunchCeremonyOption[]).findIndex(
				(option) => option.label === candidate.label
			);
			const part = reading.sections.find((section) => section.id === `option-${index + 1}`),
				claim = reading.claims.find((claim) => claim.id === `claim-option-${index + 1}`);
			return (
				!!part &&
				!!claim &&
				claim.factors.optionId === candidate.optionId &&
				claim.factors.utcInstant === candidate.utcInstant &&
				candidate.evidence.every(
					(evidence) =>
						part.paragraphs[0]!.includes(evidenceText(evidence)) &&
						evidence.evidenceIds.every((id) => part.evidenceIds.includes(id))
				) &&
				part.paragraphs[0]!.includes(
					formatLaunchLocalDateTime(candidate.localDateTime, candidate.city)
				) &&
				part.paragraphs[1]!.includes(
					formatLaunchLocalDateTime(candidate.localDateTime, candidate.city)
				) &&
				part.paragraphs[1]!.includes(String(input.answers.priorities))
			);
		});
		check(
			'wedding-candidate-semantic-dependency',
			semantic,
			'Cada apoio e ressalva depende do par, geometria, família, candidata original e prioridade relatada; coordenadas sem mecanismo não bastam.'
		);
		const relationValid = profile.profiles.every((a) =>
			profile.profiles.every(
				(b) =>
					a === b ||
					independentlyDominates(a, b) ===
						profile.dominates.some(
							(relation) =>
								relation.optionId === a.optionId && relation.otherOptionId === b.optionId
						)
			)
		);
		const preferred =
			profile.preferredOptionId &&
			profile.profiles.find((candidate) => candidate.optionId === profile.preferredOptionId);
		const outcomeValid =
			profile.outcome === 'PREFERENCE_IN_DECLARED_PROFILE'
				? !!preferred &&
					profile.profiles.every(
						(candidate) => candidate === preferred || independentlyDominates(preferred, candidate)
					)
				: profile.preferredOptionId === null &&
					(profile.outcome === 'TIED_IN_DECLARED_PROFILE'
						? profile.frontier.length > 1 &&
							profile.profiles
								.filter((candidate) => profile.frontier.includes(candidate.optionId))
								.every((candidate) =>
									signatures(candidate).every((items, index) =>
										sameItems(
											items,
											signatures(
												profile.profiles.find((option) => option.optionId === profile.frontier[0])!
											)[index]!
										)
									)
								)
						: profile.outcome === 'TRADEOFF_NO_SINGLE_PREFERENCE' &&
							!profile.profiles.some((candidate) =>
								profile.profiles.every(
									(other) => candidate === other || independentlyDominates(candidate, other)
								)
							));
		check(
			'wedding-partial-order-decision',
			relationValid &&
				outcomeValid &&
				reading.sections.find((part) => part.id === 'declared-comparison')?.paragraphs[0] ===
					outcomeText(profile),
			'Decisão verificada por inclusão independente de conjuntos, diferença estrita e cobertura; empate e trocas não recebem preferência inventada.'
		);
		check(
			'wedding-restricted-scope',
			reading.limits.some((limit) => limit.includes('sem homologação de precisão')) &&
				reading.limits.some((limit) => limit.includes('aplicação/separação')) &&
				reading.practicalAction.includes(String(input.answers.priorities)),
			'Mesmo início da cerimônia, limites calculados e condições práticas explícitos; nenhuma alegação de eleição completa ou sucesso.'
		);
	} catch {
		check(
			'bound-wedding-profile',
			false,
			'Perfil, cobertura, geometria ou comparação não sustentam a interpretação.'
		);
	}
	return checks;
}
