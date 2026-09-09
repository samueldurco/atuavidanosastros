import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workflows, parseWorkflowInput, transitionRun, WORKFLOW_VERSION, validDate } from './src/workflows.ts';

const birth = { localDateTime:'2000-01-01T12:00:00', utcInstant:'2000-01-01T15:00:00Z', timezone:'America/Sao_Paulo', latitude:-23.5, longitude:-46.6, locationSource:'synthetic' };
const consent = { storage:true, policyVersion:'atv-input-consent/1', partner:false, continuity:false };
export function inputFor(p) {
  const value = {version:WORKFLOW_VERSION, productId:p.id, consent:{...consent}};
  if (['natal','cycles','relationship','purpose'].includes(p.kind)) value.birth = {...birth};
  if (p.kind==='relationship') { value.partner={...birth}; value.consent.partner=true; }
  if (p.kind==='cycles') value.targetDate='2026-09-09';
  if (p.id==='solar-return') value.returnYear=2026;
  if (p.kind==='tarot') value.questions=Array.from({length:p.id==='three-questions'?3:1},(_,i)=>`Questão sintética ${i+1}`);
  if (p.kind==='dream') value.dream={date:'2026-09-09', narrative:'Uma porta azul em um jardim.',associations:['calma'],emotions:['curiosidade']};
  return value;
}
test('all 25 products cover six universes, with gated, typed input',()=>{
  assert.equal(workflows.length,25);
  assert.equal(new Set(workflows.map(p=>p.kind)).size,6);
  for (const p of workflows) {
    assert.equal(p.release,'blocked');
    const value=inputFor(p), parsed=parseWorkflowInput(value);
    assert.deepEqual(parsed,value,p.id);
    assert.notEqual(parsed,value);
    assert.equal(parseWorkflowInput({...value,prompt:'bypass'}),null);
    assert.equal(parseWorkflowInput({...value,consent:{...value.consent,storage:false}}),null);
  }
});
test('contracts reject invalid scopes, dates, excess input and third-party data without consent',()=>{
  assert.equal(validDate('2025-02-29'),false); assert.equal(validDate('2024-02-29'),true);
  assert.equal(validDate('2100-01-01'),false);
  for (const [id,patch] of [['synastry',{partner:null}],['daily-card',{questions:[]}],['three-questions',{questions:['one']}],['dream-reading',{dream:{date:'2026-09-09',narrative:'x'.repeat(6001),emotions:[],associations:[]}}],['solar-return',{returnYear:3000}],['ascendant',{birth:{...birth,latitude:NaN}}]]) {
    assert.equal(parseWorkflowInput({...inputFor(workflows.find(p=>p.id===id)),...patch}),null,id);
  }
});
const at='2026-09-09T20:00:00.000Z';
const base={id:'synthetic',productId:'ascendant',state:'QUEUED',revision:1,parentId:null,createdAt:at,updatedAt:at,input:inputFor(workflows.find(p=>p.id==='ascendant')),calculation:null,editorial:null,errorCode:null};
const calc={version:'fixture/1',kind:'natal',status:'experimental',facts:[{id:'f1',kind:'calculated',display:'synthetic',source:'fixture'}],data:{},limits:['fixture']};
const edit={version:'fixture/1',promotionId:'synthetic-approved',reviewDigest:'a'.repeat(64),title:'Fixture',sections:[{title:'Section',text:'Synthetic only',evidence:['f1']}],limits:[]};
const blocked={enabled:false,engine:false,promotionIds:[]};
test('state machine enforces revision, immutable calculation, engine and editorial gates',()=>{
  assert.throws(()=>transitionRun(base,2,{to:'CALCULATED',calculation:calc},blocked,at),/stale_revision/);
  assert.throws(()=>transitionRun(base,1,{to:'READY'},blocked,at),/invalid_transition/);
  const calculated=transitionRun(base,1,{to:'CALCULATED',calculation:calc},blocked,at);
  assert.equal(base.calculation,null);
  assert.throws(()=>transitionRun(calculated,2,{to:'AWAITING_EDITORIAL',calculation:{...calc,data:{changed:true}}},blocked,at),/calculation_immutable/);
  const pending=transitionRun(calculated,2,{to:'AWAITING_EDITORIAL'},blocked,at);
  for (const approval of [blocked,{enabled:true,engine:false,promotionIds:[edit.promotionId]},{enabled:true,engine:true,promotionIds:[]}])
    assert.throws(()=>transitionRun(pending,3,{to:'READY',editorial:edit},approval,at),/release_evidence_required/);
  const ready=transitionRun(pending,3,{to:'READY',editorial:edit},{enabled:true,engine:true,promotionIds:[edit.promotionId]},'2026-09-09T21:00:00.000Z');
  assert.equal(ready.revision,4); assert.equal(ready.updatedAt,'2026-09-09T21:00:00.000Z');
  assert.throws(()=>transitionRun(ready,4,{to:'QUEUED'},blocked,at),/invalid_transition/);
});
test('failures are sanitized; transition times cannot regress',()=>{
  assert.throws(()=>transitionRun(base,1,{to:'FAILED',errorCode:'secret-bearing message'},blocked,at),/safe_error/);
  assert.throws(()=>transitionRun(base,1,{to:'CANCELLED'},blocked,'2000-01-01T00:00:00Z'),/invalid_transition_time/);
  assert.equal(transitionRun(base,1,{to:'FAILED',errorCode:'provider_unavailable'},blocked,at).state,'FAILED');
});
