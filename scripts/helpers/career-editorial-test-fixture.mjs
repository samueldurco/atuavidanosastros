import { CAREER_COMPASS_EDITORIAL_VERSION, careerCompassRoles } from '../../packages/ai/src/career-compass.ts';
import { THREE_PILLARS_EDITORIAL_VERSION, threePillarsFactIds, threePillarsRoles } from '../../packages/ai/src/three-pillars.ts';
import { BIRTH_CHART_EDITORIAL_VERSION, birthChartRoles } from '../../packages/ai/src/birth-chart.ts';

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

/** Test-only structural projection; never editorial content or approval.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function threePillarsEditorialTestFixture(facts) {
  if (facts.editorialProfile !== THREE_PILLARS_EDITORIAL_VERSION) return {};
  return {
    claims: [...threePillarsFactIds.map((id, index) => {
      const fact = facts.facts.find(fact => fact.id === id);
      if (!fact) throw new Error('fixture_pillar_missing');
      return {id: `pillar-${index}`, kind: 'fact', text: fact.display, evidence: [id]};
    }), {id: 'sun-moon-dynamics', kind: 'hypothesis', text: 'Fixture de dinâmica Sol e Lua; conteúdo não homologado.', evidence: ['position-sun', 'position-moon']},
    {id: 'ascendant-expression', kind: 'hypothesis', text: 'Fixture de abordagem e fator solar; requer revisão.', evidence: ['angle-ascendant', 'position-sun']}],
    relations: [{kind: 'convergence', claimIds: [...threePillarsRoles], text: 'Relação simbólica sintética para teste de referência.'}],
    synthesis: [{claimIds: [...threePillarsRoles], text: 'Síntese integrada de fixture sem autoridade editorial.'}],
    reflections: ['Que intenção quero observar?', 'Qual necessidade pede espaço?', 'Qual abordagem posso experimentar de modo reversível?'],
  };
}

/** Test-only coverage; the text is not a birth-chart interpretation or approval.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function birthChartEditorialTestFixture(facts) {
  if (facts.editorialProfile !== BIRTH_CHART_EDITORIAL_VERSION) return {};
  const ids = Object.keys(birthChartRoles);
  return {
    claims: Object.entries(birthChartRoles).map(([id, evidence]) => ({id, kind: 'hypothesis',
      text: `Fixture estrutural do Mapa Astral: ${id}; sem conteúdo homologado.`, evidence: [...evidence]})),
    relations: [{kind: 'convergence', claimIds: ids, text: 'Relação de teste entre planetas, ângulos e cúspides; não representa aspecto.'}],
    synthesis: [{claimIds: ids, text: 'Síntese de fixture cobrindo referências; sem revisão legítima.'}],
    reflections: ['Que intenção e necessidade quero observar?', 'Quais recursos posso considerar no cotidiano?', 'Qual experimento reversível cabe nesta semana?'],
  };
}
