import { beforeEach, expect, it, vi } from 'vitest';
import { load } from './+page.server';
import { readLibraryResult } from '$lib/server/library-reader';

vi.mock('$lib/server/library-reader', () => ({ readLibraryResult: vi.fn() }));
const cursor = 'AB000000-0000-4000-8000-000000000004';
const owner = '00000000-0000-4000-8000-000000000001';
const item = '00000000-0000-4000-8000-000000000003';
const client = {};
function event(query = '', authenticated = true) {
	return {
		parent: async () => ({ user: authenticated ? { id: owner } : null }),
		locals: { supabase: client },
		params: { id: item },
		url: new URL(`https://local.test/biblioteca/${item}?${query}`),
		setHeaders: vi.fn()
	} as unknown as Parameters<typeof load>[0];
}
beforeEach(() => vi.resetAllMocks());
it.each(['workflow', 'ready', 'unavailable', 'unsupported'] as const)(
	'forwards a validated navigation cursor for %s without changing the owner read',
	async (state) => {
		vi.mocked(readLibraryResult).mockResolvedValue({ state } as Awaited<
			ReturnType<typeof readLibraryResult>
		>);
		const request = event(`fromBefore=${cursor}`);
		const result = await load(request);
		expect(result).toMatchObject({ state, libraryBefore: cursor.toLowerCase() });
		expect(readLibraryResult).toHaveBeenCalledExactlyOnceWith(client, owner, item);
		expect(request.setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex, nofollow',
			'referrer-policy': 'no-referrer'
		});
		if (state === 'workflow') expect(result).toMatchObject({ ownerId: owner });
	}
);
it.each(['', 'fromBefore=//external.test', `fromBefore=${cursor}&fromBefore=${cursor}`])(
	'ignores unsafe/absent navigation metadata: %s',
	async (query) => {
		vi.mocked(readLibraryResult).mockResolvedValue({ state: 'unavailable' } as Awaited<
			ReturnType<typeof readLibraryResult>
		>);
		expect(await load(event(query))).toMatchObject({ libraryBefore: null });
	}
);
it('never grants access based on an origin cursor', async () => {
	await expect(load(event(`fromBefore=${cursor}`, false))).rejects.toMatchObject({
		status: 303,
		location: '/entrar'
	});
	expect(readLibraryResult).not.toHaveBeenCalled();
});
it('preserves the same not-found response for inaccessible items', async () => {
	vi.mocked(readLibraryResult).mockResolvedValue({ state: 'not-found' });
	await expect(load(event(`fromBefore=${cursor}`))).rejects.toMatchObject({ status: 404 });
});
