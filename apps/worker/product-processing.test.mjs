import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processNextProductRun, createWorkflowRepository, validateCalculation, ProcessingError } from './src/product-processing.ts';

const runId='00000000-0000-4000-8000-000000000001';
const input={version:'atv-workflow/1.0.0',productId:'daily-card',consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false},questions:['Fixture only']};
const calculation={version:'fixture/1',kind:'tarot',status:'recorded',facts:[{id:'card-0',kind:'drawn',display:'Fixture',source:'synthetic'}],data:{cards:[0]},limits:[]};
const claimed={status:'claimed',runId,productId:'daily-card',token:'00000000-0000-4000-8000-000000000002',revision:1,state:'QUEUED',input,calculation:null,attempt:1,leaseUntil:'2099-01-01T00:00:00Z'};
function store(overrides={}) {
  const calls=[];
  return { calls, claim:async()=>structuredClone(claimed),
    complete:async(c,calc)=>{calls.push(['complete',c,calc]);return {state:calc?'CALCULATED':'AWAITING_EDITORIAL',revision:c.revision+1};},
    fail:async(c,code)=>{calls.push(['fail',code]);return {state:['input_invalid','calculation_invalid'].includes(code)?'FAILED':c.state,revision:c.revision};},...overrides };
}
test('processor validates input, persists calculation once and emits only safe metrics',async()=>{
  const repository=store();const metrics=[];
  assert.equal(await processNextProductRun(repository,{'daily-card':async()=>calculation},{emit:e=>metrics.push(e)}),'calculated');
  assert.equal(repository.calls.length,1);assert.equal(repository.calls[0][0],'complete');
  assert.deepEqual(Object.keys(metrics[0]).sort(),['attempt','durationMs','event','outcome']);
  assert.ok(!JSON.stringify(metrics).includes('Fixture'));assert.ok(!JSON.stringify(metrics).includes(runId));
});
test('persisted Tarot draw is never regenerated; no READY or editorial writer exists',async()=>{
  const repository=store({claim:async()=>({...claimed,state:'CALCULATED',revision:2,calculation})});
  assert.equal(await processNextProductRun(repository,{'daily-card':async()=>{throw Error('must not draw again');}}),'awaiting_editorial');
  assert.equal(repository.calls[0][2],null);
});
test('empty capabilities, idle and exhausted work never invoke calculators',async()=>{
  assert.equal(await processNextProductRun(store({claim:async()=>{throw Error('unexpected');}}),{}),'idle');
  for(const [result,outcome] of [[null,'idle'],[{status:'exhausted',runId},'exhausted']])
    assert.equal(await processNextProductRun(store({claim:async()=>result}),{'daily-card':async()=>{throw Error('unexpected');}}),outcome);
});
test('invalid input and malformed calculation are permanent safe failures',async()=>{
  const invalid=store({claim:async()=>({...claimed,input:{...input,owner:'forged'}})});
  assert.equal(await processNextProductRun(invalid,{'daily-card':async()=>{throw Error('unexpected');}}),'failed');
  assert.deepEqual(invalid.calls,[['fail','input_invalid']]);
  const malformed=store();
  assert.equal(await processNextProductRun(malformed,{'daily-card':async()=>({...calculation,facts:[]})}),'failed');
  assert.deepEqual(malformed.calls,[['fail','calculation_invalid']]);
});
test('timeout aborts and cannot persist a late calculation; bounded safe retry',async()=>{
  const repository=store();let resolve;let signal;
  assert.equal(await processNextProductRun(repository,{'daily-card':async(_,ctx)=>{signal=ctx.signal;return new Promise(r=>{resolve=r;});}},{timeoutMs:10}),'retry');
  assert.ok(signal.aborted);resolve(calculation);await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(repository.calls,[['fail','deadline_exceeded']]);
});
test('late claim after timeout cannot start work',async()=>{
  let resolve;let calculated=false;
  const repository=store({claim:()=>new Promise(r=>{resolve=r;})});
  assert.equal(await processNextProductRun(repository,{'daily-card':async()=>{calculated=true;return calculation;}},{timeoutMs:10}),'unavailable');
  resolve(claimed);await new Promise(r=>setTimeout(r,10));assert.equal(calculated,false);assert.deepEqual(repository.calls,[]);
});
test('lost fencing token is not retried; arbitrary exceptions are sanitized',async()=>{
  const lost=store({complete:async()=>{throw new ProcessingError('lease_lost');}});
  assert.equal(await processNextProductRun(lost,{'daily-card':async()=>calculation}),'lease_lost');assert.deepEqual(lost.calls,[]);
  const failed=store();
  assert.equal(await processNextProductRun(failed,{'daily-card':async()=>{throw Error('private provider response');}},{emit:()=>{throw Error('telemetry down');}}),'retry');
  assert.deepEqual(failed.calls,[['fail','transient_failure']]);
});
test('calculation bounds and kind/status prevent malformed or self-approved snapshots',()=>{
  assert.ok(validateCalculation(calculation,'daily-card'));
  for(const value of [{...calculation,kind:'dream'},{...calculation,facts:[...calculation.facts,...calculation.facts]},
    {...calculation,data:{huge:'x'.repeat(200001)}},{...calculation,status:'approved'},{...calculation,limits:[null]},
    {...calculation,data:{value:NaN}},{...calculation,data:{value:Infinity}},{...calculation,data:{value:undefined}},
    {...calculation,data:{value:new Date()}}])
    assert.equal(validateCalculation(value,'daily-card'),null);
  assert.equal(validateCalculation({...calculation,kind:'natal'},'ascendant'),null);
  const copy=validateCalculation(calculation,'daily-card');copy.data.cards[0]=9;assert.equal(calculation.data.cards[0],0);
});
test('RPC adapter accepts only bounded claims/receipts and maps exact fenced arguments',async()=>{
  const calls=[];const rpc=async(name,args)=>{calls.push({name,args});return name==='claim_product_run_work'?claimed:{state:'CALCULATED',revision:2};};
  const repository=createWorkflowRepository(rpc);const signal=new AbortController().signal;
  const claim=await repository.claim(['daily-card'],signal);await repository.complete(claim,calculation,signal);
  assert.deepEqual(calls[0],{name:'claim_product_run_work',args:{p_products:['daily-card'],p_lease_seconds:60}});
  assert.equal(calls[1].args.p_token,claimed.token);assert.equal(calls[1].args.p_revision,1);
  for(const data of [{...claimed,attempt:6},{...claimed,token:'bad'},{status:'claimed'},false])
    await assert.rejects(()=>createWorkflowRepository(async()=>data).claim(['daily-card'],signal),/unavailable/);
});
