import test from 'node:test';
import assert from 'node:assert/strict';
import { createThreePillarsFullCalculator } from './src/natal-calculators.ts';
import {
  stageThreePillarsPaidCandidate,
  threePillarsPaidCandidateContract
} from './src/three-pillars-paid-candidate.ts';

const input = {
  version: 'atv-workflow/1.0.0', productId: 'three-pillars',
  birth: {
    localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z',
    timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic'
  },
  consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false }
};
const context = { runId: '00000000-0000-4000-8000-000000000001', signal: new AbortController().signal };

async function fixture() {
  const full = await createThreePillarsFullCalculator()(input, context);
  const projected = structuredClone(full.data.natal);
  projected.version = threePillarsPaidCandidateContract.projectionVersion;
  projected.data.productId = 'three-pillars';
  projected.data.natal = structuredClone(full.data.natal);
  projected.facts.push({
    id: 'natal-asc-ruler', kind: 'calculated', display: 'Regente moderno do Ascendente: Marte',
    source: 'fixture-method'
  });
  const reading = {
    version: threePillarsPaidCandidateContract.readingVersion,
    productId: 'three-pillars', title: 'Três Pilares',
    opening: 'Abertura específica para o trio.',
    source: 'Método ATVNA com relações calculadas.',
    sections: Array.from({ length: 11 }, (_, i) => ({
      title: `Capítulo ${i + 1}`,
      text: `Texto integral do capítulo ${i + 1}.`,
      factIds: i === 8 ? ['position-sun', 'natal-asc-ruler'] : ['position-sun', 'position-moon']
    })),
    questions: ['O que ocorreu?', 'O que mudou?', 'O que contraria a hipótese?'],
    practice: 'Faça uma experiência reversível.',
    limits: [...projected.limits],
    editorial: { version: threePillarsPaidCandidateContract.readingVersion }
  };
  return { full, projected, reading };
}

test('preserves all v5.1 text and evidence in a blocked, unverified paid draft', async () => {
  const { full, projected, reading } = await fixture();
  const candidate = stageThreePillarsPaidCandidate(full, projected, reading);
  assert.equal(candidate?.status, 'unverified_candidate');
  assert.equal(candidate?.publication, 'blocked');
  assert.equal(candidate?.content.version, threePillarsPaidCandidateContract.version);
  assert.equal(candidate?.content.sections.length, 15);
  assert.equal(candidate?.content.sections[0].text, reading.opening);
  assert.deepEqual(candidate?.content.sections.slice(1, 12).map(s => s.text), reading.sections.map(s => s.text));
  assert.equal(candidate?.content.sections[12].text, reading.questions.join('\n\n'));
  assert.equal(candidate?.content.sections[13].text, reading.practice);
  assert.deepEqual(candidate?.content.sections[13].evidence, reading.sections[8].factIds);
  assert.equal(candidate?.content.sections[14].text, reading.source);
  assert.ok(!('promotionId' in candidate.content));
  assert.ok(!('reviewDigest' in candidate.content));
  assert.ok(!('calculation' in candidate));
});

test('rejects invented or orphaned evidence, changed natal, incomplete reading and oversize', async () => {
  const { full, projected, reading } = await fixture();
  const changes = {
    'wrong product calculation version': ({ full }) => { full.version = 'unknown'; },
    'missing ascendant': ({ full }) => { full.data.natal.data.angles.ascendant = null; },
    'changed natal': ({ projected }) => { projected.data.natal.facts[0].display = 'invented'; },
    'changed base fact': ({ projected }) => { projected.facts[0].display = 'invented'; },
    'wrong projection version': ({ projected }) => { projected.version = 'unknown'; },
    'wrong reading edition': ({ reading }) => { reading.version = 'atv-three-pillars-editorial/5.0.0'; },
    'incomplete chapters': ({ reading }) => { reading.sections.pop(); },
    'unanchored chapter': ({ reading }) => { reading.sections[0].factIds = ['invented']; },
    'duplicate evidence': ({ reading }) => { reading.sections[0].factIds = ['position-sun', 'position-sun']; },
    'empty evidence': ({ reading }) => { reading.sections[0].factIds = []; },
    'limit drift': ({ reading }) => { reading.limits[0] = 'approved'; },
    'oversize chapter': ({ reading }) => { reading.sections[0].text = 'X'.repeat(20001); },
    'oversize whole': ({ reading }) => { reading.sections.forEach(s => { s.text = 'X'.repeat(10000); }); }
  };
  for (const [label, change] of Object.entries(changes)) {
    const sample = structuredClone({ full, projected, reading });
    change(sample);
    assert.equal(stageThreePillarsPaidCandidate(sample.full, sample.projected, sample.reading), null, label);
  }
});
