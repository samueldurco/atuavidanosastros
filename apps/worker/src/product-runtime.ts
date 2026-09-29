import { workflows } from "@atv/domain";
import { createNatalCalculators } from "./natal-calculators.ts";
import { createSymbolicCalculators } from "./symbolic-calculators.ts";
import { createContextCalculators } from "./context-calculators.ts";
import { createPurposeCalculators } from "./purpose-calculators.ts";
import { createSynastryCalculators } from "./synastry-calculators.ts";
import { createCoupleDossierCalculators } from "./couple-dossier-calculators.ts";
import { createHoroscopeCalculators } from "./horoscope-calculators.ts";
import { createWeekReadingCalculators } from "./week-reading-calculators.ts";
import { createWeekTransitCalculators } from "./week-transit-calculators.ts";
import { createWeekTemporalCalculators } from "./week-temporal-calculators.ts";
import type { AspectPolicy } from "@atv/astrology";
import {
  createWorkflowRepository,
  processNextProductRun,
  type WorkflowRpc,
  type ProcessingEvent,
} from "./product-processing.ts";

/** Calculation availability is not entitlement, release or editorial/motor approval. */
export interface ProductCalculationOptions {
  /** Internal experimental composition only; never sourced from a request or inferred as approval. */
  experimentalSynastryPolicy?: AspectPolicy;
  /** Independent opt-in for the Dossier; a Synastry policy never registers this product. */
  experimentalCoupleDossierPolicy?: AspectPolicy;
  /** Independent Horoscope opt-in; relationship policies never register this product. */
  experimentalHoroscopePolicy?: AspectPolicy;
  /** Independent seven-sample base only; does not authorize aspects or release. */
  experimentalWeekBase?: true;
  /** Independent nominal transit-series opt-in with an explicit unapproved policy. */
  experimentalWeekTransitPolicy?: AspectPolicy;
  /** Independent bounded temporal-search opt-in; policy and engine remain unapproved. */
  experimentalWeekTemporalPolicy?: AspectPolicy;
}
export function createProductCalculators(
  options: ProductCalculationOptions = {},
) {
  if (
    options.experimentalWeekBase !== undefined &&
    options.experimentalWeekBase !== true
  )
    throw new Error("invalid_product_configuration");
  if (
    Number(options.experimentalWeekBase === true) +
      Number(options.experimentalWeekTransitPolicy !== undefined) +
      Number(options.experimentalWeekTemporalPolicy !== undefined) >
    1
  )
    throw new Error("invalid_product_configuration");
  return Object.freeze({
    ...createNatalCalculators(),
    ...createSymbolicCalculators(),
    ...createContextCalculators(),
    ...createPurposeCalculators(),
    ...(options.experimentalSynastryPolicy === undefined
      ? {}
      : createSynastryCalculators(options.experimentalSynastryPolicy)),
    ...(options.experimentalCoupleDossierPolicy === undefined
      ? {}
      : createCoupleDossierCalculators(
          options.experimentalCoupleDossierPolicy,
        )),
    ...(options.experimentalHoroscopePolicy === undefined
      ? {}
      : createHoroscopeCalculators(options.experimentalHoroscopePolicy)),
    ...(options.experimentalWeekBase === true
      ? createWeekReadingCalculators()
      : {}),
    ...(options.experimentalWeekTransitPolicy === undefined
      ? {}
      : createWeekTransitCalculators(options.experimentalWeekTransitPolicy)),
    ...(options.experimentalWeekTemporalPolicy === undefined
      ? {}
      : createWeekTemporalCalculators(options.experimentalWeekTemporalPolicy)),
  });
}

export function productCalculationCoverage() {
  const calculators = createProductCalculators();
  return workflows.map((product) =>
    Object.freeze({
      productId: product.id,
      universe: product.universe,
      kind: product.kind,
      calculation: Object.hasOwn(calculators, product.id)
        ? "partial-base"
        : "unavailable",
      publication: "blocked",
    } as const),
  );
}

/** Server-owned configuration only. One bounded step, no drain loop or scheduled/network side effect.
 * Even configured products must pass the database release/contract and ownership gates.
 * RPC transport/authentication/deadline enforcement belongs to the hosting integration. */
export function createProductProcessor(
  rpc: WorkflowRpc,
  options: ProductCalculationOptions & {
    enabledProducts?: readonly string[];
    timeoutMs?: number;
    emit?: (event: ProcessingEvent) => void;
  } = {},
) {
  const all = createProductCalculators(options),
    requested = options.enabledProducts ?? [],
    timeoutMs = options.timeoutMs ?? 20000;
  if (
    !Array.isArray(requested) ||
    requested.length > Object.keys(all).length ||
    new Set(requested).size !== requested.length ||
    requested.some((id) => typeof id !== "string" || !Object.hasOwn(all, id))
  )
    throw new Error("invalid_product_configuration");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 25000)
    throw new Error("invalid_processing_deadline");
  if (
    typeof rpc !== "function" ||
    (options.emit !== undefined && typeof options.emit !== "function")
  )
    throw new Error("invalid_product_configuration");
  const selected = Object.freeze(
    Object.fromEntries(requested.map((id) => [id, all[id]])),
  );
  const repository = createWorkflowRepository(rpc),
    emit = options.emit;
  return Object.freeze({
    products: Object.freeze(Object.keys(selected)),
    // Capture configuration now; mutations to the caller's options never broaden later claims.
    step: () =>
      processNextProductRun(repository, selected, {
        timeoutMs,
        ...(emit ? { emit } : {}),
      }),
  });
}
