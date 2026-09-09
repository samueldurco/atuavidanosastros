import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAspects, assessAspectStability, type AspectPolicy, type AspectPosition, type MajorAspect } from './aspects.ts';
import { evaluateAspectReference } from '../fixtures/aspects/evaluate.ts';

const policy = (kind: MajorAspect, orbDegrees: number): AspectPolicy => ({ id: 'qa-boundary', version: '1', aspects: [{ kind, orbDegrees }] });
const pair = (a: number, b: number): AspectPosition[] => [{ body: 'sun', longitude: a }, { body: 'moon', longitude: b }];

test('major aspects: wrap, exact angles and inclusive orb boundaries', () => {
  for (const [kind, angle] of [['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180]] as const) {
    const exact = calculateAspects(pair(0, angle), policy(kind, 0));
    assert.equal(exact.aspects[0]?.kind, kind);
    assert.equal(exact.aspects[0]?.orbDegrees, 0);
    const boundary = angle === 180 ? 176 : angle + 4;
    assert.equal(calculateAspects(pair(0, boundary), policy(kind, 4)).aspects.length, 1);
    assert.equal(calculateAspects(pair(0, boundary + (angle === 180 ? -1e-6 : 1e-6)), policy(kind, 4)).aspects.length, 0);
  }
  assert.equal(calculateAspects(pair(359, 1), policy('conjunction', 2)).aspects[0]?.separationDegrees, 2);
});

test('canonical unique pairs and policy snapshot do not depend on input order or mutate input', () => {
  const positions = Object.freeze([Object.freeze({ body: 'mars' as const, longitude: 90 }), ...pair(0, 180).map((value) => Object.freeze(value))]);
  const rules = { id: 'qa-order', version: '2', aspects: [{ kind: 'opposition' as const, orbDegrees: 0 }, { kind: 'square' as const, orbDegrees: 0 }] };
  const result = calculateAspects(positions, rules);
  assert.deepEqual(result, calculateAspects([...positions].reverse(), rules));
  assert.deepEqual(result.aspects.map(({ first, second }) => `${first}/${second}`), ['sun/moon', 'sun/mars', 'moon/mars']);
  assert.equal(result.pairsEvaluated, 3);
  assert.equal(result.motion, 'not-evaluated');
  assert.equal(result.coordinate, 'ecliptic-longitude');
  assert.equal(result.algorithmVersion, 'atv-major-aspects/1');
  rules.aspects[0]!.orbDegrees = 5;
  assert.equal(result.policy.aspects[1]?.orbDegrees, 0);
  assert.equal(positions[0]?.body, 'mars');
  assert.equal(calculateAspects([], policy('square', 0)).pairsEvaluated, 0);
  assert.equal(calculateAspects(pair(0, 180).slice(0, 1), policy('square', 0)).pairsEvaluated, 0);
});

test('invalid inputs and ambiguous or implicit policies are rejected', () => {
  for (const value of [NaN, Infinity, -1, 360, '90', null, undefined]) {
    assert.throws(() => calculateAspects(pair(0, value as number), policy('square', 1)), RangeError);
  }
  assert.throws(() => calculateAspects([{ body: 'earth', longitude: 0 }] as unknown as AspectPosition[], policy('square', 1)), RangeError);
  assert.throws(() => calculateAspects([{ body: 'sun', longitude: 0 }, { body: 'sun', longitude: 90 }], policy('square', 1)), RangeError);
  for (const invalid of [undefined, null, {}, { ...policy('square', 1), id: '' }, { ...policy('square', 1), version: '' },
    { ...policy('square', 1), aspects: [] }, policy('bogus' as MajorAspect, 1), policy('square', NaN), policy('square', -1), policy('square', 181),
    { id: 'qa', version: '1', aspects: [{ kind: 'square', orbDegrees: 15 }, { kind: 'trine', orbDegrees: 15 }] },
    { id: 'qa', version: '1', aspects: [{ kind: 'square', orbDegrees: 0 }, { kind: 'square', orbDegrees: 0 }] }]) {
    assert.throws(() => calculateAspects(pair(0, 90), invalid as AspectPolicy), RangeError);
  }
});

test('independent vector oracle over JPL positions and candidate pipeline', async () => {
  const report = await evaluateAspectReference();
  assert.equal(report.epochs, 7);
  assert.equal(report.pairs, 315);
  assert.equal(report.ambiguousPairs, 1);
  assert.equal(report.verifiedCandidatePairs, 314);
  assert.equal(report.inconclusive[0]?.pair, 'moon/pluto');
  assert.equal(report.inconclusive[0]?.candidatePass, null);
  assert.deepEqual(report.failures, []);
  assert.equal(report.productionPromotion, false);
});

test('adjacent representable floats straddle both orb edges without hidden nominal tolerance', () => {
  const adjacent = (value: number, step: bigint) => {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, value);
    view.setBigUint64(0, view.getBigUint64(0) + step);
    return view.getFloat64(0);
  };
  for (const [kind, angle] of [['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180]] as const) {
    for (const edge of [angle - 4, angle + 4].filter((value) => value > 0 && value < 180)) {
      const outsideStep = edge < angle ? -1n : 1n;
      assert.equal(calculateAspects(pair(0, edge), policy(kind, 4)).aspects.length, 1);
      assert.equal(calculateAspects(pair(0, adjacent(edge, outsideStep)), policy(kind, 4)).aspects.length, 0);
      assert.equal(calculateAspects(pair(0, adjacent(edge, -outsideStep)), policy(kind, 4)).aspects.length, 1);
    }
  }
});

test('sparse policies, malformed positions, coerced kinds and identifier boundaries are rejected', () => {
  for (const invalid of [null, undefined, {}, [undefined], new Array(1)]) assert.throws(() => calculateAspects(invalid as unknown as AspectPosition[], policy('square', 1)), RangeError);
  for (const invalid of [new Array(1), [{ kind: ['square'], orbDegrees: 1 }], [null]]) assert.throws(() => calculateAspects(pair(0, 90), { id: 'qa', version: '1', aspects: invalid } as unknown as AspectPolicy), RangeError);
  for (const id of ['x'.repeat(81), ' qa', 'qa\n', '_qa', 'á']) assert.throws(() => calculateAspects([], { ...policy('square', 1), id }), RangeError);
  assert.equal(calculateAspects([], { ...policy('square', 1), id: 'x'.repeat(80) }).pairsEvaluated, 0);
  assert.equal(calculateAspects(pair(0, 180), policy('conjunction', 180)).aspects.length, 1);
  const positions = [{ body: 'sun' as const, longitude: 0 }, { body: 'moon' as const, longitude: 90 }];
  const result = calculateAspects(positions, policy('square', 1));
  positions[0]!.longitude = 10;
  assert.equal(result.inputPositions[0]!.longitude, 0);
  assert.equal(result.inputPrecision, 'not-certified');
});

test('stability separates unknown precision, conditional stability and boundary sensitivity', () => {
  const rules = policy('square', 6);
  assert.equal(assessAspectStability(pair(0, 90), rules, null).pairs[0]?.status, 'unknown-accuracy');
  for (const value of [90, 30]) assert.equal(assessAspectStability(pair(0, value), rules, 1).pairs[0]?.status, 'stable-under-budget');
  for (const value of [83.99, 84, 84.01, 95.99, 96, 96.01]) assert.equal(assessAspectStability(pair(0, value), rules, 60 / 3600).pairs[0]?.status, 'boundary-sensitive');
  assert.equal(assessAspectStability(pair(0, 96), rules, 0).pairs[0]?.status, 'boundary-sensitive');
  assert.equal(assessAspectStability(pair(359, 1), policy('conjunction', 3), 0.1).pairs[0]?.status, 'stable-under-budget');
  assert.equal(assessAspectStability(pair(0, 180), policy('opposition', 1), 0.1).pairs[0]?.status, 'stable-under-budget');
  assert.equal(assessAspectStability(pair(0, 90), rules, 180).pairs[0]?.status, 'boundary-sensitive');
  assert.equal(assessAspectStability([], rules, null).pairs.length, 0);
  for (const invalid of [-1, NaN, Infinity, 181, undefined, '1']) assert.throws(() => assessAspectStability([], rules, invalid as number), RangeError);
});

test('conditional stability survives a grid of independent perturbations including the wrap', () => {
  const rules: AspectPolicy = { id: 'qa-grid', version: '1', aspects: [
    { kind: 'conjunction', orbDegrees: 8 }, { kind: 'sextile', orbDegrees: 4 }, { kind: 'square', orbDegrees: 6 }, { kind: 'trine', orbDegrees: 6 }, { kind: 'opposition', orbDegrees: 8 }
  ] };
  for (let a = 0; a < 360; a += 7) for (let b = 0; b < 360; b += 11) {
    const assessment = assessAspectStability(pair(a, b), rules, 0.5);
    if (assessment.pairs[0]?.status !== 'stable-under-budget') continue;
    const nominal = assessment.calculation.aspects[0]?.kind ?? null;
    for (const da of [-0.5, 0, 0.5]) for (const db of [-0.5, 0, 0.5]) {
      const changed = calculateAspects(pair((a + da + 360) % 360, (b + db + 360) % 360), rules);
      assert.equal(changed.aspects[0]?.kind ?? null, nominal);
    }
  }
});
