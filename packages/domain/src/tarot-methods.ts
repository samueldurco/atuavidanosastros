/** Editorially fixed RWS methods. No draw, entitlement or payment decisions live here. */
export interface TarotPosition {
  id: string;
  name: string;
  function: string;
  x: number;
  y: number;
}
export interface TarotMethod {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: 'atv-tarot-methods/1.0.0';
  positions: readonly TarotPosition[];
  integration: string;
  related: readonly string[];
}
const p = (id: string, name: string, role: string, x: number, y: number): TarotPosition =>
  ({ id, name, function: role, x, y });
export const retiredTarotIds = Object.freeze([
  'daily-card', 'tarot-focus', 'tarot-yes-no', 'three-questions', 'tarot-journey'
]);
export const isRetiredTarot = (id: string) => retiredTarotIds.includes(id);
export const tarotMethods: readonly TarotMethod[] = Object.freeze([
  {
    id: 'tarot-single-card', slug: 'carta-unica', name: 'Carta Única',
    description: 'Uma carta para examinar um tema central e encontrar uma forma concreta de observá-lo.',
    version: 'atv-tarot-methods/1.0.0',
    positions: [p('central-theme', 'Tema central', 'Reconhecer o mecanismo principal, seu recurso e seu excesso.', 50, 50)],
    integration: 'Uma única imagem organiza a leitura; recurso e excesso são possibilidades da mesma carta.',
    related: ['tarot-situation-challenge-advice', 'tarot-peladan-cross']
  },
  {
    id: 'tarot-situation-challenge-advice', slug: 'situacao-desafio-conselho', name: 'Situação, Desafio e Conselho',
    description: 'Três cartas relacionam o que está em jogo, o ponto de dificuldade e uma resposta possível.',
    version: 'atv-tarot-methods/1.0.0',
    positions: [
      p('situation', 'Situação', 'Nomear a dinâmica em exame sem inventar acontecimentos.', 18, 50),
      p('challenge', 'Desafio', 'Identificar a fricção, inclusive o excesso de algo útil.', 50, 50),
      p('advice', 'Conselho', 'Formular uma ação que responda à situação e à fricção.', 82, 50)
    ],
    integration: 'O conselho precisa responder ao desafio dentro da situação; as posições não são passado, presente e futuro.',
    related: ['tarot-single-card', 'tarot-peladan-cross', 'tarot-celtic-cross']
  },
  {
    id: 'tarot-peladan-cross', slug: 'cruz-peladan', name: 'Cruz Péladan',
    description: 'Cinco cartas confrontam forças favoráveis e contrárias, articulam um conselho e uma tendência condicional.',
    version: 'atv-tarot-methods/1.0.0',
    positions: [
      p('support', 'A favor', 'Localizar o apoio disponível e as condições para usá-lo.', 18, 50),
      p('opposition', 'Contra', 'Reconhecer a resistência ou o custo que limita esse apoio.', 82, 50),
      p('advice', 'Conselho', 'Mediar a oposição entre as duas primeiras cartas.', 50, 15),
      p('trend', 'Tendência', 'Explorar uma direção possível caso a dinâmica descrita continue.', 50, 85),
      p('synthesis', 'Síntese', 'Integrar a cruz sem anular seus contrastes.', 50, 50)
    ],
    integration: 'Adaptação com cinco cartas distintas do baralho completo: a carta central integra apoio, resistência e conselho.',
    related: ['tarot-situation-challenge-advice', 'tarot-celtic-cross']
  },
  {
    id: 'tarot-celtic-cross', slug: 'cruz-celta', name: 'Cruz Celta',
    description: 'Dez cartas distinguem a situação, suas bases, a postura pessoal e o contexto antes de reunir uma tendência.',
    version: 'atv-tarot-methods/1.0.0',
    positions: [
      p('situation', 'Situação', 'Definir a dinâmica atual que organiza a cruz.', 36, 50),
      p('crossing', 'Força que cruza', 'Mostrar o que atravessa a situação: recurso, resistência ou excesso.', 50, 50),
      p('foundation', 'Fundamento', 'Examinar a condição que sustenta a dinâmica, sem diagnóstico oculto.', 36, 85),
      p('past', 'Passado relevante', 'Propor uma hipótese de antecedente a conferir, sem inventar biografia.', 10, 50),
      p('awareness', 'Direção percebida', 'Distinguir a ideia consciente de direção do que já foi realizado.', 36, 15),
      p('near-development', 'Desenvolvimento próximo', 'Considerar o próximo desdobramento possível, sem data ou garantia.', 66, 50),
      p('stance', 'Sua postura', 'Examinar a forma de participação e a margem de ação pessoal.', 88, 85),
      p('environment', 'Ambiente', 'Ler condições externas observáveis, sem atribuir pensamentos a terceiros.', 88, 62),
      p('hopes-fears', 'Expectativas e receios', 'Reconhecer a ambivalência entre desejo e preocupação.', 88, 38),
      p('trend', 'Tendência', 'Reunir as condições da cruz em uma hipótese de continuidade.', 88, 15)
    ],
    integration: 'Distinguir base, direção percebida e desenvolvimento; comparar postura e ambiente antes da tendência.',
    related: ['tarot-peladan-cross', 'tarot-astrological-mandala']
  },
  {
    id: 'tarot-aphrodite-temple', slug: 'templo-afrodite', name: 'Templo de Afrodite',
    description: 'Sete cartas ajudam a examinar participação, necessidades e condições de diálogo em uma relação.',
    version: 'atv-tarot-methods/1.0.0',
    positions: [
      p('shared-theme', 'Tema comum', 'Situar a dinâmica do vínculo sob a perspectiva de quem consulta.', 50, 18),
      p('your-position', 'Sua participação', 'Reconhecer como você participa e o que pode escolher.', 20, 42),
      p('your-need', 'Sua necessidade', 'Explorar uma necessidade a nomear e negociar.', 20, 72),
      p('other-position', 'Outro lugar na relação', 'Formular uma hipótese de interação a conferir em diálogo, nunca ler a mente da outra pessoa.', 80, 42),
      p('other-need', 'Necessidade a perguntar', 'Propor algo a perguntar à outra pessoa, sem afirmar o que ela sente.', 80, 72),
      p('shared-tension', 'Tensão compartilhada', 'Examinar o padrão entre as duas participações sem distribuir culpa.', 50, 50),
      p('helpful-condition', 'Condição de ajuda', 'Identificar uma condição de conversa e um limite respeitável.', 50, 88)
    ],
    integration: 'A perspectiva sobre a outra pessoa permanece hipótese; a síntese reúne reciprocidade, limites e um diálogo verificável.',
    related: ['tarot-situation-challenge-advice', 'tarot-peladan-cross']
  },
  {
    id: 'tarot-astrological-mandala', slug: 'mandala-astrologica', name: 'Mandala Astrológica',
    description: 'Doze áreas simbólicas e uma carta central articulam prioridades e relações entre diferentes campos da vida.',
    version: 'atv-tarot-methods/1.0.0',
    positions: [
      p('presence', 'Presença e iniciativa', 'Examinar como entrar em uma situação e ocupar espaço.', 50, 6),
      p('resources', 'Recursos e sustentação', 'Examinar uso, cuidado e limite dos recursos disponíveis.', 72, 12),
      p('exchange', 'Trocas e aprendizagem', 'Examinar comunicação, perguntas e aprendizagem cotidiana.', 88, 28),
      p('roots', 'Base e pertencimento', 'Examinar condições de repouso, privacidade e pertencimento.', 94, 50),
      p('creation', 'Criação e expressão', 'Examinar prazer, autoria e exposição criativa.', 88, 72),
      p('routine', 'Rotina e cuidado', 'Examinar hábitos e organização prática sem diagnóstico de saúde.', 72, 88),
      p('relationships', 'Relações e acordos', 'Examinar reciprocidade, negociação e limites.', 50, 94),
      p('sharing', 'Partilha e transformação', 'Examinar dependências e compromissos compartilhados.', 28, 88),
      p('horizons', 'Sentido e horizontes', 'Examinar critérios de sentido, estudo e ampliação de perspectiva.', 12, 72),
      p('contribution', 'Contribuição e direção', 'Examinar responsabilidade, participação pública e direção.', 6, 50),
      p('networks', 'Redes e projetos', 'Examinar cooperação, projetos e lugar nos grupos.', 12, 28),
      p('retreat', 'Recolhimento e elaboração', 'Examinar pausas e elaboração reservada, sem supor segredos.', 28, 12),
      p('center', 'Centro · Articulação', 'Articular as doze áreas, seus contrastes e uma prioridade de observação.', 50, 50)
    ],
    integration: 'As doze áreas são simbólicas; não são casas de um mapa natal calculado. O centro relaciona áreas, sem repetir doze verbetes.',
    related: ['tarot-celtic-cross', 'tarot-single-card']
  }
]);
export const tarotMethodFor = (id: string) => tarotMethods.find((method) => method.id === id);
