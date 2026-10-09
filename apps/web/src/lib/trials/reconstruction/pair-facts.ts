import type { BirthInput, CalculationSnapshot, WorkflowInput } from '@atv/domain';
import {
	inspectBirthChartProjection,
	zodiacPosition
} from '../../../../../worker/src/natal-calculators';

export const PAIR_VERSION = 'atv-private-pair-preview/4.0.0';
export const pairFactors = ['sun', 'moon', 'ascendant'] as const;
export type PairFactor = (typeof pairFactors)[number];
export type PairPoint = { factor: PairFactor; longitude: number; sign: number; factId: string };
export type PairPerson = {
	role: 'person-a' | 'person-b';
	points: PairPoint[];
	provenance: Record<string, unknown>;
};
const names = { sun: 'Sol', moon: 'Lua', ascendant: 'Ascendente' };
const stable = (value: unknown): string => {
	if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
	if (value && typeof value === 'object')
		return (
			'{' +
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => JSON.stringify(k) + ':' + stable(v))
				.join(',') +
			'}'
		);
	return JSON.stringify(value);
};
function projectPerson(
	natal: CalculationSnapshot,
	birth: BirthInput,
	role: PairPerson['role']
): PairPerson {
	if (inspectBirthChartProjection(natal) !== 'available')
		throw new Error(
			'O Ascendente não está disponível para estes dados de nascimento. A comparação dos três fatores exige dois Ascendentes calculáveis.'
		);
	const provenance = natal.data.provenance as Record<string, unknown>;
	if (
		(provenance.temporal as { utcInstant: string }).utcInstant !==
		new Date(birth.utcInstant).toISOString()
	)
		throw new Error('Instante natal divergente na comparação.');
	const positions = natal.data.positions as { body: string; longitude: number }[];
	const angles = natal.data.angles as { ascendant: number };
	return {
		role,
		provenance: structuredClone(provenance),
		points: pairFactors.map((factor) => {
			const longitude =
				factor === 'ascendant'
					? angles.ascendant
					: positions.find((p) => p.body === factor)!.longitude;
			return { factor, longitude, sign: Math.floor(longitude / 30), factId: `${role}-${factor}` };
		})
	};
}

/** New private edition. Historical context-product calculations remain immutable. */
export function projectPairPreview(
	input: WorkflowInput,
	sources: [CalculationSnapshot, CalculationSnapshot],
	sourceInputs: [BirthInput, BirthInput]
): CalculationSnapshot {
	if (
		input.productId !== 'pair-preview' ||
		!input.birth ||
		!input.partner ||
		!input.consent.partner ||
		stable(sourceInputs) !== stable([input.birth, input.partner])
	)
		throw new Error('Dados ou consentimento do par divergentes.');
	const people = sources.map((source, i) =>
		projectPerson(source, sourceInputs[i], i === 0 ? 'person-a' : 'person-b')
	);
	return {
		version: PAIR_VERSION,
		kind: 'relationship',
		status: 'experimental',
		facts: [
			...people.flatMap((person, i) =>
				person.points.map((p) => ({
					id: p.factId,
					kind: 'calculated' as const,
					display: `Pessoa ${i === 0 ? 'A' : 'B'} · ${names[p.factor]}: ${zodiacPosition(p.longitude).display}`,
					source: `${person.provenance.provider}@${person.provenance.providerVersion};${person.provenance.algorithmVersion};${PAIR_VERSION}`
				}))
			),
			...(input.context
				? [
						{
							id: 'personal-context',
							kind: 'reported' as const,
							display: input.context,
							source: 'input.context'
						}
					]
				: [])
		],
		data: {
			productId: input.productId,
			sources: structuredClone(sources),
			sourceInputs: structuredClone(sourceInputs),
			first: people[0],
			second: people[1],
			sharing: 'not-authorized',
			aspects: [],
			compatibilityScore: null
		},
		limits: [
			...new Set(
				sources.flatMap((source) => (source.data.provenance as { warnings: string[] }).warnings)
			),
			'Comparação introdutória do Sol, da Lua e do Ascendente de duas pessoas, com zodíaco tropical e posições experimentais. Signos e graus são calculados; a interpretação é simbólica.',
			'As diferenças de signo, elemento e ritmo são hipóteses para conversar. Não são aspectos entre mapas, medidas de compatibilidade ou provas sobre sentimentos e comportamento.',
			'O Ascendente depende da hora e do lugar informados. A leitura não verifica a exatidão biográfica desses dados nem substitui uma comparação completa dos mapas.',
			'A declaração para usar os dados da outra pessoa permite esta leitura privada; não autoriza compartilhamento e não comprova consentimento bilateral verificado.'
		]
	};
}
export function assertPairProjection(input: WorkflowInput, calculation: CalculationSnapshot) {
	if (
		calculation.version !== PAIR_VERSION ||
		stable(
			projectPairPreview(
				input,
				calculation.data.sources as [CalculationSnapshot, CalculationSnapshot],
				calculation.data.sourceInputs as [BirthInput, BirthInput]
			)
		) !== stable(calculation)
	)
		throw new Error('Comparação sem correspondência com as bases natais.');
}
