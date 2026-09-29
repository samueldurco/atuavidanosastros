import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workflows, parseWorkflowInput, transitionRun, WORKFLOW_VERSION, validDate } from './src/workflows.ts';

const birth = { localDateTime:'2000-01-01T12:00:00', utcInstant:'2000-01-01T15:00:00Z', timezone:'America/Sao_Paulo', latitude:-23.5, longitude:-46.6, locationSource:'synthetic' };
const consent = { storage:true, policyVersion:'atv-input-consent/1', partner:false, continuity:false };
export function inputFor(p) {
  const value = {version:WORKFLOW_VERSION, productId:p.id, consent:{...consent}};
  if (['natal','cycles','relationship','purpose'].includes(p.kind) && p.id!=='direction-journey') value.birth = {...birth};
  if (p.id==='direction-journey') value.journey={goal:'Explorar uma direção profissional concreta',startDate:'2026-09-09'};
  if (p.id==='tarot-journey') value.tarotJourney={goal:'Acompanhar uma decisão de trabalho com autonomia'};
  if (p.id==='life-atlas') value.atlas={priorities:['Relações','Trabalho','Rotina','Aprendizado']};
  if (p.kind==='relationship') { value.partner={...birth}; value.consent.partner=true; }
  if (p.kind==='cycles') value.targetDate=p.id==='personal-calendar'?'2026-09-01':'2026-09-09';
  if (p.id==='solar-return') { value.returnYear=2026; value.returnLocation={city:'São Paulo', timezone:'America/Sao_Paulo', latitude:-23.5, longitude:-46.6, locationSource:'synthetic'}; }
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
test('solar return requires an explicit birthday city and coherent cycle year',()=>{
  const value=inputFor(workflows.find(p=>p.id==='solar-return'));
  for (const patch of [
    {returnLocation:undefined},
    {returnLocation:{...value.returnLocation,latitude:91}},
    {returnLocation:{...value.returnLocation,city:''}},
    {returnLocation:{...value.returnLocation,extra:'not allowed'}},
    {targetDate:'2027-01-01'},
  ]) assert.equal(parseWorkflowInput({...value,...patch}),null);
  assert.deepEqual(parseWorkflowInput(value)?.returnLocation,value.returnLocation);
});
test('personal calendar names one complete civil month',()=>{
  const value=inputFor(workflows.find(p=>p.id==='personal-calendar'));
  assert.equal(parseWorkflowInput(value)?.targetDate,'2026-09-01');
  for (const targetDate of ['2026-09-02','2026-09-00','2026-02-29'])
    assert.equal(parseWorkflowInput({...value,targetDate}),null);
});
test('direction journey requires its own declared goal and complete 30-day civil window',()=>{
  const value=inputFor(workflows.find(p=>p.id==='direction-journey'));
  assert.deepEqual(parseWorkflowInput(value)?.journey,value.journey);
  for (const journey of [undefined, {goal:'',startDate:'2026-09-09'},
    {goal:'x'.repeat(401),startDate:'2026-09-09'},
    {goal:'Direção',startDate:'2026-02-30'},
    {goal:'Direção',startDate:'2099-12-03'},
    {...value.journey,extra:'forbidden'}])
    assert.equal(parseWorkflowInput({...value,journey}),null);
  assert.equal(parseWorkflowInput({...value,birth}),null);
  assert.equal(parseWorkflowInput({...inputFor(workflows.find(p=>p.id==='purpose-career')),journey:value.journey}),null);
});
test('tarot journey requires a separate, bounded declared goal without accepting forged stages',()=>{
  const value=inputFor(workflows.find(p=>p.id==='tarot-journey'));
  assert.deepEqual(parseWorkflowInput(value)?.tarotJourney,value.tarotJourney);
  for (const tarotJourney of [undefined,{goal:''},{goal:'x'.repeat(401)},
    {goal:'Uma decisão\u007f'},{goal:'Questão',stage:21}])
    assert.equal(parseWorkflowInput({...value,tarotJourney}),null);
  assert.equal(parseWorkflowInput({...value,questions:[]}),null);
  assert.equal(parseWorkflowInput({...value,questions:['Uma','Duas']}),null);
  assert.equal(parseWorkflowInput({...inputFor(workflows.find(p=>p.id==='tarot-focus')),tarotJourney:value.tarotJourney}),null);
});
test('life atlas requires four distinct priorities declared by the person',()=>{
  const value=inputFor(workflows.find(p=>p.id==='life-atlas'));
  assert.deepEqual(parseWorkflowInput(value)?.atlas,value.atlas);
  for (const atlas of [undefined,{priorities:[]},{priorities:['Um','Dois','Três']},
    {priorities:['Um','Dois','Três','Quatro','Cinco']},
    {priorities:['Um','Dois','Três',' um ']},
    {priorities:['Um','Dois','Três','\u0001Quatro']},
    {priorities:['Um','Dois','Três','x'.repeat(121)]},
    {...value.atlas,extra:'forbidden'}])
    assert.equal(parseWorkflowInput({...value,atlas}),null);
  assert.equal(parseWorkflowInput({...value,birth:undefined}),null);
  assert.equal(parseWorkflowInput({...inputFor(workflows.find(p=>p.id==='birth-chart')),atlas:value.atlas}),null);
});
test('personal calendar preserves specifically authorized marks only within its month',()=>{
  const value=inputFor(workflows.find(p=>p.id==='personal-calendar'));
  const calendarMarks={authorization:'atv-personal-calendar-marks/1',entries:[
    {date:'2026-09-01',label:'Início declarado'},
    {date:'2026-09-30',label:'Fechamento declarado'}
  ]};
  assert.deepEqual(parseWorkflowInput({...value,calendarMarks})?.calendarMarks,calendarMarks);
  for (const bad of [
    {...calendarMarks,authorization:'missing'},
    {...calendarMarks,entries:[]},
    {...calendarMarks,entries:[{date:'2026-10-01',label:'Fora'}]},
    {...calendarMarks,entries:[calendarMarks.entries[0],calendarMarks.entries[0]]},
    {...calendarMarks,entries:[{date:'2026-09-01',label:'Controle\u0001'}]}
  ]) assert.equal(parseWorkflowInput({...value,calendarMarks:bad}),null);
  assert.equal(parseWorkflowInput({...inputFor(workflows.find(p=>p.id==='horoscope')),calendarMarks}),null);
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
