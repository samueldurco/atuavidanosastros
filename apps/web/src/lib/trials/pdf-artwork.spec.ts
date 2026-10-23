import { afterEach, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { calculateTarotMethod, type WorkflowInput } from '@atv/domain';
import { approveTrialReading, composeTrialReading, type SavedTrial } from './reading';
import { trialPdf } from './pdf';
import { localTarotArtwork } from './pdf-artwork.test-helper';
import { tarotArtwork } from './tarot-artwork';
import { buildTarotScene } from './tarot-diagram';

afterEach(() => vi.unstubAllGlobals());

async function delivery(): Promise<SavedTrial> {
	const id = '00000000-0000-4000-8000-000000000084';
	const input: WorkflowInput = {
		version: 'atv-workflow/1.0.0',
		productId: 'tarot-situation-challenge-advice',
		focus: 'Como conversar melhor na relação?',
		consent: {
			storage: true,
			partner: false,
			continuity: false,
			policyVersion: 'atv-input-consent/1'
		}
	};
	const calculation = await calculateTarotMethod(input, id, AbortSignal.timeout(10000));
	const reading = composeTrialReading(input, calculation);
	const approval = await approveTrialReading(input, calculation, reading);
	if (!approval) throw Error('tarot_pdf_fixture_approval');
	return {
		id,
		product_id: input.productId,
		created_at: '2026-10-20T12:00:00Z',
		input,
		calculation,
		reading,
		approval
	};
}

it('downloads only the actual drawn cards from the same origin for the client PDF', async () => {
	const saved = await delivery();
	const cardIds = [...new Set(buildTarotScene(saved).images.map((card) => card.cardId))];
	const requests: string[] = [];
	vi.stubGlobal('fetch', async (url: string) => {
		requests.push(url);
		const cardId = cardIds.find((id) => tarotArtwork(id) === url);
		if (!cardId) throw Error('unexpected_artwork_request');
		return new Response(await localTarotArtwork(cardId), { status: 200 });
	});
	const bytes = await trialPdf(saved);
	expect(requests.sort()).toEqual(cardIds.map(tarotArtwork).sort());
	expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
}, 30000);

it('reports unavailable artwork instead of silently exporting blank cards', async () => {
	const saved = await delivery();
	vi.stubGlobal('fetch', async () => new Response('Unavailable', { status: 503 }));
	await expect(trialPdf(saved)).rejects.toThrow('tarot_pdf_artwork_unavailable');
}, 30000);
