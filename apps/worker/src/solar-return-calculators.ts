import {
  CaelusEphemerisProvider,
  validateCalculationInput,
  type CalculationInput,
  type EphemerisProvider,
  type NatalChart,
} from "@atv/astrology";
import {
  parseWorkflowInput,
  type CalculationSnapshot,
  type ReturnLocationInput,
} from "@atv/domain";
import { bodyLabels, zodiacPosition } from "./natal-calculators.ts";
import { buildSolarReturnCalendar } from "./solar-return-calendar.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";

export const solarReturnProductContract = Object.freeze({
  version: "atv-solar-return-calculation/1.1.0",
  productId: "solar-return",
  status: "experimental",
  longitude: "geocentric-apparent-tropical-sun",
  search: "anniversary-utc-plus-minus-four-days/bisection-to-millisecond",
  location: "declared-birthday-city/timezone/coordinates",
  houses: "placidus-or-explicit-unavailable",
  interpretation: "not-produced",
  monthlyTimeline: "civil-calendar-scaffold-only",
});

const dayMs = 86400000;
const signedDifference = (a: number, b: number) => ((a - b + 540) % 360) - 180;
const validAngle = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 360;

function sun(chart: NatalChart): number {
  const value = chart.positions.find(
    (position) => position.body === "sun",
  )?.longitude;
  if (!validAngle(value)) throw new ProcessingError("calculation_invalid");
  return value;
}

function localInstant(instant: Date, location: ReturnLocationInput): string {
  const offset = /^UTC(?:([+-])(\d{2}):(\d{2}))?$/.exec(location.timezone);
  if (offset) {
    const hours = Number(offset[2] ?? 0),
      minutes = Number(offset[3] ?? 0);
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0))
      throw new ProcessingError("input_invalid");
    const seconds =
      (hours * 3600 + minutes * 60) * (offset[1] === "-" ? -1 : 1);
    return new Date(instant.valueOf() + seconds * 1000)
      .toISOString()
      .slice(0, 23);
  }
  if (!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(location.timezone))
    throw new ProcessingError("input_invalid");
  let fields: Record<string, string>;
  try {
    fields = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: location.timezone,
        calendar: "iso8601",
        numberingSystem: "latn",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(instant)
        .map(({ type, value }) => [type, value]),
    );
  } catch {
    throw new ProcessingError("input_invalid");
  }
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}:${fields.second}.${String(instant.getUTCMilliseconds()).padStart(3, "0")}`;
}

function geocentricInput(instant: Date): CalculationInput {
  const utcInstant = instant.toISOString();
  return {
    localDateTime: utcInstant.slice(0, -1),
    utcInstant,
    timezone: "UTC",
    latitude: 0,
    longitude: 0,
    locationSource: "internal-geocentric-reference/no-local-houses",
  };
}

function birthdayInput(
  instant: Date,
  location: ReturnLocationInput,
): CalculationInput {
  const input = {
    localDateTime: localInstant(instant, location),
    utcInstant: instant.toISOString(),
    timezone: location.timezone,
    latitude: location.latitude,
    longitude: location.longitude,
    locationSource: location.locationSource,
  };
  try {
    validateCalculationInput(input);
  } catch {
    throw new ProcessingError("input_invalid");
  }
  return input;
}

/** Experimental search only. The candidate engine has not passed independent accuracy approval. */
export function createSolarReturnCalculators(
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async (value, { signal }) => {
    signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (
      !input?.birth ||
      !input.returnLocation ||
      input.productId !== "solar-return" ||
      !input.returnYear ||
      !input.targetDate
    )
      throw new ProcessingError("input_invalid");
    const birth = input.birth,
      location = input.returnLocation;
    try {
      validateCalculationInput(birth);
    } catch {
      throw new ProcessingError("input_invalid");
    }
    const monthDay = birth.localDateTime.slice(5, 10);
    const month = Number(monthDay.slice(0, 2)),
      day = Number(monthDay.slice(3, 5));
    const daysInMonth = new Date(
      Date.UTC(input.returnYear, month, 0),
    ).getUTCDate();
    if (
      !/^\d{2}-\d{2}$/.test(monthDay) ||
      input.returnYear < Number(birth.localDateTime.slice(0, 4)) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      input.targetDate !==
        `${input.returnYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, daysInMonth)).padStart(2, "0")}`
    )
      throw new ProcessingError("input_invalid");
    // Validate the declared birthday city before calling the ephemeris.
    birthdayInput(new Date(`${input.targetDate}T12:00:00.000Z`), location);
    signal.throwIfAborted();
    const natal = await provider.calculate({ ...birth });
    signal.throwIfAborted();
    const natalSun = sun(natal);
    const center = Date.parse(`${input.targetDate}T12:00:00.000Z`);
    let low = Math.max(
      center - 4 * dayMs,
      Date.parse("1900-01-01T00:00:00.000Z"),
    );
    let high = Math.min(
      center + 4 * dayMs,
      Date.parse("2099-12-31T23:59:59.999Z"),
    );
    const delta = async (at: number) => {
      signal.throwIfAborted();
      const chart = await provider.calculate(geocentricInput(new Date(at)));
      signal.throwIfAborted();
      return signedDifference(sun(chart), natalSun);
    };
    const lower = await delta(low),
      upper = await delta(high);
    if (!(lower <= 0 && upper >= 0))
      throw new ProcessingError("calculation_invalid");
    for (let iteration = 0; iteration < 32 && high - low > 1; iteration++) {
      const middle = Math.floor((low + high) / 2);
      if ((await delta(middle)) < 0) low = middle;
      else high = middle;
    }
    const instant = new Date(Math.round((low + high) / 2));
    const chart = await provider.calculate(birthdayInput(instant, location));
    signal.throwIfAborted();
    const returnedSun = sun(chart),
      residual = Math.abs(signedDifference(returnedSun, natalSun));
    if (
      residual > 0.00002 ||
      chart.positions.some((position) => !validAngle(position.longitude))
    )
      throw new ProcessingError("calculation_invalid");
    const source = `${chart.provenance.provider}/${chart.provenance.providerVersion};${solarReturnProductContract.version}`;
    const facts: CalculationSnapshot["facts"] = [
      {
        id: "natal-sun",
        kind: "calculated",
        display: `Sol natal: ${zodiacPosition(natalSun).display}`,
        source,
      },
      {
        id: "return-instant",
        kind: "calculated",
        display: `Retorno solar calculado: ${instant.toISOString()} (${location.city}, ${location.timezone})`,
        source,
      },
      ...chart.positions.map((position) => ({
        id: `return-${position.body}`,
        kind: "calculated" as const,
        display: `${bodyLabels[position.body]} no retorno: ${zodiacPosition(position.longitude).display}`,
        source,
      })),
      ...(chart.houses.status === "ok"
        ? [
            {
              id: "return-ascendant",
              kind: "calculated" as const,
              display: `Ascendente do retorno: ${zodiacPosition(chart.houses.ascendant).display}`,
              source,
            },
          ]
        : []),
      {
        id: "return-midheaven",
        kind: "calculated",
        display: `Meio do Céu do retorno: ${zodiacPosition(chart.houses.midheaven).display}`,
        source,
      },
      ...(chart.houses.status === "ok"
        ? chart.houses.cusps.map((longitude, index) => ({
            id: `return-house-${index + 1}`,
            kind: "calculated" as const,
            display: `Cúspide ${index + 1} do retorno (Placidus): ${zodiacPosition(longitude).display}`,
            source,
          }))
        : []),
      {
        id: "birthday-city",
        kind: "reported",
        display: `Cidade declarada para o aniversário: ${location.city}`,
        source: "input.returnLocation",
      },
      ...(input.context
        ? [
            {
              id: "personal-context",
              kind: "reported" as const,
              display: input.context,
              source: "input.context",
            },
          ]
        : []),
      ...(input.importantDates?.entries.map((entry, index) => ({
        id: `important-date-${index + 1}`,
        kind: "reported" as const,
        display: `${entry.date}: ${entry.label}`,
        source: `input.importantDates.entries[${index}]`,
      })) ?? []),
    ];
    const snapshot: CalculationSnapshot = {
      version: solarReturnProductContract.version,
      kind: "cycles",
      status: "experimental",
      facts,
      data: {
        productId: "solar-return",
        returnYear: input.returnYear,
        anchorDate: input.targetDate,
        returnInstant: instant.toISOString(),
        localDateTime: chart.input.localDateTime,
        natalSunLongitude: natalSun,
        returnSunLongitude: returnedSun,
        residualDegrees: residual,
        positions: structuredClone(chart.positions),
        houses: structuredClone(chart.houses),
        natalInput: structuredClone(natal.input),
        returnInput: structuredClone(chart.input),
        natalProvenance: structuredClone(natal.provenance),
        returnProvenance: structuredClone(chart.provenance),
        calendarScaffold: buildSolarReturnCalendar(
          input.targetDate,
          input.importantDates?.entries,
        ),
        projection: solarReturnProductContract,
      },
      limits: [
        ...chart.provenance.warnings,
        "Cálculo experimental do instante e da carta do retorno; motor e precisão não homologados independentemente.",
        "A cidade, as prioridades e as datas importantes são declaradas pela pessoa. Esses relatos não alteram a geometria; a grade de 12 meses é apenas civil, sem previsão, interpretação ou mandala editorial.",
        "O retorno é uma igualdade de longitude solar geocêntrica aparente tropical; não é o horário civil de aniversário nem uma previsão de eventos.",
        ...(chart.houses.status === "not-applicable"
          ? [chart.houses.warning]
          : []),
      ],
    };
    const checked = validateCalculation(snapshot, "solar-return");
    if (!checked) throw new ProcessingError("calculation_invalid");
    return checked;
  };
  return Object.freeze({ "solar-return": calculate });
}
