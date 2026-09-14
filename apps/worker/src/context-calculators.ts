import { bodies, CaelusEphemerisProvider, validateCalculationInput,
  type CelestialBody, type EphemerisProvider, type NatalChart } from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot } from '@atv/domain';
import { ProcessingError, type ProductCalculator } from './product-processing.ts';
import { bodyLabels, calculateValidatedChart, zodiacPosition } from './natal-calculators.ts';

export const contextProductContract = Object.freeze({
  version: 'atv-context-product-calculation/1.0.0',
  products: Object.freeze(['pair-preview', 'date-reading']),
  pairBodies: Object.freeze(['moon', 'venus', 'mars'] as const),
  dateSampling: 'one-instant-at-12:00:00Z/not-local-day/not-event-search',
  completeness: 'partial', aspects: 'not-assessed', houses: 'not-projected',
  compatibility: 'not-scored', interpretation: 'not-produced', status: 'experimental'
});

function project(chart: NatalChart, selected: readonly CelestialBody[], role: string, label: string) {
  // Canonical body order, no raw birth input or inferred identity/gender in the projection.
  const positions = bodies.filter(body=>selected.includes(body)).map(body=>chart.positions.find(p=>p.body===body)!);
  const source = `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${contextProductContract.version}`;
  const facts: CalculationSnapshot['facts'] = positions.map(p=>({id:`${role}-${p.body}`,kind:'calculated',
    display:`${label} · ${bodyLabels[p.body]}: ${zodiacPosition(p.longitude).display}`,source}));
  return {facts,data:{role,positions:structuredClone(positions),provenance:structuredClone(chart.provenance)}};
}

/** Internal computation only. Consent to store a partner's input is NOT consent to share a reading. */
export function createContextCalculators(provider: EphemerisProvider = new CaelusEphemerisProvider()): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async(value,{signal})=>{
    signal.throwIfAborted();
    const input=parseWorkflowInput(value);
    if(!input?.birth || !contextProductContract.products.includes(input.productId)) throw new ProcessingError('input_invalid');
    const pair=input.productId==='pair-preview';
    // A date-only input cannot authorize local-day timing or a relocated chart. This explicit UTC
    // sample is a partial basis only; no current timezone, noon-at-birthplace or event is inferred.
    const second=pair?input.partner!:{localDateTime:`${input.targetDate}T12:00:00`,utcInstant:`${input.targetDate}T12:00:00Z`,
      timezone:'UTC',latitude:0,longitude:0,locationSource:'internal-geocentric-reference/no-local-houses'};
    // Validate BOTH records before any provider work; invalid partner data never yields a single-person substitute.
    try { validateCalculationInput(input.birth); validateCalculationInput(second); }
    catch { throw new ProcessingError('input_invalid'); }
    const firstChart=await calculateValidatedChart(provider,input.birth,signal);
    const secondChart=await calculateValidatedChart(provider,second,signal);
    signal.throwIfAborted();
    const selected=pair?contextProductContract.pairBodies:bodies;
    const first=project(firstChart,selected,pair?'person-a':'natal',pair?'Pessoa A':'Base natal');
    const next=project(secondChart,selected,pair?'person-b':'sample',pair?'Pessoa B':'Amostra da data (12:00 UTC)');
    const facts: CalculationSnapshot['facts']=[...first.facts,...next.facts];
    if(!pair) facts.push({id:'sample-instant',kind:'calculated',display:`Amostra única em ${secondChart.provenance.temporal.utcInstant}; não representa o dia local inteiro.`,source:contextProductContract.version});
    if(input.context) facts.push({id:'personal-context',kind:'reported',display:input.context,source:'input.context'});
    return {
      version:contextProductContract.version,kind:pair?'relationship':'cycles',status:'experimental',facts,
      data:{productId:input.productId,projection:contextProductContract,first:first.data,second:next.data,
        sampleInstant:pair?null:secondChart.provenance.temporal.utcInstant,
        targetDate:pair?null:input.targetDate,sharing:'not-authorized',aspects:[],events:[],compatibilityScore:null},
      limits:[...new Set([...firstChart.provenance.warnings,...secondChart.provenance.warnings]),
        'Base parcial experimental, sem homologação do motor, interpretação ou liberação do produto.',
        'Casas, ângulos, aspectos entre mapas, aplicação/separação e eventos exatos não foram projetados.',
        ...(pair?[
          'Lua, Vênus e Marte de A e B são posições separadas; não estabelecem compatibilidade, sentimentos, gênero ou destino da relação.',
          'Consentimento registrado para dados do par não autoriza compartilhar a leitura; identidade e autorização bilateral não foram verificadas.'
        ]:[
          'A data foi amostrada somente às 12:00 UTC. Não é meio-dia local, cobertura do dia, janela favorável, previsão ou busca de trânsito exato.',
          'Fuso/local atuais não foram inferidos do nascimento. Semana, calendário e Revolução Solar não foram calculados.'
        ])]
    } satisfies CalculationSnapshot;
  };
  return Object.freeze(Object.fromEntries(contextProductContract.products.map(product=>[product,calculate])));
}
