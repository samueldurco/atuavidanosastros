import {
  assessCrossAspectStability,
  bodies,
  calculateCrossAspects,
  CaelusEphemerisProvider,
  validateCalculationInput,
  type AspectPolicy,
  type EphemerisProvider,
  type MajorAspect,
  type NatalChart,
} from "@atv/astrology";
import { parseWorkflowInput, type CalculationSnapshot } from "@atv/domain";
import {
  bodyLabels,
  calculateValidatedChart,
  zodiacPosition,
} from "./natal-calculators.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";

export const synastryProductContract = Object.freeze({
  version: "atv-synastry-calculation/1.0.0",
  productId: "synastry",
  completeness: "partial",
  status: "experimental",
  policyApproval: "not-established",
  inputPrecision: "not-certified",
  motion: "not-evaluated",
  houses: "not-projected",
  compatibility: "not-scored",
  interpretation: "not-produced",
});

const aspectLabels: Record<MajorAspect, string> = {
  conjunction: "conjunção",
  sextile: "sextil",
  square: "quadratura",
  trine: "trígono",
  opposition: "oposição",
};

function project(chart: NatalChart, role: string, label: string) {
  const positions = bodies.map((body) => {
    const position = chart.positions.find((p) => p.body === body)!;
    const { longitude, latitude, distanceAu, retrograde } = position;
    return { body, longitude, latitude, distanceAu, retrograde };
  });
  const source = `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${synastryProductContract.version}`;
  const facts: CalculationSnapshot["facts"] = positions.map((p) => ({
    id: `${role}-${p.body}`,
    kind: "calculated",
    display: `${label} · ${bodyLabels[p.body]}: ${zodiacPosition(p.longitude).display}`,
    source,
  }));
  return {
    facts,
    data: { role, positions, provenance: structuredClone(chart.provenance) },
  };
}

/** Internal, explicitly configured computation. No editorial policy default or runtime registration. */
export function createSynastryCalculators(
  policy: AspectPolicy,
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Readonly<Record<string, ProductCalculator>> {
  // Validate and detach operator configuration before any asynchronous work. Client input cannot set it.
  const capturedPolicy = calculateCrossAspects([], [], policy).policy;
  const calculate: ProductCalculator = async (value, { signal }) => {
    signal.throwIfAborted();
    const parsed = parseWorkflowInput(value);
    if (!parsed?.birth || !parsed.partner || parsed.productId !== "synastry") {
      throw new ProcessingError("input_invalid");
    }
    const input = structuredClone(parsed);
    const birth = input.birth!,
      partner = input.partner!;
    try {
      validateCalculationInput(birth);
      validateCalculationInput(partner);
    } catch {
      throw new ProcessingError("input_invalid");
    }
    const firstChart = await calculateValidatedChart(provider, birth, signal);
    const secondChart = await calculateValidatedChart(
      provider,
      partner,
      signal,
    );
    signal.throwIfAborted();
    const first = project(firstChart, "person-a", "Pessoa A");
    const second = project(secondChart, "person-b", "Pessoa B");
    // The checked natal boundary requires tropical apparent geocentric ecliptic coordinates for both.
    // No measured longitude error bound is available, so every pair retains unknown accuracy.
    const stability = assessCrossAspectStability(
      first.data.positions,
      second.data.positions,
      capturedPolicy,
      { first: null, second: null },
    );
    const geometry = stability.calculation;
    const source = `${geometry.algorithmVersion};${stability.algorithmVersion};${capturedPolicy.id}@${capturedPolicy.version};${synastryProductContract.version}`;
    const facts: CalculationSnapshot["facts"] = [
      ...first.facts,
      ...second.facts,
    ];
    // All 100 directed pairs become traceable facts, including nominal absence. No top-N selection.
    for (const pair of stability.pairs) {
      const a = first.data.positions.find((p) => p.body === pair.first)!;
      const b = second.data.positions.find((p) => p.body === pair.second)!;
      const difference = Math.abs(a.longitude - b.longitude);
      const separation = Math.min(difference, 360 - difference);
      const aspect = geometry.aspects.find(
        (p) => p.first === pair.first && p.second === pair.second,
      );
      facts.push({
        id: `cross-${pair.first}-${pair.second}`,
        kind: "calculated",
        display:
          `Pessoa A · ${bodyLabels[pair.first]} / Pessoa B · ${bodyLabels[pair.second]}: separação nominal ${separation.toFixed(6)}°; ` +
          (aspect
            ? `${aspectLabels[aspect.kind]}, desvio nominal ${aspect.orbDegrees.toFixed(6)}°.`
            : "nenhum aspecto da política dentro do orbe nominal.") +
          " Precisão não certificada; estabilidade desconhecida.",
        source,
      });
    }
    if (input.context)
      facts.push({
        id: "personal-context",
        kind: "reported",
        display: input.context,
        source: "input.context",
      });
    const snapshot: CalculationSnapshot = {
      version: synastryProductContract.version,
      kind: "relationship",
      status: "experimental",
      facts,
      data: {
        productId: "synastry",
        projection: synastryProductContract,
        first: first.data,
        second: second.data,
        crossAspectStability: stability,
        consent: {
          storage: true,
          partner: true,
          policyVersion: input.consent.policyVersion,
        },
        sharing: "not-authorized",
        compatibilityScore: null,
        events: [],
      },
      limits: [
        ...new Set([
          ...firstChart.provenance.warnings,
          ...secondChart.provenance.warnings,
        ]),
        "Base parcial experimental, sem homologação do motor, interpretação ou liberação do produto.",
        "Política de aspectos explicitamente injetada; sua aprovação editorial não foi estabelecida por este cálculo.",
        "Aspectos e ausências são nominais; a precisão das duas bases não foi certificada e os cem pares têm estabilidade desconhecida.",
        "Casas, ângulos, aplicação/separação e eventos exatos não foram projetados.",
        "Aspectos entre mapas não calculam score de compatibilidade, sentimentos, gênero, comportamento ou destino da relação.",
        "Consentimento registrado para dados do par não autoriza compartilhar a leitura; identidade e autorização bilateral não foram verificadas.",
      ],
    };
    const checked = validateCalculation(snapshot, "synastry");
    if (!checked) throw new ProcessingError("calculation_invalid");
    return checked;
  };
  return Object.freeze({ synastry: calculate });
}
