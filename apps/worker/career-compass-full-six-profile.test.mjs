import test from 'node:test';
import assert from 'node:assert/strict';
import { careerCompassBirthBinding, createPurposeCalculators,
  validCareerCompassProjection } from './src/purpose-calculators.ts';
import { createCareerCompassFullBasisCalculator } from './src/career-compass-full-basis.ts';
import { prepareCareerCompassFullCandidate } from './src/career-compass-full-persistence.ts';
import { careerCompassFullFixture } from './qa/career-compass-full-fixture.mjs';

const runId = '00000000-0000-4000-8000-000000000092';
const birth = { localDateTime: '1992-05-17T08:40:00',
  utcInstant: '1992-05-17T11:40:00Z', timezone: 'America/Sao_Paulo',
  latitude: -19.9167, longitude: -43.9345, locationSource: 'synthetic' };
const profiles = [
  ['livia', 'Lívia trabalha com comunicação e quer testar a ilustração editorial sem abandonar sua renda atual de imediato.'],
  ['ceramics-employment', 'Quero testar a cerâmica mantendo meu emprego.'],
  ['leadership', 'Preciso coordenar uma equipe em uma entrega conjunta.'],
  ['workload', 'Estou com sobrecarga e preciso descansar.'],
  ['study', 'Quero estudar uma nova habilidade antes de escolher um curso.'],
  ['different-birth', 'Quero comparar a atividade atual com uma alternativa de trabalho.'],
];

test('six synthetic profiles bind distinct reports and birth data through the private full candidate', async () => {
  const candidates = [];
  for (const [name, context] of profiles) {
    const workflowInput = { version: 'atv-workflow/1.0.0', productId: 'career-compass',
      consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false,
        continuity: false },
      birth: name === 'different-birth'
        ? { localDateTime: '1985-08-21T17:20:00', utcInstant: '1985-08-21T17:20:00Z',
          timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic' }
        : birth,
      context };
    const sourceCalculation = await createPurposeCalculators()['career-compass'](workflowInput,
      { runId, signal: new AbortController().signal });
    const fullCalculation = await createCareerCompassFullBasisCalculator()(workflowInput,
      { runId, signal: new AbortController().signal });
    const claim = { runId, revision: 3, contractVersion: 'atv-product/1.0.0',
      workflowInput, sourceCalculation,
      candidateVersion: 'atv-career-compass-full-candidate/1.0.1' };
    let facts;
    const candidate = await prepareCareerCompassFullCandidate(claim, async envelope => {
      facts = envelope;
      return careerCompassFullFixture(fullCalculation);
    }, new AbortController().signal);
    assert.equal(candidate.status, 'prepared_for_review', `${name}: ${candidate.reason}`);
    assert.equal(candidate.publication, 'blocked');
    assert.equal(facts.completeness, 'complete');
    assert.equal(facts.facts.find(fact => fact.id === 'personal-context').display, context);
    assert.equal(candidate.delivery.content.sections.length, 11);
    assert.ok(candidate.delivery.content.sections[1].text.startsWith(`${context}\n\n`));
    candidates.push([name, candidate]);
  }
  const basis = candidates.map(([, candidate]) => candidate.delivery.basisDigest);
  assert.equal(new Set(basis).size, profiles.length);
  const outputs = candidates.map(([, candidate]) => candidate.delivery.outputDigest);
  assert.equal(new Set(outputs).size, profiles.length);
  const sharedBirth = candidates.slice(0, 5).map(([, candidate]) =>
    candidate.fullCalculation.data.positions);
  for (const positions of sharedBirth.slice(1)) assert.deepEqual(positions, sharedBirth[0]);
  assert.notDeepEqual(candidates[5][1].fullCalculation.data.positions, sharedBirth[0]);
});

test('private full candidate rejects a source calculation detached from the persisted input', async () => {
  const signal = new AbortController().signal;
  const workflowInput = { version: 'atv-workflow/1.0.0', productId: 'career-compass',
    consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false,
      continuity: false }, birth, context: 'Quero testar a cerâmica mantendo meu emprego.' };
  const sourceCalculation = await createPurposeCalculators()['career-compass'](
    workflowInput, { runId, signal });
  const claim = { runId, revision: 3, contractVersion: 'atv-product/1.0.0',
    workflowInput, sourceCalculation,
    candidateVersion: 'atv-career-compass-full-candidate/1.0.1' };
  const producer = () => { throw new Error('producer_must_not_run'); };

  const wrongContext = structuredClone(sourceCalculation);
  wrongContext.facts.find(fact => fact.id === 'personal-context').display =
    'Quero sair do emprego amanhã.';
  const contextResult = await prepareCareerCompassFullCandidate(
    { ...claim, sourceCalculation: wrongContext }, producer, signal);
  assert.equal(contextResult.status, 'blocked');
  assert.equal(contextResult.reason, 'source_context_mismatch');

  const legacySource = structuredClone(sourceCalculation);
  delete legacySource.data.birthBinding;
  assert.equal(validCareerCompassProjection(legacySource), true);
  const legacyResult = await prepareCareerCompassFullCandidate(
    { ...claim, sourceCalculation: legacySource }, producer, signal);
  assert.equal(legacyResult.status, 'blocked');
  assert.equal(legacyResult.reason, 'source_birth_or_engine_mismatch');

  const latitudeInput = { ...workflowInput, birth: { ...birth, latitude: birth.latitude + 1 } };
  const wrongLatitude = await createPurposeCalculators()['career-compass'](
    latitudeInput, { runId, signal });
  assert.equal(wrongLatitude.data.angles.midheaven, sourceCalculation.data.angles.midheaven);
  assert.deepEqual(wrongLatitude.data.provenance.temporal,
    sourceCalculation.data.provenance.temporal);
  const latitudeResult = await prepareCareerCompassFullCandidate(
    { ...claim, sourceCalculation: wrongLatitude }, producer, signal);
  assert.equal(latitudeResult.status, 'blocked');
  assert.equal(latitudeResult.reason, 'source_birth_or_engine_mismatch');

  const wrongLongitude = structuredClone(sourceCalculation);
  wrongLongitude.data.birthBinding.sha256 = await careerCompassBirthBinding(
    { ...birth, longitude: birth.longitude + 1 }, runId);
  const longitudeResult = await prepareCareerCompassFullCandidate(
    { ...claim, sourceCalculation: wrongLongitude }, producer, signal);
  assert.equal(longitudeResult.status, 'blocked');
  assert.equal(longitudeResult.reason, 'source_birth_or_engine_mismatch');

  const wrongTemporal = structuredClone(sourceCalculation);
  wrongTemporal.data.provenance.temporal.utcInstant = '1992-05-17T12:40:00.000Z';
  const temporalResult = await prepareCareerCompassFullCandidate(
    { ...claim, sourceCalculation: wrongTemporal }, producer, signal);
  assert.equal(temporalResult.status, 'blocked');
  assert.equal(temporalResult.reason, 'source_birth_or_engine_mismatch');

  const wrongTimezone = structuredClone(sourceCalculation);
  wrongTimezone.data.provenance.temporal.offsetSeconds += 3600;
  const timezoneResult = await prepareCareerCompassFullCandidate(
    { ...claim, sourceCalculation: wrongTimezone }, producer, signal);
  assert.equal(timezoneResult.status, 'blocked');
  assert.equal(timezoneResult.reason, 'source_birth_or_engine_mismatch');

  const otherBirthInput = { ...workflowInput, birth: {
    localDateTime: '1985-08-21T17:20:00', utcInstant: '1985-08-21T17:20:00Z',
    timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic' } };
  const wrongBirth = await createPurposeCalculators()['career-compass'](
    otherBirthInput, { runId, signal });
  const birthResult = await prepareCareerCompassFullCandidate(
    { ...claim, sourceCalculation: wrongBirth }, producer, signal);
  assert.equal(birthResult.status, 'blocked');
  assert.equal(birthResult.reason, 'source_birth_or_engine_mismatch');
});
