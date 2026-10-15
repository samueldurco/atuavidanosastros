import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createCareerCompassFullBasisCalculator, validCareerCompassFullBasis } from './src/career-compass-full-basis.ts';
import { compassQaProfiles } from '../web/src/lib/trials/reconstruction/compass-qa-profiles.ts';

// Finite reference for the exact synthetic inputs behind the six V6 owner PDFs.
// It does not certify timezone history, DUT1, polar houses, stations, or release.
const root = new URL('../../packages/astrology/fixtures/career-six-oracle/', import.meta.url);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = name => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const iso = value => new Date(value).toISOString();
const angleError = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const AS = 1 / 3600;
const planetTolerance = { longitude: 60 * AS, latitude: 60 * AS, distanceRatio: 0.001 };
const angleTolerance = { mc: 60 * AS, asc: 60 * AS, cusp: 120 * AS };
const rulers = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury',
  'venus', 'pluto', 'jupiter', 'saturn', 'uranus', 'neptune'];
const aspectPolicy = [
  ['conjunction', 0, 6], ['sextile', 60, 4], ['square', 90, 6],
  ['trine', 120, 6], ['opposition', 180, 6]
];

function referenceHouse(longitude, cusps) {
  const index = cusps.findIndex((start, i) =>
    (longitude - start + 360) % 360 < (cusps[(i + 1) % 12] - start + 360) % 360);
  return index < 0 ? null : index + 1;
}

function loadOracle() {
  const horizons = readJson('manifest.json');
  assert.equal(horizons.schemaVersion, 'atv-career-six-oracle/1');
  assert.equal(horizons.source, 'NASA/JPL Horizons API');
  assert.ok(Number.isFinite(Date.parse(horizons.retrievedAt)));
  assert.equal(horizons.sources.length, 10);
  assert.deepEqual(horizons.epochs, ['1985-08-21T17:20:00.000Z', '1992-05-17T11:40:00.000Z']);
  const expectedInstants = horizons.epochs.flatMap(epoch => [-3600000, 0, 3600000]
    .map(shift => new Date(Date.parse(epoch) + shift).toISOString()));
  assert.deepEqual(horizons.instants, expectedInstants);
  const positions = new Map();
  for (const source of horizons.sources) {
    const url = new URL(source.url);
    assert.equal(url.origin, 'https://ssd.jpl.nasa.gov');
    assert.equal(url.pathname, '/api/horizons.api');
    assert.equal(url.searchParams.get('CENTER'), "'500@399'");
    assert.equal(url.searchParams.get('QUANTITIES'), "'20,31'");
    assert.equal(url.searchParams.get('TIME_TYPE'), "'UT'");
    assert.equal(url.searchParams.get('APPARENT'), "'AIRLESS'");
    assert.equal(source.signature.source, 'NASA/JPL Horizons API');
    assert.equal(source.file, `${source.body}.txt`);
    const bytes = readFileSync(new URL(source.file, root));
    assert.equal(sha256(bytes), source.sha256, `${source.body}: JPL source hash`);
    const chunks = bytes.toString('utf8').split('$$SOE');
    assert.equal(chunks.length, 2);
    const rows = chunks[1].split('$$EOE')[0].trim().split('\n');
    assert.equal(rows.length, expectedInstants.length, `${source.body}: epoch count`);
    const series = new Map();
    rows.forEach((line, i) => {
      const columns = line.split(',').map(part => part.trim());
      const row = { jd: Number(columns[1]), distanceAu: Number(columns[4]),
        longitude: Number(columns[6]), latitude: Number(columns[7]) };
      assert.ok(Object.values(row).every(Number.isFinite), `${source.body}: JPL numeric row ${i}`);
      assert.ok(Math.abs(row.jd - (Date.parse(expectedInstants[i]) / 86400000 + 2440587.5)) < 1e-8,
        `${source.body}: JPL timestamp ${i}`);
      series.set(expectedInstants[i], row);
    });
    positions.set(source.body, series);
  }

  const erfaManifest = readJson('erfa-manifest.json');
  const erfaBytes = readFileSync(new URL('erfa-reference.json', root));
  assert.equal(erfaManifest.schemaVersion, 'atv-career-six-erfa-manifest/1');
  assert.equal(erfaManifest.promotion, false);
  assert.ok(Number.isFinite(Date.parse(erfaManifest.generatedAt)));
  assert.equal(sha256(erfaBytes), erfaManifest.fixtureSha256);
  assert.equal(sha256(readFileSync(new URL('../../scripts/generate-career-six-erfa.py', import.meta.url))),
    erfaManifest.generatorSha256);
  assert.equal(sha256(readFileSync(new URL('../../scripts/generate-house-reference.py', import.meta.url))),
    erfaManifest.geometrySourceSha256);
  assert.ok(erfaManifest.sources.every(url => url.startsWith('https://')));
  const erfa = JSON.parse(erfaBytes.toString('utf8'));
  assert.equal(erfa.schemaVersion, 'atv-career-six-erfa/1');
  assert.equal(erfa.reference.pyerfa, '2.0.1.5');
  assert.equal(erfa.reference.erfa, '2.0.1');
  assert.equal(erfa.reference.dut1Seconds, 0);
  assert.deepEqual(erfa.tolerancesArcsec, { midheaven: 60, ascendant: 60, cusp: 120 });
  assert.equal(erfa.cases.length, 2);
  assert.deepEqual(new Set(erfa.cases.map(row => iso(row.utcInstant))), new Set(horizons.epochs));
  return { positions, horizons, erfa };
}

test('the six V6 fictional Career Compass births match hashed JPL and ERFA evidence', async t => {
  const { positions, horizons, erfa } = loadOracle();
  assert.deepEqual(compassQaProfiles.map(profile => profile.slug), [
    'livia', 'ceramics-employment', 'leadership', 'workload', 'study', 'different-birth'
  ]);
  assert.equal(new Set(compassQaProfiles.map(profile => iso(profile.input.birth.utcInstant))).size, 2);
  const calculator = createCareerCompassFullBasisCalculator();
  const signal = new AbortController().signal;
  const counters = { profiles: 0, uniqueBirths: 2, positionComparisons: 0,
    angleComparisons: 0, verifiedHouseDecisions: 0, ambiguousHouseDecisions: 0,
    verifiedAspectDecisions: 0, ambiguousAspectDecisions: 0,
    verifiedAngularDecisions: 0, ambiguousAngularDecisions: 0,
    verifiedMotionDecisions: 0, ambiguousMotionDecisions: 0,
    maxLongitudeArcsec: 0, maxLatitudeArcsec: 0, maxMcArcsec: 0,
    maxAscArcsec: 0, maxCuspArcsec: 0 };
  for (const profile of compassQaProfiles) {
    const birth = profile.input.birth;
    const epoch = iso(birth.utcInstant);
    const angleRef = erfa.cases.find(row => iso(row.utcInstant) === epoch &&
      row.latitude === birth.latitude && row.longitude === birth.longitude);
    assert.ok(angleRef, `${profile.slug}: exact ERFA birth and site`);
    const snapshot = await calculator(profile.input, { runId: profile.id, signal });
    assert.equal(validCareerCompassFullBasis(profile.input, snapshot), true, profile.slug);
    assert.equal(snapshot.status, 'experimental');
    assert.equal(snapshot.data.projection.publication, 'blocked');
    assert.deepEqual(snapshot.data.chart.input, birth, profile.slug);
    assert.equal(snapshot.data.provenance.temporal.utcInstant, epoch);
    assert.equal(snapshot.data.provenance.provider, 'caelus');
    assert.equal(snapshot.data.provenance.providerVersion, '0.24.1');
    assert.equal(snapshot.data.provenance.referenceFrame, 'geocentric-apparent-ecliptic-of-date');
    const actualPositions = new Map(snapshot.data.positions.map(row => [row.body, row]));
    assert.equal(actualPositions.size, 10);
    assert.deepEqual([...actualPositions.keys()].sort(), [...positions.keys()].sort());
    const expectedPositions = new Map();
    for (const [body, series] of positions) {
      const expected = series.get(epoch);
      const actual = actualPositions.get(body);
      assert.ok(expected && actual, `${profile.slug}/${body}`);
      expectedPositions.set(body, expected);
      const longitudeError = angleError(actual.longitude, expected.longitude);
      const latitudeError = Math.abs(actual.latitude - expected.latitude);
      counters.maxLongitudeArcsec = Math.max(counters.maxLongitudeArcsec, longitudeError / AS);
      counters.maxLatitudeArcsec = Math.max(counters.maxLatitudeArcsec, latitudeError / AS);
      assert.ok(longitudeError <= planetTolerance.longitude, `${profile.slug}/${body}: JPL longitude`);
      assert.ok(latitudeError <= planetTolerance.latitude, `${profile.slug}/${body}: JPL latitude`);
      assert.ok(Math.abs(actual.distanceAu / expected.distanceAu - 1) <= planetTolerance.distanceRatio,
        `${profile.slug}/${body}: JPL distance`);
      const index = horizons.instants.indexOf(epoch);
      const before = series.get(horizons.instants[index - 1]);
      const after = series.get(horizons.instants[index + 1]);
      assert.ok(before && after);
      const travel = ((after.longitude - before.longitude + 540) % 360) - 180;
      if (Math.abs(travel) > 1e-7) {
        assert.equal(actual.retrograde, travel < 0, `${profile.slug}/${body}: JPL motion`);
        counters.verifiedMotionDecisions++;
      } else counters.ambiguousMotionDecisions++;
      counters.positionComparisons++;
    }

    const mcError = angleError(snapshot.data.angles.midheaven, angleRef.midheaven);
    const ascError = angleError(snapshot.data.angles.ascendant, angleRef.ascendant);
    counters.maxMcArcsec = Math.max(counters.maxMcArcsec, mcError / AS);
    counters.maxAscArcsec = Math.max(counters.maxAscArcsec, ascError / AS);
    assert.ok(mcError <= angleTolerance.mc, `${profile.slug}: ERFA MC`);
    assert.ok(ascError <= angleTolerance.asc, `${profile.slug}: ERFA ascendant`);
    assert.equal(snapshot.data.houses.status, 'ok');
    assert.equal(snapshot.data.houses.cusps.length, 12);
    counters.angleComparisons += 2;
    angleRef.cusps.forEach((cusp, index) => {
      const error = angleError(snapshot.data.houses.cusps[index], cusp);
      counters.maxCuspArcsec = Math.max(counters.maxCuspArcsec, error / AS);
      assert.ok(error <= angleTolerance.cusp, `${profile.slug}: ERFA cusp ${index + 1}`);
      counters.angleComparisons++;
    });
    const ruler = rulers[Math.floor(angleRef.midheaven / 30)];
    assert.equal(snapshot.data.regent.body, ruler, `${profile.slug}: MC ruler`);
    const rulerLongitude = expectedPositions.get(ruler).longitude;
    const cuspDistance = Math.min(...angleRef.cusps.map(cusp => angleError(rulerLongitude, cusp)));
    if (cuspDistance > planetTolerance.longitude + angleTolerance.cusp) {
      assert.equal(snapshot.data.regent.house, referenceHouse(rulerLongitude, angleRef.cusps),
        `${profile.slug}: reference ruler house`);
      counters.verifiedHouseDecisions++;
    } else counters.ambiguousHouseDecisions++;

    const aspectRows = snapshot.data.aspects.aspects;
    const actualAspects = new Map(aspectRows.map(row => [`${row.first}/${row.second}`, row]));
    assert.equal(actualAspects.size, aspectRows.length);
    const bodyOrder = [...actualPositions.keys()];
    for (let i = 0; i < bodyOrder.length; i++) for (let j = i + 1; j < bodyOrder.length; j++) {
      const a = bodyOrder[i], b = bodyOrder[j];
      const separation = angleError(expectedPositions.get(a).longitude, expectedPositions.get(b).longitude);
      const guard = 2 * planetTolerance.longitude;
      if (aspectPolicy.some(([, exact, orb]) => Math.abs(Math.abs(separation - exact) - orb) <= guard)) {
        counters.ambiguousAspectDecisions++;
        continue;
      }
      const expected = aspectPolicy.find(([, exact, orb]) => Math.abs(separation - exact) <= orb);
      const actual = actualAspects.get(`${a}/${b}`);
      assert.equal(actual?.kind, expected?.[0], `${profile.slug}/${a}/${b}: JPL aspect`);
      if (expected) assert.ok(Math.abs(actual.orbDegrees - Math.abs(separation - expected[1])) <= guard);
      counters.verifiedAspectDecisions++;
    }
    const angular = new Map(snapshot.data.angular.map(contact => [contact.body, contact]));
    assert.equal(angular.size, snapshot.data.angular.length);
    for (const [body, position] of expectedPositions) {
      const separation = angleError(position.longitude, angleRef.midheaven);
      const guard = planetTolerance.longitude + angleTolerance.mc;
      if (Math.abs(separation - 3) <= guard) {
        counters.ambiguousAngularDecisions++;
        continue;
      }
      assert.equal(angular.has(body), separation <= 3, `${profile.slug}/${body}: JPL/ERFA MC contact`);
      if (separation <= 3)
        assert.ok(Math.abs(angular.get(body).orbDegrees - separation) <= guard);
      counters.verifiedAngularDecisions++;
    }
    counters.profiles++;
  }
  assert.equal(counters.profiles, 6);
  assert.equal(counters.positionComparisons, 60);
  assert.equal(counters.angleComparisons, 84);
  assert.equal(counters.verifiedHouseDecisions + counters.ambiguousHouseDecisions, 6);
  assert.equal(counters.verifiedAspectDecisions + counters.ambiguousAspectDecisions, 270);
  assert.equal(counters.verifiedAngularDecisions + counters.ambiguousAngularDecisions, 60);
  assert.equal(counters.verifiedMotionDecisions + counters.ambiguousMotionDecisions, 60);
  t.diagnostic(JSON.stringify(counters));
});
