import {
  bodies, calculateAspects, CaelusEphemerisProvider, engineContract,
  type AspectPolicy, type CelestialBody, type EphemerisProvider, type NatalChart,
} from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { bodyLabels, calculateValidatedChart, zodiacPosition } from './natal-calculators.ts';
import { ProcessingError, type ProductCalculator } from './product-processing.ts';

/** Isolated evidence candidate. It is intentionally absent from the public calculator registry. */
export const CAREER_COMPASS_FULL_BASIS_VERSION = 'atv-career-compass-full-basis/1.0.1';
export const careerCompassFullAspectPolicy: AspectPolicy = Object.freeze({
  id: 'atv-compass-major-aspects', version: '1.0.0',
  aspects: Object.freeze([
    {kind:'conjunction',orbDegrees:6}, {kind:'sextile',orbDegrees:4},
    {kind:'square',orbDegrees:6}, {kind:'trine',orbDegrees:6},
    {kind:'opposition',orbDegrees:6},
  ] as const),
});
export const careerCompassFullBasisContract = Object.freeze({
  version: CAREER_COMPASS_FULL_BASIS_VERSION,
  zodiac: 'tropical', rulership: 'modern', houseSystem: 'placidus',
  houseMembership: 'cyclic-half-open-start-inclusive',
  aspectPolicy: careerCompassFullAspectPolicy,
  angularOrbDegrees: 3,
  interpretation: 'not-produced', publication: 'blocked', status: 'experimental',
});

const modernRulers: readonly CelestialBody[] = [
  'mars','venus','mercury','moon','sun','mercury','venus','pluto',
  'jupiter','saturn','uranus','neptune',
];
const aspectLabels = {
  conjunction:'conjunção', sextile:'sextil', square:'quadratura',
  trine:'trígono', opposition:'oposição',
} as const;
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([,part]) => part !== undefined)
        .sort(([a],[b]) => a.localeCompare(b)).map(([key,part]) => [key,canonical(part)]))
    : value;
const themeBodies = (ruler: CelestialBody) => ({
  contribution: ['sun', ruler],
  motivation: ['sun', 'moon', 'venus'],
  environment: ['moon', 'mercury', 'saturn'],
  'working-style': ['mercury', 'mars', 'sun'],
  sustainability: ['jupiter', 'saturn', 'mars'],
} as const);

export function careerCompassHouseAt(longitude: number, cusps: readonly number[]): number | null {
  if (cusps.length !== 12) return null;
  const index = cusps.findIndex((start, i) =>
    (longitude - start + 360) % 360 < (cusps[(i + 1) % 12]! - start + 360) % 360);
  return index < 0 ? null : index + 1;
}

function project(input: WorkflowInput, chart: NatalChart): CalculationSnapshot {
  const housesAvailable = chart.houses.status === 'ok' &&
    Math.abs(input.birth!.latitude) < engineContract.placidusAbsoluteLatitudeExclusive;
  const mc = chart.houses.midheaven;
  const ruler = modernRulers[Math.floor(mc / 30)]!;
  const rulerPosition = chart.positions.find(p => p.body === ruler)!;
  const cusps = housesAvailable ? [...chart.houses.cusps] : [];
  const rulerHouse = careerCompassHouseAt(rulerPosition.longitude, cusps);
  const aspects = calculateAspects(chart.positions, careerCompassFullAspectPolicy);
  const angular = chart.positions.flatMap(p => {
    const difference = Math.abs(p.longitude - mc);
    const orbDegrees = Math.min(difference, 360 - difference);
    return orbDegrees <= careerCompassFullBasisContract.angularOrbDegrees
      ? [{body:p.body,orbDegrees,factId:`compass-mc-${p.body}`}] : [];
  });
  const source = `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${CAREER_COMPASS_FULL_BASIS_VERSION}`;
  const methodSource = CAREER_COMPASS_FULL_BASIS_VERSION;
  const facts: CalculationSnapshot['facts'] = chart.positions.map(p => ({
    id:`position-${p.body}`, kind:'calculated',
    display:`${bodyLabels[p.body]}: ${zodiacPosition(p.longitude).display}; movimento ${p.retrograde ? 'retrógrado' : 'direto'} registrado`, source,
  }));
  facts.push(housesAvailable
    ? {id:'angle-ascendant',kind:'calculated',display:`Ascendente: ${zodiacPosition(chart.houses.ascendant).display}`,source}
    : {id:'ascendant-unavailable',kind:'calculated',display:'Ascendente não disponibilizado: condições fora do contrato conservador de casas/ângulos.',source});
  facts.push({id:'angle-midheaven',kind:'calculated',display:`Meio do Céu: ${zodiacPosition(mc).display}`,source});
  cusps.forEach((cusp, index) => facts.push({id:`house-${index+1}`,kind:'calculated',
    display:`Cúspide ${index+1} (Placidus): ${zodiacPosition(cusp).display}`,source}));
  if (input.context) facts.push({id:'personal-context',kind:'reported',display:input.context,source:'input.context'});
  facts.push({id:'career-mc-ruler',kind:'calculated',display:`Regente moderno do Meio do Céu: ${bodyLabels[ruler]}`,source:methodSource});
  facts.push({id:'compass-ruler-house',kind:'calculated',
    display:`${bodyLabels[ruler]}, regente do MC: ${rulerHouse === null ? 'casa indisponível' : `casa ${rulerHouse}`}`,source:methodSource});
  aspects.aspects.forEach((a,index) => facts.push({id:`career-aspect-${index}`,kind:'calculated',
    display:`${bodyLabels[a.first]} — ${bodyLabels[a.second]}: ${aspectLabels[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
    source:`${aspects.algorithmVersion};${careerCompassFullAspectPolicy.id}@${careerCompassFullAspectPolicy.version}`}));
  angular.forEach(a => facts.push({id:a.factId,kind:'calculated',
    display:`${bodyLabels[a.body]} junto ao Meio do Céu; distância em longitude ${a.orbDegrees.toFixed(3)}°`,source:methodSource}));

  const evidencePlan = Object.entries(themeBodies(ruler)).map(([role, involved]) => {
    const included: readonly CelestialBody[] = involved;
    return {role, factIds: [...new Set(['angle-midheaven','career-mc-ruler','compass-ruler-house',
      ...included.map(body => `position-${body}`),
      ...aspects.aspects.flatMap((aspect,index) => included.includes(aspect.first) && included.includes(aspect.second)
        ? [`career-aspect-${index}`] : []),
      ...angular.filter(contact => included.includes(contact.body)).map(contact => contact.factId),
      ...(input.context ? ['personal-context'] : [])])]};
  });
  return {
    version:CAREER_COMPASS_FULL_BASIS_VERSION, kind:'purpose',status:'experimental',facts,
    data:{productId:'career-compass',chart:structuredClone(chart),
      positions:structuredClone(chart.positions),angles:{ascendant:housesAvailable?chart.houses.ascendant:null,midheaven:mc},
      houses:{system:'placidus',status:housesAvailable?'ok':'not-applicable',cusps},
      provenance:structuredClone(chart.provenance),projection:careerCompassFullBasisContract,
      regent:{body:ruler,house:rulerHouse},aspects,angular,evidencePlan},
    limits:[...chart.provenance.warnings,
      'Base factual experimental para revisão editorial; nenhuma leitura foi produzida ou liberada.',
      'Casas Placidus e Ascendente só são usados quando disponíveis; nenhum sistema substituto é inferido.',
      'Aspectos maiores têm orbes nominais de 6°, exceto sextil de 4°; contatos ao MC até 3° em longitude. Aplicação e separação não são avaliadas.',
      'Contexto declarado é relato, não fato calculado; os cinco temas são trilhas de evidência, não conclusões profissionais.',
      'Sem prescrição de profissão, renda, contratação, aptidão ou destino. Formação, saúde, acesso e condições reais exigem investigação própria.',
    ],
  };
}

/** Trusted calculator injection only. This does not register or promote a public product. */
export function createCareerCompassFullBasisCalculator(provider: EphemerisProvider = new CaelusEphemerisProvider()): ProductCalculator {
  return async (value,{signal}) => {
    signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (!input?.birth || input.productId !== 'career-compass') throw new ProcessingError('input_invalid');
    const chart = await calculateValidatedChart(provider,input.birth,signal);
    return project(input,chart);
  };
}

/** Rebuilds every derived fact from the captured chart; coherence is not proof of provider origin. */
export function validCareerCompassFullBasis(input: WorkflowInput, value: CalculationSnapshot): boolean {
  const parsed = parseWorkflowInput(input);
  if (!parsed?.birth || parsed.productId !== 'career-compass' ||
      value.version !== CAREER_COMPASS_FULL_BASIS_VERSION || value.kind !== 'purpose' ||
      value.status !== 'experimental' || value.data.productId !== 'career-compass') return false;
  try {
    const chart = value.data.chart as NatalChart | undefined;
    if (!chart || !Array.isArray(chart.positions) || chart.positions.length !== bodies.length ||
        chart.positions.some(p => !p || !bodies.includes(p.body) || !Number.isFinite(p.longitude) || p.longitude < 0 || p.longitude >= 360) ||
        !chart.houses || !chart.provenance || chart.provenance.contract?.version !== engineContract.version ||
        Object.entries(parsed.birth).some(([key,part]) => chart.input?.[key as keyof typeof chart.input] !== part)) return false;
    if (chart.provenance.temporal?.utcInstant !== new Date(parsed.birth.utcInstant).toISOString()) return false;
    return JSON.stringify(canonical(project(parsed,chart))) === JSON.stringify(canonical(value));
  }
  catch { return false; }
}
