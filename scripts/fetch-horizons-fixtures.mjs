// Explicit, read-only refresh. Normal tests use the checked-in response, never the network.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../packages/astrology/fixtures/horizons/', import.meta.url));
mkdirSync(directory, { recursive: true });
const epochs = [
  '1900-01-01T12:00:00.000Z', '1950-06-21T12:00:00.000Z',
  '2000-01-01T12:00:00.000Z', '2024-03-20T03:06:00.000Z',
  '2026-09-08T12:00:00.000Z', '2050-12-21T12:00:00.000Z',
  '2099-12-31T12:00:00.000Z'
];
const instants = epochs.flatMap((date) => [-3600000, 0, 3600000].map((shift) => new Date(Date.parse(date) + shift).toISOString()));
const targets = { sun: 10, moon: 301, mercury: 199, venus: 299, mars: 499, jupiter: 599, saturn: 699, uranus: 799, neptune: 899, pluto: 999 };
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const manifest = { schemaVersion: 'atv-horizons/1', retrievedAt: new Date().toISOString(), epochs, instants, sources: [] };
for (const [body, command] of Object.entries(targets)) {
  const parameters = {
    format: 'json', COMMAND: `'${command}'`, OBJ_DATA: "'YES'", MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", QUANTITIES: "'20,31'",
    TLIST: `'${instants.map((date) => Date.parse(date) / 86400000 + 2440587.5).join(' ')}'`,
    TLIST_TYPE: "'JD'", TIME_TYPE: "'UT'", CAL_FORMAT: "'BOTH'", TIME_DIGITS: "'FRACSEC'",
    ANG_FORMAT: "'DEG'", APPARENT: "'AIRLESS'", CSV_FORMAT: "'YES'", EXTRA_PREC: "'YES'"
  };
  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(parameters)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${body}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.error || !data.result?.includes('$$SOE')) throw new Error(`${body}: ${data.error ?? data.result}`);
  const file = `${body}.txt`;
  writeFileSync(`${directory}/${file}`, data.result);
  manifest.sources.push({ body, command, file, url, sha256: sha256(data.result), signature: data.signature });
  console.log(`${body}: recorded ${data.result.length} bytes`);
}
writeFileSync(`${directory}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
