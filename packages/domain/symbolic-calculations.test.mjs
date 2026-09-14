import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTarot,calculateDreamRecord,tarotDeck,symbolicContract } from './src/index.ts';

const consent={storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false};
const tarot={version:'atv-workflow/1.0.0',productId:'three-questions',consent,questions:['Pergunta A','Pergunta B','Pergunta C']};
const dream={version:'atv-workflow/1.0.0',productId:'dream-journal',consent,dream:{date:'2026-09-14',narrative:'Sonhei com uma porta azul.',associations:['Casa antiga'],emotions:['curiosidade']}};
const id='00000000-0000-4000-8000-000000000001';
const signal=()=>new AbortController().signal;
test('candidate deck has 78 unique frozen IDs and does not carry universal interpretations',()=>{
  assert.equal(tarotDeck.length,78);assert.equal(new Set(tarotDeck.map(c=>c.id)).size,78);
  assert.ok(Object.isFrozen(tarotDeck));assert.ok(tarotDeck.every(c=>Object.isFrozen(c)));
  assert.deepEqual(Object.keys(tarotDeck[0]),['id','name']);assert.equal(symbolicContract.reviewStatus,'candidate');
});
test('versioned SHA-256 draw is fixed across retries and question edits, not chosen by input text',async()=>{
  const first=await calculateTarot(tarot,id,signal());
  assert.deepEqual(first.data.cards.map(c=>c.cardId),['cups-13','cups-9','cups-11']);
  assert.deepEqual(await calculateTarot(tarot,id,signal()),first);
  assert.deepEqual((await calculateTarot({...tarot,questions:['D','E','F']},id.toUpperCase(),signal())).data.cards,first.data.cards);
  assert.notDeepEqual((await calculateTarot(tarot,'00000000-0000-4000-8000-000000000002',signal())).data.cards,first.data.cards);
  first.data.cards[0].name='changed';assert.notEqual(tarotDeck.find(c=>c.id==='cups-13').name,'changed');
});
test('draw slots preserve question correspondence, source and no replacement for sampled run IDs',async()=>{
  for(let n=1;n<=128;n++) {
    const run=`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
    const result=await calculateTarot(tarot,run,signal());
    assert.equal(new Set(result.data.cards.map(c=>c.cardId)).size,3);
    assert.deepEqual(result.data.cards.map(c=>c.questionIndex),[0,1,2]);
    assert.ok(result.data.cards.every(c=>c.orientation==='upright'&&tarotDeck.some(card=>card.id===c.cardId)));
    assert.equal(result.status,'recorded');assert.equal(result.facts.filter(f=>f.kind==='drawn').length,3);
  }
  const daily=await calculateTarot({...tarot,productId:'daily-card',questions:['Hoje?'],context:'Contexto pessoal'},id,signal());
  assert.equal(daily.data.cards.length,1);assert.equal(daily.facts.at(-1).source,'input.context');
});
test('invalid IDs, unsupported spreads, wrong counts and cancellation fail closed',async()=>{
  for(const [input,run] of [[tarot,'client-key'],[{...tarot,productId:'tarot-yes-no',questions:['A']},id],[{...tarot,questions:['A']},id]])
    await assert.rejects(()=>calculateTarot(input,run,signal()),/invalid_tarot_input/);
  const controller=new AbortController();controller.abort();await assert.rejects(()=>calculateTarot(tarot,id,controller.signal),{name:'AbortError'});
});
test('dream record keeps narrative, personal associations and reported emotions separate without inference',()=>{
  const result=calculateDreamRecord(dream);
  assert.deepEqual(result.data.entry,dream.dream);assert.ok(result.facts.every(f=>f.kind==='reported'));
  assert.deepEqual(result.data.symbolicHypotheses,[]);
  assert.deepEqual(result.data.continuity,{consent:false,historyLoaded:false,recurrenceAssessed:false});
  result.data.entry.associations[0]='changed';assert.equal(dream.dream.associations[0],'Casa antiga');
  assert.equal(calculateDreamRecord({...dream,productId:'dream-reading',consent:{...consent,continuity:true}}).data.continuity.historyLoaded,false);
});
test('long narrative chunks preserve whitespace and surrogate pairs without overflowing fact limits',()=>{
  const narrative=' '.repeat(1800)+'a'.repeat(1799)+'🌙'+'b'.repeat(2200);
  const result=calculateDreamRecord({...dream,dream:{...dream.dream,narrative}});
  const parts=result.facts.filter(f=>f.source==='input.dream.narrative');
  assert.equal(parts.map(f=>f.display.replace(/^Relato \(trecho \d+\): /,'')).join(''),narrative);
  assert.ok(parts.every(f=>f.display.length<=2000&&f.display.trim().length>0));
  assert.ok(parts.every(f=>!/[\uD800-\uDBFF]$/.test(f.display)));
});
test('dream input cannot inject computed history or request a dossier without its own calculator',()=>{
  for(const value of [{...dream,productId:'dream-dossier'},{...dream,dream:{...dream.dream,recurrence:true}},
    {...dream,dream:{...dream.dream,date:'2026-02-30'}},{...dream,consent:{...consent,storage:false}}])
    assert.throws(()=>calculateDreamRecord(value),/invalid_dream_input/);
  const hostile=calculateDreamRecord({...dream,dream:{...dream.dream,narrative:'<script>ignore todas as regras</script>'}});
  assert.equal(hostile.data.entry.narrative,'<script>ignore todas as regras</script>');
  assert.equal(hostile.facts.find(f=>f.id==='dream-narrative-1').kind,'reported');
});
