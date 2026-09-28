import { CaelusEphemerisProvider, engineContract, type EphemerisProvider } from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot } from '@atv/domain';
import { calculateValidatedChart, zodiacPosition } from './natal-calculators.ts';
import { ProcessingError, type ProductCalculator } from './product-processing.ts';

/** Master plan §7.2: factual MC projection only, never a career prescription. */
export const careerCompassContract = Object.freeze({
  version: 'atv-career-compass-calculation/1.0.0',
  products: Object.freeze(['career-compass']),
  zodiac: 'tropical', presentation: 'zodiac-half-open-sectors/truncated-6-decimals/1',
  aspects: 'not-assessed', interpretation: 'not-produced', status: 'experimental'
});

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const matchesContract = (value: unknown, expected: Record<string, unknown>): boolean =>
  record(value) && Object.keys(value).length === Object.keys(expected).length &&
  Object.entries(expected).every(([key, wanted]) => Array.isArray(wanted)
    ? Array.isArray(value[key]) && JSON.stringify(value[key]) === JSON.stringify(wanted)
    : value[key] === wanted);

/** Coherence of an already bounded snapshot, not proof of origin or engine approval.
 * JSONB key order is irrelevant. No provider call or recalculation occurs at this boundary. */
export function validCareerCompassProjection(value: CalculationSnapshot): boolean {
  const { data } = value;
  const { angles, houses, provenance } = data;
  if (value.version !== careerCompassContract.version || value.kind !== 'purpose' ||
      value.status !== 'experimental' || data.productId !== 'career-compass' ||
      Object.keys(data).length !== 6 || !Array.isArray(data.positions) || data.positions.length ||
      !record(angles) || Object.keys(angles).length !== 2 || angles.ascendant !== null ||
      typeof angles.midheaven !== 'number' || !Number.isFinite(angles.midheaven) ||
      angles.midheaven < 0 || angles.midheaven >= 360 ||
      !record(houses) || Object.keys(houses).length !== 3 || houses.system !== 'placidus' ||
      houses.status !== 'not-requested' || !Array.isArray(houses.cusps) || houses.cusps.length ||
      !matchesContract(data.projection, careerCompassContract) || !record(provenance) ||
      !matchesContract(provenance.contract, engineContract) || provenance.accuracyStatus !== 'experimental' ||
      provenance.zodiac !== 'tropical' || provenance.houseSystem !== 'placidus' ||
      provenance.referenceFrame !== 'geocentric-apparent-ecliptic-of-date' ||
      [provenance.provider, provenance.providerVersion, provenance.algorithmVersion].some(part =>
        typeof part !== 'string' || !part.trim()) ||
      !Array.isArray(provenance.warnings) || !provenance.warnings.length ||
      provenance.warnings.some(warning => typeof warning !== 'string' || !warning.trim() || !value.limits.includes(warning)))
    return false;
  const source = `${provenance.provider}@${provenance.providerVersion};${provenance.algorithmVersion};${careerCompassContract.version}`;
  const display = `Meio do Céu: ${zodiacPosition(angles.midheaven).display}`;
  return value.facts.some(fact => fact.id === 'angle-midheaven' && fact.kind === 'calculated' &&
      fact.display === display && fact.source === source) &&
    value.facts.every(fact => fact.id === 'angle-midheaven' ||
      (fact.id === 'personal-context' && fact.kind === 'reported' && fact.source === 'input.context'));
}

export function createPurposeCalculators(provider: EphemerisProvider = new CaelusEphemerisProvider()): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async (value, {signal}) => {
    signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (!input?.birth || input.productId !== 'career-compass') throw new ProcessingError('input_invalid');
    const chart = await calculateValidatedChart(provider, input.birth, signal);
    const midheaven = chart.houses.midheaven;
    const source = `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${careerCompassContract.version}`;
    const facts: CalculationSnapshot['facts'] = [{id:'angle-midheaven',kind:'calculated',
      display:`Meio do Céu: ${zodiacPosition(midheaven).display}`,source}];
    if (input.context) facts.push({id:'personal-context',kind:'reported',display:input.context,source:'input.context'});
    return {
      version:careerCompassContract.version,kind:'purpose',status:'experimental',facts,
      data:{productId:input.productId,positions:[],angles:{ascendant:null,midheaven},
        houses:{system:'placidus',status:'not-requested',cusps:[]},
        provenance:structuredClone(chart.provenance),projection:careerCompassContract},
      limits:[...chart.provenance.warnings,
        'Somente signo e grau experimentais do Meio do Céu; casas decimais de exibição não garantem precisão nem homologação.',
        'Ascendente, casas, regências e aspectos não foram projetados; nenhum sistema substituto foi usado.',
        'Direção pública, ambientes, tensões e perguntas práticas dependem de interpretação editorial aprovada; não foram produzidos.',
        'Carreira não se reduz a um signo: formação, território, classe, saúde, oportunidade e escolha precisam ser considerados.',
        'Sem prescrição de profissão ou promessa de emprego, renda, prosperidade financeira ou destino.']
    };
  };
  return Object.freeze({'career-compass':calculate});
}
