import { CAREER_COMPASS_EDITORIAL_VERSION, careerCompassRoles } from '../../packages/ai/src/career-compass.ts';

// Test-only structural overrides. No interpretation, review or release authority.
/** @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts */
export function careerEditorialTestFixture(facts) {
  if (facts.editorialProfile !== CAREER_COMPASS_EDITORIAL_VERSION) return {};
  const midheaven = facts.facts.find(fact => fact.id === 'angle-midheaven');
  if (!midheaven) throw new Error('fixture_midheaven_missing');
  return {
    claims: [{ id: 'mc', kind: 'fact', text: midheaven.display,
      evidence: ['angle-midheaven'] }, ...careerCompassRoles.map(id => ({ id, kind: 'hypothesis',
      text: `Fixture estrutural do papel ${id}; conteúdo não homologado.`, evidence: ['angle-midheaven'] }))],
    synthesis: [{ claimIds: [...careerCompassRoles], text: 'Síntese sintética sem revisão editorial.' }],
    reflections: ['Que contribuição quero observar?', 'Em qual ambiente posso testá-la?', 'Qual experimento reversível cabe nesta semana?'],
  };
}
