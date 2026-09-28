import assert from 'node:assert/strict';
import test from 'node:test';
import { bodies } from './bodies.ts';
import { calculateCrossAspects, assessCrossAspectStability, type AspectPolicy, type AspectPosition, type MajorAspect } from './aspects.ts';

const position = (longitude: number): AspectPosition[] => [{ body: 'sun', longitude }];
const rule = (kind: MajorAspect, orbDegrees: number): AspectPolicy => ({ id: 'qa-cross-only', version: '1', aspects: [{ kind, orbDegrees }] });
const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 } as const;
const adjacent = (value: number, step: bigint) => {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value); view.setBigUint64(0, view.getBigUint64(0) + step);
  return view.getFloat64(0);
};

test('cross pairs retain A/B identity, including equal bodies and both ordered directions', () => {
  const a: AspectPosition[] = [{ body: 'moon', longitude: 180 }, { body: 'sun', longitude: 0 }];
  const result = calculateCrossAspects(a, a, { id: 'qa', version: '1', aspects: [
    { kind: 'conjunction', orbDegrees: 0 }, { kind: 'opposition', orbDegrees: 0 }
  ] });
  assert.equal(result.pairsEvaluated, 4);
  assert.deepEqual(result.aspects.map(p => [p.first, p.second, p.kind]), [
    ['sun', 'sun', 'conjunction'], ['sun', 'moon', 'opposition'],
    ['moon', 'sun', 'opposition'], ['moon', 'moon', 'conjunction']
  ]);
  assert.deepEqual(result.roles, ['person-a', 'person-b']);
  assert.equal(result.algorithmVersion, 'atv-cross-major-aspects/1');
  assert.equal(result.inputPrecision, 'not-certified');
  assert.equal(result.motion, 'not-evaluated');
  assert.equal(result.coordinate, 'ecliptic-longitude');
});

test('cross exact angles, wrap and adjacent orb floats have no hidden tolerance', () => {
  for (const [kind, angle] of Object.entries(angles) as [MajorAspect, number][]) {
    assert.equal(calculateCrossAspects(position(0), position(angle), rule(kind, 0)).aspects[0]?.orbDegrees, 0);
    for (const edge of [angle - 4, angle + 4].filter(v => v > 0 && v < 180)) {
      const outside = edge < angle ? -1n : 1n;
      assert.equal(calculateCrossAspects(position(0), position(edge), rule(kind, 4)).aspects.length, 1);
      assert.equal(calculateCrossAspects(position(0), position(adjacent(edge, outside)), rule(kind, 4)).aspects.length, 0);
      assert.equal(calculateCrossAspects(position(0), position(adjacent(edge, -outside)), rule(kind, 4)).aspects.length, 1);
    }
  }
  assert.equal(calculateCrossAspects(position(359), position(1), rule('conjunction', 2)).aspects[0]?.separationDegrees, 2);
});

test('canonical order and detached snapshots preserve asymmetric chart inputs and policy', () => {
  const a = [{ body: 'mars', longitude: 91 }, { body: 'sun', longitude: 0 }] satisfies AspectPosition[];
  const b = [{ body: 'venus', longitude: 180 }, { body: 'moon', longitude: 3 }] satisfies AspectPosition[];
  const policy = { id: 'qa', version: '1', aspects: [ { kind: 'opposition' as const, orbDegrees: 4 }, { kind: 'square' as const, orbDegrees: 4 } ] };
  const result = calculateCrossAspects(a, b, policy);
  assert.deepEqual(result, calculateCrossAspects([...a].reverse(), [...b].reverse(), { ...policy, aspects: [...policy.aspects].reverse() }));
  const mirrored = calculateCrossAspects(b, a, policy);
  assert.deepEqual(result.aspects.map(p => `${p.first}/${p.second}/${p.kind}`).sort(), mirrored.aspects.map(p => `${p.second}/${p.first}/${p.kind}`).sort());
  a[0]!.longitude = 22; b[0]!.longitude = 23; policy.aspects[0]!.orbDegrees = 3;
  assert.equal(result.inputPositions.first[1]?.longitude, 91);
  assert.equal(result.inputPositions.second[1]?.longitude, 180);
  assert.equal(result.policy.aspects[1]?.orbDegrees, 4);
  assert.doesNotThrow(() => calculateCrossAspects(Object.freeze(position(0).map(p => Object.freeze(p))), Object.freeze(position(90).map(p => Object.freeze(p))), Object.freeze(rule('square', 0))));
});

test('empty, unequal and ten-by-ten sets evaluate exactly the Cartesian product', () => {
  const all = bodies.map((body, i) => ({ body, longitude: i * 30 }));
  for (const [a, b] of [[[], all], [all, []], [position(0), all], [all, all]] as [AspectPosition[], AspectPosition[]][]) {
    const result = calculateCrossAspects(a, b, rule('conjunction', 180));
    assert.equal(result.pairsEvaluated, a.length * b.length);
    assert.equal(result.aspects.length, a.length * b.length);
  }
});

test('invalid input on either side or invalid policy refuses even with an empty counterpart', () => {
  for (const invalid of [undefined, null, {}, new Array(1), [null], position(NaN), position(Infinity), position(-1), position(360),
    [{ body: 'earth', longitude: 0 }], [...position(0), ...position(1)], position('90' as unknown as number)]) {
    assert.throws(() => calculateCrossAspects(invalid as AspectPosition[], [], rule('square', 1)), RangeError);
    assert.throws(() => calculateCrossAspects([], invalid as AspectPosition[], rule('square', 1)), RangeError);
  }
  for (const invalid of [undefined, null, {}, { ...rule('square', 1), id: '' }, { ...rule('square', 1), aspects: new Array(1) },
    rule('bogus' as MajorAspect, 1), rule('square', NaN), rule('square', -1), rule('square', 181),
    { id: 'qa', version: '1', aspects: [{ kind: 'square', orbDegrees: 15 }, { kind: 'trine', orbDegrees: 15 }] }]) {
    assert.throws(() => calculateCrossAspects([], [], invalid as AspectPolicy), RangeError);
  }
});

test('900 synthetic cross pairs match an independent unit-vector angular oracle', () => {
  const policy: AspectPolicy = { id: 'qa-vector', version: '1', aspects: (Object.keys(angles) as MajorAspect[]).map(kind => ({ kind, orbDegrees: 5.125 })) };
  let checked = 0;
  for (let epoch = 0; epoch < 9; epoch++) {
    const a = bodies.map((body, i) => ({ body, longitude: (i * 37 + epoch * 11) % 360 }));
    const b = bodies.map((body, i) => ({ body, longitude: (i * 31 + epoch * 17) % 360 }));
    const result = calculateCrossAspects(a, b, policy);
    for (const left of a) for (const right of b) {
      const x = left.longitude * Math.PI / 180, y = right.longitude * Math.PI / 180;
      const cross = Math.cos(x) * Math.sin(y) - Math.sin(x) * Math.cos(y);
      const dot = Math.cos(x) * Math.cos(y) + Math.sin(x) * Math.sin(y);
      const separation = Math.atan2(Math.abs(cross), dot) * 180 / Math.PI;
      const expected = policy.aspects.find(p => Math.abs(separation - angles[p.kind]) <= p.orbDegrees);
      const actual = result.aspects.find(p => p.first === left.body && p.second === right.body);
      assert.equal(actual?.kind, expected?.kind);
      if (actual) assert.ok(Math.abs(actual.separationDegrees - separation) < 1e-10);
      checked++;
    }
  }
  assert.equal(checked, 900);
});

test('cross stability requires both error assumptions and includes nominally absent aspects', () => {
  for (const budgets of [{ first: null, second: 0 }, { first: 0, second: null }, { first: null, second: null }]) {
    const result = assessCrossAspectStability(position(0), position(30), rule('square', 6), budgets);
    assert.equal(result.calculation.aspects.length, 0);
    assert.equal(result.pairs[0]?.status, 'unknown-accuracy');
    assert.equal(result.pairs[0]?.separationIntervalDegrees, null);
  }
  const budgets = { first: 0.25, second: 0.75 };
  const result = assessCrossAspectStability(position(0), position(90), rule('square', 6), budgets);
  assert.equal(result.algorithmVersion, 'atv-cross-aspect-stability/1');
  assert.deepEqual(result.pairs[0]?.separationIntervalDegrees, [89 - 1e-12, 91 + 1e-12]);
  assert.equal(result.pairs[0]?.status, 'stable-under-budget');
  budgets.first = 90; assert.equal(result.assumedLongitudeErrorDegrees.first, 0.25);
  assert.equal(assessCrossAspectStability(position(0), position(96), rule('square', 6), { first: 0, second: 0 }).pairs[0]?.status, 'boundary-sensitive');
  assert.equal(assessCrossAspectStability(position(0), position(30), rule('square', 6), { first: 180, second: 180 }).pairs[0]?.status, 'boundary-sensitive');
});

test('invalid cross error budgets refuse before calculation including empty charts', () => {
  for (const invalid of [undefined, null, {}, { first: 0 }, { second: 0 }, ...[-1, 181, NaN, Infinity, '1', undefined].flatMap(value => [{ first: value, second: 0 }, { first: 0, second: value }])]) {
    assert.throws(() => assessCrossAspectStability([], [], rule('square', 1), invalid as { first: number; second: number }), RangeError);
  }
});

test('independent perturbations preserve every classification declared stable under unequal budgets', () => {
  const policy: AspectPolicy = { id: 'qa-grid', version: '1', aspects: (Object.keys(angles) as MajorAspect[]).map(kind => ({ kind, orbDegrees: 4 })) };
  for (let a = 0; a < 360; a += 13) for (let b = 0; b < 360; b += 17) {
    const result = assessCrossAspectStability(position(a), position(b), policy, { first: 0.25, second: 0.75 });
    if (result.pairs[0]?.status !== 'stable-under-budget') continue;
    const nominal = result.calculation.aspects[0]?.kind;
    for (const da of [-0.25, 0, 0.25]) for (const db of [-0.75, 0, 0.75]) {
      assert.equal(calculateCrossAspects(position((a + da + 360) % 360), position((b + db + 360) % 360), policy).aspects[0]?.kind, nominal);
    }
  }
});
