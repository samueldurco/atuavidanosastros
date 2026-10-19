import assert from 'node:assert/strict';
import { SCHEMA_VERSION } from '@atv/ai';

const roles = [
  'integrated-direction', 'context-criterion', 'theme-contribution', 'theme-motivation',
  'theme-environment', 'theme-working-style', 'theme-sustainability',
  'selected-relation-1', 'selected-relation-2', 'selected-relation-3',
  'reversible-experiment', 'decision-review',
];

/** Stable synthetic model contract fixture for private persistence tests only. */
export function careerCompassFullFixture(snapshot) {
  const fact = (id) => snapshot.facts.find((item) => item.id === id);
  const exact = (id) => ({ id: `fact-${id}`, kind: 'fact',
    text: fact(id).display, evidence: [id] });
  const aspectList = snapshot.data.aspects.aspects;
  const fallbacks = [['sun', 'moon'], ['mercury', 'mars'], ['jupiter', 'saturn'],
    ['venus', 'pluto'], ['uranus', 'neptune']];
  const pairs = new Set();
  const selected = [0, 1, 2].map((index) => {
    const aspect = aspectList[index];
    const bodies = aspect ? [aspect.first, aspect.second] : fallbacks.find((pair) =>
      !pairs.has([...pair].sort().join('|')));
    assert.ok(bodies);
    pairs.add([...bodies].sort().join('|'));
    return [
      ...(aspect ? [`career-aspect-${index}`] : []),
      ...bodies.map((body) => `position-${body}`), 'personal-context',
    ];
  });
  const hypothesis = (id, text, evidence) => ({ id, kind: 'hypothesis', text, evidence });
  return {
    schemaVersion: SCHEMA_VERSION, capability: 'purpose-direction', scope: 'integrated',
    title: 'Bússola integral sintética para revisão privada',
    claims: [
      ...['angle-midheaven', 'career-mc-ruler', 'compass-ruler-house', 'personal-context'].map(exact),
      hypothesis('integrated-direction', 'Uma direção possível pede comparação entre contribuição, custo e tempo real antes de qualquer mudança.',
        ['angle-midheaven', 'career-mc-ruler', 'compass-ruler-house', 'position-sun', 'personal-context']),
      hypothesis('context-criterion', 'A transição relatada pode ser comparada pela qualidade de uma tarefa pequena sem deixar o trabalho atual.',
        ['angle-midheaven', 'position-mercury', 'personal-context']),
      hypothesis('theme-contribution', 'Uma contribuição testável é produzir uma entrega que outra pessoa consiga avaliar.',
        ['angle-midheaven', 'career-mc-ruler', 'position-sun']),
      hypothesis('theme-motivation', 'A vontade de repetir uma atividade depois de praticá-la oferece um critério observável de interesse.',
        ['position-sun', 'position-moon', 'position-venus']),
      hypothesis('theme-environment', 'Tempo protegido e retorno específico podem mudar o resultado do mesmo ensaio.',
        ['position-moon', 'position-mercury', 'position-saturn']),
      hypothesis('theme-working-style', 'Planejar e executar uma etapa curta permite comparar método e esforço.',
        ['position-mercury', 'position-mars', 'position-sun']),
      hypothesis('theme-sustainability', 'A continuidade depende de energia, apoio e margem de tempo registrada após cada tentativa.',
        ['position-jupiter', 'position-saturn', 'position-mars']),
      hypothesis('selected-relation-1', 'A primeira combinação pode alterar a forma de começar a tarefa, sujeita à experiência relatada.', selected[0]),
      hypothesis('selected-relation-2', 'A segunda combinação sugere observar se comunicação e ação se apoiam na prática.', selected[1]),
      hypothesis('selected-relation-3', 'A terceira combinação pede comparar avanço e limite antes de repetir o ensaio.', selected[2]),
      hypothesis('reversible-experiment', 'Em duas semanas, testar uma tarefa de até uma hora, anotar resultado e custo; adiar se faltar descanso.',
        ['angle-midheaven', 'position-mercury', 'personal-context']),
      hypothesis('decision-review', 'Só rever uma decisão depois da etapa executada, do custo anotado e de um resultado que contrarie a hipótese.',
        ['angle-midheaven', 'position-saturn', 'personal-context']),
    ],
    relations: [
      { kind: 'tension', claimIds: ['selected-relation-1', 'theme-sustainability'],
        text: 'A primeira relação pode pedir um ritmo menor do que o interesse inicial sugere.' },
      { kind: 'convergence', claimIds: ['selected-relation-2', 'theme-working-style'],
        text: 'A segunda relação pode favorecer uma tarefa curta com retorno concreto.' },
      { kind: 'tension', claimIds: ['selected-relation-3', 'theme-environment'],
        text: 'A terceira relação pode mudar de efeito conforme o tempo e o apoio disponíveis.' },
    ],
    synthesis: [{ claimIds: roles,
      text: 'Direção, contexto, cinco temas, três relações, ensaio e revisão formam uma hipótese situada, ainda sujeita ao resultado observado.' }],
    reflections: ['Que entrega pequena poderia ser observada?', 'Qual custo real de tempo apareceu?',
      'Que resultado contrariaria a hipótese inicial?'],
    limits: ['Método simbólico experimental; nenhuma previsão ou aptidão profissional é provada por estes fatores.'],
  };
}
