import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bodies, CaelusEphemerisProvider, type CelestialBody, type NatalChart } from '../../src/index.ts';

interface Source { suite: 'temporal' | 'motion'; body: CelestialBody; file: string; sha256: string; start: string; stop: string; stepDays: number; url: string }
const root = new URL('./', import.meta.url);
const delta = (a: number, b: number) => ((a - b + 540) % 360) - 180;
const targetIds: Record<CelestialBody, number> = { sun: 10, moon: 301, mercury: 199, venus: 299, mars: 499, jupiter: 599, saturn: 699, uranus: 799, neptune: 899, pluto: 999 };

export async function evaluateCoverage() {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.schemaVersion, 'atv-horizons-coverage/1');
  assert.equal(manifest.productionPromotion, false);
  assert.deepEqual(manifest.tolerance, { longitudeArcsec: 60, latitudeArcsec: 60, distanceRelative: 0.001, motionBudgetDegrees: 120 / 3600 });
  const sources: Source[] = manifest.sources;
  const expectedFiles = bodies.flatMap((body) => [`temporal-${body}.txt`, ...(['sun', 'moon'].includes(body) ? [] : [`motion-${body}.txt`])]);
  assert.deepEqual(sources.map(({ file }) => file).sort(), expectedFiles.sort());
  const charts = new Map<string, NatalChart>();
  const provider = new CaelusEphemerisProvider();
  const rows = [];
  const motion = [];
  const transitions: Array<{ body: CelestialBody; from: string; to: string; kind: 'retrograde' | 'direct'; stationTimingCertified: false }> = [];
  for (const source of sources) {
    assert.ok(bodies.includes(source.body));
    assert.equal(source.file, `${source.suite}-${source.body}.txt`);
    const temporal = source.suite === 'temporal';
    const year = source.body === 'venus' || source.body === 'mars' ? 2025 : 2026;
    assert.equal(source.start, temporal ? '1900-01-01T12:00:00Z' : `${year}-01-01T12:00:00Z`);
    assert.equal(source.stop, temporal ? '2099-12-31T12:00:00Z' : `${year}-12-31T12:00:00Z`);
    assert.equal(source.stepDays, temporal ? 90 : 1);
    const request = new URL(source.url);
    assert.equal(request.origin, 'https://ssd.jpl.nasa.gov');
    for (const [key, value] of Object.entries({ COMMAND: `'${targetIds[source.body]}'`, CENTER: "'500@399'", QUANTITIES: "'20,31'", TIME_TYPE: "'UT'", EPHEM_TYPE: "'OBSERVER'", STEP_SIZE: `'${source.stepDays} d'`, START_TIME: `'${source.start.slice(0, -1)}'`, STOP_TIME: `'${source.stop.slice(0, -1)}'`, CAL_TYPE: "'GREGORIAN'", APPARENT: "'AIRLESS'", ANG_FORMAT: "'DEG'" })) assert.equal(request.searchParams.get(key), value);
    const raw = readFileSync(new URL(source.file, root));
    assert.equal(createHash('sha256').update(raw).digest('hex'), source.sha256);
    assert.ok(raw.toString('utf8').split('\n').some((line) => line.startsWith('Target body name:') && line.includes(`(${targetIds[source.body]})`)));
    assert.match(raw.toString('utf8'), /Center body name: Earth \(399\)/);
    assert.match(raw.toString('utf8'), /Center-site name: GEOCENTRIC/);
    const sections = raw.toString('utf8').split('$$SOE');
    assert.equal(sections.length, 2);
    const end = sections[1]!.split('$$EOE');
    assert.equal(end.length, 2);
    const references = end[0]!.trim().split('\n').map((line, index) => {
      const cells = line.split(',').map((cell) => cell.trim());
      assert.ok([1, 4, 6, 7].every((index) => cells[index] && cells[index] !== 'n.a.'));
      const [jd, distanceAu, longitude, latitude] = [1, 4, 6, 7].map((i) => Number(cells[i])) as [number, number, number, number];
      assert.ok([jd, distanceAu, longitude, latitude].every(Number.isFinite));
      assert.ok(distanceAu > 0 && longitude >= 0 && longitude < 360 && Math.abs(latitude) <= 90);
      const time = Date.parse(source.start) + index * source.stepDays * 86400000;
      assert.ok(Math.abs(jd - (time / 86400000 + 2440587.5)) < 1e-8);
      return { epoch: new Date(time).toISOString(), longitude, latitude, distanceAu };
    });
    assert.equal(references.length, Math.floor((Date.parse(source.stop) - Date.parse(source.start)) / (source.stepDays * 86400000)) + 1);
    let previousMotion: { epoch: string; referenceDegrees: number } | undefined;
    for (const [i, reference] of references.entries()) {
      const epoch = reference.epoch;
      let chart = charts.get(epoch);
      if (!chart) {
        chart = await provider.calculate({ localDateTime: epoch.slice(0, -1), utcInstant: epoch, timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic-coverage' });
        charts.set(epoch, chart);
      }
      const position = chart.positions.find(({ body }) => body === source.body)!;
      const longitudeArcsec = Math.abs(delta(position.longitude, reference.longitude)) * 3600;
      const latitudeArcsec = Math.abs(position.latitude - reference.latitude) * 3600;
      const distanceRelative = Math.abs(position.distanceAu / reference.distanceAu - 1);
      rows.push({ suite: source.suite, body: source.body, epoch, longitudeArcsec, latitudeArcsec, distanceRelative,
        pass: longitudeArcsec <= manifest.tolerance.longitudeArcsec && latitudeArcsec <= manifest.tolerance.latitudeArcsec && distanceRelative <= manifest.tolerance.distanceRelative });
      if (!temporal && i > 0 && i < references.length - 1) {
        const referenceDegrees = delta(references[i + 1]!.longitude, references[i - 1]!.longitude);
        // Two sampled endpoints, not an instantaneous station solver. Do not certify near-zero signs.
        const inconclusive = Math.abs(referenceDegrees) <= manifest.tolerance.motionBudgetDegrees;
        motion.push({ body: source.body, epoch, referenceDegrees, candidateRetrograde: position.retrograde,
          pass: inconclusive ? null : position.retrograde === (referenceDegrees < 0) });
        if (previousMotion && Math.sign(previousMotion.referenceDegrees) !== Math.sign(referenceDegrees)) transitions.push({ body: source.body, from: previousMotion.epoch, to: epoch, kind: referenceDegrees < 0 ? 'retrograde' : 'direct', stationTimingCertified: false });
        previousMotion = { epoch, referenceDegrees };
      }
    }
  }
  assert.ok(bodies.filter((body) => !['sun', 'moon'].includes(body)).every((body) => transitions.some((row) => row.body === body)), 'Every sampled planet must exercise a motion sign transition.');
  return {
    scope: 'TEMPORAL_AND_MOTION_SAMPLE', productionPromotion: false, tolerance: manifest.tolerance,
    count: rows.length, temporalCount: rows.filter((row) => row.suite === 'temporal').length,
    maxima: { longitudeArcsec: Math.max(...rows.map((r) => r.longitudeArcsec)), latitudeArcsec: Math.max(...rows.map((r) => r.latitudeArcsec)), distanceRelative: Math.max(...rows.map((r) => r.distanceRelative)) },
    motionCount: motion.length, verifiedMotion: motion.filter((r) => r.pass === true).length,
    inconclusiveMotion: motion.filter((r) => r.pass === null), transitions,
    failures: [...rows.filter((row) => !row.pass), ...motion.filter((row) => row.pass === false)], rows, motion
  };
}
