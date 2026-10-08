import {
  bodies,
  CaelusEphemerisProvider,
  type EphemerisProvider,
} from "@atv/astrology";
import { validDate } from "@atv/domain";

export const SOLAR_YEAR_SAMPLES_VERSION = "atv-solar-year-daily-samples/1.0.0";
export type SolarYearSamples = {
  version: typeof SOLAR_YEAR_SAMPLES_VERSION;
  startDate: string;
  endDateExclusive: string;
  cadence: "one-observation-per-UTC-date-at-noon";
  bodies: string[];
  source: string;
  rows: number[][];
};
const dayMs = 86400000;

/** A finite daily grid, not a continuous search or twelve repetitions of the return chart. */
export async function calculateSolarYearSamples(
  startDate: string,
  endDateExclusive: string,
  signal: AbortSignal,
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Promise<SolarYearSamples> {
  const first = Date.parse(`${startDate}T12:00:00.000Z`),
    end = Date.parse(`${endDateExclusive}T12:00:00.000Z`);
  const count = (end - first) / dayMs;
  if (
    !validDate(startDate) ||
    !validDate(endDateExclusive) ||
    !Number.isInteger(count) ||
    count < 365 ||
    count > 366 ||
    startDate < "1900-01-01" ||
    endDateExclusive > "2100-01-01"
  )
    throw new Error("O ciclo completo precisa estar entre 1900 e 2099.");
  const rows: number[][] = [];
  let source = "";
  for (let index = 0; index < count; index++) {
    signal.throwIfAborted();
    const at = first + index * dayMs,
      utcInstant = new Date(at).toISOString();
    const chart = await provider.calculate({
      localDateTime: utcInstant.slice(0, -1),
      utcInstant,
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
      locationSource: "internal-geocentric-reference/no-local-houses",
    });
    signal.throwIfAborted();
    const row = [
      at,
      ...bodies.map(
        (body) =>
          chart.positions.find((p) => p.body === body)?.longitude ?? NaN,
      ),
    ];
    if (row.slice(1).some((n) => !Number.isFinite(n) || n < 0 || n >= 360))
      throw new Error("Observação anual inválida.");
    const currentSource = `${chart.provenance.provider}/${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${SOLAR_YEAR_SAMPLES_VERSION}`;
    if (source && source !== currentSource)
      throw new Error("Fonte anual divergente.");
    source = currentSource;
    rows.push(row);
  }
  return {
    version: SOLAR_YEAR_SAMPLES_VERSION,
    startDate,
    endDateExclusive,
    cadence: "one-observation-per-UTC-date-at-noon",
    bodies: [...bodies],
    source,
    rows,
  };
}

export function assertSolarYearSamples(
  value: SolarYearSamples,
  start: string,
  end: string,
) {
  const first = Date.parse(`${start}T12:00:00.000Z`),
    count = (Date.parse(`${end}T12:00:00.000Z`) - first) / dayMs;
  if (
    !validDate(start) ||
    !validDate(end) ||
    start < "1900-01-01" ||
    !value ||
    value.version !== SOLAR_YEAR_SAMPLES_VERSION ||
    value.startDate !== start ||
    value.endDateExclusive !== end ||
    value.cadence !== "one-observation-per-UTC-date-at-noon" ||
    !Array.isArray(value.bodies) ||
    value.bodies.join("|") !== bodies.join("|") ||
    typeof value.source !== "string" ||
    !value.source.endsWith(SOLAR_YEAR_SAMPLES_VERSION) ||
    count < 365 ||
    count > 366 ||
    !Number.isInteger(count) ||
    !Array.isArray(value.rows) ||
    value.rows.length !== count ||
    end > "2100-01-01" ||
    value.rows.some(
      (row, i) =>
        !Array.isArray(row) ||
        row.length !== 11 ||
        row[0] !== first + i * dayMs ||
        row
          .slice(1)
          .some(
            (n) =>
              typeof n !== "number" || !Number.isFinite(n) || n < 0 || n >= 360,
          ),
    )
  )
    throw new Error("Grade anual divergente.");
}
