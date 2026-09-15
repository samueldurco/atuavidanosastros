import { describe, expect, it, vi } from 'vitest';
import { cardFixture } from '../../../tests/fixtures/product-export';
import { CARD_EXPORT_VERSION, CARD_LIMITS, renderProductCard } from './product-card';

describe('complete private editorial section card', () => {
	it('is deterministic, embeds fonts and preserves all selected content and limitations', () => {
		const run = cardFixture();
		const card = renderProductCard(run, 0)!;
		expect(card).not.toBeNull();
		expect(card).toEqual(renderProductCard(run, 0));
		const visible = [...card.svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
			.map((m) => m[1])
			.join(' ')
			.replace(/\s/g, '');
		for (const text of [
			run.editorial!.sections[0].text,
			run.calculation!.facts[0].display,
			run.calculation!.facts[0].source,
			...run.editorial!.limits,
			...run.calculation!.limits
		])
			expect(visible).toContain(text.replace(/\s/g, ''));
		expect(card.svg).toContain(CARD_EXPORT_VERSION);
		expect(card.svg).toContain('base64,');
		expect(card.svg).not.toContain('Outro contexto');
		expect(card.svg).not.toContain('Outra perspectiva');
		expect(card.filename).toMatch(/r4-card-1.svg$/);
		expect(new TextEncoder().encode(card.svg).length).toBeLessThan(CARD_LIMITS.bytes);
	});
	it('selects the requested section and only its cited evidence', () => {
		const svg = renderProductCard(cardFixture(), 1)!.svg;
		expect(svg).toContain('Outra perspectiva');
		expect(svg).toContain('Outro contexto sintético');
		expect(svg).not.toContain('O Louco');
		expect(svg).toContain('Nenhum modelo homologado.');
	});
	it('escapes XML, strips extra fields and never produces active or externally fetched content', () => {
		const run = cardFixture();
		run.editorial!.sections[0].text = '<script>alert("x")</script> & texto';
		const svg = renderProductCard(
			{ ...run, input: 'PRIVATE_INPUT', email: 'PRIVATE_EMAIL' },
			0
		)!.svg;
		expect(svg).toContain('&lt;script&gt;');
		expect(svg).not.toMatch(
			/<(script|image|use|foreignObject|a)\b|\bhref=|\bonload=|PRIVATE_INPUT|PRIVATE_EMAIL/
		);
	});
	it('rejects malformed or revoked records, invalid indices and unsupported products', () => {
		for (const index of [-1, 2, 40, 0.5, NaN, Infinity])
			expect(renderProductCard(cardFixture(), index)).toBeNull();
		for (const run of [
			null,
			{},
			{ ...cardFixture(), released: false },
			{ ...cardFixture(), editorial: null },
			{ ...cardFixture(), productId: 'atv-plus' }
		])
			expect(renderProductCard(run, 0)).toBeNull();
	});
	it('refuses missing evidence and unsupported glyphs instead of silently dropping them', () => {
		const run = cardFixture();
		run.editorial!.sections[0].evidence = ['missing'];
		expect(renderProductCard(run, 0)).toBeNull();
		run.editorial!.sections[0].evidence = ['card-0'];
		for (const text of ['Sem omitir 🌙', '漢字', 'controle\u0001']) {
			run.editorial!.sections[0].text = text;
			expect(renderProductCard(run, 0)).toBeNull();
		}
	});
	it('wraps long words and allows taller cards without truncation', () => {
		const run = cardFixture('long');
		const card = renderProductCard(run, 0)!;
		expect(card).not.toBeNull();
		expect(card.height).toBeGreaterThan(renderProductCard(cardFixture(), 0)!.height);
		const text = [...card.svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
			.map((m) => m[1])
			.join('')
			.replace(/\s/g, '');
		expect(text).toContain(run.editorial!.sections[0].text.replace(/\s/g, ''));
	});
	it('fails closed at the text and canvas budgets, never extracting a summary', () => {
		const run = cardFixture();
		run.editorial!.sections[0].text = 'Leitura extensa. '.repeat(1000);
		expect(renderProductCard(run, 0)).toBeNull();
		run.calculation!.facts[0].display = 'Base. '.repeat(300);
		run.editorial!.limits = Array(10).fill('Limite. '.repeat(100));
		expect(renderProductCard(run, 0)).toBeNull();
	});
	it('fails closed on rendering deadline and does not leak exceptions', () => {
		const clock = vi
			.spyOn(performance, 'now')
			.mockReturnValueOnce(0)
			.mockReturnValue(CARD_LIMITS.milliseconds + 1);
		try {
			expect(renderProductCard(cardFixture(), 0)).toBeNull();
		} finally {
			clock.mockRestore();
		}
	});
});
