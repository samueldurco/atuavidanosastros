import { assessCrossAspectStability, type AspectPolicy, type AspectPosition } from '@atv/astrology';
import type { BirthInput, CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { inspectBirthChartProjection } from '../../../../../worker/src/natal-calculators';
import { bodyNames } from './canon';
import { aspectNames } from './date-facts';
import { normalizeFactGraph } from './fact-graph';

export const SYNASTRY_VERSION = 'atv-private-synastry-synthesis/4.0.0';
/** Editorial inclusion threshold, never a provider precision certificate. */
export const synastryAspectPolicy: AspectPolicy = {
	id: 'atv-synastry-major-aspects',
	version: '1.0.0',
	aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((kind) => ({
		kind: kind as AspectPolicy['aspects'][number]['kind'],
		orbDegrees: kind === 'sextile' ? 4 : 6
	}))
};
export type HouseOverlay = {
	from: 'person-a' | 'person-b';
	body: string;
	house: number;
	factId: string;
	positionFactId: string;
	cuspFactId: string;
};
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
export function projectSynastry(
	input: WorkflowInput,
	sources: [CalculationSnapshot, CalculationSnapshot],
	sourceInputs: [BirthInput, BirthInput]
): CalculationSnapshot {
	if (
		input.productId !== 'synastry' ||
		!input.birth ||
		!input.partner ||
		!input.consent.partner ||
		stable(sourceInputs) !== stable([input.birth, input.partner])
	)
		throw new Error('Dados ou consentimento da Sinastria divergentes.');
	for (const [i, source] of sources.entries()) {
		if (
			!inspectBirthChartProjection(source) ||
			(source.data.provenance as { temporal: { utcInstant: string } }).temporal.utcInstant !==
				new Date(sourceInputs[i].utcInstant).toISOString()
		)
			throw new Error('Base natal divergente na Sinastria.');
	}
	const graphs = sources.map(normalizeFactGraph);
	if (graphs.some((g) => g.positions.length !== 10))
		throw new Error('Sinastria exige dez posições em cada mapa.');
	const stability = assessCrossAspectStability(
		sources[0].data.positions as AspectPosition[],
		sources[1].data.positions as AspectPosition[],
		synastryAspectPolicy,
		{ first: null, second: null }
	);
	const geometry = stability.calculation;
	const overlays: HouseOverlay[] = [];
	for (const [i, graph] of graphs.entries()) {
		const other = graphs[1 - i];
		if (other.houses.length !== 12) continue;
		for (const p of graph.positions) {
			const cusp = other.houses.find(
				(h, j) =>
					(p.longitude - h.longitude + 360) % 360 <
					(other.houses[(j + 1) % 12].longitude - h.longitude + 360) % 360
			);
			if (!cusp) throw new Error('Sobreposição sem cúspide válida.');
			const from = i === 0 ? 'person-a' : 'person-b',
				to = i === 0 ? 'person-b' : 'person-a';
			overlays.push({
				from,
				body: p.body,
				house: cusp.house,
				factId: `overlay-${from}-${p.body}`,
				positionFactId: `${from}-${p.factId}`,
				cuspFactId: `${to}-${cusp.factId}`
			});
		}
	}
	const provenance = sources.map((s) => s.data.provenance as { warnings: string[] });
	return {
		version: SYNASTRY_VERSION,
		kind: 'relationship',
		status: 'experimental',
		facts: [
			...sources.flatMap((s, i) =>
				s.facts.map((f) => ({
					...f,
					id: `person-${i === 0 ? 'a' : 'b'}-${f.id}`,
					display: `Pessoa ${i === 0 ? 'A' : 'B'} · ${f.display}`
				}))
			),
			...stability.pairs.map((pair) => {
				const a = geometry.inputPositions.first.find((p) => p.body === pair.first)!,
					b = geometry.inputPositions.second.find((p) => p.body === pair.second)!;
				const diff = Math.abs(a.longitude - b.longitude),
					separation = Math.min(diff, 360 - diff);
				const aspect = geometry.aspects.find(
					(x) => x.first === pair.first && x.second === pair.second
				);
				return {
					id: `cross-${pair.first}-${pair.second}`,
					kind: 'calculated' as const,
					display: `${bodyNames[pair.first]} de A / ${bodyNames[pair.second]} de B: separação ${separation.toFixed(6)}°; ${aspect ? `${aspectNames[aspect.kind]}, orbe ${aspect.orbDegrees.toFixed(6)}°` : 'sem aspecto maior na política desta edição'}. Precisão não certificada; estabilidade desconhecida.`,
					source: `${geometry.algorithmVersion};${synastryAspectPolicy.id}@${synastryAspectPolicy.version};${SYNASTRY_VERSION}`
				};
			}),
			...overlays.map((o) => ({
				id: o.factId,
				kind: 'calculated' as const,
				display: `${bodyNames[o.body]} da pessoa ${o.from === 'person-a' ? 'A' : 'B'} na casa ${o.house} da pessoa ${o.from === 'person-a' ? 'B' : 'A'}.`,
				source: `atv-house-overlay/1;${o.positionFactId};${o.cuspFactId}`
			})),
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
			first: structuredClone(sources[0].data),
			second: structuredClone(sources[1].data),
			relationshipGeometry: geometry,
			crossAspectStability: stability,
			houseOverlays: overlays,
			sharing: 'not-authorized',
			compatibilityScore: null
		},
		limits: [
			...new Set(provenance.flatMap((p) => p.warnings)),
			'Sinastria tropical experimental: compara dois mapas e seleciona hipóteses simbólicas para conversar; não calcula um mapa composto.',
			'Os cem pares planetários são avaliados. A política editorial inclui conjunção, quadratura, trígono e oposição até 6°, sextil até 4°. O orbe não mede a qualidade da relação.',
			'A precisão das posições não está certificada: a estabilidade dos contatos é desconhecida, inclusive perto do limite do orbe. Nenhum aspecto é apresentado como robusto.',
			'Casas e ângulos dependem da hora e do local. As sobreposições só aparecem quando as casas do mapa receptor estão calculáveis; não verificam a exatidão biográfica da entrada.',
			'O mapa não comprova sentimentos, atração, compromisso, segurança ou destino. Esses temas exigem a experiência e a palavra de cada pessoa.',
			'A declaração para usar os dados da outra pessoa permite esta leitura privada; não autoriza compartilhamento e não comprova consentimento bilateral verificado.'
		]
	};
}
export function assertSynastryProjection(input: WorkflowInput, calculation: CalculationSnapshot) {
	if (
		calculation.version !== SYNASTRY_VERSION ||
		stable(
			projectSynastry(
				input,
				calculation.data.sources as [CalculationSnapshot, CalculationSnapshot],
				calculation.data.sourceInputs as [BirthInput, BirthInput]
			)
		) !== stable(calculation)
	)
		throw new Error('Sinastria sem correspondência com as bases natais.');
}
