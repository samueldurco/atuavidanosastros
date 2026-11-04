import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

const db = new PGlite();
const subject = 'b'.repeat(64);
const event = 'a'.repeat(64);
const second = 'c'.repeat(64);
const migration = readFileSync(
	new URL(
		'../../../../../supabase/migrations/20261104104910_whatsapp_consultation_dispatch.sql',
		import.meta.url
	),
	'utf8'
);

beforeAll(async () => {
	await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
		create table public.webhook_inbox(provider text,external_event_id text,event_type text,signature_verified boolean,
		processing_state text default 'RECEIVED',attempts integer default 0,last_error_code text,processed_at timestamptz);
		grant all on public.webhook_inbox to service_role;`);
	await db.exec(migration);
}, 30_000);
afterAll(() => db.close());
beforeEach(async () => {
	await db.exec(
		'truncate public.webhook_inbox,public.whatsapp_consultation_sessions,public.whatsapp_consultation_dispatches'
	);
	await db.query(
		"insert into public.webhook_inbox(provider,external_event_id,event_type,signature_verified) values('whatsapp',$1,'whatsapp.message.text',true),('whatsapp',$2,'whatsapp.message.text',true)",
		[event, second]
	);
});

async function claim(id = event, timestamp?: number) {
	const result = await db.query<{ result: { result: string; state?: unknown } }>(
		'select public.claim_whatsapp_consultation($1,$2,coalesce($3::bigint,extract(epoch from now())::bigint)) as result',
		[id, subject, timestamp ?? null]
	);
	return result.rows[0].result;
}
async function complete(id = event, outcome = 'SENT', state = { step: 'question' }) {
	return db.query('select public.complete_whatsapp_consultation($1,$2,$3,$4)', [
		id,
		subject,
		outcome,
		state
	]);
}

it('requires a durable verified message and rejects statuses', async () => {
	await expect(claim('d'.repeat(64))).rejects.toThrow('durable_message_required');
	await db.query(
		"update public.webhook_inbox set event_type='whatsapp.status.delivered' where external_event_id=$1",
		[event]
	);
	await expect(claim()).rejects.toThrow('durable_message_required');
});

it('claims a durable event once and serializes different events for a subject', async () => {
	expect(await claim()).toEqual({ result: 'claimed', state: { step: 'menu' } });
	expect(await claim()).toEqual({ result: 'busy' });
	expect(await claim(second)).toEqual({ result: 'busy' });
	await complete();
	expect(await claim()).toEqual({ result: 'duplicate' });
	expect(await claim(second)).toEqual({ result: 'claimed', state: { step: 'question' } });
	const result = await db.query<{ attempts: number }>(
		'select attempts from public.webhook_inbox where external_event_id=$1',
		[event]
	);
	expect(result.rows[0].attempts).toBe(1);
});

it('skips expired, future and out-of-order events', async () => {
	const current = Math.floor(Date.now() / 1000);
	expect(await claim(event, current - 90_000)).toEqual({ result: 'skipped' });
	expect(await claim(second, current + 120)).toEqual({ result: 'skipped' });
	await db.exec(
		'truncate public.whatsapp_consultation_dispatches,public.whatsapp_consultation_sessions'
	);
	await claim(event, current);
	await complete();
	expect(await claim(second, current - 1)).toEqual({ result: 'skipped' });
});

it('stale send moves to reconciliation and delayed completion cannot overwrite the next session', async () => {
	await claim();
	await db.query(
		'update public.whatsapp_consultation_sessions set active_since=now()-interval \'3 minutes\',state=\'{"step":"prosper"}\' where subject_key=$1',
		[subject]
	);
	expect(await claim(second)).toEqual({ result: 'claimed', state: { step: 'menu' } });
	await complete(event, 'SENT', { step: 'closed' });
	const states = await db.query<{ active_event: string; state: unknown }>(
		'select active_event,state from public.whatsapp_consultation_sessions'
	);
	expect(states.rows[0]).toEqual({ active_event: second, state: { step: 'menu' } });
	const dispatch = await db.query<{ state: string }>(
		'select state from public.whatsapp_consultation_dispatches where external_event_id=$1',
		[event]
	);
	expect(dispatch.rows[0].state).toBe('NEEDS_RECONCILIATION');
	const inbox = await db.query<{ processing_state: string }>(
		'select processing_state from public.webhook_inbox where external_event_id=$1',
		[event]
	);
	expect(inbox.rows[0].processing_state).toBe('QUARANTINED');
});

it('failed or uncertain sends never become automatically claimable', async () => {
	await claim();
	await complete(event, 'NEEDS_RECONCILIATION');
	expect(await claim()).toEqual({ result: 'duplicate' });
	const inbox = await db.query<{ processing_state: string }>(
		'select processing_state from public.webhook_inbox where external_event_id=$1',
		[event]
	);
	expect(inbox.rows[0].processing_state).toBe('QUARANTINED');
});

it('redelivery of the same event after two minutes quarantines the stale send without claiming again', async () => {
	expect((await claim()).result).toBe('claimed');
	await db.query(
		"update public.whatsapp_consultation_sessions set active_since=now()-interval '10 seconds' where subject_key=$1",
		[subject]
	);
	expect(await claim()).toEqual({ result: 'busy' });
	await db.query(
		"update public.whatsapp_consultation_sessions set active_since=now()-interval '2 minutes' where subject_key=$1",
		[subject]
	);
	expect(await claim()).toEqual({ result: 'duplicate' });
	expect(await claim()).toEqual({ result: 'duplicate' });
	const dispatch = await db.query<{ state: string; completed_at: unknown }>(
		'select state,completed_at from public.whatsapp_consultation_dispatches where external_event_id=$1',
		[event]
	);
	expect(dispatch.rows[0]).toEqual({
		state: 'NEEDS_RECONCILIATION',
		completed_at: expect.anything()
	});
	const inbox = await db.query<{
		processing_state: string;
		attempts: number;
		last_error_code: string;
	}>(
		'select processing_state,attempts,last_error_code from public.webhook_inbox where external_event_id=$1',
		[event]
	);
	expect(inbox.rows[0]).toEqual({
		processing_state: 'QUARANTINED',
		attempts: 1,
		last_error_code: 'needs_reconciliation'
	});
	const session = await db.query<{ state: unknown; active_event: null; active_since: null }>(
		'select state,active_event,active_since from public.whatsapp_consultation_sessions where subject_key=$1',
		[subject]
	);
	expect(session.rows[0]).toEqual({
		state: { step: 'menu' },
		active_event: null,
		active_since: null
	});
});

it('state permits only finite enum/choice IDs and refuses raw conversation fields', async () => {
	await claim();
	await expect(
		db.query('select public.complete_whatsapp_consultation($1,$2,$3,$4)', [
			event,
			subject,
			'SENT',
			{ step: 'question', text: 'synthetic private content' }
		])
	).rejects.toThrow('invalid_state');
	await expect(
		db.query('select public.complete_whatsapp_consultation($1,$2,$3,$4)', [
			event,
			subject,
			'SENT',
			{ step: 'choice', choices: ['synthetic:private'] }
		])
	).rejects.toThrow('invalid_state');
	await db.query('select public.complete_whatsapp_consultation($1,$2,$3,$4)', [
		event,
		subject,
		'SENT',
		{ step: 'choice', choices: ['birth-chart'] }
	]);
});

it('anon and authenticated cannot read sessions or execute privileged RPCs', async () => {
	for (const role of ['anon', 'authenticated']) {
		await db.exec(`set role ${role}`);
		try {
			await expect(db.query('select * from public.whatsapp_consultation_sessions')).rejects.toThrow(
				/permission denied/
			);
			await expect(claim()).rejects.toThrow(/permission denied/);
		} finally {
			await db.exec('reset role');
		}
	}
});

it('service_role can claim and complete through invoker RPCs', async () => {
	await db.exec('set role service_role');
	try {
		expect((await claim()).result).toBe('claimed');
		await complete();
		expect((await claim()).result).toBe('duplicate');
	} finally {
		await db.exec('reset role');
	}
});
