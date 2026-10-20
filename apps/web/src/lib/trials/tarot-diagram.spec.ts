import { expect, it } from 'vitest';
import { calculateTarotMethod, tarotMethods } from '@atv/domain';
import { buildTarotScene, tarotSceneSvg } from './tarot-diagram';

it.each(tarotMethods)('$name: saved cards, positions and collision-free layout', async (method) => {
	const calculation = await calculateTarotMethod(
		{
			version: 'atv-workflow/1.0.0',
			productId: method.id,
			consent: {
				storage: true,
				partner: false,
				continuity: false,
				policyVersion: 'atv-input-consent/1'
			}
		},
		'00000000-0000-4000-8000-000000000084',
		AbortSignal.timeout(10000)
	);
	const saved = { product_id: method.id, calculation },
		scene = buildTarotScene(saved);
	const cards = scene.nodes.filter((n) => n.type === 'rect' && n.layer === 'cards');
	expect(cards).toHaveLength(method.positions.length);
	for (const [i, box] of cards.entries()) {
		if (box.type !== 'rect') throw Error('card_rect');
		expect(box.x).toBeGreaterThan(0);
		expect(box.y).toBeGreaterThan(100);
		expect(box.x + box.w).toBeLessThan(scene.width);
		expect(box.y + box.h).toBeLessThan(scene.height - 60);
		for (const peer of cards.slice(i + 1)) {
			if (peer.type !== 'rect') throw Error('card_rect');
			expect(
				box.x < peer.x + peer.w &&
					peer.x < box.x + box.w &&
					box.y < peer.y + peer.h &&
					peer.y < box.y + box.h
			).toBe(false);
		}
	}
	const svg = tarotSceneSvg(scene);
	expect(svg).toContain('role="img"');
	expect(scene.images).toHaveLength(scene.cards.length);
	for (const [i, card] of scene.cards.entries()) {
		expect(svg).toContain(`${card.positionName}: ${card.name}`);
		expect(scene.images[i].cardId).toBe(card.cardId);
		expect(svg).toContain(`/tarot/rws/${card.cardId}.jpg`);
		const box = cards[i];
		if (box.type !== 'rect') throw Error('card_rect');
		expect(scene.images[i].x).toBeGreaterThanOrEqual(box.x);
		expect(scene.images[i].y).toBeGreaterThanOrEqual(box.y);
		expect(scene.images[i].x + scene.images[i].w).toBeLessThanOrEqual(box.x + box.w);
		expect(scene.images[i].y + scene.images[i].h).toBeLessThanOrEqual(box.y + box.h);
	}
	const wrong = structuredClone(saved);
	(wrong.calculation.data.cards as { positionName: string }[])[0].positionName = 'Posição falsa';
	expect(() => buildTarotScene(wrong)).toThrow('tarot_diagram_position');
});
