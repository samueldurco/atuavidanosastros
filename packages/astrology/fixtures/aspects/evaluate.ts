import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bodies, calculateAspects, CaelusEphemerisProvider, type AspectPolicy, type AspectPosition, type MajorAspect } from '../../src/index.ts';

interface ReferencePair {
  first: string; second: string; separationDegrees: number; kind: MajorAspect | null;
  orbDegrees: number | null; boundaryMarginDegrees: number;
}
interface Fixture {
  schemaVersion: string; productionPromotion: boolean; policy: AspectPolicy;
  cases: { epoch: string; positions: AspectPosition[]; pairs: ReferencePair[] }[];
}
const root = new URL('./', import.meta.url);
const digest = (url: URL) => createHash('sha256').update(readFileSync(url)).digest('hex');
export async function evaluateAspectReference() {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  const fixture: Fixture = JSON.parse(readFileSync(new URL('vector-reference.json', root), 'utf8'));
  assert.equal(manifest.schemaVersion, 'atv-aspects-manifest/1');
  assert.equal(fixture.schemaVersion, 'atv-aspects-reference/1');
  assert.equal(manifest.qaPolicyOnly, true);
  assert.equal(manifest.productionPromotion, false);
  assert.equal(fixture.productionPromotion, false);
  assert.equal(digest(new URL('vector-reference.json', root)), manifest.fixtureSha256);
  assert.equal(digest(new URL('../../../../scripts/generate-aspect-reference.py', root)), manifest.generatorSha256);
  assert.equal(digest(new URL('../horizons/manifest.json', root)), manifest.sourceManifestSha256);
  assert.deepEqual(manifest.sources.map((item: { body: string }) => item.body), bodies);
  for (const source of manifest.sources) {
    assert.equal(source.file, `${source.body}.txt`);
    assert.equal(digest(new URL(`../horizons/${source.file}`, root)), source.sha256);
  }
  assert.equal(manifest.caseCount, 7);
  assert.equal(manifest.pairCount, 315);
  assert.equal(fixture.cases.length, 7);
  assert.equal(new Set(fixture.cases.map(({ epoch }) => epoch)).size, 7);
  assert.deepEqual(manifest.toleranceDegrees, { samePositions: 1e-7, candidatePositions: 2 * 60 / 3600 });
  assert.deepEqual(fixture.policy, { id: 'qa-major', version: '1', aspects: [
    { kind: 'conjunction', orbDegrees: 8 }, { kind: 'sextile', orbDegrees: 4 }, { kind: 'square', orbDegrees: 6 },
    { kind: 'trine', orbDegrees: 6 }, { kind: 'opposition', orbDegrees: 8 }
  ] });
  const provider = new CaelusEphemerisProvider();
  const rows = [];
  for (const sample of fixture.cases) {
    assert.deepEqual(sample.positions.map(({ body }) => body), bodies);
    const referenceCalculation = calculateAspects(sample.positions, fixture.policy);
    const chart = await provider.calculate({ localDateTime: sample.epoch.slice(0, -1), utcInstant: sample.epoch, timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic-fixture' });
    const candidateCalculation = calculateAspects(chart.positions, fixture.policy);
    assert.equal(referenceCalculation.pairsEvaluated, 45);
    assert.equal(candidateCalculation.pairsEvaluated, 45);
    assert.equal(sample.pairs.length, 45);
    const expectedPairs = bodies.flatMap((first, i) => bodies.slice(i + 1).map((second) => `${first}/${second}`));
    assert.deepEqual(sample.pairs.map((pair) => `${pair.first}/${pair.second}`), expectedPairs);
    for (const expected of sample.pairs) {
      assert.ok(Number.isFinite(expected.separationDegrees) && expected.separationDegrees >= 0 && expected.separationDegrees <= 180);
      assert.ok(Number.isFinite(expected.boundaryMarginDegrees) && expected.boundaryMarginDegrees >= 0);
      const exact = referenceCalculation.aspects.find((pair) => pair.first === expected.first && pair.second === expected.second);
      const candidate = candidateCalculation.aspects.find((pair) => pair.first === expected.first && pair.second === expected.second);
      const ambiguous = expected.boundaryMarginDegrees <= manifest.toleranceDegrees.candidatePositions;
      const exactError = exact ? Math.max(Math.abs(exact.separationDegrees - expected.separationDegrees), Math.abs(exact.orbDegrees - Number(expected.orbDegrees))) : 0;
      const candidateError = candidate && expected.kind ? Math.max(Math.abs(candidate.separationDegrees - expected.separationDegrees), Math.abs(candidate.orbDegrees - Number(expected.orbDegrees))) : 0;
      const exactPass = (exact?.kind ?? null) === expected.kind && exactError <= manifest.toleranceDegrees.samePositions;
      // An ephemeris error budget can cross an orb boundary even when this observation agrees.
      // Preserve that uncertainty; never adjust the QA policy or tolerance to turn it into a pass.
      const candidatePass = ambiguous ? null : (candidate?.kind ?? null) === expected.kind && candidateError <= manifest.toleranceDegrees.candidatePositions;
      rows.push({ epoch: sample.epoch, pair: `${expected.first}/${expected.second}`, kind: expected.kind, ambiguous, exactError, candidateError,
        exactPass, candidatePass, observedCandidateKind: candidate?.kind ?? null });
    }
    assert.equal(referenceCalculation.aspects.length, sample.pairs.filter((pair) => pair.kind !== null).length);
  }
  return { generatedAt: new Date().toISOString(), algorithm: 'atv-major-aspects/1', productionPromotion: false, qaPolicyOnly: true,
    epochs: fixture.cases.length, pairs: rows.length, matches: rows.filter((row) => row.kind).length,
    ambiguousPairs: rows.filter((row) => row.ambiguous).length,
    verifiedCandidatePairs: rows.filter((row) => row.candidatePass === true).length,
    maxExactErrorDegrees: Math.max(...rows.map((row) => row.exactError)),
    maxCandidateErrorDegrees: Math.max(...rows.map((row) => row.candidateError)),
    failures: rows.filter((row) => !row.exactPass || row.candidatePass === false),
    inconclusive: rows.filter((row) => row.candidatePass === null), rows };
}
