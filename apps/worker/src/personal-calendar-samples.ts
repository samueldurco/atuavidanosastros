import {
  bodies,
  CaelusEphemerisProvider,
  type EphemerisProvider,
  type CalculationProvenance,
} from "@atv/astrology";
import { validDate } from "@atv/domain";

export const CALENDAR_SAMPLES_VERSION =
  "atv-personal-calendar-six-hour-samples/1.0.0";
export type CalendarSamples = {
  version: typeof CALENDAR_SAMPLES_VERSION;
  startDate: string;
  endDateExclusive: string;
  stepHours: 6;
  timezone: "UTC";
  bodies: string[];
  source: string;
  license: "caelus@0.24.1/MIT";
  provenance: CalculationProvenance;
  inputTemplate: {
    timezone: "UTC";
    latitude: 0;
    longitude: 0;
    locationSource: string;
  };
  rows: number[][];
};
const step = 21_600_000;
const identity = (p: CalculationProvenance) =>
  JSON.stringify({
    provider: p.provider,
    providerVersion: p.providerVersion,
    algorithmVersion: p.algorithmVersion,
    zodiac: p.zodiac,
    referenceFrame: p.referenceFrame,
    dataManifest: p.dataManifest,
    contract: p.contract,
    accuracyStatus: p.accuracyStatus,
  });
export function calendarBounds(start: string) {
  if (
    !validDate(start) ||
    !start.endsWith("-01") ||
    start < "1900-01-01" ||
    start > "2099-12-01"
  )
    throw Error(
      "O calendário exige o primeiro dia de um mês entre 1900 e 2099.",
    );
  const d = new Date(`${start}T00:00:00.000Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
}
export async function calculateCalendarSamples(
  startDate: string,
  signal: AbortSignal,
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Promise<CalendarSamples> {
  const endDateExclusive = calendarBounds(startDate),
    first = Date.parse(startDate + "T00:00:00.000Z"),
    end = Date.parse(endDateExclusive + "T00:00:00.000Z");
  const rows: number[][] = [],
    inputTemplate = {
      timezone: "UTC" as const,
      latitude: 0 as const,
      longitude: 0 as const,
      locationSource: "internal-geocentric-reference/no-local-houses",
    };
  let provenance: CalculationProvenance | undefined,
    source = "";
  // The next month's midnight is a boundary, not a calculation outside the engine domain.
  for (let at = first; at < end; at += step) {
    signal.throwIfAborted();
    const utcInstant = new Date(at).toISOString();
    const chart = await provider.calculate({
      ...inputTemplate,
      localDateTime: utcInstant.slice(0, -1),
      utcInstant,
    });
    signal.throwIfAborted();
    const current = `${chart.provenance.provider}/${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${CALENDAR_SAMPLES_VERSION}`;
    if (
      chart.provenance.temporal.utcInstant !== utcInstant ||
      (provenance && identity(provenance) !== identity(chart.provenance)) ||
      (source && current !== source)
    )
      throw Error("Origem ou instante temporal mudou durante o cálculo.");
    source = current;
    provenance ??= structuredClone(chart.provenance);
    const row = [
      at,
      ...bodies.map(
        (b) => chart.positions.find((p) => p.body === b)?.longitude ?? NaN,
      ),
    ];
    if (row.slice(1).some((n) => !Number.isFinite(n) || n < 0 || n >= 360))
      throw Error("Observação diária inválida.");
    rows.push(row);
  }
  const result: CalendarSamples = {
    version: CALENDAR_SAMPLES_VERSION,
    startDate,
    endDateExclusive,
    stepHours: 6,
    timezone: "UTC",
    bodies: [...bodies],
    source,
    license: "caelus@0.24.1/MIT",
    provenance: provenance!,
    inputTemplate,
    rows,
  };
  assertCalendarSamples(result, startDate);
  return result;
}
export function assertCalendarSamples(value: CalendarSamples, start: string) {
  const end = calendarBounds(start),
    first = Date.parse(start + "T00:00:00.000Z"),
    count = (Date.parse(end + "T00:00:00.000Z") - first) / step;
  if (
    !value ||
    value.version !== CALENDAR_SAMPLES_VERSION ||
    value.startDate !== start ||
    value.endDateExclusive !== end ||
    value.stepHours !== 6 ||
    value.timezone !== "UTC" ||
    value.license !== "caelus@0.24.1/MIT" ||
    !Array.isArray(value.bodies) ||
    value.bodies.join("|") !== bodies.join("|") ||
    !value.provenance ||
    value.provenance.temporal?.utcInstant !== new Date(first).toISOString() ||
    value.source !==
      `${value.provenance.provider}/${value.provenance.providerVersion};${value.provenance.algorithmVersion};${CALENDAR_SAMPLES_VERSION}` ||
    JSON.stringify(value.inputTemplate) !==
      JSON.stringify({
        timezone: "UTC",
        latitude: 0,
        longitude: 0,
        locationSource: "internal-geocentric-reference/no-local-houses",
      }) ||
    !Array.isArray(value.rows) ||
    value.rows.length !== count ||
    value.rows.some(
      (r, i) =>
        !Array.isArray(r) ||
        r.length !== 11 ||
        r[0] !== first + i * step ||
        r
          .slice(1)
          .some(
            (n) =>
              typeof n !== "number" || !Number.isFinite(n) || n < 0 || n >= 360,
          ),
    )
  )
    throw Error("Grade diária incompleta ou divergente.");
}
