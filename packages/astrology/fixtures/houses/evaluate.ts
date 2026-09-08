import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CaelusHouseCalculator, type CalculationInput } from '../../src/index.ts';

interface ReferenceCase {
  id: string;
  input: CalculationInput;
  expectedStatus: 'ok' | 'not-applicable';
  midheaven: number;
  ascendant: number | null;
  cusps: number[];
}
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const arcseconds = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180) * 3600;
const validAngle = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;

export function evaluateHouseReference() {
  const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
  const raw = readFileSync(new URL('./erfa-reference.json', import.meta.url));
  assert.equal(sha256(raw), manifest.fixtureSha256, 'Independent house fixture hash');
  assert.equal(sha256(readFileSync(new URL('../../../../scripts/generate-house-reference.py', import.meta.url))), manifest.generatorSha256, 'Reference generator hash');
  const fixture = JSON.parse(raw.toString('utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(manifest.promotion, false);
  assert.equal(fixture.reference.pyerfa, '2.0.1.5');
  assert.equal(fixture.reference.erfa, '2.0.1');
  assert.deepEqual(fixture.tolerancesArcsec, { midheaven: 60, ascendant: 60, cusp: 120 });
  const cases: ReferenceCase[] = fixture.cases;
  assert.equal(manifest.count, 168);
  assert.equal(cases.length, 168);
  assert.equal(new Set(cases.map((c) => c.id)).size, 168);
  assert.equal(new Set(cases.map((c) => c.input.utcInstant)).size, 12);
  assert.equal(cases.filter((c) => c.expectedStatus === 'ok').length, 120);
  const calculator = new CaelusHouseCalculator();
  const failures: Array<{ id: string; field: string; detail: string }> = [];
  const maximaArcsec = { midheaven: 0, ascendant: 0, cusp: 0 };
  let comparisons = 0;
  for (const reference of cases) {
    assert.ok(validAngle(reference.midheaven));
    const supported = Math.abs(reference.input.latitude) < 66;
    assert.equal(reference.expectedStatus, supported ? 'ok' : 'not-applicable');
    assert.equal(reference.cusps.length, supported ? 12 : 0);
    assert.ok(supported ? validAngle(reference.ascendant) : reference.ascendant === null);
    assert.ok(reference.cusps.every(validAngle));
    const actual = calculator.calculate(reference.input);
    const compare = (field: keyof typeof maximaArcsec, value: number, expected: number, label = field as string) => {
      assert.ok(validAngle(value), `${reference.id}/${label}: candidate angle`);
      const error = arcseconds(value, expected);
      maximaArcsec[field] = Math.max(maximaArcsec[field], error);
      comparisons++;
      if (error > fixture.tolerancesArcsec[field]) failures.push({ id: reference.id, field: label, detail: `${error} arcsec` });
    };
    compare('midheaven', actual.midheaven, reference.midheaven);
    if (reference.ascendant !== null) compare('ascendant', actual.ascendant, reference.ascendant);
    if (actual.status !== reference.expectedStatus) {
      failures.push({ id: reference.id, field: 'status', detail: `${actual.status}; expected ${reference.expectedStatus}` });
      continue;
    }
    if (actual.status === 'not-applicable') {
      assert.deepEqual(actual.cusps, [], 'No substitute polar cusps');
      assert.equal(actual.code, 'PLACIDUS_UNAVAILABLE');
      assert.ok(actual.warning.length > 0);
      continue;
    }
    assert.equal(actual.cusps.length, 12);
    actual.cusps.forEach((value, i) => {
      const expected = reference.cusps[i];
      assert.equal(typeof expected, 'number');
      compare('cusp', value, expected as number, `house-${i + 1}`);
    });
  }
  return { scope: 'ANGLES_HOUSES_GEOMETRIC_SAMPLE', cases: cases.length, comparisons, maximaArcsec, failures, productionPromotion: false };
}
