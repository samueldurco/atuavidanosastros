// Explicit read-only acquisition. CI reads the preserved, hashed responses offline.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../packages/astrology/fixtures/coverage/', import.meta.url);
mkdirSync(root, { recursive: true });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const targets = { sun: 10, moon: 301, mercury: 199, venus: 299, mars: 499, jupiter: 599, saturn: 699, uranus: 799, neptune: 899, pluto: 999 };
const manifestPath = new URL('manifest.json', root);
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {
  schemaVersion: 'atv-horizons-coverage/1', productionPromotion: false,
  // Fixed before acquisition/comparison. These are acceptance budgets, not global error guarantees.
  tolerance: { longitudeArcsec: 60, latitudeArcsec: 60, distanceRelative: 0.001, motionBudgetDegrees: 120 / 3600 }, sources: []
};
for (const [body, command] of Object.entries(targets)) {
  for (const suite of ['temporal', ...(body === 'sun' || body === 'moon' ? [] : ['motion'])]) {
    const year = body === 'venus' || body === 'mars' ? 2025 : 2026;
    const start = suite === 'temporal' ? '1900-01-01T12:00:00Z' : `${year}-01-01T12:00:00Z`;
    const stop = suite === 'temporal' ? '2099-12-31T12:00:00Z' : `${year}-12-31T12:00:00Z`;
    const stepDays = suite === 'temporal' ? 90 : 1;
    const file = `${suite}-${body}.txt`;
    const existing = manifest.sources.find((source) => source.file === file);
    if (existing && sha(readFileSync(new URL(file, root))) === existing.sha256) continue;
    const parameters = {
      format: 'json', COMMAND: `'${command}'`, OBJ_DATA: "'YES'", MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", QUANTITIES: "'20,31'",
      START_TIME: `'${start.slice(0, -1)}'`, STOP_TIME: `'${stop.slice(0, -1)}'`, STEP_SIZE: `'${stepDays} d'`,
      TIME_TYPE: "'UT'", CAL_FORMAT: "'BOTH'", CAL_TYPE: "'GREGORIAN'", TIME_DIGITS: "'FRACSEC'",
      ANG_FORMAT: "'DEG'", APPARENT: "'AIRLESS'", CSV_FORMAT: "'YES'", EXTRA_PREC: "'YES'"
    };
    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(parameters)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    const data = await response.json();
    if (data.error || !data.result?.includes('$$SOE')) throw new Error(`${file}: ${data.error ?? data.result}`);
    writeFileSync(new URL(file, root), data.result);
    const source = { suite, body, command, start, stop, stepDays, file, url, retrievedAt: new Date().toISOString(), signature: data.signature, sha256: sha(data.result) };
    manifest.sources = [...manifest.sources.filter((item) => item.file !== file), source];
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`${file}: ${data.result.length} bytes preserved`);
  }
}
