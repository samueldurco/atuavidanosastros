import { describe, expect, it } from 'vitest';
import { parseDirectionJourneyForm } from './direction-journey-request';

function form(entries: Record<string, string> = {}) {
	const result = new FormData();
	for (const [key, value] of Object.entries({
		goal: 'Explorar uma direção profissional possível',
		startDate: '2028-02-28',
		storage: 'on',
		...entries
	}))
		result.set(key, value);
	return result;
}

describe('direction journey private form', () => {
	it('preserves the declaration without requiring birth or continuity', () => {
		const value = form({ context: 'Quero experimentar sem sair do emprego atual.' });
		const parsed = parseDirectionJourneyForm(value);
		expect(parsed.errors).toEqual({});
		expect(parsed.input).toMatchObject({
			productId: 'direction-journey',
			journey: { goal: 'Explorar uma direção profissional possível', startDate: '2028-02-28' },
			context: 'Quero experimentar sem sair do emprego atual.',
			consent: { storage: true, partner: false, continuity: false }
		});
		expect(parsed.input).not.toHaveProperty('birth');
	});
	it('rejects an invalid window, missing consent and unexpected or duplicate fields', () => {
		expect(parseDirectionJourneyForm(form({ startDate: '2099-12-03' })).input).toBeNull();
		expect(parseDirectionJourneyForm(form({ goal: '   ' })).input).toBeNull();
		expect(parseDirectionJourneyForm(form({ goal: 'Meta\u0000oculta' })).input).toBeNull();
		expect(parseDirectionJourneyForm(form({ storage: '' })).errors.storage).toBeTruthy();
		const extra = form();
		extra.set('birth', 'invented');
		expect(parseDirectionJourneyForm(extra).input).toBeNull();
		const duplicate = form();
		duplicate.append('goal', 'Outra direção');
		expect(parseDirectionJourneyForm(duplicate).input).toBeNull();
	});
});
