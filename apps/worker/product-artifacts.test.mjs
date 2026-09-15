import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { persistRenderedProductArtifact,ArtifactError } from './src/product-artifacts.ts';
const input=()=>({owner:'00000000-0000-4000-8000-000000000001',reading:{id:'00000000-0000-4000-8000-000000000002',productId:'daily-card',revision:4,reviewDigest:'a'.repeat(64),sectionCount:1},
 format:'web',section:-1,rendererVersion:'atv-web-export/1.0.0',bytes:new TextEncoder().encode('Synthetic bytes')});
const receipt=args=>({id:'00000000-0000-4000-8000-000000000003',runId:args.p_run_id,revision:args.p_revision,reviewDigest:args.p_review_digest,
 format:args.p_format,section:args.p_section,rendererVersion:args.p_renderer,sha256:args.p_sha256,bytes:Buffer.from(args.p_body_base64,'base64').length,createdAt:'2026-09-15T20:00:00Z'});
test('writer snapshots identity and bytes before async hashing and only returns verified manifest',async()=>{
 const value=input(),expected=Buffer.from(value.bytes);let observed;
 const pending=persistRenderedProductArtifact(async(name,args)=>{assert.equal(name,'persist_product_artifact');observed=args;return {...receipt(args),bodyBase64:'PRIVATE'};},value);
 value.reading.revision=8;value.bytes.fill(0);value.owner='OTHER';
 const saved=await pending;
 assert.equal(saved.revision,4);assert.equal(saved.bodyBase64,undefined);
 assert.deepEqual(Buffer.from(observed.p_body_base64,'base64'),expected);
 assert.equal(saved.sha256,createHash('sha256').update(expected).digest('hex'));
});
test('invalid eligibility, identity, section, renderer, byte budget and deadlines never call transport',async()=>{
 let called=0;const rpc=async()=>{called++;};
 for(const change of [v=>v.owner='bad',v=>v.reading.reviewDigest='bad',v=>v.section=0,v=>v.rendererVersion='unknown',v=>v.bytes=new Uint8Array(0),v=>v.bytes=new Uint8Array(8388609),v=>v.reading.productId='atv-plus']) {
  const value=input();change(value);await assert.rejects(()=>persistRenderedProductArtifact(rpc,value),/artifact_invalid/);
 }
 for(const timeoutMs of [0,10001,1.5]) await assert.rejects(()=>persistRenderedProductArtifact(rpc,input(),{timeoutMs}),/artifact_invalid/);
 assert.equal(called,0);
});
test('tampered receipts or raw provider exceptions cannot masquerade as persisted bytes or leak errors',async()=>{
 for(const change of [v=>v.sha256='c'.repeat(64),v=>v.bytes++,v=>v.revision++,v=>v.format='card',v=>v.id='bad'])
  await assert.rejects(()=>persistRenderedProductArtifact(async(_n,args)=>{const result=receipt(args);change(result);return result;},input()),/artifact_unavailable/);
 await assert.rejects(()=>persistRenderedProductArtifact(async()=>{throw new Error('PRIVATE_PROVIDER_PAYLOAD');},input()),e=>e.message==='artifact_unavailable');
 await assert.rejects(()=>persistRenderedProductArtifact(async()=>{throw new ArtifactError('artifact_limit');},input()),/artifact_limit/);
});
test('deadline aborts hanging transports; pre-abort does not persist and late completions do not become success',async()=>{
 let signal,resolve;
 await assert.rejects(()=>persistRenderedProductArtifact((_n,_a,s)=>{signal=s;return new Promise(r=>{resolve=r;});},input(),{timeoutMs:30}),/deadline_exceeded/);
 assert.equal(signal.aborted,true);resolve(null);
 const controller=new AbortController();controller.abort();let called=0;
 await assert.rejects(()=>persistRenderedProductArtifact(async()=>{called++;},input(),{signal:controller.signal}),/deadline_exceeded/);assert.equal(called,0);
});
