import { CaelusEphemerisProvider, type EphemerisProvider } from '@atv/astrology';
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
