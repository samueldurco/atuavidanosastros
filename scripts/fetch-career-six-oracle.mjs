// Explicit read-only NASA/JPL fetch for the two distinct synthetic birth instants
// behind the six Career Compass V6 owner previews. Normal tests remain offline.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../packages/astrology/fixtures/career-six-oracle/', import.meta.url));
mkdirSync(root, { recursive: true });
const epochs = ['1985-08-21T17:20:00.000Z', '1992-05-17T11:40:00.000Z'];
const instants = epochs.flatMap(epoch => [-3600000, 0, 3600000]
  .map(shift => new Date(Date.parse(epoch) + shift).toISOString()));
const targets = { sun: 10, moon: 301, mercury: 199, venus: 299, mars: 499,
  jupiter: 599, saturn: 699, uranus: 799, neptune: 899, pluto: 999 };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = { schemaVersion: 'atv-career-six-oracle/1',
  retrievedAt: new Date().toISOString(), epochs, instants,
  source: 'NASA/JPL Horizons API', sources: [] };

for (const [body, command] of Object.entries(targets)) {
  const params = {
    format: 'json', COMMAND: `'${command}'`, OBJ_DATA: "'YES'",
    MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'",
    QUANTITIES: "'20,31'",
    TLIST: `'${instants.map(epoch => Date.parse(epoch) / 86400000 + 2440587.5).join(' ')}'`,
    TLIST_TYPE: "'JD'", TIME_TYPE: "'UT'", CAL_FORMAT: "'BOTH'",
    TIME_DIGITS: "'FRACSEC'", ANG_FORMAT: "'DEG'", APPARENT: "'AIRLESS'",
    CSV_FORMAT: "'YES'", EXTRA_PREC: "'YES'"
  };
  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(params)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${body}: JPL HTTP ${response.status}`);
  const data = await response.json();
  if (data.error || !data.result?.includes('$$SOE') || !data.result.includes('$$EOE'))
    throw new Error(`${body}: ${data.error ?? 'JPL result is missing ephemeris rows'}`);
  const file = `${body}.txt`;
  const bytes = Buffer.from(data.result, 'utf8');
  writeFileSync(`${root}/${file}`, bytes);
  manifest.sources.push({ body, command, file, url, sha256: hash(bytes), signature: data.signature });
  console.log(`${body}: ${bytes.length} bytes, ${hash(bytes).slice(0, 12)}`);
}
writeFileSync(`${root}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
