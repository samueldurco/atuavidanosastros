import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artifactEligible,artifactFormats,parseArtifactManifest } from './src/artifacts.ts';
import { productCatalog } from './src/catalog.ts';
const reading={id:'00000000-0000-4000-8000-000000000001',productId:'daily-card',revision:4,reviewDigest:'a'.repeat(64),sectionCount:2};
const manifest={id:'00000000-0000-4000-8000-000000000002',runId:reading.id,revision:4,reviewDigest:reading.reviewDigest,
 format:'card',section:1,rendererVersion:artifactFormats.card.renderer,sha256:'b'.repeat(64),bytes:500,createdAt:'2026-09-15T20:00:00Z'};
test('manifest is a minimal frozen projection and never exposes storage data',()=>{
 const parsed=parseArtifactManifest({...manifest,bodyBase64:'SECRET',input:'PRIVATE'},reading);
 assert.deepEqual(parsed,manifest);assert.ok(Object.isFrozen(parsed));
});

test('web, PDF, SVG and reading cards retain historical renderers while rejecting future versions',()=>{
 const birth={...reading,productId:'birth-chart'};
 for(const [format,prefix,versions,future] of [
  ['web','atv-web-export',['1.0.0','1.1.0','1.2.0','1.3.0'],'1.4.0'],
  ['pdf','atv-pdf-export',['1.0.0','1.1.0','1.2.0','1.3.0','1.4.0'],'1.5.0'],
  ['svg','atv-svg-export',['1.0.0','1.1.0','1.2.0'],'1.3.0'],
  ['card','atv-reading-card',['1.0.0','1.1.0','1.2.0'],'1.3.0']]) {
  for(const version of versions) {
   const input={...manifest,format,section:format==='card'?1:-1,rendererVersion:`${prefix}/${version}`};
   assert.deepEqual(parseArtifactManifest(input,birth),input);
  }
  assert.equal(parseArtifactManifest({...manifest,format,section:format==='card'?1:-1,rendererVersion:`${prefix}/${future}`},birth),null);
 }
});
test('manifest binds exact run, revision, review and section and supported renderer',()=>{
 for(const [key,value] of [['runId',manifest.id],['revision',3],['reviewDigest','c'.repeat(64)],['section',2],['section',-1],['rendererVersion','unknown'],['format','audio'],['bytes',0],['bytes',2000001],['bytes',1.5],['createdAt','invalid'],['sha256','z'.repeat(64)],['id','invalid']])
  assert.equal(parseArtifactManifest({...manifest,[key]:value},reading),null,key);
 for(const sectionCount of [0,41,1.5]) assert.equal(parseArtifactManifest(manifest,{...reading,sectionCount}),null);
});
test('eligibility matches catalog; current geometry scope stays limited and club/audio remain outside storage',()=>{
 for(const product of productCatalog) for(const format of ['web','pdf','svg','card']) {
  const expected=product.personalized && (format==='svg'?['birth-chart','ascendant'].includes(product.id):product.delivery.includes(format==='card'?'web':format));
  assert.equal(artifactEligible(product.id,format),expected,product.id+':'+format);
 }
 assert.equal(artifactEligible('unknown','web'),false);
 assert.equal(parseArtifactManifest({...manifest,format:'pdf',section:-1,rendererVersion:artifactFormats.pdf.renderer},reading),null);
});
