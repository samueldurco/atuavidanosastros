import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { productCatalog } from '@atv/domain';
import { cardFixture } from '../../../tests/fixtures/product-export';
import {
	NARRATION_MAX_BYTES,
	NARRATION_VERSION,
	prepareProductNarration
} from './product-narration';

// Synthetic boundary fixtures, not career calculations, real reviews or release approval.
function fixture() {
	const run = cardFixture();
	run.productId = 'purpose-career';
	run.calculation!.facts.push({
		id: 'calc-1',
		kind: 'calculated',
		display: 'ΔT — dado sintético',
		source: 'Método de teste'
	});
	run.editorial!.sections[0].evidence.push('calc-1');
	return run;
}
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
afterEach(() => vi.unstubAllGlobals());

describe('eligible narration preparation — no synthesis or publication', () => {
	it('only prepares catalog-eligible audio and keeps both downstream gates blocked', async () => {
		expect(productCatalog.filter((p) => p.delivery.includes('audio')).map((p) => p.id)).toEqual([
			'purpose-career'
		]);
		for (const product of productCatalog) {
			const run = fixture();
			run.productId = product.id;
			const result = await prepareProductNarration(run);
			if (product.id !== 'purpose-career') expect(result).toBeNull();
			else
				expect(result).toMatchObject({
					version: NARRATION_VERSION,
					status: 'prepared',
					synthesis: 'blocked',
					publication: 'blocked',
					contentType: 'text/plain; charset=utf-8',
					language: 'pt-BR'
				});
		}
	});

	it('copies every approved segment, source and limit in order without shortening or deduplication', async () => {
		const run = fixture();
		run.calculation!.limits.push(run.calculation!.limits[0]);
		run.editorial!.limits.push('Outro limite: não é aconselhamento.');
		const result = (await prepareProductNarration(run))!;
		const segment = (id: string) => result.segments.find((s) => s.id === id)!;
		expect(segment('title').text).toBe(run.editorial!.title);
		for (const [i, section] of run.editorial!.sections.entries()) {
			expect(segment(`section-${i}-heading`).text).toBe(section.title);
			expect(segment(`section-${i}`)).toMatchObject({
				text: section.text,
				evidence: section.evidence
			});
			expect(segment(`section-${i}-evidence`).text).toBe(
				`Referências desta seção: ${section.evidence.join('; ')}.`
			);
		}
		for (const [i, fact] of run.calculation!.facts.entries()) {
			expect(segment(`fact-${i}`)).toMatchObject({ text: fact.display, evidence: [fact.id] });
			expect(segment(`fact-${i}-source`).text).toBe(fact.source);
		}
		expect(result.segments.filter((s) => s.kind === 'fact-label').map((s) => s.text)).toEqual([
			'Carta sorteada. Referência: card-0.',
			'Relato informado. Referência: context-1.',
			'Dado calculado. Referência: calc-1.'
		]);
		expect(result.segments.filter((s) => s.kind === 'limit').map((s) => s.text)).toEqual([
			...run.calculation!.limits,
			...run.editorial!.limits
		]);
		expect(result.segments.filter((s) => s.kind === 'section').map((s) => s.text)).toEqual(
			run.editorial!.sections.map((s) => s.text)
		);
		expect(result.text).toBe(result.segments.map((s) => s.text).join('\n\n'));
		expect(result.bytes).toBe(Buffer.byteLength(result.text, 'utf8'));
		expect(result.text).toContain('não determina suas escolhas');
		expect(result.text).toContain('não apaga arquivos já baixados');
	});

	it('binds exact transcript and ordered manifest deterministically without speaking private binding IDs', async () => {
		const run = fixture();
		const result = (await prepareProductNarration(run))!;
		expect(await prepareProductNarration(run)).toEqual(result);
		expect(result.transcriptDigest).toBe(sha(result.text));
		expect(result.manifestDigest).toBe(
			sha(
				JSON.stringify({
					version: result.version,
					binding: result.binding,
					segments: result.segments,
					transcriptDigest: result.transcriptDigest
				})
			)
		);
		expect(result.binding).toEqual({
			runId: run.id,
			productId: run.productId,
			revision: run.revision,
			calculationVersion: run.calculation!.version,
			editorialVersion: run.editorial!.version,
			promotionId: run.editorial!.promotionId,
			reviewDigest: run.editorial!.reviewDigest
		});
		for (const id of [run.id, run.editorial!.promotionId, run.editorial!.reviewDigest])
			expect(result.text).not.toContain(id);
		run.editorial!.sections[0].text = 'Changed';
		run.editorial!.sections[0].evidence.reverse();
		run.calculation!.limits[0] = 'Changed';
		expect(result.transcriptDigest).toBe(sha(result.text));
		expect(result.segments.find((s) => s.id === 'section-0')!.evidence).toEqual([
			'card-0',
			'calc-1'
		]);
		expect(result.text).not.toContain('Changed');
	});

	it.each(['id', 'revision', 'promotion', 'review'] as const)(
		'binds changed %s even when narration is unchanged',
		async (field) => {
			const run = fixture();
			const before = (await prepareProductNarration(run))!;
			if (field === 'id') run.id = '00000000-0000-4000-8000-000000000099';
			if (field === 'revision') {
				run.revision++;
				run.history.push({ revision: run.revision, state: 'READY', at: run.updatedAt });
			}
			if (field === 'promotion') run.editorial!.promotionId = 'other-fixture-not-approved';
			if (field === 'review') run.editorial!.reviewDigest = '1'.repeat(64);
			const after = (await prepareProductNarration(run))!;
			expect(after.transcriptDigest).toBe(before.transcriptDigest);
			expect(after.manifestDigest).not.toBe(before.manifestDigest);
		}
	);

	it.each(['text', 'source', 'limit', 'evidence', 'sections', 'method'] as const)(
		'detects changed %s in both hashes',
		async (field) => {
			const run = fixture();
			const before = (await prepareProductNarration(run))!;
			if (field === 'text') run.editorial!.sections[0].text += ' Outro trecho.';
			if (field === 'source') run.calculation!.facts[0].source += ' Outra fonte.';
			if (field === 'limit') run.editorial!.limits.push('Outro limite');
			if (field === 'evidence') run.editorial!.sections[0].evidence.reverse();
			if (field === 'sections') run.editorial!.sections.reverse();
			if (field === 'method') run.calculation!.version = 'fixture/2';
			const after = (await prepareProductNarration(run))!;
			expect(after.transcriptDigest).not.toBe(before.transcriptDigest);
			expect(after.manifestDigest).not.toBe(before.manifestDigest);
		}
	);

	it('ignores unprojected private input and never calls a network provider', async () => {
		const network = vi.fn(() => {
			throw new Error('Network forbidden');
		});
		vi.stubGlobal('fetch', network);
		const run = fixture();
		const result = await prepareProductNarration({
			...run,
			ownerId: 'private-owner',
			email: 'private@example.invalid',
			input: { birth: 'private-birth' },
			provider: 'private-provider',
			raw: 'private-raw',
			editorial: { ...run.editorial, prompt: 'private-prompt' }
		});
		expect(result).toEqual(await prepareProductNarration(run));
		expect(JSON.stringify(result)).not.toContain('private-');
		expect(network).not.toHaveBeenCalled();
	});

	it('preserves original accents, symbols, whitespace and literal markup as plain text', async () => {
		const run = fixture();
		const original =
			'  Propósito, ação, ΔT, 🌙\t\n<speak><break time="1s"/></speak> & <script>literal</script>  ';
		run.editorial!.sections[0].text = original;
		const result = (await prepareProductNarration(run))!;
		expect(result.contentType).toBe('text/plain; charset=utf-8');
		expect(result.segments.find((s) => s.id === 'section-0')!.text).toBe(original);
		expect(result.text).toContain(original);
	});

	it.each([
		'\0',
		'\u000b',
		'\u007f',
		'\u0085',
		'\u202e',
		'\u2066',
		'\u200e',
		'\u061c',
		'\ud800',
		'\udfff'
	])('refuses unsafe control or malformed Unicode %j without cleanup', async (char) => {
		const run = fixture();
		run.editorial!.sections[0].text += char;
		expect(await prepareProductNarration(run)).toBeNull();
	});

	it.each(['title', 'fact', 'source', 'limit', 'reference', 'version'] as const)(
		'checks all spoken fields, including %s',
		async (field) => {
			const run = fixture();
			if (field === 'title') run.editorial!.title += '\u202e';
			if (field === 'fact') run.calculation!.facts[0].display += '\u202e';
			if (field === 'source') run.calculation!.facts[0].source += '\u202e';
			if (field === 'limit') run.calculation!.limits.push('Unsafe\u202e');
			if (field === 'reference') {
				run.calculation!.facts[0].id += '\u202e';
				run.editorial!.sections[0].evidence[0] += '\u202e';
			}
			if (field === 'version') run.editorial!.version += '\u202e';
			expect(await prepareProductNarration(run)).toBeNull();
		}
	);

	it('counts UTF-8 bytes, accepts the exact bound and refuses one byte more without truncation', async () => {
		const run = fixture();
		run.editorial!.sections = Array.from({ length: 5 }, () => ({
			title: 'Parte sintética',
			text: 'á'.repeat(8000),
			evidence: ['card-0']
		}));
		const initial = (await prepareProductNarration(run))!;
		const padding = NARRATION_MAX_BYTES - initial.bytes;
		expect(padding).toBeGreaterThan(0);
		run.editorial!.sections[4].text += 'x'.repeat(padding);
		const exact = (await prepareProductNarration(run))!;
		expect(exact.bytes).toBe(NARRATION_MAX_BYTES);
		expect(exact.text.length).toBeLessThan(exact.bytes);
		run.editorial!.sections[4].text += 'x';
		expect(await prepareProductNarration(run)).toBeNull();
	});

	it.each([
		'revoked',
		'pending',
		'no-calculation',
		'no-editorial',
		'bad-digest',
		'unknown-reference',
		'oversized-section',
		'invalid-kind'
	] as const)('refuses %s', async (fault) => {
		const run = fixture();
		if (fault === 'revoked') run.released = false;
		if (fault === 'pending') {
			run.state = 'AWAITING_EDITORIAL';
			run.history[3].state = 'AWAITING_EDITORIAL';
		}
		if (fault === 'no-calculation') run.calculation = null;
		if (fault === 'no-editorial') run.editorial = null;
		if (fault === 'bad-digest') run.editorial!.reviewDigest = 'not-a-review';
		if (fault === 'unknown-reference') run.editorial!.sections[0].evidence.push('unknown');
		if (fault === 'oversized-section') run.editorial!.sections[0].text = 'x'.repeat(20001);
		if (fault === 'invalid-kind') run.calculation!.facts[0].kind = 'inferred';
		expect(await prepareProductNarration(run)).toBeNull();
	});

	it.each([null, undefined, {}, [], 'READY'])('refuses malformed projection %j', async (value) => {
		expect(await prepareProductNarration(value)).toBeNull();
	});
});
