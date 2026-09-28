import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProductLabCorpus, corpusCategories, corpusDigest, corpusProducts, productCorpusInput } from './helpers/product-lab-corpus.mjs';
import { createProductCalculators } from '../apps/worker/src/product-runtime.ts';
import { validateFacts, tierLimits } from '../packages/ai/src/contracts.ts';
import { releaseCases } from '../packages/ai/src/lab/release-dataset.ts';

const corpus = await buildProductLabCorpus();

test('versioned request fingerprint catches silent factual drift, not editorial quality', () => {
  assert.equal(corpus.version, 'atv-product-facts-synthetic/1.1.0');
  assert.equal(corpusDigest(corpus.cases.map(({ id, request }) => ({ id, request }))),
    '49ff8dedac35ca3a028d7bd610895f316858e3ce5df57ad69df8d24ead520d1f');
});

test('offline corpus covers 12 partial bases, six capabilities and seven strata without claiming release', () => {
  assert.deepEqual([...corpusProducts].sort(), Object.keys(createProductCalculators()).sort());
  assert.equal(corpus.cases.length, 84);
  assert.equal(corpus.cases.filter(item => item.preparation === 'prepared').length, 83);
  assert.deepEqual(corpus.cases.filter(item => item.preparation === 'blocked').map(item => [item.id, item.blockReason]),
    [['ascendant-boundary', 'insufficient_facts']]);
  assert.equal(new Set(corpus.cases.map(item => item.id)).size, 84);
  assert.equal(new Set(corpus.cases.map(item => item.runId)).size, 84);
  assert.equal(corpus.unavailableProducts.length, 13);
  assert.equal(corpus.promotionEligible, false);
  assert.equal(new Set(corpus.cases.filter(item => item.request).map(item => item.request.facts.capability)).size, 6);
  for (const product of corpusProducts) {
    const rows = corpus.cases.filter(item => item.productId === product);
    assert.deepEqual(rows.map(item => item.category), corpusCategories);
    assert.equal(new Set(rows.map(item => item.calculationDigest)).size, 7);
    // Context-only differences do not count as factual diversity.
    const bases = rows.map(item => item.calculation.kind === 'dream' ? item.calculation.data.entry.narrative :
      item.calculation.facts.filter(fact => fact.kind !== 'reported'));
    assert.ok(new Set(bases.map(corpusDigest)).size >= 4, product);
  }
});

test('facts are projected without invention, truncation or loss of provenance', () => {
  for (const item of corpus.cases) {
    assert.equal(item.editorialReview, 'not-reviewed');
    assert.equal(item.publication, 'blocked');
    assert.equal(item.calculationDigest, corpusDigest(item.calculation));
    assert.equal(item.inputDigest, corpusDigest(item.input));
    if (!item.request) { assert.equal(item.preparation, 'blocked'); assert.ok(item.blockReason); continue; }
    assert.ok(validateFacts(item.request.facts), item.id);
    assert.deepEqual(item.request.facts.facts, item.calculation.facts);
    assert.equal(item.factsDigest, corpusDigest(item.request.facts));
    assert.equal(item.request.facts.completeness, 'partial');
    assert.equal(item.request.dataClass, 'synthetic');
    assert.ok(JSON.stringify(item.request.facts).length + item.request.context.length < tierLimits.intermediate.maxInputChars, item.id);
    assert.equal('output' in item, false);
    assert.equal('review' in item, false);
  }
});

test('polar boundaries and incomplete dream reports retain limits, not replacement facts', () => {
  const polar = corpus.cases.find(item => item.id === 'birth-chart-boundary');
  assert.equal(polar.calculation.data.angles.ascendant, null);
  assert.deepEqual(polar.calculation.data.houses.cusps, []);
  assert.equal(polar.calculation.facts.some(item => item.id.startsWith('house-')), false);
  const ascendant = corpus.cases.find(item => item.id === 'ascendant-boundary');
  assert.equal(ascendant.calculation.data.angles.ascendant, null);
  assert.ok(ascendant.calculation.facts.some(fact => fact.id === 'ascendant-unavailable'));
  assert.equal('request' in ascendant, false);
  assert.equal('factsDigest' in ascendant, false);
  for (const product of ['dream-reading', 'dream-journal']) {
    const dream = corpus.cases.find(item => item.id === `${product}-incomplete`);
    assert.deepEqual(dream.calculation.data.entry.emotions, []);
    assert.deepEqual(dream.calculation.data.entry.associations, []);
    assert.equal(dream.calculation.data.continuity.historyLoaded, false);
  }
});

test('adversarial text stays reported data and cannot redraw a saved Tarot run', async () => {
  const calculators = createProductCalculators();
  for (const item of corpus.cases.filter(item => item.category === 'adversarial')) {
    assert.ok(item.calculation.facts.some(fact => fact.kind === 'reported' && /Ignore|ignore/.test(fact.display)), item.id);
    if (item.calculation.kind !== 'tarot') continue;
    const clean = productCorpusInput(item.productId, 'common');
    const recalculated = await calculators[item.productId](clean, { runId: item.runId, signal: new AbortController().signal });
    assert.deepEqual(recalculated.data.cards, item.calculation.data.cards);
  }
});

test('replay preserves exact inputs and fact requests; live calculation timestamps remain provenance', async () => {
  const before = JSON.stringify(releaseCases);
  const second = await buildProductLabCorpus();
  // Engine provenance records actual execution time; do not forge it to manufacture identical runs.
  const stable = value => value.cases.map(({ id, input, inputDigest, request, factsDigest, criteria, preparation, blockReason }) =>
    ({ id, input, inputDigest, request, factsDigest, criteria, preparation, blockReason }));
  assert.deepEqual(stable(second), stable(corpus));
  second.cases[0].calculation.facts[0].display = 'mutated local fixture';
  assert.notEqual(second.cases[0].calculation.facts[0].display, corpus.cases[0].calculation.facts[0].display);
  assert.equal(JSON.stringify(releaseCases), before);
  assert.equal(releaseCases.length, 42);
  assert.throws(() => productCorpusInput('unknown', 'common'), /unknown_corpus_case/);
});
