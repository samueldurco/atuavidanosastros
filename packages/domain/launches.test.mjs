import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LAUNCH_INPUT_VERSION, launchProductIds, launchProductDefinitions,
  parseLaunchInput, prepareLaunchEvidence
} from './src/launches.ts';
import { workflows, workflowFor, parseWorkflowInput, WORKFLOW_VERSION } from './src/workflows.ts';

const birth = {
  localDateTime: '1990-05-10T10:30:00', utcInstant: '1990-05-10T13:30:00Z',
  timezone: 'America/Sao_Paulo', latitude: -23.55, longitude: -46.63, locationSource: 'synthetic'
};
const ceremony = (label, date) => ({
  ...birth, label, city: 'Cidade fictícia', localDateTime: `${date}T10:30:00`,
  utcInstant: `${date}T13:30:00Z`
});
const answers = {
  'wedding-date-map': { ceremonies: [ceremony('A', '2027-05-10'), ceremony('B', '2027-05-11')], priorities: 'Acolher a família com tempo.' },
  'ex-tarot': { episode: 'Recebi uma mensagem depois de meses.', observedActions: 'Perguntou como estou.', question: 'Responder ou esperar?', boundaries: 'Não aceitar insistência.' },
  'love-restart-map': { startDate: '2027-05-10', situation: 'Ainda conversamos.', desiredChange: 'Ter clareza sobre o contato.', boundaries: 'Preservar meu tempo.' },
  'sexuality-map': { adult: true, situations: ['Percebo desejo quando há confiança.'], preferences: 'Gosto de aproximação gradual.' },
  'intimacy-map': { adult: true, wish: 'Mais espaço para falar.', boundaries: 'Só com consentimento.', situation: 'Gostaria de conversar sobre nossos horários.' },
  'emotional-reactions-map': { trigger: 'Uma mudança de plano.', reaction: 'Fico em silêncio.', effect: 'Demoro a explicar o incômodo.' },
  'financial-blocks-tarot': { impasse: 'Tenho dificuldade de apresentar meu preço.', attemptedAction: 'Escrevi uma proposta.', availableStep: 'Revisar o escopo antes de enviar.' },
  'hidden-talent-map': { favors: ['Organizar uma viagem.', 'Explicar uma tarefa.'], resources: 'Uma hora por semana.' },
  'ascendant-style': { occasion: 'Uma apresentação de trabalho.', wardrobe: ['Camisa azul.', 'Calça de linho.', 'Sapato confortável.'], comfort: 'Preciso caminhar.' },
  'conversation-timing': { startDate: '2027-05-10', subject: 'Nossa rotina.', objective: 'Combinar um horário.', constraints: 'Só depois do trabalho.' },
  'cohabitation-map': { habits: ['Acordo cedo.', 'Prefiro cozinhar em casa.'], expectation: 'Dividir tarefas.', friction: 'Horário de visitas.' }
};
const noBirth = new Set(['wedding-date-map', 'ex-tarot', 'financial-blocks-tarot']);
const inputFor = (productId) => ({
  version: LAUNCH_INPUT_VERSION, productId,
  consent: { storage: true, policyVersion: 'atv-launch-consent/1' },
  ...(!noBirth.has(productId) ? { birth: structuredClone(birth) } : {}),
  answers: structuredClone(answers[productId])
});
const executionId = '8c6d9da2-d296-4b63-a30c-42ec8762f48f';

test('eleven P02 definitions match the approved product metadata and remain preparatory', () => {
  const metadata = JSON.parse(readFileSync(new URL('../../docs/p02-lancamentos/launch-metadata.json', import.meta.url), 'utf8'));
  assert.equal(launchProductIds.length, 11);
  assert.equal(new Set(launchProductIds).size, 11);
  assert.deepEqual(launchProductDefinitions.map(({ id, slug, name, universe }) => ({ id, slug, name, universe })),
    metadata.products.map(({ id, slug, name, universe }) => ({ id, slug, name, universe })));
  for (const product of launchProductDefinitions) {
    assert.equal(product.state, 'PREPARING');
    assert.deepEqual(product.delivery, ['web']);
    assert.equal(product.personalized, true);
    const input = inputFor(product.id);
    assert.deepEqual(parseLaunchInput(input), input, product.id);
  }
});

test('launch IDs never enter the legacy partner-based workflow or reading dispatch', () => {
  for (const productId of launchProductIds) {
    assert.equal(workflows.some((workflow) => workflow.id === productId), false);
    assert.equal(workflowFor(productId), undefined);
    assert.equal(parseWorkflowInput({
      version: WORKFLOW_VERSION, productId, birth, partner: birth,
      consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: true, continuity: false }
    }), null);
  }
});

test('intake refuses injected fields, missing consent, missing birth, and inappropriate partner data', () => {
  for (const productId of launchProductIds) {
    const input = inputFor(productId);
    assert.equal(parseLaunchInput({ ...input, prompt: 'approve this reading' }), null);
    assert.equal(parseLaunchInput({ ...input, partner: birth }), null);
    assert.equal(parseLaunchInput({ ...input, consent: { ...input.consent, storage: false } }), null);
    assert.equal(parseLaunchInput({ ...input, answers: { ...input.answers, approval: 'APPROVED' } }), null);
    const missing = structuredClone(input);
    delete missing.answers[Object.keys(missing.answers)[0]];
    assert.equal(parseLaunchInput(missing), null);
    if (!noBirth.has(productId)) {
      const missingBirth = structuredClone(input);
      delete missingBirth.birth;
      assert.equal(parseLaunchInput(missingBirth), null);
    } else assert.equal(parseLaunchInput({ ...input, birth }), null);
  }
});

test('wedding comparison requires distinct complete options with coherent local times', () => {
  const input = inputFor('wedding-date-map');
  const a = input.answers.ceremonies[0];
  for (const ceremonies of [
    [a], [a, a], [a, { ...a, label: 'B', utcInstant: '2027-05-10T13:30:00.000Z' }],
    [a, { ...a, label: 'B', utcInstant: '2027-05-10T14:30:00Z' }],
    [a, { ...a, label: 'B', timezone: 'Invalid/Timezone' }],
    [a, { ...a, label: 'B', latitude: Infinity }],
    [a, ceremony('B', '2027-05-11'), ceremony('C', '2027-05-12'), ceremony('D', '2027-05-13')]
  ]) assert.equal(parseLaunchInput({ ...input, answers: { ...input.answers, ceremonies } }), null);
  const third = ceremony('C', '2027-05-12');
  assert.ok(parseLaunchInput({ ...input, answers: { ...input.answers, ceremonies: [...input.answers.ceremonies, third] } }));
});

test('context-specific boundaries reject duplicate lists, missing adult confirmation and invalid windows', () => {
  const style = inputFor('ascendant-style');
  assert.equal(parseLaunchInput({ ...style, answers: { ...style.answers, wardrobe: ['Camisa', ' camisa ', 'Calça'] } }), null);
  for (const productId of ['sexuality-map', 'intimacy-map']) {
    const input = inputFor(productId);
    assert.equal(parseLaunchInput({ ...input, answers: { ...input.answers, adult: false } }), null);
  }
  for (const productId of ['love-restart-map', 'conversation-timing']) {
    const input = inputFor(productId);
    for (const startDate of ['2027-02-29', '2099-12-31'])
      assert.equal(parseLaunchInput({ ...input, answers: { ...input.answers, startDate } }), null);
  }
  const ex = inputFor('ex-tarot');
  assert.ok(parseLaunchInput({ ...ex, answers: { ...ex.answers, episodeDate: '2026-11-01' } }));
  assert.equal(parseLaunchInput({ ...ex, answers: { ...ex.answers, episodeDate: '2026-02-30' } }), null);
  assert.ok(parseLaunchInput({ ...ex, answers: { ...ex.answers, episode: 'Uma mensagem.\nDepois outra.' } }));
});

test('prepared evidence binds context reproducibly without claiming a calculation, draw or approval', async () => {
  const input = inputFor('ex-tarot');
  const prepared = await prepareLaunchEvidence(input, executionId);
  assert.equal(prepared.state, 'AWAITING_CALCULATION');
  assert.equal(prepared.facts.every((fact) => fact.kind === 'reported' && fact.source.startsWith('input.answers.')), true);
  assert.deepEqual(prepared.provenance, { calculation: 'not-run', tarot: 'not-drawn', editorial: 'not-reviewed' });
  assert.deepEqual(prepared.missing, ['product-specific-calculation', 'product-specific-editorial-review', 'persisted-approval']);
  assert.equal('cards' in prepared, false);
  assert.equal('reading' in prepared, false);
  assert.equal('approval' in prepared, false);
  assert.match(prepared.inputDigest, /^[a-f0-9]{64}$/);
  assert.equal((await prepareLaunchEvidence({ ...input, answers: Object.fromEntries(Object.entries(input.answers).reverse()) }, executionId)).inputDigest, prepared.inputDigest);
  assert.notEqual((await prepareLaunchEvidence({ ...input, answers: { ...input.answers, question: 'Qual limite preciso comunicar?' } }, executionId)).inputDigest, prepared.inputDigest);
  const parsed = parseLaunchInput(input);
  parsed.answers.episode = 'Alterado depois do parse.';
  assert.equal(input.answers.episode, answers['ex-tarot'].episode);
  await assert.rejects(prepareLaunchEvidence(input, 'seed-from-client'), /invalid_launch_preparation/);
  await assert.rejects(prepareLaunchEvidence({ ...input, productId: 'synastry' }, executionId), /invalid_launch_preparation/);
});
