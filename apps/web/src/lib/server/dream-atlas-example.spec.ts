import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trialIdentity } from './private-trials';
import { load } from '../../routes/testar-produtos/dream-atlas/exemplo/+page.server';
import { approveTrialReading } from '$lib/trials/reading';
import { dreamAtlasExamplePdf } from '$lib/trials/dream-atlas-example-pdf';
import { PDFDocument } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';

vi.mock('./private-trials', () => ({ trialIdentity: vi.fn() }));
const abortSignal = vi.fn(),
	rpc = vi.fn(() => ({ abortSignal }));
const from = vi.fn(() => {
	throw new Error('The fictional example must not query or write user records.');
});
beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(trialIdentity).mockResolvedValue({
		ownerId: '00000000-0000-4000-8000-000000000001',
		supabase: { rpc, from }
	} as never);
	abortSignal.mockResolvedValue({ data: true, error: null });
});
describe('private owner-only fictional diary demonstration', () => {
	it('refuses anonymous, ungranted, revoked, and unavailable owner evaluation access before creating the example', async () => {
		const event = { locals: {}, setHeaders: vi.fn() } as never;
		vi.mocked(trialIdentity).mockRejectedValueOnce({ status: 401 });
		await expect(load(event)).rejects.toMatchObject({ status: 401 });
		vi.mocked(trialIdentity).mockRejectedValueOnce({ status: 403 });
		await expect(load(event)).rejects.toMatchObject({ status: 403 });
		abortSignal.mockResolvedValueOnce({ data: false, error: null });
		await expect(load(event)).rejects.toMatchObject({ status: 403 });
		abortSignal.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } });
		await expect(load(event)).rejects.toMatchObject({ status: 503 });
		expect(from).not.toHaveBeenCalled();
	});
	it('uses the regular review gate, exposes only declared fictional sources, and stamps every PDF page', async () => {
		const setHeaders = vi.fn();
		const result = await load({ locals: {}, setHeaders } as never);
		expect(result).toBeTruthy();
		const { saved } = result!;
		expect(rpc).toHaveBeenCalledWith('has_atv_owner_evaluation_access');
		expect(setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex, nofollow'
		});
		expect(await approveTrialReading(saved.input, saved.calculation, saved.reading)).toEqual(
			saved.approval
		);
		expect(saved.calculation.data.entries).toHaveLength(8);
		expect(JSON.stringify(saved.calculation.data.entries).match(/Exemplo fictício:/g)).toHaveLength(
			8
		);
		expect(from).not.toHaveBeenCalled();
		const bytes = await dreamAtlasExamplePdf(saved);
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getTitle()).toContain('Demonstração fictícia');
		expect(pdf.getPageCount()).toBeGreaterThan(2);
		await mkdir('../../test-results/dream-atlas', { recursive: true });
		await writeFile('../../test-results/dream-atlas/owner-fictional-example.pdf', bytes);
	});
});
