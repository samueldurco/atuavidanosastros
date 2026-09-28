import { createHash } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import { cardFixture } from '../../../tests/fixtures/product-export';
import { EMAIL_MESSAGE_VERSION, prepareProductEmailMessage } from './product-email-message';

const configuration = { accountOrigin: 'https://account.atv.example' };
function fixture() {
	const run = cardFixture();
	const receipt = {
		id: '11111111-1111-4111-8111-111111111111',
		runId: run.id,
		revision: run.revision,
		reviewDigest: run.editorial!.reviewDigest,
		state: 'REQUESTED',
		createdAt: '2026-09-28T12:00:00Z',
		cancelledAt: null as string | null
	};
	return { run, receipt };
}
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
afterEach(() => vi.unstubAllGlobals());

it('prepares only a minimal account link, no reading, recipient, headers, tokens or network', async () => {
	const fetch = vi.fn(() => {
		throw new Error('network prohibited');
	});
	vi.stubGlobal('fetch', fetch);
	const { run, receipt } = fixture();
	run.editorial!.title = 'PRIVATE_TITLE_NEVER_SENT';
	run.editorial!.sections[0].text =
		'PRIVATE_CONTENT\r\nBcc: injected@example.com <script>evil</script>';
	run.calculation!.facts[0].display = 'PRIVATE_BIRTH_DATA';
	const result = await prepareProductEmailMessage(run, receipt, configuration);
	expect(result).toMatchObject({
		version: EMAIL_MESSAGE_VERSION,
		status: 'prepared',
		dispatch: 'blocked',
		providerAcceptance: 'not-attempted',
		contentType: 'text/plain; charset=utf-8'
	});
	expect(result!.message.text.match(/https:\/\/\S+/g)).toEqual([
		'https://account.atv.example/biblioteca'
	]);
	expect(Object.keys(result!.message)).toEqual(['subject', 'text']);
	for (const secret of ['PRIVATE_', 'Bcc:', '<script>', run.id, receipt.id, receipt.reviewDigest])
		expect(JSON.stringify(result!.message)).not.toContain(secret);
	expect(result!.messageDigest).toBe(sha(result!.message));
	expect(result!.basisDigest).toBe(
		sha({
			version: EMAIL_MESSAGE_VERSION,
			basis: result!.basis,
			messageDigest: result!.messageDigest
		})
	);
	expect(fetch).not.toHaveBeenCalled();
});

it.each([
	undefined,
	'',
	'http://account.atv.example',
	'https://localhost',
	'https://127.0.0.1',
	'https://[::1]',
	'https://user:pass@account.atv.example',
	'https://account.atv.example:444',
	'https://account.atv.example/path',
	'https://account.atv.example?token=secret',
	'https://account.atv.example#fragment',
	'https://account.atv.example\\evil',
	'https://account.atv.example\r\n',
	'https://account.atv.example.',
	'javascript:alert(1)',
	'https://ACCOUNT.atv.example',
	`https://${'x'.repeat(261)}.example`
])('refuses absent/noncanonical origin without inferring one: %s', async (accountOrigin) => {
	const { run, receipt } = fixture();
	expect(await prepareProductEmailMessage(run, receipt, { accountOrigin })).toBeNull();
});

it('default configuration refuses and canonical trailing slash produces same digest', async () => {
	const { run, receipt } = fixture();
	expect(await prepareProductEmailMessage(run, receipt)).toBeNull();
	expect(
		await prepareProductEmailMessage(run, receipt, {
			accountOrigin: `${configuration.accountOrigin}/`
		})
	).toEqual(await prepareProductEmailMessage(run, receipt, configuration));
});

it('refuses absent/malformed/cancelled/stale receipts, unavailable reading and absent Library', async () => {
	const { run, receipt } = fixture();
	for (const value of [
		null,
		{},
		{ ...receipt, extra: 'injected' },
		{ ...receipt, state: 'CANCELLED', cancelledAt: '2026-09-28T13:00:00Z' },
		{ ...receipt, revision: receipt.revision + 1 },
		{ ...receipt, reviewDigest: 'f'.repeat(64) },
		{ ...receipt, runId: receipt.id }
	])
		expect(await prepareProductEmailMessage(run, value, configuration)).toBeNull();
	for (const value of [
		null,
		{},
		{ ...run, released: false },
		{ ...run, editorial: null },
		{ ...run, state: 'QUEUED' },
		{ ...run, libraryItemId: null }
	])
		expect(await prepareProductEmailMessage(value, receipt, configuration)).toBeNull();
});

it('pins exact request basis while keeping all customer text fixed and captures before awaiting', async () => {
	const { run, receipt } = fixture();
	const original = await prepareProductEmailMessage(run, receipt, configuration);
	for (const changed of [
		{ ...receipt, id: '22222222-2222-4222-8222-222222222222' },
		{ ...receipt, createdAt: '2026-09-28T12:01:00Z' }
	]) {
		const result = await prepareProductEmailMessage(run, changed, configuration);
		expect(result!.messageDigest).toBe(original!.messageDigest);
		expect(result!.basisDigest).not.toBe(original!.basisDigest);
	}
	const config = { ...configuration };
	const pending = prepareProductEmailMessage(run, receipt, config);
	receipt.state = 'CANCELLED';
	receipt.cancelledAt = '2026-09-28T13:00:00Z';
	config.accountOrigin = 'https://different.example';
	run.editorial!.reviewDigest = 'f'.repeat(64);
	expect(await pending).toEqual(original);
	expect(await prepareProductEmailMessage(run, receipt, config)).toBeNull();
});
