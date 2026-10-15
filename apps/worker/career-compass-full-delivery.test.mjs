import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION } from '@atv/ai';
import { createCareerCompassFullBasisCalculator } from './src/career-compass-full-basis.ts';
import { evaluateCareerCompassFullDraft, evaluateProductDraft } from './src/product-editorial.ts';
import { prepareCareerCompassFullDelivery } from './src/career-compass-full-delivery.ts';

const runId = '00000000-0000-4000-8000-000000000092';
const context = 'Quero avaliar uma transição sem sair do trabalho atual e com pouco tempo disponível.';
const workflowInput = {
  version: 'atv-workflow/1.0.0', productId: 'career-compass',
  consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false },
  birth: { localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z',
    timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic' },
  context,
};
const roles = [
  'integrated-direction', 'context-criterion', 'theme-contribution', 'theme-motivation',
  'theme-environment', 'theme-working-style', 'theme-sustainability',
  'selected-relation-1', 'selected-relation-2', 'selected-relation-3',
  'reversible-experiment', 'decision-review',
];
const calculation = () => createCareerCompassFullBasisCalculator()(workflowInput,
  { runId, signal: new AbortController().signal });

function reading(snapshot) {
  const fact = (id) => snapshot.facts.find((item) => item.id === id);
  const exact = (id) => ({ id: `fact-${id}`, kind: 'fact',
    text: fact(id).display, evidence: [id] });
  const aspectList = snapshot.data.aspects.aspects;
  const fallbacks = [['sun', 'moon'], ['mercury', 'mars'], ['jupiter', 'saturn'],
    ['venus', 'pluto'], ['uranus', 'neptune']];
  const pairs = new Set();
  const selected = [0, 1, 2].map((index) => {
    const aspect = aspectList[index];
    const bodies = aspect ? [aspect.first, aspect.second] : fallbacks.find((pair) =>
      !pairs.has([...pair].sort().join('|')));
    assert.ok(bodies);
    pairs.add([...bodies].sort().join('|'));
    return [
      ...(aspect ? [`career-aspect-${index}`] : []),
      ...bodies.map((body) => `position-${body}`), 'personal-context',
    ];
  });
  const hypothesis = (id, text, evidence) => ({ id, kind: 'hypothesis', text, evidence });
  return {
    schemaVersion: SCHEMA_VERSION, capability: 'purpose-direction', scope: 'integrated',
    title: 'Bússola integral sintética para revisão privada',
    claims: [
      ...['angle-midheaven', 'career-mc-ruler', 'compass-ruler-house', 'personal-context'].map(exact),
      hypothesis('integrated-direction', 'Uma direção possível pede comparação entre contribuição, custo e tempo real antes de qualquer mudança.',
        ['angle-midheaven', 'career-mc-ruler', 'compass-ruler-house', 'position-sun', 'personal-context']),
      hypothesis('context-criterion', 'A transição relatada pode ser comparada pela qualidade de uma tarefa pequena sem deixar o trabalho atual.',
        ['angle-midheaven', 'position-mercury', 'personal-context']),
      hypothesis('theme-contribution', 'Uma contribuição testável é produzir uma entrega que outra pessoa consiga avaliar.',
        ['angle-midheaven', 'career-mc-ruler', 'position-sun']),
      hypothesis('theme-motivation', 'A vontade de repetir uma atividade depois de praticá-la oferece um critério observável de interesse.',
        ['position-sun', 'position-moon', 'position-venus']),
      hypothesis('theme-environment', 'Tempo protegido e retorno específico podem mudar o resultado do mesmo ensaio.',
        ['position-moon', 'position-mercury', 'position-saturn']),
      hypothesis('theme-working-style', 'Planejar e executar uma etapa curta permite comparar método e esforço.',
        ['position-mercury', 'position-mars', 'position-sun']),
      hypothesis('theme-sustainability', 'A continuidade depende de energia, apoio e margem de tempo registrada após cada tentativa.',
        ['position-jupiter', 'position-saturn', 'position-mars']),
      hypothesis('selected-relation-1', 'A primeira combinação pode alterar a forma de começar a tarefa, sujeita à experiência relatada.', selected[0]),
      hypothesis('selected-relation-2', 'A segunda combinação sugere observar se comunicação e ação se apoiam na prática.', selected[1]),
      hypothesis('selected-relation-3', 'A terceira combinação pede comparar avanço e limite antes de repetir o ensaio.', selected[2]),
      hypothesis('reversible-experiment', 'Em duas semanas, testar uma tarefa de até uma hora, anotar resultado e custo; adiar se faltar descanso.',
        ['angle-midheaven', 'position-mercury', 'personal-context']),
      hypothesis('decision-review', 'Só rever uma decisão depois da etapa executada, do custo anotado e de um resultado que contrarie a hipótese.',
        ['angle-midheaven', 'position-saturn', 'personal-context']),
    ],
    relations: [
      { kind: 'tension', claimIds: ['selected-relation-1', 'theme-sustainability'],
        text: 'A primeira relação pode pedir um ritmo menor do que o interesse inicial sugere.' },
      { kind: 'convergence', claimIds: ['selected-relation-2', 'theme-working-style'],
        text: 'A segunda relação pode favorecer uma tarefa curta com retorno concreto.' },
      { kind: 'tension', claimIds: ['selected-relation-3', 'theme-environment'],
        text: 'A terceira relação pode mudar de efeito conforme o tempo e o apoio disponíveis.' },
    ],
    synthesis: [{ claimIds: roles,
      text: 'Direção, contexto, cinco temas, três relações, ensaio e revisão formam uma hipótese situada, ainda sujeita ao resultado observado.' }],
    reflections: ['Que entrega pequena poderia ser observada?', 'Qual custo real de tempo apareceu?',
      'Que resultado contrariaria a hipótese inicial?'],
    limits: ['Método simbólico experimental; nenhuma previsão ou aptidão profissional é provada por estes fatores.'],
  };
}

test('complete private delivery binds persisted input, calculation and text and remains blocked', async () => {
  const snapshot = await calculation();
  const output = reading(snapshot);
  const draft = { runId, revision: 2, productId: 'career-compass', tier: 'premium',
    workflowInput, calculation: snapshot, output };
  const assessment = await evaluateCareerCompassFullDraft(draft);
  assert.equal(assessment.status, 'needs_editorial_review', JSON.stringify(assessment.findings));
  assert.equal(assessment.reason, 'review_required');
  assert.equal(assessment.publication, 'blocked');
  assert.match(assessment.basisDigest, /^[0-9a-f]{64}$/);
  const delivery = await prepareCareerCompassFullDelivery(draft);
  assert.equal(delivery.status, 'prepared_for_review', delivery.reason);
  assert.equal(delivery.publication, 'blocked');
  assert.equal(delivery.content.sections.length, 11);
  assert.equal(delivery.content.sections[1].text.startsWith(`${context}\n\n`), true);
  assert.equal(delivery.content.sections[7].text.includes('1. A primeira combinação'), true);
  const method = delivery.content.sections[10];
  assert.equal(method.title, 'Como esta leitura foi construída');
  assert.ok(method.text.length < 1000);
  assert.deepEqual(method.evidence, snapshot.facts.map((fact) => fact.id));
  assert.ok(method.evidence.includes('angle-midheaven'));
  assert.ok(method.evidence.includes('personal-context'));
  assert.deepEqual(new Set(snapshot.facts.map((fact) => fact.id)).size, snapshot.facts.length);
  assert.equal(method.text.includes('movimento direto da candidata'), false);
  const readerText = `${delivery.content.sections.map((section) => section.text).join('\n')}\n${delivery.content.limits.join('\n')}`;
  assert.doesNotMatch(readerText, /\b(?:gauntlet|UT1|IANA|orbe)\b/i);
  assert.doesNotMatch(readerText, /\d+[.,]\d{2,}°/);
  assert.match(readerText, /A precisão desta base ainda está em validação independente/);
  assert.equal('promotionId' in delivery.content, false);
  assert.equal('reviewDigest' in delivery.content, false);
  assert.equal(delivery.basisDigest, assessment.basisDigest);
  assert.equal(delivery.outputDigest, assessment.outputDigest);
  assert.match(delivery.deliveryDigest, /^[0-9a-f]{64}$/);
  assert.deepEqual(await prepareCareerCompassFullDelivery(draft), delivery);
  assert.equal((await evaluateProductDraft(draft)).reason, 'calculation_invalid');
});

test('private delivery rejects wrong aspect endpoints, repeated pairs and drift from persisted input', async () => {
  const snapshot = await calculation();
  const output = reading(snapshot);
  const base = { runId, revision: 2, productId: 'career-compass', tier: 'premium',
    workflowInput, calculation: snapshot, output };
  const wrongAspect = structuredClone(base);
  const selected = wrongAspect.output.claims.find((claim) => claim.id === 'selected-relation-1');
  assert.ok(selected.evidence.some((id) => id.startsWith('career-aspect-')));
  const endpoints = snapshot.data.aspects.aspects[0];
  const unrelated = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']
    .find((body) => body !== endpoints.first && body !== endpoints.second);
  selected.evidence = selected.evidence.filter((id) => !id.startsWith('position-'));
  selected.evidence.push(`position-${endpoints.first}`, `position-${unrelated}`);
  const mismatch = await evaluateCareerCompassFullDraft(wrongAspect);
  assert.equal(mismatch.status, 'rejected');
  assert.ok(mismatch.findings.some((finding) => finding.code === 'career_full_aspect_pair_mismatch'));
  const duplicate = structuredClone(base);
  const one = duplicate.output.claims.find((claim) => claim.id === 'selected-relation-1');
  const two = duplicate.output.claims.find((claim) => claim.id === 'selected-relation-2');
  two.evidence = [...two.evidence.filter((id) => !id.startsWith('position-')),
    ...one.evidence.filter((id) => id.startsWith('position-'))];
  assert.ok((await evaluateCareerCompassFullDraft(duplicate)).findings.some((finding) =>
    finding.code === 'career_full_selected_pair_duplicate'));
  const changedContext = structuredClone(base);
  changedContext.workflowInput.context = 'Agora quero assumir a liderança da equipe.';
  assert.equal((await prepareCareerCompassFullDelivery(changedContext)).reason, 'calculation_invalid');
  const changedCalculation = structuredClone(base);
  changedCalculation.calculation.facts.find((item) => item.id === 'career-mc-ruler').display = 'Outro regente';
  assert.equal((await prepareCareerCompassFullDelivery(changedCalculation)).reason, 'calculation_invalid');
  const missingInput = structuredClone(base);
  delete missingInput.workflowInput;
  assert.equal((await prepareCareerCompassFullDelivery(missingInput)).publication, 'blocked');
});
