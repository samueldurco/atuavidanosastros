import { describe, expect, it } from 'vitest';
import { visualContext } from './visual-v4';
import { freeTools } from './free-tools';
import { interestNavigation } from './public-navigation';
import { discoverySeo, legacyPublicPaths } from '../seo';
import { pagesSitemap } from '../server/editorial-feeds';

describe('public discovery identity and canonical URLs', () => {
	it('retains each universe identity across its topic and tools', () => {
		for (const topic of interestNavigation)
			expect(visualContext(topic.href).universe).toBe(topic.id);
		for (const tool of freeTools) expect(visualContext(tool.href).universe).toBe(tool.topicId);
		expect(visualContext('/temas/tarot', '', 'birth-chart').universe).toBe('meu-ceu');
	});
	it('publishes only canonical discovery URLs in the page sitemap', () => {
		const sitemap = pagesSitemap([]);
		for (const path of [
			'/temas',
			'/ferramentas',
			'/revista',
			...interestNavigation.map((t) => t.href),
			...freeTools.map((t) => t.href)
		]) {
			expect(discoverySeo(path)?.path).toBe(path);
			expect(sitemap).toContain(`https://atuavidanosastros.com.br${path}</loc>`);
		}
		for (const path of [
			'/meu-ceu',
			'/ciclos',
			'/amor',
			'/proposito',
			'/tarot',
			'/sonhos',
			'/caderno',
			'/mapa-de-proposito'
		])
			expect(legacyPublicPaths).not.toContain(path);
		expect(
			sitemap.match(/https:\/\/atuavidanosastros.com.br\/bussola-de-carreira<\/loc>/g)
		).toHaveLength(1);
	});
});
