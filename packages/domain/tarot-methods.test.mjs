import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTarotMethod } from './src/tarot-method-calculation.ts';
import { tarotMethods, retiredTarotIds } from './src/tarot-methods.ts';
import { parseWorkflowInput, workflows } from './src/workflows.ts';
import { productCatalog } from './src/catalog.ts';

const run='00000000-0000-4000-8000-000000000001';
const base=(id)=>({version:'atv-workflow/1.0.0',productId:id,consent:{storage:true,partner:false,continuity:false,policyVersion:'atv-input-consent/1'}});
test('six direct methods have complete named positions, optional focus and no retired visible products',()=>{
  assert.deepEqual(tarotMethods.map(m=>m.positions.length),[1,3,5,10,7,13]);
  for(const method of tarotMethods){
    assert.ok(parseWorkflowInput(base(method.id)));
    assert.ok(parseWorkflowInput({...base(method.id),focus:'Como organizar a mudança de trabalho?'}));
    assert.equal(parseWorkflowInput({...base(method.id),focus:' '}),null);
    assert.equal(parseWorkflowInput({...base(method.id),focus:'a'.repeat(401)}),null);
    assert.equal(new Set(method.positions.map(p=>p.id)).size,method.positions.length);
    assert.ok(method.positions.every(p=>p.name&&p.function&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
    assert.ok(method.related.every(id=>tarotMethods.some(m=>m.id===id)));
  }
  for(const id of retiredTarotIds){
    assert.ok(!workflows.some(p=>p.id===id));
    assert.ok(!productCatalog.some(p=>p.id===id));
  }
});
test('persisted execution selects 1/3/5/10/7/13 unique cards, with exact position order on every retry',async()=>{
  for(const method of tarotMethods){
    const input=base(method.id),result=await calculateTarotMethod(input,run,AbortSignal.timeout(10000));
    assert.deepEqual(await calculateTarotMethod(input,run,AbortSignal.timeout(10000)),result);
    assert.equal(result.data.cards.length,method.positions.length);
    assert.equal(new Set(result.data.cards.map(c=>c.cardId)).size,method.positions.length);
    assert.deepEqual(result.data.cards.map(c=>c.positionId),method.positions.map(p=>p.id));
    assert.ok(result.data.cards.every(c=>c.orientation==='upright'));
    const focused=await calculateTarotMethod({...input,focus:'Preciso rever uma parceria.'},run,AbortSignal.timeout(10000));
    assert.deepEqual(focused.data.cards,result.data.cards);
    const next=await calculateTarotMethod(input,'00000000-0000-4000-8000-000000000002',AbortSignal.timeout(10000));
    assert.notDeepEqual(next.data.cards,result.data.cards);
  }
});
test('server UUID, cancellation and retired methods fail closed',async()=>{
  await assert.rejects(calculateTarotMethod(base(tarotMethods[0].id),'client-seed',AbortSignal.timeout(1000)),/invalid_tarot_method_input/);
  await assert.rejects(calculateTarotMethod(base('daily-card'),run,AbortSignal.timeout(1000)),/invalid_tarot_method_input/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(calculateTarotMethod(base(tarotMethods[0].id),run,controller.signal),{name:'AbortError'});
});
