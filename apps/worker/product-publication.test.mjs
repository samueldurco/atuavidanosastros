import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductPublisher } from './src/product-publication.ts';

const claim=()=>({runId:'00000000-0000-4000-8000-000000000001',receiptId:'00000000-0000-4000-8000-000000000002',
  token:'00000000-0000-4000-8000-000000000003',revision:3,leaseUntil:new Date(Date.now()+60000).toISOString()});
const config={enabledProducts:['daily-card']};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('publisher defaults offline, validates configuration and captures allowlist and sink',async()=>{
  const events=[];const offline=createProductPublisher(async()=>assert.fail('offline'),{emit:e=>events.push(e)});
  assert.equal(await offline.step(),'idle');assert.ok(Object.isFrozen(offline));
  assert.deepEqual(Object.keys(events[0]).sort(),['durationMs','event','outcome']);assert.ok(Object.isFrozen(events[0]));
  for(const enabledProducts of [['unknown'],['daily-card','daily-card'],[null],'daily-card'])
    assert.throws(()=>createProductPublisher(async()=>null,{enabledProducts}),/invalid_product_configuration/);
  for(const timeoutMs of [0,-1,25001,NaN,1.5]) assert.throws(()=>createProductPublisher(async()=>null,{timeoutMs}),/invalid_publication_deadline/);
  assert.throws(()=>createProductPublisher(null),/invalid_publication_configuration/);
  const options={enabledProducts:['daily-card'],emit:e=>events.push(e)};
  const runtime=createProductPublisher(async(name,args,signal)=>{
    assert.equal(name,'claim_product_editorial');assert.deepEqual(args,{p_products:['daily-card']});assert.ok(signal instanceof AbortSignal);return null;
  },options);
  options.enabledProducts.push('birth-chart');options.emit=()=>assert.fail('mutated sink');
  assert.equal(await runtime.step(),'idle');assert.deepEqual(runtime.products,['daily-card']);assert.ok(Object.isFrozen(runtime.products));
});

test('one claim plus one fixed publication RPC never carries text, input, owner or approval',async()=>{
  const c=claim(),calls=[];
  const runtime=createProductPublisher(async(name,args)=>{calls.push({name,args});return calls.length===1?c:{state:'READY',revision:4};},config);
  assert.equal(await runtime.step(),'published');assert.deepEqual(calls,[
    {name:'claim_product_editorial',args:{p_products:['daily-card']}},
    {name:'complete_product_editorial',args:{p_id:c.runId,p_receipt:c.receiptId,p_token:c.token,p_revision:3}},
  ]);
});

test('malformed or expired claims cannot reach completion; failures contain no sensitive data',async()=>{
  const events=[];
  for(const value of [undefined,[],{}, {...claim(),private:'secret'}, {...claim(),token:'bad'}, {...claim(),revision:8},
    {...claim(),revision:1.5}, {...claim(),leaseUntil:'2000-01-01'}, {...claim(),leaseUntil:'invalid'}]) {
    let calls=0;const runtime=createProductPublisher(async()=>{calls++;return value;},{...config,emit:e=>events.push(e)});
    assert.equal(await runtime.step(),'unavailable');assert.equal(calls,1);
  }
  const runtime=createProductPublisher(async()=>{throw Error('secret input credential');},{...config,emit:e=>events.push(e)});
  assert.equal(await runtime.step(),'unavailable');assert.ok(!JSON.stringify(events).includes('secret'));
});

test('any missing, malformed, mismatched or failed completion is uncertain without retry or cleanup writes',async()=>{
  for(const response of [null,{}, {state:'READY',revision:3},{state:'READY',revision:4,private:'secret'},'throw']) {
    let calls=0;const runtime=createProductPublisher(async()=>{if(++calls===1)return claim();if(response==='throw')throw Error('secret');return response;},config);
    assert.equal(await runtime.step(),'publication_uncertain');assert.equal(calls,2);
  }
});

test('pre-aborted and in-flight claim cancellation prevent completion even when transport responds late',async()=>{
  const controller=new AbortController();controller.abort();
  assert.equal(await createProductPublisher(async()=>assert.fail('aborted'),config).step(controller.signal),'cancelled');
  const wait=deferred(),abort=new AbortController();let calls=0,transportSignal;
  const runtime=createProductPublisher(async(_n,_a,s)=>{calls++;transportSignal=s;return wait.promise;},config);
  const result=runtime.step(abort.signal);abort.abort();assert.equal(await result,'cancelled');assert.ok(transportSignal.aborted);
  wait.resolve(claim());await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
});

test('claim deadline bounds a hung transport and suppresses late completion and duplicate telemetry',async()=>{
  const wait=deferred(),events=[];let calls=0;
  const runtime=createProductPublisher(async()=>{calls++;return wait.promise;},{...config,timeoutMs:15,emit:e=>events.push(e)});
  assert.equal(await runtime.step(),'deadline_exceeded');wait.resolve(claim());await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1);assert.equal(events.length,1);
});

test('completion cancellation and deadline remain uncertain; late success cannot emit published',async()=>{
  for(const cancel of [true,false]) {
    const entered=deferred(),wait=deferred(),abort=new AbortController(),events=[];let calls=0;
    const runtime=createProductPublisher(async()=>{if(++calls===1)return claim();entered.resolve();return wait.promise;},
      {...config,timeoutMs:30,emit:e=>events.push(e)});
    const result=runtime.step(abort.signal);await entered.promise;if(cancel)abort.abort();
    assert.equal(await result,'publication_uncertain');wait.resolve({state:'READY',revision:4});await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls,2);assert.equal(events.length,1);assert.equal(events[0].outcome,'publication_uncertain');
  }
});

test('same publisher serializes active calls; telemetry exceptions never change result',async()=>{
  const wait=deferred();let calls=0;
  const runtime=createProductPublisher(async()=>{calls++;return wait.promise;},{...config,emit:()=>{throw Error('sink');}});
  const first=runtime.step();assert.equal(await runtime.step(),'busy');assert.equal(calls,1);wait.resolve(null);assert.equal(await first,'idle');
});
