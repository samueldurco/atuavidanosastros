import type { ProductDefinition } from './catalog.ts';
import type { BirthInput } from './workflows.ts';

/** P02 intake/preparation only. No commercial or editorial release is implied. */
export const LAUNCH_INPUT_VERSION = 'atv-launch-input/1' as const;
export const LAUNCH_EVIDENCE_VERSION = 'atv-launch-evidence/1' as const;
export const launchProductIds = [
  'wedding-date-map', 'ex-tarot', 'love-restart-map', 'sexuality-map', 'intimacy-map',
  'emotional-reactions-map', 'financial-blocks-tarot', 'hidden-talent-map',
  'ascendant-style', 'conversation-timing', 'cohabitation-map'
] as const;
export type LaunchProductId = typeof launchProductIds[number];
export const isLaunchProductId = (value: unknown): value is LaunchProductId =>
  typeof value === 'string' && launchProductIds.some((id) => id === value);

export type LaunchField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'list' | 'date' | 'adult-confirmation' | 'ceremony-options';
  required: boolean;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
};
export type LaunchSpec = {
  title: string;
  subtitle?: string;
  method: string;
  requiresBirth: boolean;
  requiredCalculation: 'electional-comparison' | 'tarot-three-cards' | 'natal-transits-30d' |
    'natal-venus-mars' | 'natal-moon' | 'natal-talents' | 'natal-ascendant' |
    'natal-transits-7d' | 'natal-habits';
  fields: readonly LaunchField[];
  deliverySections: readonly string[];
  limits: readonly string[];
  closestProductIds: readonly string[];
};
const narrative = (key: string, label: string, maxLength = 600): LaunchField =>
  ({ key, label, type: 'textarea', required: true, maxLength });
const list = (key: string, label: string, minItems: number, maxItems: number): LaunchField =>
  ({ key, label, type: 'list', required: true, minItems, maxItems, maxLength: 200 });
const date = (key: string, label: string): LaunchField =>
  ({ key, label, type: 'date', required: true });
const adult: LaunchField = {
  key: 'adult', label: 'Confirmo que sou maior de 18 anos', type: 'adult-confirmation', required: true
};
export const launchSpecs: Readonly<Record<LaunchProductId, LaunchSpec>> = {
  'wedding-date-map': {
    title: 'Mapa da Data de Casamento', requiresBirth: false,
    method: 'Comparação eletiva de duas ou três opções reais de cerimônia, cada uma com horário e cidade.',
    requiredCalculation: 'electional-comparison',
    fields: [{ key: 'ceremonies', label: 'Datas, horários e cidade da cerimônia', type: 'ceremony-options', required: true, minItems: 2, maxItems: 3 }, narrative('priorities', 'O que mais importa na cerimônia?')],
    deliverySections: ['Quadro comparativo das opções', 'Motivos e ressalvas de cada opção', 'Escolha entre as opções e critério de desempate'],
    limits: ['Compara apenas as opções informadas; não descobre uma data ideal universal.', 'Não mede compatibilidade nem garante o resultado do casamento.'],
    closestProductIds: ['date-reading', 'synastry']
  },
  'ex-tarot': {
    title: 'Tarot do Ex: Saudade e Arrependimento', requiresBirth: false,
    method: 'Três cartas em posições temáticas: episódio, hipótese a examinar e critério de reparação. Exige método próprio, sorteio autorizado e registro antes da interpretação.',
    requiredCalculation: 'tarot-three-cards',
    fields: [{ ...date('episodeDate', 'Quando aconteceu? (opcional)'), required: false }, narrative('episode', 'O episódio que você quer examinar'), narrative('observedActions', 'Quais atitudes você observou?'), narrative('question', 'O que você deseja decidir agora?'), narrative('boundaries', 'Que limite você quer preservar?')],
    deliverySections: ['O episódio à luz das três cartas', 'Saudade e reparação: hipóteses e sinais observáveis', 'Uma atitude e um limite para o próximo contato'],
    limits: ['Não afirma o que a outra pessoa pensa ou sente.', 'Astrologia do momento exige dados suficientes e cálculo próprio; não está incluída na preparação.'],
    closestProductIds: ['tarot-situation-challenge-advice', 'tarot-aphrodite-temple']
  },
  'love-restart-map': {
    title: 'Mapa do Recomeço Amoroso', subtitle: 'Previsão de 30 dias', requiresBirth: true,
    method: 'Trânsitos pessoais em um intervalo explícito de 30 dias, ligados ao contexto e aos limites de quem consulta.',
    requiredCalculation: 'natal-transits-30d',
    fields: [date('startDate', 'Primeiro dia da previsão'), narrative('situation', 'Como está o contato entre vocês?'), narrative('desiredChange', 'Que mudança você deseja?'), narrative('boundaries', 'Que limite você quer preservar?')],
    deliverySections: ['Período e movimentos pessoais relevantes', 'Cenários de silêncio, contato e reaproximação', 'Como se posicionar e o que observar'],
    limits: ['Cenários condicionais não prometem reconciliação.', 'Não substitui o consentimento nem presume a decisão da outra pessoa.'],
    closestProductIds: ['week-reading', 'personal-calendar', 'synastry']
  },
  'sexuality-map': {
    title: 'Mapa da Sexualidade', requiresBirth: true,
    method: 'Vênus e Marte natais em diálogo com situações de desejo e atração relatadas pela pessoa adulta.',
    requiredCalculation: 'natal-venus-mars',
    fields: [adult, list('situations', 'Situações em que você percebe desejo ou atração', 1, 3), narrative('preferences', 'O que você reconhece nas suas preferências?')],
    deliverySections: ['Seu modo de desejar e se aproximar', 'Recursos e tensões nas situações escolhidas', 'Um experimento de expressão e um limite'],
    limits: ['Não determina orientação sexual nem preferências de outra pessoa.', 'Não é diagnóstico ou aconselhamento de saúde.'],
    closestProductIds: ['birth-chart', 'synastry']
  },
  'intimacy-map': {
    title: 'Mapa da Intimidade a Dois', requiresBirth: true,
    method: 'Leitura individual de Vênus e Marte, desejo e limites a partir do relato de uma pessoa adulta.',
    requiredCalculation: 'natal-venus-mars',
    fields: [adult, narrative('wish', 'O que você gostaria de cultivar na intimidade?'), narrative('boundaries', 'Que limites precisam ser respeitados?'), narrative('situation', 'Uma situação concreta que você gostaria de mudar')],
    deliverySections: ['Desejo e condição de segurança pessoal', 'Um limite e uma possibilidade de aproximação', 'Um convite que você pode adaptar'],
    limits: ['Não exige participação, mapa ou respostas do parceiro.', 'O convite depende de consentimento e não prevê a reação de outra pessoa.'],
    closestProductIds: ['synastry', 'couple-dossier', 'birth-chart']
  },
  'emotional-reactions-map': {
    title: 'Mapa das Reações Emocionais', requiresBirth: true,
    method: 'Lua natal relacionada a uma sequência observada de gatilho, reação e efeito.',
    requiredCalculation: 'natal-moon',
    fields: [narrative('trigger', 'O que costuma acontecer antes da reação?'), narrative('reaction', 'Como você reage?'), narrative('effect', 'Que efeito você observa depois?')],
    deliverySections: ['Gatilho, reação e efeito relatados', 'Uma hipótese astrológica para reconhecer o padrão', 'Uma alternativa concreta para experimentar'],
    limits: ['Não faz diagnóstico psicológico nem substitui terapia.', 'A hipótese deve ser conferida na experiência; o mapa não explica toda reação.'],
    closestProductIds: ['birth-chart', 'three-pillars']
  },
  'financial-blocks-tarot': {
    title: 'Tarot dos Bloqueios Financeiros', requiresBirth: false,
    method: 'Três cartas em posições temáticas: impasse, possível bloqueio e primeiro passo. Exige método próprio, sorteio autorizado e registro antes da interpretação.',
    requiredCalculation: 'tarot-three-cards',
    fields: [narrative('impasse', 'Qual é o impasse concreto?'), narrative('attemptedAction', 'O que você já tentou?'), narrative('availableStep', 'O que está ao seu alcance agora?')],
    deliverySections: ['O impasse nas três posições', 'Bloqueio possível e sinal para conferir', 'Primeiro passo com critério de observação'],
    limits: ['Não promete renda, retorno ou resultado financeiro.', 'Não recomenda investimento nem transforma cartas em fatos sobre dinheiro.'],
    closestProductIds: ['tarot-situation-challenge-advice', 'purpose-career']
  },
  'hidden-talent-map': {
    title: 'Mapa do Talento Oculto', requiresBirth: true,
    method: 'Indicadores natais de habilidades comparados com dois favores reais que a pessoa já presta.',
    requiredCalculation: 'natal-talents',
    fields: [list('favors', 'Dois favores que as pessoas já pedem a você', 2, 2), narrative('resources', 'Que recursos e tempo você tem para experimentar?')],
    deliverySections: ['Habilidade reconhecível nos dois exemplos', 'Relação com os indicadores natais', 'Uma oferta inicial para testar e um sinal de resposta'],
    limits: ['Não promete renda nem atribui competência comprovada apenas pelo mapa.', 'A oferta inicial é um experimento, não um plano completo de carreira.'],
    closestProductIds: ['purpose-career', 'birth-chart']
  },
  'ascendant-style': {
    title: 'Meu Estilo pelo Ascendente', requiresBirth: true,
    method: 'Ascendente natal, contexto de uma ocasião e inventário de peças que a pessoa já possui.',
    requiredCalculation: 'natal-ascendant',
    fields: [narrative('occasion', 'Para qual ocasião?'), list('wardrobe', 'Peças que você já possui', 3, 12), narrative('comfort', 'Conforto, clima ou preferências a respeitar')],
    deliverySections: ['Intenção de presença para a ocasião', 'Três composições com as peças informadas', 'Como adaptar sem comprar peças novas'],
    limits: ['A calculadora gratuita de Ascendente continua disponível.', 'Não deduz corpo, gênero ou preferências estéticas apenas pelo signo.'],
    closestProductIds: ['ascendant', 'three-pillars']
  },
  'conversation-timing': {
    title: 'A Hora da Conversa — Horóscopo Amoroso', requiresBirth: true,
    method: 'Comparação de trânsitos pessoais dentro de sete dias para uma conversa amorosa específica.',
    requiredCalculation: 'natal-transits-7d',
    fields: [date('startDate', 'Primeiro dia da janela de sete dias'), narrative('subject', 'Sobre o que você quer conversar?'), narrative('objective', 'Qual é seu objetivo com essa conversa?'), narrative('constraints', 'Quais horários e limites reais precisam ser respeitados?')],
    deliverySections: ['A conversa e a janela de sete dias', 'Falar ou esperar: razões e ressalvas', 'Uma frase de abertura adaptável'],
    limits: ['Não garante resposta favorável nem controla a disposição de outra pessoa.', 'A janela se refere a uma conversa, não ao horóscopo de toda a semana.'],
    closestProductIds: ['week-reading', 'date-reading']
  },
  'cohabitation-map': {
    title: 'Mapa da Convivência a Dois', requiresBirth: true,
    method: 'Leitura natal individual confrontada com hábitos de rotina observados antes da mudança.',
    requiredCalculation: 'natal-habits',
    fields: [list('habits', 'Hábitos que você já observou na convivência', 2, 5), narrative('expectation', 'O que você espera da rotina compartilhada?'), narrative('friction', 'Que situação prática merece acordo antes da mudança?')],
    deliverySections: ['Uma afinidade nas rotinas relatadas', 'Um atrito a conferir em conversa', 'Três acordos para negociar antes da mudança'],
    limits: ['Não exige participação ou mapa do parceiro.', 'Não é sinastria nem declara os hábitos não relatados da outra pessoa.'],
    closestProductIds: ['synastry', 'couple-dossier', 'birth-chart']
  }
};

const presentation: Record<LaunchProductId, { slug: string; universe: ProductDefinition['universe'] }> = {
  'wedding-date-map': { slug: 'mapa-da-data-de-casamento', universe: 'amor-relacoes' },
  'ex-tarot': { slug: 'tarot-do-ex-saudade-e-arrependimento', universe: 'tarot-arcanos' },
  'love-restart-map': { slug: 'mapa-do-recomeco-amoroso', universe: 'amor-relacoes' },
  'sexuality-map': { slug: 'mapa-da-sexualidade', universe: 'amor-relacoes' },
  'intimacy-map': { slug: 'mapa-da-intimidade-a-dois', universe: 'amor-relacoes' },
  'emotional-reactions-map': { slug: 'mapa-das-reacoes-emocionais', universe: 'meu-ceu' },
  'financial-blocks-tarot': { slug: 'tarot-dos-bloqueios-financeiros', universe: 'tarot-arcanos' },
  'hidden-talent-map': { slug: 'mapa-do-talento-oculto', universe: 'proposito-prosperidade' },
  'ascendant-style': { slug: 'meu-estilo-pelo-ascendente', universe: 'meu-ceu' },
  'conversation-timing': { slug: 'a-hora-da-conversa-horoscopo-amoroso', universe: 'amor-relacoes' },
  'cohabitation-map': { slug: 'mapa-da-convivencia-a-dois', universe: 'amor-relacoes' }
};
export const launchProductDefinitions: readonly ProductDefinition[] = launchProductIds.map((id) => ({
  id, ...presentation[id], name: launchSpecs[id].title, state: 'PREPARING', delivery: ['web'], personalized: true
}));

export interface LaunchCeremonyOption extends BirthInput { label: string; city: string }
export type LaunchAnswer = string | string[] | boolean | LaunchCeremonyOption[];
export interface LaunchInput {
  version: typeof LAUNCH_INPUT_VERSION;
  productId: LaunchProductId;
  consent: { storage: true; policyVersion: 'atv-launch-consent/1' };
  birth?: BirthInput;
  answers: Record<string, LaunchAnswer>;
}
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const safeText = (value: unknown, max: number, multiline = false): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max &&
  !(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f]/).test(value);
const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2099-12-31') return false;
  const instant = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(instant.valueOf()) && instant.toISOString().slice(0, 10) === value;
};
const birthKeys = ['localDateTime', 'utcInstant', 'timezone', 'latitude', 'longitude', 'locationSource'] as const;
/** Validates timezone/instant correspondence; does not infer a city or calculate a chart. */
function validBirth(value: unknown, ceremony = false): value is BirthInput {
  if (!object(value) || !exactKeys(value, ceremony ? [...birthKeys, 'label', 'city'] : birthKeys) ||
      !safeText(value.localDateTime, 19) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value.localDateTime) ||
      !validDate(value.localDateTime.slice(0, 10)) ||
      !safeText(value.utcInstant, 30) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value.utcInstant) ||
      !safeText(value.timezone, 80) || !safeText(value.locationSource, 80) ||
      typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 ||
      typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180 ||
      (ceremony && (!safeText(value.label, 80) || !safeText(value.city, 160)))) return false;
  const instant = new Date(value.utcInstant);
  if (!Number.isFinite(instant.valueOf()) || instant.getUTCMilliseconds() !== 0 || instant.toISOString() !== value.utcInstant.replace(/Z$/, value.utcInstant.includes('.') ? 'Z' : '.000Z')) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: value.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant);
    const part = (name: string) => parts.find((p) => p.type === name)?.value;
    const local = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
    return local === (value.localDateTime.length === 16 ? `${value.localDateTime}:00` : value.localDateTime);
  } catch { return false; }
}
const normalized = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');

/** Strict server intake boundary. Narratives remain reported data, never instructions. */
export function parseLaunchInput(value: unknown): LaunchInput | null {
  if (!object(value) || value.version !== LAUNCH_INPUT_VERSION || !isLaunchProductId(value.productId)) return null;
  const spec = launchSpecs[value.productId];
  if (!exactKeys(value, ['version', 'productId', 'consent', 'answers', ...(spec.requiresBirth ? ['birth'] : [])]) ||
      !object(value.consent) || !exactKeys(value.consent, ['storage', 'policyVersion']) ||
      value.consent.storage !== true || value.consent.policyVersion !== 'atv-launch-consent/1' ||
      (spec.requiresBirth && !validBirth(value.birth)) || !object(value.answers) ||
      !Object.keys(value.answers).every((key) => spec.fields.some((field) => field.key === key))) return null;
  for (const field of spec.fields) {
    const answer = value.answers[field.key];
    if (answer === undefined && !field.required) continue;
    if (field.type === 'adult-confirmation') { if (answer !== true) return null; }
    else if (field.type === 'date') { if (!validDate(answer)) return null; }
    else if (field.type === 'list') {
      if (!Array.isArray(answer) || answer.length < (field.minItems ?? 1) || answer.length > (field.maxItems ?? 1) ||
          !answer.every((item) => safeText(item, field.maxLength ?? 600)) ||
          new Set(answer.map((item) => normalized(item as string))).size !== answer.length) return null;
    } else if (field.type === 'ceremony-options') {
      if (!Array.isArray(answer) || answer.length < 2 || answer.length > 3 || !answer.every((item) => validBirth(item, true))) return null;
      const options = answer as unknown as LaunchCeremonyOption[];
      if (new Set(options.map((option) => `${Date.parse(option.utcInstant)}|${option.latitude}|${option.longitude}`)).size !== options.length ||
          new Set(options.map((option) => normalized(option.label))).size !== options.length) return null;
    } else if (!safeText(answer, field.maxLength ?? 600, field.type === 'textarea')) return null;
  }
  const start = value.answers.startDate;
  if (typeof start === 'string' && ['love-restart-map', 'conversation-timing'].includes(value.productId)) {
    const length = value.productId === 'love-restart-map' ? 30 : 7;
    if (new Date(Date.parse(`${start}T00:00:00Z`) + (length - 1) * 86400000).toISOString().slice(0, 10) > '2099-12-31') return null;
  }
  return structuredClone(value) as unknown as LaunchInput;
}

export type LaunchPreparedEvidence = {
  version: typeof LAUNCH_EVIDENCE_VERSION;
  executionId: string;
  productId: LaunchProductId;
  state: 'AWAITING_CALCULATION';
  inputDigest: string;
  facts: { id: string; kind: 'reported'; display: string; source: string }[];
  methodPlan: { method: string; requiredCalculation: LaunchSpec['requiredCalculation']; deliverySections: readonly string[] };
  missing: readonly ['product-specific-calculation', 'product-specific-editorial-review', 'persisted-approval'];
  provenance: { calculation: 'not-run'; tarot: 'not-drawn'; editorial: 'not-reviewed' };
};
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
};

/** Prepares only the supplied facts. A caller must persist and bind real calculations separately. */
export async function prepareLaunchEvidence(value: unknown, executionId: string): Promise<LaunchPreparedEvidence> {
  const input = parseLaunchInput(value);
  if (!input || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(executionId)) throw new TypeError('invalid_launch_preparation');
  const spec = launchSpecs[input.productId];
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(input)));
  const facts: LaunchPreparedEvidence['facts'] = spec.fields.flatMap((field) => {
    const answer = input.answers[field.key];
    if (answer === undefined) return [];
    const values = Array.isArray(answer) ? answer : [answer];
    return values.map((item, index) => ({
      id: `reported-${field.key}-${index + 1}`, kind: 'reported' as const,
      display: typeof item === 'string' ? item : canonical(item),
      source: `input.answers.${field.key}${Array.isArray(answer) ? `[${index}]` : ''}`
    }));
  });
  if (input.birth) facts.unshift({ id: 'reported-birth', kind: 'reported', display: canonical(input.birth), source: 'input.birth' });
  return {
    version: LAUNCH_EVIDENCE_VERSION, executionId: executionId.toLowerCase(), productId: input.productId,
    state: 'AWAITING_CALCULATION', inputDigest: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''), facts,
    methodPlan: { method: spec.method, requiredCalculation: spec.requiredCalculation, deliverySections: [...spec.deliverySections] },
    missing: ['product-specific-calculation', 'product-specific-editorial-review', 'persisted-approval'],
    provenance: { calculation: 'not-run', tarot: 'not-drawn', editorial: 'not-reviewed' }
  };
}
