import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dimensions, RUBRIC_VERSION, SCHEMA_VERSION, EditorialGateway, LabBudgetLedger } from '@atv/ai';
import { prepareProductFacts, evaluateProductDraft } from './src/product-editorial.ts';
import { createNatalCalculators } from './src/natal-calculators.ts';
import { createSymbolicCalculators } from './src/symbolic-calculators.ts';

const runId='00000000-0000-4000-8000-000000000001';
const consent={storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false};
const birth={localDateTime:'2000-01-01T12:00:00',utcInstant:'2000-01-01T12:00:00Z',timezone:'UTC',latitude:0,longitude:0,locationSource:'synthetic'};
const calculators={...createNatalCalculators(),...createSymbolicCalculators()};
async function calculation(productId='daily-card') {
  const input={version:'atv-workflow/1.0.0',productId,consent};
  if(['daily-card','three-questions'].includes(productId)) input.questions=Array(productId==='daily-card'?1:3).fill('Que alternativa posso observar?');
  else if(productId.startsWith('dream-')) input.dream={date:'2026-09-14',narrative:'Uma ponte apareceu no sonho.',emotions:['curiosidade'],associations:['travessia']};
  else input.birth=birth;
  return calculators[productId](input,{runId,signal:new AbortController().signal});
}
function reading(facts) {
  return {schemaVersion:SCHEMA_VERSION,capability:facts.capability,scope:'partial',title:'Um recorte para observar',
    claims:[{id:'c1',kind:'fact',text:facts.facts[0].display,evidence:[facts.facts[0].id]}],relations:[],
    synthesis:[{claimIds:['c1'],text:'Este recorte preserva a informação recebida e não encerra uma leitura.'}],
    reflections:['Que associação pessoal aparece ao considerar esse elemento?'],limits:['Rascunho sintético para testar contratos; não é interpretação homologada.']};
}
async function draft(productId='daily-card') {
  const calc=await calculation(productId); const prepared=prepareProductFacts(productId,calc);
  assert.equal(prepared.status,'prepared');
  return {runId,revision:2,productId,tier:'free',calculation:calc,output:reading(prepared.facts)};
}
const authority={reviewers:['synthetic-reviewer'],calibrations:['synthetic-calibration']};
function bound(assessment) {
  return {basisDigest:assessment.basisDigest,review:{rubricVersion:RUBRIC_VERSION,outputDigest:assessment.outputDigest,
    reviewer:'synthetic-reviewer',source:'human',calibrationId:null,
    scores:Object.fromEntries(dimensions.map(d=>[d,10])),evidence:Object.fromEntries(dimensions.map(d=>[d,'Fixture de regra; não calibra qualidade.']))}};
}

test('all eight real calculators project exact, isolated, partial facts into the Lab',async()=>{
  for(const productId of Object.keys(calculators)) {
    const calc=await calculation(productId);const prepared=prepareProductFacts(productId,calc);
    assert.equal(prepared.status,'prepared',productId);assert.deepEqual(prepared.facts.facts,calc.facts);
    assert.equal(prepared.facts.completeness,'partial');assert.equal('data' in prepared.facts,false);
    prepared.facts.facts[0].display='changed';assert.notEqual(calc.facts[0].display,'changed');
    assert.notEqual(prepared.calculation.facts[0].display,'changed');
    const evaluated=await evaluateProductDraft(await draft(productId));
    assert.equal(evaluated.status,'needs_editorial_review');assert.equal(evaluated.publication,'blocked');
  }
});

test('storage-only facts refuse adaptation without truncation, invented basis or hidden loss',async()=>{
  for(const mutate of [c=>c.facts[0].display='x'.repeat(1201),c=>c.facts[0].source='x'.repeat(161),
    c=>c.facts[0].id='X invalid id',c=>c.facts=Array.from({length:41},(_,i)=>({...c.facts[0],id:`fact-${i}`}))]) {
    const c=await calculation();mutate(c);const copy=structuredClone(c);
    assert.equal(prepareProductFacts('daily-card',c).reason,'facts_not_representable');assert.deepEqual(c,copy);
  }
  const c=await calculation();c.facts=c.facts.filter(f=>f.kind==='reported');
  assert.equal(prepareProductFacts('daily-card',c).reason,'insufficient_facts');
  assert.equal(prepareProductFacts('birth-chart',c).reason,'calculation_invalid');
  assert.equal(prepareProductFacts('unknown',c).reason,'calculation_invalid');
});

test('review is bound to output and complete provenance, run, revision, product and tier',async()=>{
  const input=await draft();const assessment=await evaluateProductDraft(input);const review=bound(assessment);
  assert.equal(assessment.outputDigest,createHash('sha256').update(JSON.stringify(input.output)).digest('hex'));
  assert.equal((await evaluateProductDraft(input,review,authority)).status,'reviewed_candidate');
  for(const mutate of [d=>d.runId='00000000-0000-4000-8000-000000000002',d=>d.revision++,d=>d.tier='premium',
    d=>d.productId='tarot-focus',d=>d.calculation.version+='-changed',d=>d.calculation.data.newProvenance='changed',
    d=>d.calculation.limits.push('Outro limite.'),d=>d.calculation.facts[0].source+='-changed',
    d=>d.output.title='Outro recorte']) {
    const changed=structuredClone(input);mutate(changed);
    const result=await evaluateProductDraft(changed,review,authority);
    assert.equal(result.reason,'review_basis_mismatch');assert.notEqual(result.basisDigest,assessment.basisDigest);
    assert.equal(result.publication,'blocked');
  }
});

test('equivalent object key order has stable basis; caller mutation cannot race hashing',async()=>{
  const input=await draft();input.calculation.data={b:2,a:{d:4,c:3}};
  const first=await evaluateProductDraft(input);
  input.calculation.data={a:{c:3,d:4},b:2};
  assert.equal((await evaluateProductDraft(input)).basisDigest,first.basisDigest);
  const pending=evaluateProductDraft(input);input.revision++;input.calculation.data.a.c=900;
  assert.equal((await pending).basisDigest,first.basisDigest);
});

test('untrusted, stale, uncalibrated and below-threshold reviews never approve',async()=>{
  const input=await draft();const initial=await evaluateProductDraft(input);const good=bound(initial);
  assert.equal((await evaluateProductDraft(input,good)).reason,'reviewer_not_authorized');
  for(const mutate of [r=>r.review.outputDigest='0'.repeat(64),r=>r.review.rubricVersion='old',
    r=>r.review.scores.factualFidelity=9,r=>r.review.evidence.depth='',r=>r.review.scores.voice=NaN,
    r=>r.review.scores=null,r=>r.review.evidence=null,r=>r.review.evidence.depth=123,
    r=>{r.review.source='calibrated-reviewer';r.review.calibrationId='unknown';}]) {
    const review=structuredClone(good);mutate(review);
    assert.notEqual((await evaluateProductDraft(input,review,authority)).status,'reviewed_candidate');
  }
  good.review.source='calibrated-reviewer';good.review.calibrationId='synthetic-calibration';
  const result=await evaluateProductDraft(input,good,authority);
  assert.equal(result.status,'reviewed_candidate');assert.equal(result.reason,'promotion_required');
  assert.equal(result.publication,'blocked');assert.equal('reading' in result,false);
});

test('schema and mechanical rejection take precedence over review scores',async()=>{
  const input=await draft();const good=bound(await evaluateProductDraft(input));
  for(const [mutate,reason] of [[d=>d.output.extra=true,'invalid_schema'],
    [d=>d.output.claims[0].text='Carta inventada','mechanical_rejected'],
    [d=>d.output.capability='natal-synthesis','mechanical_rejected'],
    [d=>d.output.scope='integrated','mechanical_rejected']]) {
    const changed=structuredClone(input);mutate(changed);
    const result=await evaluateProductDraft(changed,good,authority);
    assert.equal(result.reason,reason);assert.equal(result.status,'rejected');
  }
  for(const mutate of [d=>d.runId='not-a-run',d=>d.revision=-1,d=>d.tier='unknown',d=>d.calculation.data.bad=Infinity]) {
    const changed=structuredClone(input);mutate(changed);assert.equal((await evaluateProductDraft(changed)).status,'rejected');
  }
});

test('product evidence never opens the production or personal-data gateway',async()=>{
  const input=await draft();const prepared=prepareProductFacts(input.productId,input.calculation);let calls=0;
  const config={enabled:true,providers:[{id:'fixture',model:'synthetic',kind:'fixture',generate:async()=>{calls++;throw Error('must not call');}}],ledger:new LabBudgetLedger()};
  const request={correlationId:'synthetic-bridge',tier:'free',facts:prepared.facts,dataClass:'synthetic',consentToProcess:true};
  assert.equal((await new EditorialGateway({...config,mode:'production'}).generate(request)).reason,'promotion_required');
  assert.equal((await new EditorialGateway({...config,mode:'lab'}).generate({...request,dataClass:'personal'})).reason,'personal_data_not_approved');
  assert.equal(calls,0);
});
