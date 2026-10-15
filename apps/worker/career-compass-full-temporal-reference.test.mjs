import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  createCareerCompassFullBasisCalculator,
  validCareerCompassFullBasis,
} from './src/career-compass-full-basis.ts';

// Independent, finite JPL checks at the private product boundary. The 90-day
// temporal grid and one-year daily station grids are samples, not a global
// precision, exact station-time, civil-time, or production certification.
const root = new URL('../../packages/astrology/fixtures/coverage/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const angleError = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const signedDelta = (a, b) => ((a - b + 540) % 360) - 180;
const ARCSECOND = 1 / 3600;
const bodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const movingBodies = bodies.filter(body => body !== 'sun' && body !== 'moon');
const targetIds = {sun: 10, moon: 301, mercury: 199, venus: 299, mars: 499,
  jupiter: 599, saturn: 699, uranus: 799, neptune: 899, pluto: 999};
const context = {runId: '00000000-0000-4000-8000-000000000092', signal: new AbortController().signal};

function referenceSeries(source) {
  const url = new URL(source.url);
  assert.equal(url.origin, 'https://ssd.jpl.nasa.gov');
  assert.equal(url.pathname, '/api/horizons.api');
  assert.equal(url.searchParams.get('COMMAND'), `'${targetIds[source.body]}'`);
  assert.equal(url.searchParams.get('CENTER'), "'500@399'");
  assert.equal(url.searchParams.get('EPHEM_TYPE'), "'OBSERVER'");
  assert.equal(url.searchParams.get('QUANTITIES'), "'20,31'");
  assert.equal(url.searchParams.get('APPARENT'), "'AIRLESS'");
  assert.equal(url.searchParams.get('TIME_TYPE'), "'UT'");
  assert.equal(url.searchParams.get('START_TIME'), `'${source.start.slice(0, -1)}'`);
  assert.equal(url.searchParams.get('STOP_TIME'), `'${source.stop.slice(0, -1)}'`);
  assert.equal(url.searchParams.get('STEP_SIZE'), `'${source.stepDays} d'`);
  assert.equal(url.searchParams.get('CSV_FORMAT'), "'YES'");
  assert.equal(url.searchParams.get('EXTRA_PREC'), "'YES'");
  assert.equal(source.signature.source, 'NASA/JPL Horizons API');
  const raw = readFileSync(new URL(source.file, root));
  assert.equal(sha256(raw), source.sha256, `${source.body}/${source.suite}: source hash`);
  const text = raw.toString('utf8');
  assert.match(text, new RegExp(`Target body name:.*\\(${targetIds[source.body]}\\)`));
  assert.match(text, /Center body name: Earth \(399\)/);
  assert.match(text, /Center-site name: GEOCENTRIC/);
  const parts = text.split('$$SOE');
  assert.equal(parts.length, 2);
  const rows = parts[1].split('$$EOE')[0].trim().split('\n');
  const step = source.stepDays * 86400000;
  assert.equal(rows.length, Math.floor((Date.parse(source.stop) - Date.parse(source.start)) / step) + 1);
  return rows.map((line, index) => {
    const cells = line.split(',').map(cell => cell.trim());
    const jd = Number(cells[1]);
    const distanceAu = Number(cells[4]);
    const longitude = Number(cells[6]);
    const latitude = Number(cells[7]);
    const epoch = new Date(Date.parse(source.start) + index * step).toISOString();
    assert.ok([jd, distanceAu, longitude, latitude].every(Number.isFinite));
    assert.ok(Math.abs(jd - (Date.parse(epoch) / 86400000 + 2440587.5)) < 1e-8);
    return {epoch, longitude, latitude, distanceAu};
  });
}

async function privateSnapshot(calculator, epoch) {
  const birth = {localDateTime: epoch.slice(0, -1), utcInstant: epoch,
    timezone: 'UTC', latitude: -19.9167, longitude: -43.9345,
    locationSource: 'synthetic-jpl-envelope'};
  const input = {version: 'atv-workflow/1.0.0', productId: 'career-compass',
    consent: {storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false},
    birth, context: 'Ensaio técnico fictício da base de carreira.'};
  const snapshot = await calculator(input, context);
  assert.equal(validCareerCompassFullBasis(input, snapshot), true, epoch);
  assert.equal(snapshot.data.projection.publication, 'blocked');
  assert.equal(snapshot.data.provenance.accuracyStatus, 'experimental');
  assert.deepEqual(snapshot.data.chart.input, birth);
  return new Map(snapshot.data.positions.map(position => [position.body, position]));
}

function comparePosition(actual, reference, label, maxima) {
  assert.ok(actual, `${label}: missing position`);
  const longitudeArcsec = angleError(actual.longitude, reference.longitude) / ARCSECOND;
  const latitudeArcsec = Math.abs(actual.latitude - reference.latitude) / ARCSECOND;
  const distanceRelative = Math.abs(actual.distanceAu / reference.distanceAu - 1);
  maxima.longitudeArcsec = Math.max(maxima.longitudeArcsec, longitudeArcsec);
  maxima.latitudeArcsec = Math.max(maxima.latitudeArcsec, latitudeArcsec);
  maxima.distanceRelative = Math.max(maxima.distanceRelative, distanceRelative);
  assert.ok(longitudeArcsec <= manifest.tolerance.longitudeArcsec, `${label}: JPL longitude ${longitudeArcsec}"`);
  assert.ok(latitudeArcsec <= manifest.tolerance.latitudeArcsec, `${label}: JPL latitude ${latitudeArcsec}"`);
  assert.ok(distanceRelative <= manifest.tolerance.distanceRelative, `${label}: JPL distance ${distanceRelative}`);
}

test('private Career Compass full basis matches hashed JPL epochs across 1900–2099', async t => {
  assert.equal(manifest.schemaVersion, 'atv-horizons-coverage/1');
  assert.equal(manifest.productionPromotion, false);
  assert.deepEqual(manifest.tolerance, {longitudeArcsec: 60, latitudeArcsec: 60,
    distanceRelative: 0.001, motionBudgetDegrees: 2 / 60});
  const sources = manifest.sources.filter(source => source.suite === 'temporal');
  assert.deepEqual(sources.map(source => source.body).sort(), [...bodies].sort());
  const series = new Map(sources.map(source => [source.body, referenceSeries(source)]));
  const count = series.get('sun').length;
  assert.equal(count, 812);
  assert.ok([...series.values()].every(rows => rows.length === count));
  const start = Date.parse('1900-01-01T12:00:00Z');
  const indexes = [0, 1, ...[1925, 1950, 1975, 2000, 2025, 2050, 2075, 2099]
    .map(year => Math.round((Date.parse(`${year}-01-01T12:00:00Z`) - start) / (90 * 86400000)))]
    .filter(index => index >= 0 && index < count);
  indexes.push(count - 1);
  assert.equal(indexes.length, 11);
  assert.equal(series.get('sun')[indexes[0]].epoch, '1900-01-01T12:00:00.000Z');
  assert.equal(series.get('sun')[indexes.at(-1)].epoch.slice(0, 4), '2099');
  const calculator = createCareerCompassFullBasisCalculator();
  const maxima = {longitudeArcsec: 0, latitudeArcsec: 0, distanceRelative: 0};
  for (const index of indexes) {
    const epoch = series.get('sun')[index].epoch;
    const actual = await privateSnapshot(calculator, epoch);
    assert.equal(actual.size, 10);
    for (const body of bodies) {
      const reference = series.get(body)[index];
      assert.equal(reference.epoch, epoch);
      comparePosition(actual.get(body), reference, `${epoch}/${body}`, maxima);
    }
  }
  t.diagnostic(JSON.stringify({epochCount: indexes.length, positionComparisons: indexes.length * bodies.length,
    first: series.get('sun')[indexes[0]].epoch, last: series.get('sun')[indexes.at(-1)].epoch, maxima,
    productionPromotion: false}));
});

test('private Career Compass full basis matches daily JPL samples around retrograde transitions', async t => {
  const sources = manifest.sources.filter(source => source.suite === 'motion');
  assert.deepEqual(sources.map(source => source.body).sort(), [...movingBodies].sort());
  const calculator = createCareerCompassFullBasisCalculator();
  const maxima = {longitudeArcsec: 0, latitudeArcsec: 0, distanceRelative: 0};
  const sampled = [];
  let verifiedDirections = 0;
  let inconclusiveDirections = 0;
  for (const source of sources) {
    const series = referenceSeries(source);
    const motion = series.map((row, index) => index > 0 && index < series.length - 1
      ? signedDelta(series[index + 1].longitude, series[index - 1].longitude) : null);
    const transition = motion.findIndex((degrees, index) => index > 1 && degrees !== null &&
      motion[index - 1] !== null && Math.sign(degrees) !== Math.sign(motion[index - 1]));
    assert.ok(transition > 1, `${source.body}: JPL transition missing`);
    const beforeSign = Math.sign(motion[transition - 1]);
    const afterSign = Math.sign(motion[transition]);
    const conclusive = (index, sign) => motion[index] !== null && Math.sign(motion[index]) === sign &&
      Math.abs(motion[index]) > manifest.tolerance.motionBudgetDegrees;
    const before = Array.from({length: transition - 1}, (_, offset) => transition - 1 - offset)
      .find(index => conclusive(index, beforeSign));
    const after = Array.from({length: series.length - transition - 1}, (_, offset) => transition + offset)
      .find(index => conclusive(index, afterSign));
    assert.ok(before !== undefined && after !== undefined,
      `${source.body}: both sides of sampled transition must have conclusive motion`);
    const indexes = [...new Set([before, after, ...Array.from({length: 7}, (_, offset) => transition + offset - 3)])]
      .filter(index => index > 0 && index < series.length - 1).sort((a, b) => a - b);
    for (const index of indexes) {
      const reference = series[index];
      const actual = await privateSnapshot(calculator, reference.epoch);
      const position = actual.get(source.body);
      comparePosition(position, reference, `${source.body}/${reference.epoch}`, maxima);
      if (Math.abs(motion[index]) <= manifest.tolerance.motionBudgetDegrees) {
        inconclusiveDirections++;
      } else {
        assert.equal(position.retrograde, motion[index] < 0,
          `${source.body}/${reference.epoch}: JPL direction outside station uncertainty`);
        verifiedDirections++;
      }
      sampled.push(`${source.body}/${reference.epoch}`);
    }
  }
  assert.equal(new Set(sampled).size, sampled.length);
  assert.ok(verifiedDirections >= movingBodies.length * 2);
  assert.ok(inconclusiveDirections > 0);
  t.diagnostic(JSON.stringify({bodies: movingBodies.length, sampledDays: sampled.length,
    verifiedDirections, inconclusiveDirections, maxima, stationTimingCertified: false,
    productionPromotion: false}));
});

test('private Career Compass full basis matches hashed ERFA house envelope 1900–2099', async t => {
  const fixtureRoot = new URL('../../packages/astrology/fixtures/career-envelope-erfa/', import.meta.url);
  const erfaManifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureRoot), 'utf8'));
  const fixtureBytes = readFileSync(new URL('erfa-reference.json', fixtureRoot));
  const fixture = JSON.parse(fixtureBytes);
  assert.equal(erfaManifest.schemaVersion, 'atv-career-envelope-erfa-manifest/1');
  assert.equal(erfaManifest.promotion, false);
  assert.equal(sha256(fixtureBytes), erfaManifest.fixtureSha256);
  assert.equal(sha256(readFileSync(new URL('../../scripts/generate-career-envelope-erfa.py', import.meta.url))),
    erfaManifest.generatorSha256);
  assert.equal(sha256(readFileSync(new URL('../../scripts/generate-house-reference.py', import.meta.url))),
    erfaManifest.geometrySourceSha256);
  assert.equal(fixture.schemaVersion, 'atv-career-envelope-erfa/1');
  assert.equal(fixture.reference.pyerfa, '2.0.1.5');
  assert.equal(fixture.reference.erfa, '2.0.1');
  assert.equal(fixture.reference.numpy, '2.2.6');
  assert.equal(fixture.reference.dut1Seconds, 0);
  assert.deepEqual(fixture.tolerancesArcsec, {midheaven: 60, ascendant: 60, cusp: 120});
  assert.ok(erfaManifest.sources.some(source => source.startsWith('https://github.com/liberfa/erfa/')));
  assert.equal(fixture.cases.length, 27);
  assert.equal(erfaManifest.count, fixture.cases.length);
  assert.equal(new Set(fixture.cases.map(item => item.id)).size, 27);
  assert.equal(new Set(fixture.cases.map(item => item.input.utcInstant)).size, 9);
  assert.equal(fixture.cases.filter(item => item.expectedStatus === 'ok').length, 18);
  assert.equal(fixture.cases.filter(item => item.expectedStatus === 'not-applicable').length, 9);
  assert.equal(fixture.cases[0].input.utcInstant, '1900-01-01T00:00:00Z');
  assert.equal(fixture.cases.at(-1).input.utcInstant, '2099-12-31T23:59:59.999Z');

  const calculator = createCareerCompassFullBasisCalculator();
  const maxima = {midheavenArcsec: 0, ascendantArcsec: 0, cuspArcsec: 0};
  for (const item of fixture.cases) {
    const input = {version: 'atv-workflow/1.0.0', productId: 'career-compass',
      consent: {storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false},
      birth: item.input, context: 'Ensaio técnico fictício da geometria de carreira.'};
    const snapshot = await calculator(input, context);
    assert.equal(validCareerCompassFullBasis(input, snapshot), true, item.id);
    assert.equal(snapshot.data.projection.publication, 'blocked', item.id);
    assert.equal(snapshot.data.provenance.accuracyStatus, 'experimental', item.id);
    assert.deepEqual(snapshot.data.chart.input, item.input, item.id);
    const mcError = angleError(snapshot.data.angles.midheaven, item.midheaven) / ARCSECOND;
    maxima.midheavenArcsec = Math.max(maxima.midheavenArcsec, mcError);
    assert.ok(mcError <= fixture.tolerancesArcsec.midheaven, `${item.id}: ERFA midheaven ${mcError}"`);
    assert.equal(snapshot.data.houses.status, item.expectedStatus, item.id);
    if (item.expectedStatus === 'ok') {
      const ascError = angleError(snapshot.data.angles.ascendant, item.ascendant) / ARCSECOND;
      maxima.ascendantArcsec = Math.max(maxima.ascendantArcsec, ascError);
      assert.ok(ascError <= fixture.tolerancesArcsec.ascendant, `${item.id}: ERFA ascendant ${ascError}"`);
      assert.equal(snapshot.data.houses.cusps.length, 12, item.id);
      for (let index = 0; index < 12; index++) {
        const cuspError = angleError(snapshot.data.houses.cusps[index], item.cusps[index]) / ARCSECOND;
        maxima.cuspArcsec = Math.max(maxima.cuspArcsec, cuspError);
        assert.ok(cuspError <= fixture.tolerancesArcsec.cusp,
          `${item.id}/cusp-${index + 1}: ERFA cusp ${cuspError}"`);
      }
    } else {
      assert.equal(snapshot.data.angles.ascendant, null, item.id);
      assert.deepEqual(snapshot.data.houses.cusps, [], item.id);
    }
  }
  t.diagnostic(JSON.stringify({cases: fixture.cases.length, houseCases: 18, polarRefusals: 9,
    houseCuspComparisons: 18 * 12, maxima, dut1Measured: false, productionPromotion: false}));
});
