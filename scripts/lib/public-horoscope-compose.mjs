import { createHash } from "node:crypto";
import {
  CORPUS,
  CORPUS_VERSION,
  METHOD_VERSION,
  SIGNS,
  SECTORS,
  BODIES,
  PAIRS,
  ASPECTS,
  AXES,
  MOVEMENTS,
  APPLICATIONS,
  MOTION_CONSEQUENCES,
} from "./public-horoscope-corpus.mjs";

export const ALGORITHM_VERSION = "atv-public-horoscope-composition/1.0.0";
export const REVIEW_MODE = "reviewed-corpus-and-runtime-verification";
const canonical = (x) =>
  Array.isArray(x)
    ? `[${x.map(canonical).join(",")}]`
    : x && typeof x === "object"
      ? `{${Object.keys(x)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical(x[k])}`)
          .join(",")}}`
      : JSON.stringify(x);
export const corpusDigest = () =>
  createHash("sha256").update(canonical(CORPUS)).digest("hex");
export const contentDigest = (value) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export const sector = (longitude, sign) => {
  const index = SIGNS.findIndex(([id]) => id === sign);
  if (
    index < 0 ||
    !Number.isFinite(longitude) ||
    longitude < 0 ||
    longitude >= 360
  )
    throw Error("Invalid solar sector");
  return 1 + ((Math.floor(longitude / 30) - index + 12) % 12);
};
const titlecase = (text) => text[0].toLocaleUpperCase("pt-BR") + text.slice(1);
const list = (items) =>
  items.length < 2
    ? items[0]
    : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
const tension = (factor) =>
  ["square", "opposition"].includes(factor.aspect?.kind);
const unique = (xs) => [...new Set(xs)];
const dayLabel = (at) => {
  const [year, month, day] = at.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};
const sampleLabel = (at) => `${dayLabel(at)} às ${at.slice(11, 16)}`;

export function factorObservationTimes(factor, facts) {
  if (factor.kind !== "aspect") return [factor.representativeAt];
  const target = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  }[factor.aspect.kind];
  const [a, b] = factor.bodies.map((body) => 1 + facts.bodies.indexOf(body));
  return facts.rows
    .filter((row) => {
      const distance = Math.abs(row[a] - row[b]);
      return Math.abs(Math.min(distance, 360 - distance) - target) <= 2;
    })
    .map((row) => new Date(row[0]).toISOString());
}

function temporalFrame(factor, facts) {
  const times = factorObservationTimes(factor, facts);
  if (!times.length) throw Error("Selected factor has no factual observation");
  if (factor.kind !== "aspect")
    return `A mudança aparece entre as amostras de ${sampleLabel(factor.firstObservedAt)} e ${sampleLabel(factor.lastObservedAt)} (UTC); esse intervalo não determina o instante exato da passagem.`;
  const first = times[0],
    last = times.at(-1);
  if (facts.period === "daily") {
    const hours = times.map((t) => Number(t.slice(11, 13)));
    return hours.some((h) => h < 12) && hours.some((h) => h >= 12)
      ? "A relação aparece em amostras das duas metades do dia UTC."
      : `A relação aparece em amostras ${hours.every((h) => h < 12) ? "da primeira" : "da segunda"} metade do dia UTC.`;
  }
  const total =
    Date.parse(`${facts.endDateExclusive}T00:00:00Z`) -
    Date.parse(`${facts.startDate}T00:00:00Z`);
  const parts = unique(
    times.map((t) =>
      Math.min(
        2,
        Math.floor(
          ((Date.parse(t) - Date.parse(`${facts.startDate}T00:00:00Z`)) /
            total) *
            3,
        ),
      ),
    ),
  );
  return parts.length === 3
    ? `Há observações dessa relação no início, meio e fim ${facts.period === "weekly" ? "da semana amostrada" : "do mês amostrado"}.`
    : `O recorte observado vai de ${dayLabel(first)} a ${dayLabel(last)} (UTC).`;
}

/** Select only from the already calculated editorial selection, never add an invented factor. */
export function compositionFactors(facts) {
  const selected = facts.selectedIds.map((id) =>
    facts.candidates.find((row) => row.id === id),
  );
  if (selected.some((f) => !f) || selected.length < 2)
    throw Error("Insufficient selected factual factors");
  const rank = (f) =>
    (f.category === "fast" ? 40 : 0) +
    (f.kind === "aspect" ? 10 : 0) +
    (f.bodies.includes("moon") ? 0 : 20) +
    (tension(f) ? 5 : 0);
  const available = [...selected].sort(
    (a, b) =>
      rank(b) - rank(a) || b.score - a.score || a.id.localeCompare(b.id),
  );
  const chosen = [available.shift()];
  while (chosen.length < 3 && available.length) {
    const shared = available.findIndex(
      (f) =>
        f.bodies.some((body) => chosen.some((c) => c.bodies.includes(body))) &&
        (f.category !== "background" ||
          !chosen.some((c) => c.category === "background")),
    );
    const next =
      shared >= 0
        ? shared
        : available.findIndex(
            (f) =>
              f.category !== "background" ||
              !chosen.some((c) => c.category === "background"),
          );
    if (next < 0) break;
    chosen.push(...available.splice(next, 1));
  }
  if (chosen.length < 2)
    throw Error("At least two admissible relational factors required");
  return chosen;
}

function project(factor, facts, sign) {
  const row = facts.rows.find(
    (r) => new Date(r[0]).toISOString() === factor.representativeAt,
  );
  if (
    !row ||
    factor.bodies.some((body) => !BODIES[body] || !facts.bodies.includes(body))
  )
    throw Error("Missing representative factual row");
  const sectors = Object.fromEntries(
    factor.bodies.map((body) => [
      body,
      sector(row[1 + facts.bodies.indexOf(body)], sign),
    ]),
  );
  return { factor, sectors, representativeAt: factor.representativeAt };
}

function aspectParagraph(projected, facts) {
  const { factor, sectors } = projected;
  const [a, b] = factor.bodies;
  const relation = PAIRS[`${a}:${b}`] ?? PAIRS[`${b}:${a}`];
  const aspect = ASPECTS[factor.aspect?.kind];
  if (!relation || !aspect) throw Error("Relation outside the reviewed corpus");
  const first = SECTORS[sectors[a]],
    second = SECTORS[sectors[b]];
  const same = sectors[a] === sectors[b];
  const context = same
    ? `Essa dinâmica se concentra nas situações que envolvem ${first.area}. Ao ${first.scene}, as duas preocupações podem aparecer na mesma decisão.`
    : `Essa dinâmica aproxima dois contextos: ${first.area} e ${second.area}. Uma escolha feita ao ${first.scene} pode mudar as condições em que você consegue ${second.scene}.`;
  const interaction = {
    square: `O atrito aparece quando a tendência a ${BODIES[a].shadow} dificulta ${BODIES[b].need}. Esse caminho tem um custo: ao ${first.cost}, você pode comprometer ${second.question}. O ajuste interpretado é dar à escolha um limite compreensível: ${first.practice} precisa comportar também ${second.practice}.`,
    opposition: `Um lado procura ${BODIES[a].need}; o outro, ${BODIES[b].need}. Se a resposta oscilar entre ${BODIES[a].shadow} e ${BODIES[b].shadow}, nenhuma preocupação encontra descanso. ${titlecase(first.practice)} e ${second.practice} dão uma forma negociável a essa diferença, para que a proteção de um tema não dependa da renúncia ao outro.`,
    sextile: `${titlecase(BODIES[a].need)} pode ajudar a ${BODIES[b].need}: ${first.practice} abre caminho para ${second.practice}. O apoio perde força quando vira ${BODIES[a].shadow}, porque essa resposta estreita a abertura entre os dois temas.`,
    trine: `A possibilidade de ${BODIES[a].need} encontra continuidade em ${BODIES[b].need}. Isso aproxima ${first.practice} de ${second.practice}, sem exigir que cada passo comece do zero. Essa continuidade também pode reforçar a tendência a ${first.cost}; uma forma familiar merece ser distinguida daquilo que você ainda escolhe sustentar.`,
    conjunction: `${titlecase(BODIES[a].need)} e ${BODIES[b].need} se concentram na mesma escolha. Essa proximidade pode dar força à intenção, mas também fazer ${BODIES[a].shadow} parecer necessário para cuidar de ambas. ${titlecase(first.practice)} oferece uma forma concreta de separar o que cada necessidade pede, sem desmanchar o que elas podem construir juntas.`,
  }[factor.aspect.kind];
  const background =
    factor.category === "background"
      ? " Por envolver corpos lentos, esta relação é um pano de fundo, sem ser uma novidade exclusiva deste período."
      : "";
  const anchor = `Esta interpretação reúne ${BODIES[a].name} e ${BODIES[b].name} em ${aspect.name}, nos setores solares ${sectors[a]} e ${sectors[b]}.`;
  return `${relation} ${context} ${interaction} ${anchor} ${temporalFrame(factor, facts)}${background}`;
}

function changeParagraph(projected, facts) {
  const { factor, sectors } = projected;
  const body = factor.bodies[0],
    info = BODIES[body],
    current = SECTORS[sectors[body]];
  if (factor.kind === "sign-change") {
    const from =
      1 +
      ((factor.fromSign -
        SIGNS.findIndex(([id]) => id === projected.sign) +
        12) %
        12);
    const previous = SECTORS[from];
    if (!previous || !Number.isInteger(factor.toSign))
      throw Error("Invalid sign change");
    return `A mudança de signo de ${info.name} desloca o foco entre dois temas: ${previous.area} e ${current.area}. A necessidade de ${info.need} permanece, mas passa a ser lida em outro contexto. Uma resposta adequada para ${previous.question} pode precisar de ajustes quando está em jogo ${current.question}. Por exemplo, ${previous.practice} não resolve automaticamente o que aparece ao ${current.scene}. Preservar uma intenção pode exigir outra maneira de realizá-la. ${temporalFrame(factor, facts)}`;
  }
  if (factor.kind !== "motion-change" || typeof factor.retrograde !== "boolean")
    throw Error("Movement outside the reviewed corpus");
  const movement =
    MOVEMENTS[body]?.[factor.retrograde ? "retrograde" : "direct"];
  if (!movement) throw Error("Movement outside the reviewed corpus");
  const direction = factor.retrograde ? "retrógrado" : "direto";
  const slow =
    factor.category === "background"
      ? " Por envolver um corpo lento, essa mudança entra como pano de fundo coletivo."
      : "";
  const application = APPLICATIONS[body].replace(/\{(\w+)\}/g, (_, key) =>
    key === "practiceCapitalized" ? titlecase(current.practice) : current[key],
  );
  return `${movement} ${application} A referência é a passagem de ${info.name} ao movimento aparente ${direction}, visto da Terra, no setor solar ${sectors[body]}; ela não impõe uma regra de parar ou avançar. ${temporalFrame(factor, facts)}${slow}`;
}

function synthesis(projected, facts) {
  const [first, second, third] = projected;
  const firstSector = SECTORS[Object.values(first.sectors)[0]];
  const secondSector = SECTORS[Object.values(second.sectors).at(-1)];
  const allSectors = unique(projected.flatMap((p) => Object.values(p.sectors)));
  const axis = Object.entries(AXES).find(([key]) =>
    key.split(":").every((s) => allSectors.includes(Number(s))),
  );
  const sharedBody = first.factor.bodies.find((b) =>
    second.factor.bodies.includes(b),
  );
  const sharedSector = Object.values(first.sectors).find((s) =>
    Object.values(second.sectors).includes(s),
  );
  const relationBetween = (a, b) => {
    const relation = PAIRS[`${a}:${b}`] ?? PAIRS[`${b}:${a}`];
    if (!relation)
      throw Error("Synthesis relation outside the reviewed corpus");
    return relation;
  };
  const transition = (p) => {
    const body = p.factor.bodies[0];
    const from =
      1 +
      ((p.factor.fromSign - SIGNS.findIndex(([id]) => id === p.sign) + 12) %
        12);
    return { body, previous: SECTORS[from], current: SECTORS[p.sectors[body]] };
  };
  let thread;
  if (
    first.factor.kind === "motion-change" &&
    second.factor.kind === "motion-change" &&
    !sharedBody
  ) {
    const a = first.factor.bodies[0],
      b = second.factor.bodies[0];
    const ordered = [first, second].sort((a, b) =>
      a.factor.representativeAt.localeCompare(b.factor.representativeAt),
    );
    const consequence =
      MOTION_CONSEQUENCES[`${a}:${b}`] ?? MOTION_CONSEQUENCES[`${b}:${a}`];
    if (!consequence)
      throw Error("Motion synthesis outside the reviewed corpus");
    thread = `Lidas em conjunto, as mudanças de movimento de ${BODIES[a].name} e ${BODIES[b].name} acrescentam uma distinção. ${consequence} ${sharedSector ? `Essa diferença modifica a leitura das situações que envolvem ${SECTORS[sharedSector].area}: as duas revisões recaem sobre a mesma escolha, mas esclarecem preocupações diferentes.` : `Essa diferença aproxima ${firstSector.area} e ${secondSector.area}; mudar os termos de uma escolha pode alterar o que é possível sustentar na outra.`} Os registros se distribuem pelo período: ${BODIES[ordered[0].factor.bodies[0]].name} em ${sampleLabel(ordered[0].factor.representativeAt)} e ${BODIES[ordered[1].factor.bodies[0]].name} em ${sampleLabel(ordered[1].factor.representativeAt)} (UTC).`;
  } else if (
    sharedBody &&
    first.factor.kind === "aspect" &&
    second.factor.kind === "aspect"
  ) {
    const a = first.factor.bodies.find((b) => b !== sharedBody);
    const b = second.factor.bodies.find((b) => b !== sharedBody);
    thread = `As duas primeiras relações se encontram em ${BODIES[sharedBody].name}: ${BODIES[sharedBody].need} participa das duas escolhas. ${a !== b ? relationBetween(a, b) : `Essa recorrência dá mais de uma forma à mesma questão: ${firstSector.question}.`} Nesse conjunto, ${BODIES[a].shadow} pode dificultar ${BODIES[b].need}; ${firstSector.practice} ajuda a preservar a ligação entre os temas sem entregar toda a decisão a essa reação.`;
  } else if (
    sharedBody &&
    [first.factor.kind, second.factor.kind].includes("sign-change")
  ) {
    const changed = first.factor.kind === "sign-change" ? first : second;
    const { body, previous, current } = transition(changed);
    const other = (first === changed ? second : first).factor.bodies.find(
      (b) => b !== body,
    );
    thread = `A passagem de ${BODIES[body].name} muda o contexto da outra relação: ${BODIES[body].need} deixa de ser lido apenas no tema que envolve ${previous.area} e passa ao tema que envolve ${current.area}. ${titlecase(current.practice)} torna essa mudança concreta${other ? ` e modifica as condições para ${BODIES[other].need}` : ""}. Preservar a intenção pede reconsiderar os termos em que ela pode ser compartilhada.`;
  } else {
    const a = first.factor.bodies[0];
    const b = second.factor.bodies.find((b) => b !== a);
    thread = `A leitura conjunta aproxima dois temas: ${firstSector.area} e ${secondSector.area}. ${b ? relationBetween(a, b) : `A necessidade de ${BODIES[a].need} aparece em contextos diferentes; ${firstSector.practice} pode preservar a intenção enquanto a forma de responder muda.`}`;
  }
  let modification = "";
  if (third?.factor.kind === "sign-change") {
    const { body, previous, current } = transition(third);
    modification = `A passagem de ${BODIES[body].name}, registrada em ${dayLabel(third.factor.representativeAt)} (UTC), leva essa questão do tema que envolve ${previous.area} para o tema que envolve ${current.area}. A preocupação anterior era ${previous.question}; agora, ${current.practice} oferece outro modo de responder. Essa mudança de contexto ajuda a distinguir a intenção que você preserva dos termos que podem precisar ser renegociados.`;
  } else if (third) {
    const existing = unique([first, second].flatMap((p) => p.factor.bodies));
    const anchor = third.factor.bodies.find((b) => existing.includes(b));
    const added =
      third.factor.bodies.find((b) => b !== anchor) ?? third.factor.bodies[0];
    const area = SECTORS[third.sectors[added]];
    modification = `${third.factor.kind === "aspect" ? `O contato em ${ASPECTS[third.factor.aspect.kind].name} entre ${third.factor.bodies.map((b) => BODIES[b].name).join(" e ")}` : `A revisão de ${BODIES[added].name}`} acrescenta ${BODIES[added].need} a essa conclusão. ${titlecase(BODIES[added].shadow)} pode ${tension(third.factor) ? "acentuar o impasse" : "fechar essa possibilidade de apoio"}, porque torna mais difícil ${anchor ? BODIES[anchor].need : BODIES[first.factor.bodies[0]].need}. Assim, ${area.practice} ${tension(third.factor) ? "dá um contorno à reação" : "oferece um recurso"} que modifica a maneira de enfrentar a primeira escolha.`;
  }
  const scale = {
    daily:
      "No recorte diário, essa combinação dá medida a uma resposta próxima, sem exigir uma solução para todos os assuntos de uma vez.",
    weekly:
      "Na escala da semana, essa diferença permite ajustar um acordo entre momentos distintos, em vez de tratar a primeira resposta como definitiva.",
    monthly:
      "Na escala do mês, a sequência oferece uma mudança de perspectiva: o que precisa de revisão pode ganhar outra forma de continuidade.",
  }[facts.period];
  return `${thread} ${modification} ${axis?.[1] ?? ""} ${scale}`.replace(
    / {2,}/g,
    " ",
  );
}

export function composeHoroscope(facts, sign) {
  const found = SIGNS.find(([id]) => id === sign);
  if (!found || !["daily", "weekly", "monthly"].includes(facts.period))
    throw Error("Invalid sign or period");
  const factors = compositionFactors(facts);
  const projected = factors.map((f) => ({ ...project(f, facts, sign), sign }));
  const primarySector = Object.values(projected[0].sectors)[0];
  const secondarySector = Object.values(projected[0].sectors).at(-1);
  const title =
    primarySector === secondarySector
      ? titlecase(SECTORS[primarySector].title)
      : `${titlecase(SECTORS[primarySector].title)} e ${SECTORS[secondarySector].title}`;
  const paragraphs = projected.map((p) =>
    p.factor.kind === "aspect"
      ? aspectParagraph(p, facts)
      : changeParagraph(p, facts),
  );
  paragraphs.push(synthesis(projected, facts));
  const selectionNote = `Esta leitura desenvolve ${factors.length} relações da seleção calculada para o período: ${list(factors.map((f) => (f.kind === "aspect" ? `${BODIES[f.bodies[0]].name}–${BODIES[f.bodies[1]].name} em ${ASPECTS[f.aspect.kind].name}` : f.kind === "sign-change" ? `mudança de signo de ${BODIES[f.bodies[0]].name}` : `passagem de ${BODIES[f.bodies[0]].name} ao movimento ${f.retrograde ? "retrógrado" : "direto"}`)))}. Os fatores foram escolhidos pela presença de movimentos rápidos e por ligações entre os temas; não são uma lista de todos os movimentos do céu.`;
  return {
    sign,
    name: found[1],
    title,
    description:
      primarySector === secondarySector
        ? `Uma leitura simbólica para ${found[1]} sobre as diferentes escolhas que envolvem ${SECTORS[primarySector].area}.`
        : `Uma leitura simbólica para ${found[1]} sobre ${SECTORS[primarySector].area} e suas relações com ${SECTORS[secondarySector].area}.`,
    paragraphs,
    selectionNote,
    factorIds: factors.map((f) => f.id),
    claims: [
      ...projected.map((p, paragraph) => ({
        paragraph,
        factorIds: [p.factor.id],
        representativeAt: p.representativeAt,
        sectors: p.sectors,
        interpretation: paragraphs[paragraph],
      })),
      {
        paragraph: paragraphs.length - 1,
        factorIds: factors.map((f) => f.id),
        sectorsByFactor: Object.fromEntries(
          projected.map((p) => [p.factor.id, p.sectors]),
        ),
        interpretation: paragraphs.at(-1),
      },
    ],
  };
}

export function composeHoroscopeBatch(facts) {
  return {
    period: facts.period,
    startDate: facts.startDate,
    authoringAgent: "atvna-deterministic-horoscope-composer",
    methodVersion: METHOD_VERSION,
    composition: {
      corpusVersion: CORPUS_VERSION,
      corpusDigest: corpusDigest(),
      algorithmVersion: ALGORITHM_VERSION,
      reviewMode: REVIEW_MODE,
    },
    requiredFactors: compositionFactors(facts).map((f) => f.id),
    readings: SIGNS.map(([sign]) => composeHoroscope(facts, sign)),
  };
}

/** Exact deterministic publication bytes. Preparing bytes never grants admission. */
export function composeDocumentAndClaims(facts, sign, frozenAt) {
  if (!Number.isFinite(Date.parse(frozenAt)))
    throw Error("Invalid freeze timestamp");
  const reading = composeHoroscope(facts, sign);
  const id = `horoscopo-${sign}-${facts.period}-${facts.startDate}`;
  const document = {
    id,
    revision: 1,
    state: "PUBLISHED",
    kind: "horoscope",
    path: `/horoscopo/${sign}/${facts.period}/${facts.startDate}`,
    title: `${reading.name}: ${reading.title}`,
    description: reading.description,
    author: {
      id: "atvna-horoscopo-automatizado",
      name: "ATVNA",
      type: "Organization",
      bio: "Publicação ATVNA por composição determinística de corpus elaborado e revisto por IA. Sem revisão humana.",
    },
    automationDisclosure: {
      generatedWithAI: true,
      humanReview: false,
      reviewMode: REVIEW_MODE,
    },
    publishedAt: frozenAt,
    modifiedAt: frozenAt,
    sections: [
      { heading: reading.title, paragraphs: reading.paragraphs },
      {
        heading: "Como esta leitura foi construída",
        paragraphs: [
          `Esta é uma interpretação simbólica geral para ${reading.name}, com cobertura de ${facts.startDate} até ${facts.endDateExclusive} (fim exclusivo), em UTC. O signo escolhido inicia doze setores simbólicos; eles não são casas do seu mapa natal. O mesmo céu é interpretado a partir de setores diferentes para cada signo.`,
          reading.selectionNote,
          "As relações mencionadas foram observadas em uma grade de seis horas. Elas não indicam duração completa nem horários exatos de acontecimentos. A base calculada tem precisão integral ainda experimental. Os exemplos ilustram a interpretação e não afirmam fatos da sua vida.",
          `${CORPUS.disclosure} A interpretação simbólica não demonstra causalidade científica nem oferece previsão garantida de acontecimentos.`,
        ],
      },
    ],
    sources: [
      {
        title: "Caelus — código do motor de efemérides utilizado",
        url: "https://github.com/heavyblotto/caelus",
      },
    ],
    calculation: {
      engine: facts.engine,
      version: facts.version,
      factsDigest: contentDigest(facts),
      coverageStart: `${facts.startDate}T00:00:00.000Z`,
      coverageEnd: `${facts.endDateExclusive}T00:00:00.000Z`,
    },
  };
  const claims = {
    documentId: id,
    methodVersion: METHOD_VERSION,
    authoringAgent: "atvna-deterministic-horoscope-composer",
    sign,
    factsDigest: contentDigest(facts),
    claims: reading.claims.map((claim) => {
      const sampledFactors = claim.factorIds.map((factorId) =>
        facts.candidates.find((factor) => factor.id === factorId),
      );
      const bodies = unique(sampledFactors.flatMap((factor) => factor.bodies));
      return {
        section: 0,
        paragraph: claim.paragraph,
        factorIds: claim.factorIds,
        positionObservations: facts.rows.map((row) => ({
          at: row[0],
          sectors: Object.fromEntries(
            bodies.map((body) => [
              body,
              sector(row[1 + facts.bodies.indexOf(body)], sign),
            ]),
          ),
        })),
        observedAtByFactor: Object.fromEntries(
          sampledFactors.map((factor) => [
            factor.id,
            factorObservationTimes(factor, facts),
          ]),
        ),
        interpretation: claim.interpretation,
        sampledFactors,
      };
    }),
  };
  return { document, claims };
}

/** Pure replay, usable by signer and server; any divergence throws. No filesystem. */
export function assertRuntimeComposition({ document, claims, facts, scope }) {
  const same = (actual, expected, label) => {
    if (canonical(actual) !== canonical(expected))
      throw Error(`Runtime composition mismatch: ${label}`);
  };
  if (
    !scope ||
    scope.schemaVersion !== "atv-dated-horoscope-preparation-v1" ||
    scope.policyVersion !== "atvna-horoscope-policy-2026-10-20-v1" ||
    scope.methodVersion !== METHOD_VERSION ||
    scope.composition?.reviewMode !== REVIEW_MODE ||
    scope.composition.corpusVersion !== CORPUS_VERSION ||
    scope.composition.corpusDigest !== corpusDigest() ||
    scope.composition.algorithmVersion !== ALGORITHM_VERSION ||
    !/^[0-9a-f]{64}$/.test(scope.composition.algorithmDigest ?? "")
  )
    throw Error("Runtime composition scope is unsupported");
  same(scope.factsDigest, contentDigest(facts), "facts digest");
  same(
    [scope.period, scope.startDate, scope.endDateExclusive],
    [facts.period, facts.startDate, facts.endDateExclusive],
    "coverage",
  );
  const expectedIds = SIGNS.map(
    ([sign]) => `horoscopo-${sign}-${facts.period}-${facts.startDate}`,
  ).sort();
  same(
    Object.keys(scope.documentDigests ?? {}).sort(),
    expectedIds,
    "complete document scope",
  );
  same(
    Object.keys(scope.claimsDigests ?? {}).sort(),
    expectedIds,
    "complete claims scope",
  );
  const expected = composeDocumentAndClaims(facts, claims.sign, scope.frozenAt);
  same(document, expected.document, "document");
  same(claims, expected.claims, "claims");
  same(
    scope.documentDigests[document.id],
    contentDigest(document),
    "document digest",
  );
  same(
    scope.claimsDigests[document.id],
    contentDigest(claims),
    "claims digest",
  );
  const batch = composeHoroscopeBatch(facts);
  const paragraphs = batch.readings.flatMap((reading) => reading.paragraphs);
  if (new Set(paragraphs).size !== paragraphs.length)
    throw Error("Runtime differentiation failed");
  return {
    facts: "PASS",
    claims: "PASS",
    composition: "PASS",
    coverage: "PASS",
    disclosure: "PASS",
    differentiation: "PASS",
  };
}
