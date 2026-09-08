export interface CalculationInput {
  localDateTime: string;
  timezone: string;
  utcInstant: string;
  latitude: number;
  longitude: number;
  locationSource: string;
}

export interface TimeResolution {
  instant: Date;
  timezoneMode: 'fixed-offset' | 'iana';
  offsetSeconds: number;
  timezoneRules: 'explicit-offset/v1' | 'runtime-intl/unpinned';
}

const localPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;

function strictDate(value: string): Date {
  if (!localPattern.test(value)) throw new TypeError('Data/hora deve incluir segundos e usar calendário ISO.');
  const date = new Date(`${value}Z`);
  const canonical = `${value.slice(0, 19)}.${(value.split('.')[1] ?? '').padEnd(3, '0')}Z`;
  if (!Number.isFinite(date.valueOf()) || date.toISOString() !== canonical) throw new TypeError('Data/hora inválida.');
  return date;
}

/** UTC disambiguates DST folds; local time must resolve back to this exact instant. */
export function validateCalculationInput(input: CalculationInput): TimeResolution {
  if (typeof input.utcInstant !== 'string' || !input.utcInstant.endsWith('Z')) throw new TypeError('utcInstant deve declarar UTC com Z.');
  const instant = strictDate(input.utcInstant.slice(0, -1));
  if (instant.getUTCFullYear() < 1900 || instant.getUTCFullYear() > 2099) throw new RangeError('Intervalo experimental do motor: 1900–2099.');
  if (typeof input.localDateTime !== 'string') throw new TypeError('Data/hora local inválida.');
  const local = strictDate(input.localDateTime);
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) throw new RangeError('Latitude inválida.');
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new RangeError('Longitude inválida.');
  if (typeof input.locationSource !== 'string' || !input.locationSource.trim() || input.locationSource.length > 80) throw new TypeError('Fonte geográfica inválida.');
  if (typeof input.timezone !== 'string' || !input.timezone || input.timezone.length > 80) throw new TypeError('Fuso inválido.');
  const offset = /^UTC(?:([+-])(\d{2}):(\d{2}))?$/.exec(input.timezone);
  const offsetSeconds = (local.valueOf() - instant.valueOf()) / 1000;
  if (offset) {
    const hours = Number(offset[2] ?? 0);
    const minutes = Number(offset[3] ?? 0);
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) throw new RangeError('Offset UTC inválido.');
    const expected = (hours * 3600 + minutes * 60) * (offset[1] === '-' ? -1 : 1);
    if (offsetSeconds !== expected) throw new TypeError('Data local, offset e UTC não correspondem.');
    return { instant, timezoneMode: 'fixed-offset', offsetSeconds, timezoneRules: 'explicit-offset/v1' };
  }
  if (!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(input.timezone)) throw new TypeError('Identificador IANA inválido.');
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: input.timezone, calendar: 'iso8601', numberingSystem: 'latn', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const fields = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, value]));
  const resolved = `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}:${fields.second}`;
  if (resolved !== input.localDateTime.slice(0, 19) || instant.getUTCMilliseconds() !== local.getUTCMilliseconds()) throw new TypeError('Data local, fuso IANA e UTC não correspondem.');
  return { instant, timezoneMode: 'iana', offsetSeconds, timezoneRules: 'runtime-intl/unpinned' };
}
