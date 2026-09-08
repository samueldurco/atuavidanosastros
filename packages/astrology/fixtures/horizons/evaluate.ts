import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bodies, CaelusEphemerisProvider, type CelestialBody } from '../../src/index.ts';

interface Manifest {
  schemaVersion: string;
  epochs: string[];
  instants: string[];
  sources: { body: CelestialBody; file: string; sha256: string }[];
}
interface Reference { jd: number; distanceAu: number; longitude: number; latitude: number }
const root = new URL('./', import.meta.url);
const delta = (a: number, b: number) => ((a - b + 540) % 360) - 180;
// Recorded before the first comparison; changing a limit requires a reviewed decision.
export const tolerance = { longitudeArcsec: 60, latitudeArcsec: 60, distanceRelative: 0.001 };

export async function evaluateHorizons() {
  const manifest: Manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.schemaVersion, 'atv-horizons/1');
  assert.equal(manifest.epochs.length, 7);
  assert.equal(manifest.instants.length, 21);
  assert.deepEqual(manifest.sources.map(({ body }) => body).sort(), [...bodies].sort());
  const references = new Map<CelestialBody, Reference[]>();
  for (const source of manifest.sources) {
    assert.equal(source.file, `${source.body}.txt`);
    const raw = readFileSync(new URL(source.file, root));
    assert.equal(createHash('sha256').update(raw).digest('hex'), source.sha256, `${source.body}: fixture hash`);
    const sections = raw.toString('utf8').split('$$SOE');
    assert.equal(sections.length, 2);
    const end = sections[1]!.split('$$EOE');
    assert.equal(end.length, 2);
    const rows = end[0]!.trim().split('\n').map((line, index) => {
      const cells = line.split(',').map((value) => value.trim());
      const row = { jd: Number(cells[1]), distanceAu: Number(cells[4]), longitude: Number(cells[6]), latitude: Number(cells[7]) };
      assert.ok(Object.values(row).every(Number.isFinite), `${source.body}: numeric columns`);
      assert.ok(row.distanceAu > 0 && row.longitude >= 0 && row.longitude < 360 && Math.abs(row.latitude) <= 90);
      const expectedInstant = manifest.instants[index];
      assert.ok(expectedInstant);
      const expectedJd = Date.parse(expectedInstant) / 86400000 + 2440587.5;
      assert.ok(Math.abs(row.jd - expectedJd) < 1e-8, `${source.body}: timestamp ${index}`);
      return row;
    });
    assert.equal(rows.length, manifest.instants.length);
    references.set(source.body, rows);
  }
  const provider = new CaelusEphemerisProvider();
  const rows = [];
  for (const [epochIndex, epoch] of manifest.epochs.entries()) {
    const index = epochIndex * 3 + 1;
    assert.equal(manifest.instants[index], epoch);
    assert.equal(Date.parse(manifest.instants[index - 1]!), Date.parse(epoch) - 3600000);
    assert.equal(Date.parse(manifest.instants[index + 1]!), Date.parse(epoch) + 3600000);
    const chart = await provider.calculate({ localDateTime: epoch.slice(0, -1), utcInstant: epoch, timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic-fixture' });
    assert.deepEqual(chart.positions.map(({ body }) => body), bodies);
    for (const position of chart.positions) {
      const series = references.get(position.body)!;
      const reference = series[index];
      const previous = series[index - 1];
      const next = series[index + 1];
      assert.ok(reference && previous && next);
      const angularErrorArcsec = Math.abs(delta(position.longitude, reference.longitude)) * 3600;
      const latitudeErrorArcsec = Math.abs(position.latitude - reference.latitude) * 3600;
      const distanceRelativeError = Math.abs(position.distanceAu / reference.distanceAu - 1);
      const referenceMotionDegrees = delta(next.longitude, previous.longitude);
      // This sparse corpus is not a station suite; do not infer a station pass from a rounded zero.
      assert.ok(Math.abs(referenceMotionDegrees) > 1e-7, 'Retrograde reference is ambiguous near a station.');
      const retrogradeMatches = position.retrograde === (referenceMotionDegrees < 0);
      rows.push({ epoch, body: position.body, angularErrorArcsec, latitudeErrorArcsec, distanceRelativeError, retrogradeMatches,
        pass: angularErrorArcsec <= tolerance.longitudeArcsec && latitudeErrorArcsec <= tolerance.latitudeArcsec && distanceRelativeError <= tolerance.distanceRelative && retrogradeMatches });
    }
  }
  return { generatedAt: new Date().toISOString(), candidate: 'caelus/0.24.1 embedded', tolerance, productionPromotion: false, count: rows.length, failures: rows.filter((row) => !row.pass), rows };
}
