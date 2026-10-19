import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createCareerCompassFullBasisCalculator, validCareerCompassFullBasis } from './src/career-compass-full-basis.ts';
import { createPurposeCalculators, validCareerCompassProjection } from './src/purpose-calculators.ts';

// This is a finite, external-oracle sample. It cannot certify global precision,
// timezone rules, DUT1, or station timing, and never promotes publication.
const context = {
  runId: '00000000-0000-4000-8000-000000000092',
  signal: new AbortController().signal,
};
const AS = 1 / 3600;
const planetTolerance = {longitude: 60 * AS, latitude: 60 * AS, distance: 0.001};
const angleTolerance = {mc: 60 * AS, asc: 60 * AS, cusp: 120 * AS};
const rulers = ['mars','venus','mercury','moon','sun','mercury','venus','pluto',
  'jupiter','saturn','uranus','neptune'];
const aspectPolicy = [
  ['conjunction',0,6], ['sextile',60,4], ['square',90,6],
  ['trine',120,6], ['opposition',180,6],
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const angleError = (a,b) => Math.abs(((a-b+540)%360)-180);
const instant = value => new Date(value).toISOString();
const readJson = url => JSON.parse(readFileSync(url,'utf8'));
const houseRoot = new URL('../../packages/astrology/fixtures/houses/',import.meta.url);
const planetRoot = new URL('../../packages/astrology/fixtures/horizons/',import.meta.url);

function verifyInstalledDataManifest() {
  const manifest=readJson(new URL('../../packages/astrology/src/data-manifest.json',import.meta.url));
  const packageRequire=createRequire(new URL('../../packages/astrology/package.json',import.meta.url));
  const entry=pathToFileURL(packageRequire.resolve('caelus/data-embedded'));
  const packageInfo=readJson(new URL('../../package.json',entry));
  assert.equal(manifest.provider,packageInfo.name);
  assert.equal(manifest.version,packageInfo.version);
  assert.equal(manifest.tier,'embedded');
  const dependencyFiles=[entry,...[...readFileSync(entry,'utf8').matchAll(/from "(\.\.\/data\/[^"\n]+)"/g)]
    .map(match=>new URL(match[1],entry))];
  assert.equal(dependencyFiles.length,manifest.files.length);
  const expected=new Map(manifest.files.map(file=>[file.path,file.sha256]));
  assert.equal(expected.size,manifest.files.length);
  for (const file of dependencyFiles) {
    const path=file.pathname.split('/dist/')[1];
    assert.ok(path,`installed Caelus file is outside dist: ${file.pathname}`);
    assert.equal(sha256(readFileSync(file)),expected.get(path),`installed Caelus dataset: ${path}`);
  }
  return manifest;
}

function loadIndependentReferences() {
  const installedDataManifest=verifyInstalledDataManifest();
  const houseManifest=readJson(new URL('manifest.json',houseRoot));
  const houseBytes=readFileSync(new URL('erfa-reference.json',houseRoot));
  assert.equal(sha256(houseBytes),houseManifest.fixtureSha256,'ERFA reference hash');
  assert.equal(sha256(readFileSync(new URL('../../scripts/generate-house-reference.py',import.meta.url))),
    houseManifest.generatorSha256,'ERFA reference generator hash');
  const houseFixture=JSON.parse(houseBytes.toString('utf8'));
  assert.equal(houseManifest.promotion,false);
  assert.equal(houseFixture.reference.pyerfa,'2.0.1.5');
  assert.equal(houseFixture.reference.erfa,'2.0.1');
  assert.deepEqual(houseFixture.tolerancesArcsec,{midheaven:60,ascendant:60,cusp:120});

  const planetManifest=readJson(new URL('manifest.json',planetRoot));
  assert.equal(planetManifest.schemaVersion,'atv-horizons/1');
  assert.equal(planetManifest.sources.length,10);
  const ephemeris=new Map();
  for (const source of planetManifest.sources) {
    assert.equal(source.signature.source,'NASA/JPL Horizons API');
    assert.ok(source.url.startsWith('https://ssd.jpl.nasa.gov/api/horizons.api?'));
    assert.equal(source.file,`${source.body}.txt`);
    const bytes=readFileSync(new URL(source.file,planetRoot));
    assert.equal(sha256(bytes),source.sha256,`${source.body}: JPL reference hash`);
    const text=bytes.toString('utf8');
    const sections=text.split('$$SOE');
    assert.equal(sections.length,2);
    const payload=sections[1].split('$$EOE');
    assert.equal(payload.length,2);
    const rows=payload[0].trim().split('\n');
    assert.equal(rows.length,planetManifest.instants.length);
    const series=new Map();
    rows.forEach((line,index) => {
      const cells=line.split(',').map(s=>s.trim());
      const row={jd:Number(cells[1]),distanceAu:Number(cells[4]),
        longitude:Number(cells[6]),latitude:Number(cells[7])};
      assert.ok(Object.values(row).every(Number.isFinite));
      const epoch=planetManifest.instants[index];
      assert.ok(Math.abs(row.jd-(Date.parse(epoch)/86400000+2440587.5))<1e-8,
        `${source.body}: JPL timestamp ${index}`);
      series.set(epoch,row);
    });
    ephemeris.set(source.body,series);
  }
  const shared=new Set(planetManifest.epochs.map(instant));
  const cases=houseFixture.cases.filter(row=>shared.has(instant(row.input.utcInstant)));
  assert.equal(shared.size,7);
  assert.equal(cases.length,28);
  assert.equal(new Set(cases.map(row=>instant(row.input.utcInstant))).size,2);
  assert.equal(cases.filter(row=>row.expectedStatus==='ok').length,20);
  assert.equal(cases.filter(row=>row.expectedStatus==='not-applicable').length,8);
  return {cases,ephemeris,planetManifest,installedDataManifest};
}

function referenceHouse(longitude,cusps) {
  // Independent half-open interval lookup from the versioned ERFA cusps.
  const match=cusps.findIndex((start,index) => {
    const end=cusps[(index+1)%12];
    const candidate=(longitude-start+360)%360;
    const width=(end-start+360)%360;
    return candidate>=0 && candidate<width;
  });
  return match<0?null:match+1;
}

test('career full snapshot is sampled against versioned JPL and ERFA references, including polar refusal',async t=>{
  const {cases,ephemeris,planetManifest,installedDataManifest}=loadIndependentReferences();
  const fullCalculator=createCareerCompassFullBasisCalculator();
  const publicCalculator=createPurposeCalculators()['career-compass'];
  let positionComparisons=0,angleComparisons=0,verifiedHouseDecisions=0;
  let verifiedAspectDecisions=0,verifiedAngularDecisions=0;
  let ambiguousHouseDecisions=0,ambiguousAspectDecisions=0,ambiguousAngularDecisions=0;
  for (const reference of cases) {
    const birth=reference.input;
    const epoch=instant(birth.utcInstant);
    const input={version:'atv-workflow/1.0.0',productId:'career-compass',
      consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false},
      birth,context:'Quero examinar minhas opções profissionais.'};
    const snapshot=await fullCalculator(input,context);
    const publicSnapshot=await publicCalculator(input,context);
    assert.equal(snapshot.version,'atv-career-compass-full-basis/1.0.1');
    assert.equal(snapshot.status,'experimental');
    assert.equal(snapshot.data.projection.publication,'blocked');
    assert.equal(snapshot.data.projection.interpretation,'not-produced');
    assert.equal(validCareerCompassFullBasis(input,snapshot),true);
    assert.deepEqual(snapshot.data.chart.input,birth,reference.id);
    assert.deepEqual(snapshot.data.positions,snapshot.data.chart.positions,reference.id);
    assert.deepEqual(snapshot.data.provenance,snapshot.data.chart.provenance,reference.id);
    const provenance=snapshot.data.provenance;
    assert.equal(provenance.provider,'caelus');
    assert.equal(provenance.providerVersion,'0.24.1');
    assert.equal(provenance.algorithmVersion,'atv-caelus-adapter-v3');
    assert.equal(provenance.referenceFrame,'geocentric-apparent-ecliptic-of-date');
    assert.equal(provenance.zodiac,'tropical');
    assert.equal(provenance.accuracyStatus,'experimental');
    assert.equal(provenance.contract.productionPromotion,false);
    assert.equal(provenance.contract.guaranteedLongitudeErrorDegrees,null);
    assert.equal(provenance.temporal.utcInstant,epoch);
    assert.equal(provenance.temporal.inputScale,'UTC');
    assert.equal(provenance.temporal.engineScale,'UT1-approximated-by-UTC');
    assert.equal(provenance.temporal.dut1Seconds,null);
    assert.equal(provenance.temporal.timezoneMode,'fixed-offset');
    assert.equal(provenance.temporal.offsetSeconds,0);
    assert.equal(provenance.dataManifest.provider,'caelus');
    assert.equal(provenance.dataManifest.version,'0.24.1');
    assert.deepEqual(provenance.dataManifest,installedDataManifest);
    const calculatedFactSource='caelus@0.24.1;atv-caelus-adapter-v3;atv-career-compass-full-basis/1.0.1';
    for (const fact of snapshot.facts.filter(fact=>fact.id.startsWith('position-') ||
      fact.id==='angle-midheaven' || fact.id==='angle-ascendant' || fact.id.startsWith('house-')))
      assert.equal(fact.source,calculatedFactSource,`${reference.id}/${fact.id}: source`);

    const positions=new Map(snapshot.data.positions.map(position=>[position.body,position]));
    assert.equal(positions.size,10,`${reference.id}: ten unique bodies`);
    assert.deepEqual([...positions.keys()].sort(),[...ephemeris.keys()].sort());
    const expectedPositions=new Map();
    for (const [body,series] of ephemeris) {
      const actual=positions.get(body);
      const expected=series.get(epoch);
      assert.ok(actual && expected,`${reference.id}/${body}`);
      expectedPositions.set(body,expected);
      assert.ok(angleError(actual.longitude,expected.longitude)<=planetTolerance.longitude,
        `${reference.id}/${body}: JPL longitude`);
      assert.ok(Math.abs(actual.latitude-expected.latitude)<=planetTolerance.latitude,
        `${reference.id}/${body}: JPL latitude`);
      assert.ok(Math.abs(actual.distanceAu/expected.distanceAu-1)<=planetTolerance.distance,
        `${reference.id}/${body}: JPL distance`);
      const at=planetManifest.instants.indexOf(epoch);
      const before=series.get(planetManifest.instants[at-1]);
      const after=series.get(planetManifest.instants[at+1]);
      assert.ok(before && after);
      const movement=((after.longitude-before.longitude+540)%360)-180;
      assert.ok(Math.abs(movement)>1e-7,`${body}: station direction inconclusive`);
      assert.equal(actual.retrograde,movement<0,`${reference.id}/${body}: JPL direction`);
      positionComparisons++;
    }

    assert.ok(angleError(snapshot.data.angles.midheaven,reference.midheaven)<=angleTolerance.mc,
      `${reference.id}: ERFA MC`);
    angleComparisons++;
    assert.equal(snapshot.data.houses.status,reference.expectedStatus,`${reference.id}: Placidus status`);
    if (reference.expectedStatus==='ok') {
      assert.ok(angleError(snapshot.data.angles.ascendant,reference.ascendant)<=angleTolerance.asc,
        `${reference.id}: ERFA ascendant`);
      angleComparisons++;
      assert.equal(snapshot.data.houses.cusps.length,12);
      reference.cusps.forEach((cusp,index)=>{
        assert.ok(angleError(snapshot.data.houses.cusps[index],cusp)<=angleTolerance.cusp,
          `${reference.id}: ERFA cusp ${index+1}`);
        angleComparisons++;
      });
      assert.ok(snapshot.facts.some(fact=>fact.id==='angle-ascendant'));
      assert.equal(snapshot.facts.filter(fact=>/^house-\d+$/.test(fact.id)).length,12);
    } else {
      assert.equal(snapshot.data.angles.ascendant,null,`${reference.id}: no substitute ASC`);
      assert.deepEqual(snapshot.data.houses.cusps,[],`${reference.id}: no substitute houses`);
      assert.equal(snapshot.data.regent.house,null);
      assert.ok(snapshot.facts.some(fact=>fact.id==='ascendant-unavailable'));
      assert.ok(!snapshot.facts.some(fact=>fact.id==='angle-ascendant' || /^house-\d+$/.test(fact.id)));
      assert.equal(snapshot.data.chart.houses.code,'PLACIDUS_UNAVAILABLE');
    }

    // The public contract exposes MC alone even when the private candidate has a full chart.
    assert.equal(validCareerCompassProjection(publicSnapshot),true);
    assert.equal(publicSnapshot.version,'atv-career-compass-calculation/1.0.0');
    assert.deepEqual(publicSnapshot.data.positions,[]);
    assert.equal(publicSnapshot.data.angles.ascendant,null);
    assert.deepEqual(publicSnapshot.data.houses.cusps,[]);
    assert.equal(publicSnapshot.data.houses.status,'not-requested');
    assert.ok(angleError(publicSnapshot.data.angles.midheaven,reference.midheaven)<=angleTolerance.mc);
    assert.ok(angleError(publicSnapshot.data.angles.midheaven,snapshot.data.angles.midheaven)<1e-10);
    assert.ok(!publicSnapshot.facts.some(fact=>fact.id.startsWith('position-') ||
      fact.id.startsWith('career-aspect-') || fact.id.startsWith('house-')));

    const referenceRuler=rulers[Math.floor(reference.midheaven/30)];
    assert.equal(snapshot.data.regent.body,referenceRuler,`${reference.id}: MC ruler`);
    if (reference.expectedStatus==='ok') {
      const rulerPosition=expectedPositions.get(referenceRuler);
      const cuspDistance=Math.min(...reference.cusps.map(cusp=>angleError(rulerPosition.longitude,cusp)));
      if (cuspDistance>(planetTolerance.longitude+angleTolerance.cusp)) {
        assert.equal(snapshot.data.regent.house,referenceHouse(rulerPosition.longitude,reference.cusps),
          `${reference.id}: reference ruler house`);
        verifiedHouseDecisions++;
      } else ambiguousHouseDecisions++;
    }

    const aspectRows=snapshot.data.aspects.aspects;
    const actualAspects=new Map(aspectRows.map(a=>[`${a.first}/${a.second}`,a]));
    assert.equal(actualAspects.size,aspectRows.length,`${reference.id}: duplicate aspects`);
    const order=[...positions.keys()];
    for (let first=0;first<order.length;first++) for (let second=first+1;second<order.length;second++) {
      const bodyA=order[first],bodyB=order[second];
      const pA=expectedPositions.get(bodyA),pB=expectedPositions.get(bodyB);
      const separation=angleError(pA.longitude,pB.longitude);
      const guard=2*planetTolerance.longitude;
      if (aspectPolicy.some(([,exact,orb])=>Math.abs(Math.abs(separation-exact)-orb)<=guard)) {
        ambiguousAspectDecisions++;
        continue;
      }
      const expected=aspectPolicy.find(([,exact,orb])=>Math.abs(separation-exact)<=orb);
      const actual=actualAspects.get(`${bodyA}/${bodyB}`);
      assert.equal(actual?.kind,expected?.[0],`${reference.id}/${bodyA}/${bodyB}: JPL aspect`);
      if (expected)
        assert.ok(Math.abs(actual.orbDegrees-Math.abs(separation-expected[1]))<=guard,
          `${reference.id}/${bodyA}/${bodyB}: JPL aspect orb`);
      verifiedAspectDecisions++;
    }
    const angular=new Map(snapshot.data.angular.map(contact=>[contact.body,contact]));
    assert.equal(angular.size,snapshot.data.angular.length);
    for (const [body,position] of expectedPositions) {
      const distance=angleError(position.longitude,reference.midheaven);
      const guard=planetTolerance.longitude+angleTolerance.mc;
      if (Math.abs(distance-3)<=guard) {ambiguousAngularDecisions++;continue;}
      assert.equal(angular.has(body),distance<=3,`${reference.id}/${body}: JPL/ERFA MC contact`);
      if (distance<=3)
        assert.ok(Math.abs(angular.get(body).orbDegrees-distance)<=guard);
      verifiedAngularDecisions++;
    }
  }
  assert.equal(positionComparisons,280);
  assert.equal(angleComparisons,288); // 28 MC + 20 ASC + 20*12 cusps.
  assert.equal(verifiedHouseDecisions+ambiguousHouseDecisions,20);
  assert.equal(verifiedAspectDecisions+ambiguousAspectDecisions,28*45);
  assert.equal(verifiedAngularDecisions+ambiguousAngularDecisions,280);
  assert.ok(verifiedHouseDecisions>0 && verifiedAspectDecisions>0 && verifiedAngularDecisions>0);
  t.diagnostic(JSON.stringify({positionComparisons,angleComparisons,
    verifiedHouseDecisions,ambiguousHouseDecisions,
    verifiedAspectDecisions,ambiguousAspectDecisions,
    verifiedAngularDecisions,ambiguousAngularDecisions,polarRefusals:8}));
});
