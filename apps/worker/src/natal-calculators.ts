import { bodies, CaelusEphemerisProvider, engineContract, validateCalculationInput,
  type CelestialBody, type EphemerisProvider, type NatalChart } from '@atv/astrology';
import { parseWorkflowInput, type BirthInput, type CalculationSnapshot } from '@atv/domain';
import { ProcessingError, type ProductCalculator } from './product-processing.ts';

export const natalProductContract = Object.freeze({
  version: 'atv-natal-product-calculation/1.0.0',
  products: Object.freeze(['birth-chart', 'three-pillars', 'ascendant', 'midheaven']),
  zodiac: 'tropical', presentation: 'zodiac-half-open-sectors/truncated-6-decimals/1',
  aspects: 'not-assessed', interpretation: 'not-produced', status: 'experimental'
});
export const bodyLabels: Readonly<Record<CelestialBody, string>> = Object.freeze({sun:'Sol',moon:'Lua',mercury:'Mercúrio',venus:'Vênus',
  mars:'Marte',jupiter:'Júpiter',saturn:'Saturno',uranus:'Urano',neptune:'Netuno',pluto:'Plutão'});
const signs = ['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'];
const angle = (v: number) => Number.isFinite(v) && v >= 0 && v < 360;

/** Sign sectors are half-open [n*30, (n+1)*30). Display precision is not an accuracy claim. */
export function zodiacPosition(longitude: number): { sign: string; signIndex: number; degrees: number; display: string } {
  if (!angle(longitude)) throw new ProcessingError('calculation_invalid');
  const signIndex = Math.floor(longitude / 30), degrees = longitude - signIndex * 30;
  return { sign: signs[signIndex]!, signIndex, degrees,
    display: `${(Math.floor(degrees * 1e6) / 1e6).toFixed(6)}° de ${signs[signIndex]}` };
}

function validateChart(chart: NatalChart): void {
  if (!chart || !Array.isArray(chart.positions) || chart.positions.length !== bodies.length ||
      new Set(chart.positions.map(p=>p.body)).size !== bodies.length ||
      chart.positions.some(p=>!bodies.includes(p.body) || !angle(p.longitude) || !Number.isFinite(p.latitude) ||
        Math.abs(p.latitude)>90 || !Number.isFinite(p.distanceAu) || p.distanceAu<=0 || typeof p.retrograde!=='boolean') ||
      !chart.houses || chart.houses.system!=='placidus' || !angle(chart.houses.ascendant) || !angle(chart.houses.midheaven) ||
      !Array.isArray(chart.houses.cusps) || !['ok','not-applicable'].includes(chart.houses.status) ||
      (chart.houses.status==='ok' ? chart.houses.cusps.length!==12 || chart.houses.cusps.some(v=>!angle(v)) : chart.houses.cusps.length!==0) ||
      chart.provenance?.accuracyStatus!=='experimental' || chart.provenance.contract?.version!==engineContract.version ||
      chart.provenance.contract.productionPromotion!==false || chart.provenance.zodiac!=='tropical' ||
      chart.provenance.referenceFrame!=='geocentric-apparent-ecliptic-of-date')
    throw new ProcessingError('calculation_invalid');
}

/** Shared checked boundary for product projections. Aborting fences output, not synchronous CPU work. */
export async function calculateValidatedChart(provider: EphemerisProvider, input: BirthInput, signal: AbortSignal): Promise<NatalChart> {
  signal.throwIfAborted();
  try { validateCalculationInput(input); } catch { throw new ProcessingError('input_invalid'); }
  let chart: NatalChart;
  try { chart = await provider.calculate({...input}); }
  catch (error) { if(error instanceof TypeError || error instanceof RangeError) throw new ProcessingError('calculation_invalid'); throw error; }
  signal.throwIfAborted();
  validateChart(chart);
  if (!chart.input || Object.entries(input).some(([key,value])=>chart.input[key as keyof typeof chart.input]!==value) ||
      chart.provenance.temporal.utcInstant!==new Date(input.utcInstant).toISOString()) throw new ProcessingError('calculation_invalid');
  return structuredClone(chart);
}

/** Trusted internal provider injection, never client supplied. Does not enable a release or infer a reading. */
export function createNatalCalculators(provider: EphemerisProvider = new CaelusEphemerisProvider()): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async (value, {signal}) => {
    signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (!input?.birth || !natalProductContract.products.includes(input.productId)) throw new ProcessingError('input_invalid');
    const chart = await calculateValidatedChart(provider, input.birth, signal);
    const full = input.productId==='birth-chart', pillars = input.productId==='three-pillars';
    const asc = full || pillars || input.productId==='ascendant', mc = full || input.productId==='midheaven';
    const housesAvailable = chart.houses.status==='ok' && Math.abs(input.birth.latitude)<engineContract.placidusAbsoluteLatitudeExclusive;
    const selected = chart.positions.filter(p=>full || (pillars && (p.body==='sun' || p.body==='moon')));
    const source = `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${natalProductContract.version}`;
    const facts: CalculationSnapshot['facts'] = selected.map(p=>({id:`position-${p.body}`,kind:'calculated',
      display:`${bodyLabels[p.body]}: ${zodiacPosition(p.longitude).display}; movimento ${p.retrograde?'retrógrado':'direto'} da candidata`,source}));
    if (asc) facts.push(housesAvailable ? {id:'angle-ascendant',kind:'calculated',display:`Ascendente: ${zodiacPosition(chart.houses.ascendant).display}`,source} :
      {id:'ascendant-unavailable',kind:'calculated',display:'Ascendente não disponibilizado: condições fora do contrato conservador de casas/ângulos.',source});
    if (mc) facts.push({id:'angle-midheaven',kind:'calculated',display:`Meio do Céu: ${zodiacPosition(chart.houses.midheaven).display}`,source});
    if (full && housesAvailable) chart.houses.cusps.forEach((cusp,index)=>facts.push({id:`house-${index+1}`,kind:'calculated',
      display:`Cúspide ${index+1} (Placidus): ${zodiacPosition(cusp).display}`,source}));
    if (input.context) facts.push({id:'personal-context',kind:'reported',display:input.context,source:'input.context'});
    const snapshot: CalculationSnapshot = {
      version:natalProductContract.version,kind:input.productId==='midheaven'?'purpose':'natal',status:'experimental',facts,
      data:{productId:input.productId,positions:structuredClone(selected),
        angles:{ascendant:asc && housesAvailable?chart.houses.ascendant:null,midheaven:mc?chart.houses.midheaven:null},
        houses:{system:'placidus',status:full?(housesAvailable?'ok':'not-applicable'):'not-requested',cusps:full && housesAvailable?[...chart.houses.cusps]:[]},
        provenance:structuredClone(chart.provenance),projection:natalProductContract},
      limits:[...chart.provenance.warnings,
        'Posições e signos são fatos experimentais, não uma interpretação ou homologação. Casas decimais de exibição não garantem precisão.',
        'Aspectos, síntese interpretativa, profissões e promessas de prosperidade não foram produzidos.',
        ...(!housesAvailable?['Placidus e Ascendente não disponibilizados; nenhum sistema substituto foi usado. Meio do Céu, quando solicitado, é calculado separadamente e permanece experimental.']:[])]
    };
    return snapshot;
  };
  return Object.freeze(Object.fromEntries(natalProductContract.products.map(product=>[product,calculate])));
}
