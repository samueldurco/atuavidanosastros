import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

const service = (db, sql, args = []) =>
  asRole(db, 'service_role', null, () => db.query(sql, args)).then(r => r.rows[0]?.data);
const read = (db, id, user = owner) =>
  asRole(db, 'authenticated', user, () => db.query('select read_product_run($1) as data', [id])).then(r => r.rows[0].data);

test('Personal Calendar SQL exposes only a released owner-scoped civil grid with reported marks', async t => {
  const db = await setupProductDatabase({ processing: true });
  t.after(() => db.close());
  for (const migration of [
    '20260915180000_product_artifacts.sql',
    '20260923110000_product_editorial_publication.sql',
    '20260929150000_week_temporal_reader_detail.sql',
    '20260929180000_solar_return_calendar_reader.sql',
    '20260929200000_personal_calendar_grid_reader.sql'
  ]) await db.exec(await file(`supabase/migrations/${migration}`));
  // Synthetic isolated flags and receipt exercise projection gates only; no production approval.
  await db.exec("update workflow_releases set enabled=true,engine_approved=true,access_policy='free' where product_id='personal-calendar'");
  const input = {
    version: 'atv-workflow/1.0.0', productId: 'personal-calendar', targetDate: '2024-02-01',
    birth: { localDateTime: '2000-09-29T12:00:00', utcInstant: '2000-09-29T12:00:00Z', timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic-reader-test' },
    calendarMarks: { authorization: 'atv-personal-calendar-marks/1', entries: [{ date: '2024-02-29', label: 'Mudanca informada' }] },
    consent: { storage: true, partner: false, continuity: false, policyVersion: 'atv-input-consent/1' }
  };
  const id = await asRole(db, 'authenticated', owner, () =>
    db.query('select request_product_run($1,$2,$3) as id', ['personal-calendar', randomUUID(), input])
  ).then(r => r.rows[0].id);
  const dates = Array.from({ length: 29 }, (_, index) => new Date(Date.UTC(2024,1,index+1)).toISOString().slice(0,10));
  const calculation = {
    version: 'atv-personal-calendar-calculation/1.1.0', kind: 'cycles', status: 'experimental',
    facts: [
      { id: 'natal-sun', kind: 'calculated', display: 'Sol natal: 1 Aries', source: 'synthetic-reader-test' },
      ...dates.map(date => ({ id: `civil-day-${date}`, kind: 'calculated', display: `Dia civil: ${date}`, source: 'atv-personal-calendar-calculation/1.1.0' })),
      { id: 'reported-mark-1', kind: 'reported', display: '2024-02-29: Mudanca informada', source: 'input.calendarMarks.entries[0]' }
    ],
    data: { monthStart: '2024-02-01', monthEndExclusive: '2024-03-01', dates, natalSunLongitude: 1, privateNote: 'must stay private' },
    limits: ['Grade civil, sem previsao.']
  };
  const claimWork = () => service(db, 'select claim_product_run_work($1,$2) as data', [['personal-calendar'], 60]);
  const completeWork = (claim, calc = null) => service(db,
    'select complete_product_run_work($1,$2,$3,$4) as data', [id, claim.token, claim.revision, calc]);
  assert.equal((await completeWork(await claimWork(), calculation)).state, 'CALCULATED');
  assert.equal((await completeWork(await claimWork())).state, 'AWAITING_EDITORIAL');
  assert.equal((await read(db, id)).released, false);
  assert.equal((await read(db, id)).calculation, null);
  assert.equal(await read(db, id, other), null);
  const row = (await db.query('select * from product_runs where id=$1', [id])).rows[0];
  const promotion = `fixture-${randomUUID()}`;
  const editorial = {
    version: 'fixture/1', promotionId: promotion, reviewDigest: 'a'.repeat(64), title: 'Leitura sintética',
    sections: [{ title: 'Base', text: 'Texto sintético.', evidence: ['natal-sun'] }], limits: []
  };
  await db.query('insert into editorial_promotions values ($1,$2,$3,$4,null)', [promotion, 'personal-calendar', row.contract_version, 'b'.repeat(64)]);
  const receipt = randomUUID();
  await db.query(`insert into product_editorial_receipts(id,run_id,revision,calculation,editorial,promotion_id,promotion_evidence_digest,basis_digest,review_digest,authority_reference,expires_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'synthetic-reader-only',clock_timestamp()+interval '1 hour')`,
    [receipt, id, row.revision, calculation, editorial, promotion, 'b'.repeat(64), 'c'.repeat(64), editorial.reviewDigest]);
  await db.exec('update product_editorial_policy set enabled=true');
  const claim = await service(db, 'select claim_product_editorial($1) as data', [['personal-calendar']]);
  assert.equal(claim.receiptId, receipt);
  assert.equal((await service(db, 'select complete_product_editorial($1,$2,$3,$4) as data', [id, receipt, claim.token, claim.revision])).state, 'READY');
  const result = await read(db, id);
  assert.equal(result.released, true);
  assert.deepEqual(result.calculation.personalCalendar.dates, dates);
  assert.deepEqual(Object.keys(result.calculation.personalCalendar).sort(), ['version','basis','startDate','endDateExclusive','dates'].sort());
  assert.equal(result.calculation.facts.at(-1).source, 'input.calendarMarks.entries[0]');
  assert.equal(JSON.stringify(result).includes('must stay private'), false);
  assert.equal(result.calculation.data, undefined);
  assert.equal(result.input, undefined);
  assert.equal(await read(db, id, other), null);
  await db.query('update product_editorial_receipts set revoked_at=now() where id=$1', [receipt]);
  assert.equal((await read(db, id)).released, false);
  assert.equal((await read(db, id)).calculation, null);
});
