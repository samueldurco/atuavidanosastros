import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupProductDatabase, file } from './helpers/product-database.mjs';

const productId = 'P06-ARI-EMB-A001-SWT01';
const sale = (status='APPROVED', transaction='HP_SYNTHETIC_1') => ({ transaction, status,
  hotmartProductId:'1234567', hotmartOfferCode:'synthetic', amountMinor:39900, currency:'BRL', verifiedAt:new Date().toISOString() });
const events = { APPROVED:'PURCHASE_APPROVED', COMPLETE:'PURCHASE_COMPLETE', REFUNDED:'PURCHASE_REFUNDED',
  CHARGEBACK:'PURCHASE_CHARGEBACK', CANCELLED:'PURCHASE_CANCELED', PARTIALLY_REFUNDED:'PURCHASE_PARTIALLY_REFUNDED' };
async function as(db, role, fn) {
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function setup() {
  const db = await setupProductDatabase();
  await db.exec(await file('supabase/migrations/20261007173224_p06_physical_reconciliation.sql'));
  // Synthetic local catalog only. No production seed, transaction, address or identity.
  await db.query(`insert into public.products(id,slug,name,universe,physical,metadata)
    values ($1,'p06-synthetic','Synthetic','loja-signos',true,$2)`, [productId, {
      project:'P06',sku:'ATV-P06-ARI-EMB-A001-SWT01-PRE-M',price_version:'p06-2026-10-07-v1' }]);
  const offer = (await db.query(`insert into public.offers(product_id,code,hotmart_product_id,hotmart_offer_code)
    values ($1,$2,'1234567','synthetic') returning id`, [productId, productId+'-BRL-V1'])).rows[0];
  await db.query(`insert into public.price_versions(offer_id,amount_minor,valid_from) values ($1,39900,now())`, [offer.id]);
  return db;
}
async function inbox(db, value, {signature=true,event=events[value.status]}={}) {
  return (await db.query(`insert into public.webhook_inbox(provider,external_event_id,event_type,signature_verified,payload_hash,payload)
    values ('hotmart',gen_random_uuid()::text,$1,$2,'synthetic',$3) returning id`, [event,signature,{
      event,data:{ product:{id:1234567},purchase:{transaction:value.transaction,offer:{code:'synthetic'}} } }])).rows[0].id;
}
async function reconcile(db,id,value) {
  return as(db,'service_role',async () => (await db.query('select public.reconcile_p06_payment($1,$2,$3) as result', [id,productId,value])).rows[0].result);
}
async function count(db, table) { return (await db.query(`select count(*)::integer as n from public.${table}`)).rows[0].n; }

test('private payment queue: grants, durable inbox, idempotency and atomic outbox',async () => {
  const db=await setup();
  try {
    for(const role of ['anon','authenticated']) {
      for(const table of ['p06_physical_orders','p06_physical_receipts'])
        await assert.rejects(() => as(db,role,() => db.query(`select * from public.${table}`)),/permission denied/);
      await assert.rejects(() => as(db,role,() => db.query('select public.reconcile_p06_payment(gen_random_uuid(),$1,$2)',[productId,sale()])),/permission denied/);
    }
    const value=sale(),id=await inbox(db,value);
    assert.deepEqual(await reconcile(db,id,value),{orderId:(await db.query('select id from public.p06_physical_orders')).rows[0]?.id,state:'WAITING_LOGISTICS',duplicate:false});
    assert.equal((await reconcile(db,id,value)).duplicate,true);
    const id2=await inbox(db,value);
    assert.equal((await reconcile(db,id2,value)).state,'WAITING_LOGISTICS');
    assert.equal(await count(db,'p06_physical_orders'),1);
    assert.equal(await count(db,'p06_physical_receipts'),2);
    assert.equal(await count(db,'outbox_events'),1);
    assert.equal(await count(db,'entitlements'),0);
    assert.equal(await count(db,'purchases'),0);
    assert.equal((await db.query('select processing_state from public.webhook_inbox where id=$1',[id])).rows[0].processing_state,'PROCESSED');
    const payload=(await db.query('select payload from public.outbox_events')).rows[0].payload;
    assert.deepEqual(Object.keys(payload).sort(),['orderId','paymentStatus','sku','state']);
    assert.equal(payload.state,'WAITING_LOGISTICS');
  } finally { await db.close(); }
});

test('reversals are terminal, partial refund needs review, dispatched reversal needs review',async () => {
  const db=await setup();
  try {
    const refund=sale('REFUNDED'),refundId=await inbox(db,refund);
    assert.equal((await reconcile(db,refundId,refund)).state,'CANCELLED');
    const approved=sale(),approveId=await inbox(db,approved);
    assert.equal((await reconcile(db,approveId,approved)).state,'CANCELLED');
    assert.equal((await db.query('select payment_status from public.p06_physical_orders')).rows[0].payment_status,'REFUNDED');
    assert.equal(await count(db,'outbox_events'),1);
    const partial=sale('PARTIALLY_REFUNDED','HP_SYNTHETIC_2');
    assert.equal((await reconcile(db,await inbox(db,partial),partial)).state,'MANUAL_REVIEW');
    const sent=sale('APPROVED','HP_SYNTHETIC_3');
    await reconcile(db,await inbox(db,sent),sent);
    await db.query("update public.p06_physical_orders set state='SUPPLIER_SUBMITTED' where hotmart_transaction=$1",[sent.transaction]);
    const chargeback=sale('CHARGEBACK',sent.transaction);
    assert.equal((await reconcile(db,await inbox(db,chargeback),chargeback)).state,'MANUAL_REVIEW');
    assert.equal(await count(db,'entitlements'),0);
  } finally { await db.close(); }
});

test('invalid or stale evidence leaves inbox retryable and creates no financial side effects',async () => {
  const db=await setup();
  try {
    const value=sale();
    const untrusted=await inbox(db,value,{signature:false});
    await assert.rejects(() => reconcile(db,untrusted,value),/p06_untrusted_inbox/);
    const logistics=await inbox(db,value,{event:'ORDER_FULFILLMENT'});
    await assert.rejects(() => reconcile(db,logistics,value),/p06_readback_or_inbox_mismatch/);
    const id=await inbox(db,value);
    for(const change of [ {hotmartProductId:'9'}, {hotmartOfferCode:'wrong'}, {currency:'USD'},
      {amountMinor:1}, {amountMinor:39900.1}, {transaction:'OTHER'}, {status:'REFUNDED'},
      {verifiedAt:new Date(Date.now()-3600000).toISOString()}, {verifiedAt:null},
      {verifiedAt:new Date(Date.now()+3600000).toISOString()} ]) {
      await assert.rejects(() => reconcile(db,id,{...value,...change}),/p06_.*mismatch/);
    }
    assert.equal(await count(db,'p06_physical_orders'),0);
    assert.equal(await count(db,'p06_physical_receipts'),0);
    assert.equal(await count(db,'outbox_events'),0);
    assert.equal((await db.query('select processing_state from public.webhook_inbox where id=$1',[id])).rows[0].processing_state,'RECEIVED');
    await reconcile(db,id,value);
    await db.exec(await file('supabase/forward-fixes/disable_p06_physical_reconciliation.sql'));
    await assert.rejects(() => reconcile(db,id,value),/permission denied/);
    await assert.rejects(() => as(db,'service_role',() => db.query('select * from public.p06_physical_orders')),/permission denied/);
    assert.equal(await count(db,'p06_physical_orders'),1);
    assert.equal(await count(db,'p06_physical_receipts'),1);
  } finally { await db.close(); }
});
