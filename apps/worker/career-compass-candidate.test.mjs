import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createPurposeCalculators } from "./src/purpose-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  CAREER_COMPASS_CANDIDATE_VERSION,
  composeCareerCompassCandidate,
  prepareCareerCompassCandidate,
} from "./src/career-compass-candidate.ts";
import {
  CAREER_COMPASS_CANDIDATE_VERSION as HISTORICAL_CANDIDATE_VERSION,
  prepareCareerCompassCandidate as prepareHistoricalCareerCompassCandidate,
} from "./src/career-compass-candidate-v1.8.3.ts";

const runId = "00000000-0000-4000-8000-000000000091";
const consent = {
  storage: true,
  policyVersion: "atv-input-consent/1",
  partner: false,
  continuity: false,
};
const calculate = createPurposeCalculators()["career-compass"];

async function calculation(time = "12:00:00", context) {
  const input = {
    version: "atv-workflow/1.0.0",
    productId: "career-compass",
    consent,
    birth: {
      localDateTime: `2000-01-01T${time}`,
      utcInstant: `2000-01-01T${time}Z`,
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
      locationSource: "synthetic",
    },
    ...(context === undefined ? {} : { context }),
  };
  return calculate(input, { runId, signal: new AbortController().signal });
}

async function candidate(calculationSnapshot, revision = 1) {
  return prepareCareerCompassCandidate({
    runId,
    revision,
    tier: "free",
    calculation: calculationSnapshot,
  });
}

test("candidate composes three supported roles and three distinct questions, then stays blocked", async () => {
  const snapshot = await calculation();
  const before = structuredClone(snapshot);
  const result = await candidate(snapshot);
  assert.equal(result.status, "prepared_for_review", result.reason);
  assert.equal(result.version, CAREER_COMPASS_CANDIDATE_VERSION);
  assert.equal(result.publication, "blocked");
  assert.equal(result.assessment.status, "needs_editorial_review");
  assert.equal(result.assessment.publication, "blocked");
  assert.equal(result.delivery.status, "prepared_for_review");
  assert.equal(result.delivery.publication, "blocked");
  assert.equal(result.assessment.basisDigest, result.delivery.basisDigest);
  assert.equal(result.assessment.outputDigest, result.delivery.outputDigest);
  for (const digest of [
    result.assessment.basisDigest,
    result.assessment.outputDigest,
    result.delivery.deliveryDigest,
    result.candidateDigest,
  ])
    assert.match(digest, /^[0-9a-f]{64}$/);
  const expectedCandidateDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: CAREER_COMPASS_CANDIDATE_VERSION,
        basisDigest: result.assessment.basisDigest,
        outputDigest: result.assessment.outputDigest,
        deliveryDigest: result.delivery.deliveryDigest,
      }),
    )
    .digest("hex");
  assert.equal(result.candidateDigest, expectedCandidateDigest);
  assert.deepEqual(snapshot, before);

  const roles = ["public-direction", "work-possibilities", "tension-or-excess"];
  assert.deepEqual(
    result.reading.claims
      .filter((claim) => claim.kind === "hypothesis")
      .map((claim) => claim.id),
    roles,
  );
  assert.deepEqual(result.reading.synthesis[0].claimIds, roles);
  assert.equal(result.reading.scope, "partial");
  assert.equal(result.reading.reflections.length, 3);
  assert.equal(new Set(result.reading.reflections).size, 3);
  assert.deepEqual(result.reading.relations, []);
  const known = new Map(
    result.facts.facts.map((fact) => [fact.id, fact.display]),
  );
  for (const claim of result.reading.claims) {
    for (const id of claim.evidence) assert.ok(known.has(id));
    if (claim.kind === "fact")
      assert.equal(claim.text, known.get(claim.evidence[0]));
  }
  assert.ok(result.delivery.content.sections.length >= 5);
  assert.ok(!("promotionId" in result.delivery.content));
  assert.ok(!("reviewDigest" in result.delivery.content));
  assert.ok(!("receipt" in result));
  assert.ok(!("state" in result));
});

test("a different calculated Midheaven changes interpretation and its bound digests", async () => {
  const first = await candidate(await calculation("12:00:00"));
  const second = await candidate(await calculation("20:00:00"));
  assert.equal(first.status, "prepared_for_review", first.reason);
  assert.equal(second.status, "prepared_for_review", second.reason);
  assert.notEqual(
    first.facts.facts[0].display.split(" de ")[1],
    second.facts.facts[0].display.split(" de ")[1],
  );
  assert.notEqual(
    first.reading.claims.find((c) => c.id === "public-direction").text,
    second.reading.claims.find((c) => c.id === "public-direction").text,
  );
  assert.notEqual(first.reading.reflections[2], second.reading.reflections[2]);
  assert.notEqual(first.assessment.basisDigest, second.assessment.basisDigest);
  assert.notEqual(
    first.assessment.outputDigest,
    second.assessment.outputDigest,
  );
  assert.notEqual(
    first.delivery.deliveryDigest,
    second.delivery.deliveryDigest,
  );
});

test("same Midheaven, different reported situation changes all interpretive sections", async () => {
  const team = await candidate(
    await calculation("12:00:00", "Quero melhorar a colaboração com a equipe."),
  );
  const transition = await candidate(
    await calculation(
      "12:00:00",
      "Estou em transição e quero testar possibilidades.",
    ),
  );
  const change = await candidate(
    await calculation("12:00:00", "Quero mudar uma rotina de trabalho."),
  );
  assert.equal(team.status, "prepared_for_review", team.reason);
  assert.equal(transition.status, "prepared_for_review", transition.reason);
  assert.equal(change.status, "prepared_for_review", change.reason);
  assert.equal(team.facts.facts[0].display, transition.facts.facts[0].display);
  for (const role of ["public-direction", "work-possibilities", "tension-or-excess"]) {
    const teamClaim = team.reading.claims.find((c) => c.id === role);
    const transitionClaim = transition.reading.claims.find((c) => c.id === role);
    const changeClaim = change.reading.claims.find((c) => c.id === role);
    assert.notEqual(teamClaim.text, transitionClaim.text, role);
    assert.notEqual(transitionClaim.text, changeClaim.text, role);
    assert.deepEqual(teamClaim.evidence, ["angle-midheaven", "personal-context"]);
    assert.deepEqual(transitionClaim.evidence, ["angle-midheaven", "personal-context"]);
  }
  assert.notEqual(team.reading.synthesis[0].text, transition.reading.synthesis[0].text);
  for (let index = 0; index < 3; index++)
    assert.notEqual(team.reading.reflections[index], transition.reading.reflections[index]);
  assert.match(team.reading.reflections[0], /equipe/);
  assert.match(transition.reading.reflections[0], /transição/);
  assert.match(change.reading.reflections[0], /rotina/);
  assert.equal(
    team.reading.claims.find((c) => c.id === "reported-context").text,
    team.facts.facts.find((f) => f.id === "personal-context").display,
  );
  assert.equal(
    team.delivery.content.sections.find((s) =>
      s.evidence.includes("personal-context"),
    )?.title,
    "Contexto profissional informado",
  );
  assert.equal(
    transition.reading.claims.find((c) => c.id === "reported-context").text,
    transition.facts.facts.find((f) => f.id === "personal-context").display,
  );
  assert.notEqual(
    team.assessment.basisDigest,
    transition.assessment.basisDigest,
  );
  assert.notEqual(
    team.assessment.outputDigest,
    transition.assessment.outputDigest,
  );
});

test("changing employment is a transition, while changing a routine is a local experiment", async () => {
  const employment = await candidate(await calculation("12:00:00", "Quero mudar de trabalho."));
  const routine = await candidate(await calculation("12:00:00", "Quero mudar uma rotina de trabalho."));
  assert.equal(employment.status, "prepared_for_review", employment.reason);
  assert.equal(routine.status, "prepared_for_review", routine.reason);
  assert.equal(employment.facts.facts[0].display, routine.facts.facts[0].display);
  assert.match(employment.reading.reflections[0], /mudança de emprego|transição/);
  assert.match(routine.reading.reflections[0], /rotina/);
  assert.doesNotMatch(employment.reading.synthesis[0].text, /Altere uma etapa por pouco tempo/);
});

test("negated goals become explicit boundaries, not recommendations", async () => {
  for (const [statement, expected] of [
    ["Não quero liderar equipe.", /sem liderar uma equipe|sem assumir gestão de pessoas/i],
    ["Não estou em transição profissional.", /situação que você relatou/i],
    ["Não quero mudar de trabalho.", /sem mudar de emprego|trabalho atual/i],
    ["Prefiro trabalhar sem equipe.", /sem trabalho contínuo em equipe|individual/i],
  ]) {
    const result = await candidate(await calculation("12:00:00", statement));
    assert.equal(result.status, "prepared_for_review", result.reason);
    assert.match(
      result.reading.reflections.join(" "),
      expected,
      statement,
    );
    assert.equal(
      result.reading.claims.find((claim) => claim.id === "reported-context").text,
      statement,
    );
  }
  const mixed = await candidate(
    await calculation(
      "12:00:00",
      "Não quero mudar de emprego, mas quero colaborar com a equipe.",
    ),
  );
  assert.equal(mixed.status, "prepared_for_review", mixed.reason);
  assert.match(mixed.reading.reflections.join(" "), /equipe/);
  assert.doesNotMatch(mixed.reading.reflections.join(" "), /mudar de emprego/);
});

test("independent preference does not inherit team obligations from the Cancer interpretation", async () => {
  const independent = await candidate(await calculation("00:00:00", "Prefiro trabalhar sem equipe."));
  const collaborative = await candidate(await calculation("00:00:00", "Quero melhorar a colaboração com a equipe."));
  assert.equal(independent.status, "prepared_for_review", independent.reason);
  assert.equal(collaborative.status, "prepared_for_review", collaborative.reason);
  assert.match(independent.facts.facts[0].display, /de Câncer$/);
  assert.equal(independent.facts.facts[0].display, collaborative.facts.facts[0].display);
  const soloText = [
    ...independent.reading.claims.filter((c) => c.kind === "hypothesis").map((c) => c.text),
    independent.reading.synthesis[0].text,
    ...independent.reading.reflections,
  ].join(" ");
  const teamText = [
    ...collaborative.reading.claims.filter((c) => c.kind === "hypothesis").map((c) => c.text),
    collaborative.reading.synthesis[0].text,
    ...collaborative.reading.reflections,
  ].join(" ");
  assert.match(soloText, /Meio do Céu em Câncer/);
  assert.match(soloText, /entrega individual|atividade individual/);
  assert.doesNotMatch(soloText, /ambiente de equipe|apoio a equipe|trabalho conjunto|ação concreta do grupo/i);
  assert.match(teamText, /colaboração com a equipe|ambiente de equipe/i);
  assert.notEqual(independent.assessment.outputDigest, collaborative.assessment.outputDigest);
  assert.equal(independent.publication, "blocked");
  assert.equal(collaborative.publication, "blocked");
});

test("leadership invitation and leadership refusal on the same chart produce different decisions", async () => {
  const invited = await candidate(await calculation("12:00:00", "Recebi um convite para liderar equipe."));
  const declined = await candidate(await calculation("12:00:00", "Não quero liderar equipe."));
  assert.equal(invited.status, "prepared_for_review", invited.reason);
  assert.equal(declined.status, "prepared_for_review", declined.reason);
  assert.equal(invited.facts.facts[0].display, declined.facts.facts[0].display);
  const invitedText = [
    ...invited.reading.claims.filter((c) => c.kind === "hypothesis").map((c) => c.text),
    invited.reading.synthesis[0].text,
    ...invited.reading.reflections,
  ].join(" ");
  const declinedText = [
    ...declined.reading.claims.filter((c) => c.kind === "hypothesis").map((c) => c.text),
    declined.reading.synthesis[0].text,
    ...declined.reading.reflections,
  ].join(" ");
  assert.match(invitedText, /convite para liderar|convite recebido/i);
  assert.match(declinedText, /não quer liderar|sem liderança formal|sem assumir liderança formal/i);
  assert.doesNotMatch(declinedText, /aceitar o papel inteiro|responder ao convite/i);
  assert.notEqual(invited.assessment.outputDigest, declined.assessment.outputDigest);
});

test("a leadership invitation remains visible when the person refuses to lead", async () => {
  for (const statement of [
    "Recebi um convite para liderar uma equipe, mas não quero liderar.",
    "Não quero liderar equipe, mas recebi um convite para liderar.",
  ]) {
    const result = await candidate(await calculation("12:00:00", statement));
    assert.equal(result.status, "prepared_for_review", result.reason);
    const sections = interpretiveSections(result);
    for (const section of sections.slice(0, 4)) {
      assert.match(section, /convite/i);
      assert.match(section, /não quer liderar|sem (?:assumir )?liderança formal|não liderar equipe|sem liderar equipe|limite/i);
    }
    assert.match(sections.slice(4).join(" "), /convite/i);
    assert.match(sections.slice(4).join(" "), /sem liderar equipe|gestão de pessoas|cargo de liderança/i);
    assert.doesNotMatch(sections.join(" "), /aceitar o papel inteiro|deve aceitar o cargo/i);
    assert.equal(result.publication, "blocked");
  }
});

test("overload changes contribution and work conditions without treating rejected rest as a goal", async () => {
  const overload = await candidate(await calculation("12:00:00", "Estou com muitas demandas, mas não quero descansar."));
  const notOverloaded = await candidate(await calculation("12:00:00", "Não estou com muitas demandas."));
  assert.equal(overload.status, "prepared_for_review", overload.reason);
  assert.equal(notOverloaded.status, "prepared_for_review", notOverloaded.reason);
  const interpreted = [
    ...overload.reading.claims.filter((c) => c.kind === "hypothesis").map((c) => c.text),
    overload.reading.synthesis[0].text,
    ...overload.reading.reflections,
  ].join(" ");
  assert.match(interpreted, /demandas em excesso/);
  assert.match(interpreted, /renegocie o alcance|adiada ou repartida/);
  assert.doesNotMatch(interpreted, /descans|repous|pausa/i);
  assert.notEqual(overload.reading.claims.find((c) => c.id === "public-direction").text,
    notOverloaded.reading.claims.find((c) => c.id === "public-direction").text);
  assert.match(notOverloaded.reading.limits.join(" "), /tema não foi classificado/);
});

test("Cancer with missing rest and request to reduce load does not gain another obligation", async () => {
  const reported = await candidate(await calculation("00:00:00", "Não tenho descanso e preciso reduzir a carga."));
  const baseline = await candidate(await calculation("00:00:00"));
  assert.equal(reported.status, "prepared_for_review", reported.reason);
  assert.match(reported.facts.facts[0].display, /de Câncer$/);
  const [direction, mode, tension] = reported.reading.claims.filter((claim) => claim.kind === "hypothesis").map((claim) => claim.text);
  const synthesis = reported.reading.synthesis[0].text;
  assert.match(direction, /falta de descanso/);
  assert.match(direction, /não pede outra responsabilidade/);
  assert.match(mode, /renegocie o alcance/);
  assert.match(tension, /carga/);
  assert.match(synthesis, /adiada ou repartida/);
  assert.doesNotMatch([direction, mode, tension, synthesis].join(" "), /assumir mais uma demanda|escolha uma responsabilidade possível|pergunte de que apoio a equipe precisa/i);
  assert.notEqual(reported.assessment.outputDigest, baseline.assessment.outputDigest);
  assert.equal(reported.publication, "blocked");
});

test("study with an independent preference remains an individual experiment in every section", async () => {
  const reported = await candidate(await calculation("00:00:00", "Prefiro trabalhar sem equipe; quero voltar a estudar."));
  const studyOnly = await candidate(await calculation("00:00:00", "Quero voltar a estudar."));
  assert.equal(reported.status, "prepared_for_review", reported.reason);
  const [direction, mode, tension] = reported.reading.claims.filter((claim) => claim.kind === "hypothesis").map((claim) => claim.text);
  const synthesis = reported.reading.synthesis[0].text;
  const interpreted = [direction, mode, tension, synthesis, ...reported.reading.reflections].join(" ");
  for (const section of [direction, mode, tension, synthesis]) {
    assert.match(section, /individual/);
    assert.match(section, /estud|aprend|formaç|curso|habilidade/i);
  }
  assert.doesNotMatch(interpreted, /ambiente de equipe|apoio a equipe|trabalho conjunto|responsabilidade distribuída|ação concreta do grupo/i);
  assert.match(reported.reading.reflections.join(" "), /individual/);
  assert.notEqual(reported.assessment.outputDigest, studyOnly.assessment.outputDigest);
  assert.equal(reported.publication, "blocked");
});

test("job transition with leadership refusal keeps both parts of the report", async () => {
  const reported = await candidate(await calculation("12:00:00", "Quero mudar de emprego, mas não quero liderar equipe."));
  const transitionOnly = await candidate(await calculation("12:00:00", "Quero mudar de emprego."));
  assert.equal(reported.status, "prepared_for_review", reported.reason);
  const [direction, mode, tension] = reported.reading.claims.filter((claim) => claim.kind === "hypothesis").map((claim) => claim.text);
  const synthesis = reported.reading.synthesis[0].text;
  for (const section of [direction, mode, tension, synthesis]) {
    assert.match(section, /mudança de emprego|transição|outro emprego|possibilidades de trabalho/i);
    assert.match(section, /sem assumir liderança formal|não liderar equipe/i);
  }
  assert.match(reported.reading.reflections.join(" "), /mudança de emprego|transição/i);
  assert.match(reported.reading.reflections.join(" "), /sem assumir liderança formal/i);
  assert.doesNotMatch([direction, mode, tension, synthesis].join(" "), /aceitar o papel inteiro|convite para liderar/i);
  assert.notEqual(reported.assessment.outputDigest, transitionOnly.assessment.outputDigest);
  assert.equal(reported.publication, "blocked");
});

test("a negative constraint in the same clause does not erase the preceding goal", async () => {
  const transition = await candidate(await calculation("12:00:00", "Quero mudar de emprego sem liderar equipe."));
  const study = await candidate(await calculation("00:00:00", "Quero voltar a estudar e prefiro trabalhar sem equipe."));
  assert.equal(transition.status, "prepared_for_review", transition.reason);
  assert.equal(study.status, "prepared_for_review", study.reason);
  assert.match(transition.reading.claims.find((claim) => claim.id === "public-direction").text, /mudança de emprego/);
  assert.match(transition.reading.claims.find((claim) => claim.id === "public-direction").text, /sem assumir liderança formal/);
  assert.match(study.reading.claims.find((claim) => claim.id === "public-direction").text, /voltar a estudar/);
  assert.match(study.reading.claims.find((claim) => claim.id === "public-direction").text, /entrega individual/);
  assert.equal(transition.publication, "blocked");
  assert.equal(study.publication, "blocked");
});

function interpretiveSections(result) {
  return [
    ...result.reading.claims.filter((claim) => claim.kind === "hypothesis").map((claim) => claim.text),
    result.reading.synthesis[0].text,
    ...result.reading.reflections,
  ];
}

test("ceramics remains a conditional, materially grounded practice across all MC signs", async () => {
  const signs = new Set();
  for (let hour = 0; hour < 24; hour += 2) {
    const snapshot = await calculation(
      `${String(hour).padStart(2, "0")}:00:00`,
      "Sou ceramista e quero desenvolver uma peça de cerâmica, mas não tenho argila nem acesso a forno.",
    );
    const result = await candidate(snapshot);
    assert.equal(result.status, "prepared_for_review", result.reason);
    signs.add(result.facts.facts[0].display.split(" de ")[1]);
    const [direction, workMode, tension, synthesis, ...questions] = interpretiveSections(result);
    assert.match(direction, /prática de cerâmica/i);
    assert.match(direction, /não tem argila no momento/i);
    assert.match(workMode, /sem argila, use o desenho/i);
    assert.match(workMode, /não ter acesso à queima, deixe essa etapa fora/i);
    assert.match(tension, /sem argila, não há como verificar a modelagem agora/i);
    assert.match(synthesis, /observação numa peça concluída poderia mostrar/i);
    assert.match(synthesis, /falta de argila impede de avaliar/i);
    assert.match(synthesis, /a queima fica fora deste teste/i);
    assert.match(questions[1], /tamanho e função.*desenho.*não há argila/i);
    assert.match(questions[2], /só poderá ser conferida depois da modelagem e da queima/i);
    assert.notEqual(questions[1], questions[2]);
    assert.doesNotMatch(interpretiveSections(result).join(" "), /amostra de ilustração|produza uma amostra curta|peça pronta para você/i);
    assert.equal(result.publication, "blocked");
  }
  assert.equal(signs.size, 12);
});

test("ceramics with unreported resources asks about access before physical production", async () => {
  const result = await candidate(await calculation("06:00:00", "Sou oleira e quero desenvolver uma peça."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  const [direction, workMode, , synthesis, ...questions] = interpretiveSections(result);
  assert.match(direction, /prática de cerâmica/i);
  assert.match(workMode, /se houver argila e espaço adequados, modele/i);
  assert.match(synthesis, /queima só entra no teste quando houver acesso real/i);
  assert.match(questions[1], /materiais, espaço e acesso à queima/i);
  assert.equal(result.publication, "blocked");
});

test("the historical 1.8.3 candidate stays reproducible while ceramics gains a new version", async () => {
  const snapshot = await calculation("14:00:00", "Sou ceramista e quero desenvolver uma peça de cerâmica.");
  const old = await prepareHistoricalCareerCompassCandidate({
    runId,
    revision: 1,
    tier: "free",
    calculation: snapshot,
  });
  const current = await candidate(snapshot);
  assert.equal(HISTORICAL_CANDIDATE_VERSION, "atv-career-compass-candidate/1.8.3");
  assert.equal(old.status, "prepared_for_review", old.reason);
  assert.equal(current.status, "prepared_for_review", current.reason);
  assert.equal(old.version, HISTORICAL_CANDIDATE_VERSION);
  assert.equal(current.version, CAREER_COMPASS_CANDIDATE_VERSION);
  assert.deepEqual(old.facts, current.facts);
  assert.notEqual(old.assessment.basisDigest, current.assessment.basisDigest);
  assert.notEqual(old.assessment.outputDigest, current.assessment.outputDigest);
  assert.match(interpretiveSections(old).join(" "), /prática criativa/i);
  assert.match(interpretiveSections(current).join(" "), /prática de cerâmica/i);
  assert.equal(old.publication, "blocked");
  assert.equal(current.publication, "blocked");
});

test("career and profession transitions preserve the reported object instead of implying a new employer", async () => {
  for (const [statement, label] of [
    ["Quero mudar de carreira.", /mudança de carreira/i],
    ["Quero mudar de profissão.", /mudança de profissão/i],
  ]) {
    const result = await candidate(await calculation("00:00:00", statement));
    assert.equal(result.status, "prepared_for_review", result.reason);
    for (const section of interpretiveSections(result)) {
      assert.match(section, label, statement);
      assert.doesNotMatch(section, /outro emprego|troca de emprego|mudar de emprego/i, statement);
    }
    assert.equal(result.publication, "blocked");
  }
});

test("career change and refusal to change employer remain distinct in every section", async () => {
  const result = await candidate(await calculation("00:00:00", "Quero mudar de carreira, mas não quero mudar de emprego."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /mudança de carreira/i);
    assert.match(section, /sem mudar de emprego/i);
  }
  assert.equal(result.publication, "blocked");
});

test("career change can be considered while keeping the reported profession", async () => {
  const result = await candidate(await calculation("00:00:00", "Quero mudar de carreira, mas não quero mudar de profissão."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /mudança de carreira/i);
    assert.match(section, /sem mudar de profissão/i);
    assert.doesNotMatch(section, /mudança de profissão|outra profissão|novo emprego/i);
  }
  assert.equal(result.publication, "blocked");
});

test("profession change can be considered while keeping the reported career", async () => {
  const result = await candidate(await calculation("00:00:00", "Quero mudar de profissão, mas não quero mudar de carreira."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /mudança de profissão/i);
    assert.match(section, /sem mudar de carreira/i);
    assert.doesNotMatch(section, /mudança de carreira|outro emprego/i);
  }
  assert.equal(result.publication, "blocked");
});

test("transition synthesis checks a result before comparing concrete conditions for every sign", async () => {
  const signs = new Set();
  for (let hour = 0; hour < 24; hour += 2) {
    const result = await candidate(await calculation(`${String(hour).padStart(2, "0")}:00:00`, "Quero mudar de carreira."));
    assert.equal(result.status, "prepared_for_review", result.reason);
    signs.add(result.facts.facts[0].display.split(" de ")[1]);
    const synthesis = result.reading.synthesis[0].text;
    assert.match(synthesis, /confira se\b/i);
    assert.match(synthesis, /tempo/i);
    assert.match(synthesis, /recursos/i);
    assert.match(synthesis, /autonomia/i);
    assert.doesNotMatch(synthesis, /compare se\b/i);
    assert.equal(result.publication, "blocked");
  }
  assert.equal(signs.size, 12);
});

test("employment change and refusal to change career retain both objects", async () => {
  const result = await candidate(await calculation("00:00:00", "Não quero mudar de carreira, mas quero mudar de emprego."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /mudança de emprego/i);
    assert.match(section, /sem mudar de carreira/i);
  }
  assert.equal(result.publication, "blocked");
});

test("overload and employment transition both shape all sections", async () => {
  const result = await candidate(await calculation("00:00:00", "Estou sobrecarregada e quero mudar de emprego."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /mudança de emprego/i);
    assert.match(section, /carga|demanda|prioridade|recurso|prazo/i);
  }
  assert.doesNotMatch(interpretiveSections(result).join(" "), /assuma outra responsabilidade|aumente a carga/i);
  assert.equal(result.publication, "blocked");
});

test("team work and refusal of leadership both shape all sections", async () => {
  const result = await candidate(await calculation("00:00:00", "Quero trabalhar em equipe, mas sem assumir liderança."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /equipe/i);
    assert.match(section, /sem assumir liderança formal|não liderar equipe|sem liderar equipe|sem assumir gestão de pessoas/i);
  }
  assert.equal(result.publication, "blocked");
});

test("independent work followed by study in the same clause preserves both intentions", async () => {
  const result = await candidate(await calculation("00:00:00", "Prefiro trabalhar sem equipe e quero voltar a estudar."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /individual/i);
    assert.match(section, /estud|aprend|formaç|curso|habilidade/i);
  }
  assert.equal(result.publication, "blocked");
});

test("a new intention after a comma survives a scoped refusal", async () => {
  const result = await candidate(await calculation("00:00:00", "Prefiro trabalhar sem equipe, quero voltar a estudar."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result)) {
    assert.match(section, /individual/i);
    assert.match(section, /estud|aprend|formaç|curso|habilidade/i);
  }
  assert.equal(result.publication, "blocked");
});

test("study coordinated after an independent work boundary remains a separate goal", async () => {
  for (const statement of [
    "Prefiro trabalhar sem equipe e voltar a estudar.",
    "Prefiro trabalhar sem equipe e estudar.",
  ]) {
    const result = await candidate(await calculation("00:00:00", statement));
    assert.equal(result.status, "prepared_for_review", result.reason);
    for (const section of interpretiveSections(result)) {
      assert.match(section, /individual/i);
      assert.match(section, /estud|aprend|formaç|curso|habilidade/i);
    }
    assert.equal(result.publication, "blocked");
  }
});

test("negated coordination does not establish an affirmative study goal", async () => {
  const result = await candidate(await calculation("00:00:00", "Não quero liderar e voltar a estudar."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  assert.match(result.reading.claims.find((claim) => claim.id === "public-direction").text, /não quer liderar/i);
  assert.doesNotMatch(result.reading.claims.find((claim) => claim.id === "public-direction").text, /você também considera estudar|ao considerar voltar a estudar/i);
  assert.equal(result.publication, "blocked");
});

test("a double negation about changing work is not rewritten as a wish to stay", async () => {
  for (const statement of [
    "Não quero deixar de mudar de emprego.",
    "Não quero deixar de mudar de carreira.",
  ]) {
    const result = await candidate(await calculation("00:00:00", statement));
    assert.equal(result.status, "prepared_for_review", result.reason);
    const interpretation = interpretiveSections(result).join(" ");
    assert.doesNotMatch(interpretation, /você informou que não quer mudar|sem mudar de emprego|sem mudar de carreira/i);
    assert.equal(result.publication, "blocked");
  }
});

test("a first intention to study is not rewritten as returning to study", async () => {
  const result = await candidate(await calculation("00:00:00", "Quero estudar."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  assert.match(result.reading.claims.find((claim) => claim.id === "public-direction").text, /ao considerar estudar/i);
  assert.doesNotMatch(result.reading.claims.find((claim) => claim.id === "public-direction").text, /voltar a estudar/i);
  assert.doesNotMatch(result.reading.limits.join(" "), /tema não foi classificado/i);
  assert.equal(result.publication, "blocked");
});

test("employment transition retains a separate study objective", async () => {
  const result = await candidate(await calculation("00:00:00", "Quero mudar de emprego e voltar a estudar."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result).slice(0, 4)) {
    assert.match(section, /mudança de emprego/i);
    assert.match(section, /estud|formaç|habilidade/i);
  }
  assert.match(result.reading.reflections.join(" "), /estud|habilidade/i);
  assert.equal(result.publication, "blocked");
});

test("overload, employment transition and study remain distinct reported concerns", async () => {
  const result = await candidate(await calculation("00:00:00", "Estou sobrecarregada e quero mudar de emprego e voltar a estudar."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  for (const section of interpretiveSections(result).slice(0, 4)) {
    assert.match(section, /carga|demanda|prioridade|sobrecarga/i);
    assert.match(section, /mudança de emprego/i);
    assert.match(section, /estud|formaç/i);
  }
  assert.equal(result.publication, "blocked");
});

test("leadership negation preserves its scope and opposite preference", async () => {
  const wantsToContinue = await candidate(await calculation("00:00:00", "Não quero deixar de liderar equipe."));
  assert.equal(wantsToContinue.status, "prepared_for_review", wantsToContinue.reason);
  const continuation = interpretiveSections(wantsToContinue).join(" ");
  assert.match(continuation, /(?:continuar|manter|deseja manter|não quer deixar de) liderar|liderança que deseja manter/i);
  assert.doesNotMatch(continuation, /você disse que não quer liderar|você informou que não quer liderar/i);

  const explicitContinuation = await candidate(await calculation("00:00:00", "Quero continuar liderando equipe."));
  assert.equal(explicitContinuation.status, "prepared_for_review", explicitContinuation.reason);
  assert.match(explicitContinuation.reading.claims.find((claim) => claim.id === "public-direction").text, /deseja continuar liderando/i);
  assert.doesNotMatch(explicitContinuation.reading.claims.find((claim) => claim.id === "public-direction").text, /não quer liderar/i);

  const refusesToLead = await candidate(await calculation("00:00:00", "Não quero liderar equipe."));
  assert.equal(refusesToLead.status, "prepared_for_review", refusesToLead.reason);
  assert.match(refusesToLead.reading.claims.find((claim) => claim.id === "public-direction").text, /não quer liderar equipe/i);
  assert.doesNotMatch(refusesToLead.reading.claims.find((claim) => claim.id === "public-direction").text, /continuar liderando|liderança que deseja manter/i);

  const transition = await candidate(await calculation("00:00:00", "Quero mudar de emprego e não quero deixar de liderar equipe."));
  assert.equal(transition.status, "prepared_for_review", transition.reason);
  assert.match(transition.reading.claims.find((claim) => claim.id === "public-direction").text, /mudança de emprego/i);
  assert.match(transition.reading.claims.find((claim) => claim.id === "public-direction").text, /desejo de continuar liderando/i);
  assert.doesNotMatch(transition.reading.claims.find((claim) => claim.id === "public-direction").text, /sem assumir liderança formal/i);
  for (const result of [wantsToContinue, explicitContinuation, refusesToLead, transition]) assert.equal(result.publication, "blocked");
});

test("contradictory leadership statements do not assign either preference", async () => {
  const result = await candidate(await calculation("00:00:00", "Não quero deixar de liderar equipe e não quero liderar equipe."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  const interpretation = interpretiveSections(result).join(" ");
  assert.doesNotMatch(interpretation, /você informou que não quer liderar|você relatou que não quer deixar de liderar/i);
  assert.match(result.reading.limits.join(" "), /tema não foi classificado/i);
  assert.equal(result.publication, "blocked");
});

test("refusing a career or profession change becomes an explicit boundary", async () => {
  for (const [statement, label] of [
    ["Não quero mudar de carreira.", /não quer mudar de carreira/i],
    ["Não quero mudar de profissão.", /não quer mudar de profissão/i],
  ]) {
    const result = await candidate(await calculation("00:00:00", statement));
    assert.equal(result.status, "prepared_for_review", result.reason);
    assert.match(result.reading.claims.find((claim) => claim.id === "public-direction").text, label);
    assert.doesNotMatch(interpretiveSections(result).join(" "), /outra carreira|outra profissão|outro emprego/i);
  }
});

test("city relocation for work changes all reading blocks without inventing employer change", async () => {
  for (const report of ["Quero mudar de cidade por oportunidades de trabalho.", "Penso em mudança de cidade."]) {
    const result = await candidate(await calculation("00:00:00", report));
    assert.equal(result.status, "prepared_for_review", result.reason);
    for (const role of ["public-direction", "work-possibilities", "tension-or-excess"]) {
      const claim = result.reading.claims.find((item) => item.id === role);
      assert.match(claim.text, /destino|mudança de cidade/i, role);
      assert.deepEqual(claim.evidence, ["angle-midheaven", "personal-context"]);
    }
    assert.match(result.reading.synthesis[0].text, /mudança de cidade/i);
    assert.equal(new Set(result.reading.reflections).size, 3);
    assert.match(result.reading.reflections.join(" "), /destino|mudança de cidade/i);
    assert.doesNotMatch(result.reading.limits.join(" "), /tema não foi classificado/i);
    assert.doesNotMatch(interpretiveSections(result).join(" "), /mudança de rotina|mudança de emprego|outro emprego/i);
    assert.equal(result.publication, "blocked");
  }
});

test("a refused city move is not assigned, while a separate employer intention remains", async () => {
  const refused = await candidate(await calculation("00:00:00", "Não quero mudar de cidade."));
  assert.equal(refused.status, "prepared_for_review", refused.reason);
  assert.match(refused.reading.limits.join(" "), /tema não foi classificado/i);
  assert.doesNotMatch(interpretiveSections(refused).join(" "), /você relatou que considera uma mudança de cidade/i);

  const mixed = await candidate(await calculation("00:00:00", "Não quero mudar de cidade, mas quero mudar de emprego."));
  assert.equal(mixed.status, "prepared_for_review", mixed.reason);
  assert.match(mixed.reading.claims.find((claim) => claim.id === "public-direction").text, /mudança de emprego/i);
  assert.doesNotMatch(interpretiveSections(mixed).join(" "), /você relatou que considera uma mudança de cidade/i);
});

test("editorial illustration names the reported practice and bounds its experiment", async () => {
  const result = await candidate(await calculation("00:00:00", "Sou autônoma e faço ilustração editorial."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  const sections = interpretiveSections(result);
  assert.match(sections[0], /ilustração editorial/i);
  assert.match(sections[3], /amostra curta de ilustração editorial/i);
  assert.doesNotMatch(sections.join(" "), /abrir uma agência|assumir equipe|garantia de renda/i);
  assert.equal(result.publication, "blocked");
});

test("all 12 Midheaven signs render context actions without broken infinitive templates", async () => {
  const sampleContexts = [
    "Estou sobrecarregada e quero mudar de emprego.",
    "Quero mudar de carreira.",
    "Quero trabalhar em equipe, mas sem assumir liderança.",
    "Sou autônoma e faço ilustração editorial.",
    "Quero voltar a estudar.",
    "Recebi um convite para liderar equipe.",
    "Quero mudar uma rotina de trabalho.",
    "Não quero liderar equipe.",
    "Não quero mudar de emprego.",
    "Não quero mudar de carreira.",
    "Prefiro trabalhar sem equipe.",
  ];
  const signs = new Set();
  for (let hour = 0; hour < 24; hour += 2) {
    for (const context of sampleContexts) {
      const result = await candidate(await calculation(`${String(hour).padStart(2, "0")}:00:00`, context));
      assert.equal(result.status, "prepared_for_review", `${hour}: ${result.reason}`);
      signs.add(result.facts.facts[0].display.split(" de ")[1]);
      const text = interpretiveSections(result).join(" ");
      assert.doesNotMatch(text, /\b(?:testar|teste curto de|amostra curta de|testar como)\s+(?:iniciar|consolidar|traduzir|identificar|dar forma|corrigir|explicitar|investigar|ligar|organizar|testar)\b/i, `${hour}: ${context}`);
      assert.equal(result.publication, "blocked");
    }
  }
  assert.equal(signs.size, 12);
});

test("all 12 Midheaven signs present the third reflection with an initial capital", async () => {
  const signs = new Set();
  for (let hour = 0; hour < 24; hour++) {
    const result = await candidate(await calculation(`${String(hour).padStart(2, "0")}:00:00`));
    assert.equal(result.status, "prepared_for_review", result.reason);
    signs.add(result.facts.facts[0].display.split(" de ")[1]);
    assert.match(result.reading.reflections[2], /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/u);
  }
  assert.equal(signs.size, 12);
});

test("a short exercise keeps its reported boundary without repeating delivery labels", async () => {
  assert.equal(CAREER_COMPASS_CANDIDATE_VERSION, "atv-career-compass-candidate/1.8.7");
  for (const [context, expectedBoundary] of [
    ["Não quero liderar equipe.", /sem assumir liderança formal/i],
    ["Quero mudar de carreira.", /atividade curta/i],
    ["Quero voltar a estudar.", /exercício curto/i],
  ]) {
    const bySign = new Map();
    for (let hour = 0; hour < 24; hour++) {
      const result = await candidate(await calculation(`${String(hour).padStart(2, "0")}:00:00`, context));
      assert.equal(result.status, "prepared_for_review", `${hour}: ${result.reason}`);
      const sign = result.facts.facts[0].display.split(" de ")[1];
      const synthesis = result.reading.synthesis[0].text;
      bySign.set(sign, synthesis);
      assert.match(synthesis, expectedBoundary, `${sign}: ${context}`);
      assert.doesNotMatch(synthesis, /em uma entrega delimitada/i, `${sign}: ${context}`);
      assert.doesNotMatch(synthesis, /\s{2,}|\s+[;,.?!]/, `${sign}: ${context}`);
      assert.equal(result.publication, "blocked");
    }
    assert.equal(bySign.size, 12);
    assert.match(bySign.get("Virgem"), /corrigir uma falha específica/i);
    assert.match(bySign.get("Câncer"), /identificar uma necessidade/i);
  }
});

test("a transition without named alternatives asks for one feasible test before comparison", async () => {
  const result = await candidate(await calculation("12:00:00", "Quero mudar de carreira."));
  assert.equal(result.status, "prepared_for_review", result.reason);
  const possibilities = result.reading.claims.find((claim) => claim.id === "work-possibilities").text;
  const synthesis = result.reading.synthesis[0].text;
  assert.match(possibilities, /Escolha uma possibilidade ligada à mudança de carreira/i);
  assert.match(possibilities, /Se houver outra opção/i);
  assert.doesNotMatch(possibilities, /Compare duas possibilidades/i);
  assert.doesNotMatch(synthesis, /Em cada opção/i);
  assert.match(synthesis, /compare alternativas somente se elas estiverem disponíveis/i);
  assert.equal(result.reading.reflections.length, 3);
  assert.equal(result.publication, "blocked");
});

test("contrasting circumstances on the same Midheaven produce different feasible actions", async () => {
  const profiles = [
    ["Estou sobrecarregada e quero reduzir a carga.", /carga|demanda/i],
    ["Quero mudar de carreira.", /mudança de carreira/i],
    ["Não quero estudar.", /sem estudar|não quer estudar/i],
  ];
  const results = [];
  for (const [statement, expected] of profiles) {
    const result = await candidate(await calculation("12:00:00", statement));
    assert.equal(result.status, "prepared_for_review", result.reason);
    assert.match(result.reading.synthesis[0].text, expected, statement);
    assert.equal(result.reading.reflections.length, 3);
    assert.equal(new Set(result.reading.reflections).size, 3);
    assert.equal(result.publication, "blocked");
    results.push(result);
  }
  assert.equal(new Set(results.map((result) => result.facts.facts[0].display)).size, 1);
  for (const role of ["public-direction", "work-possibilities", "tension-or-excess"]) {
    assert.equal(new Set(results.map((result) => result.reading.claims.find((claim) => claim.id === role).text)).size, 3, role);
  }
  assert.equal(new Set(results.map((result) => result.reading.synthesis[0].text)).size, 3);
});

test("an unclassified report keeps MC-only hypotheses and asks a concrete sign-specific question", async () => {
  const report = "Quero tirar um ano sabático para cuidar dos meus gatos.";
  const plain = await candidate(await calculation("12:00:00"));
  const unknown = await candidate(await calculation("12:00:00", report));
  assert.equal(plain.status, "prepared_for_review", plain.reason);
  assert.equal(unknown.status, "prepared_for_review", unknown.reason);
  assert.equal(unknown.reading.claims.find((claim) => claim.id === "reported-context").text, report);
  for (const role of ["public-direction", "work-possibilities", "tension-or-excess"]) {
    const withoutContext = plain.reading.claims.find((claim) => claim.id === role);
    const withUnknownContext = unknown.reading.claims.find((claim) => claim.id === role);
    assert.equal(withUnknownContext.text, withoutContext.text);
    assert.deepEqual(withUnknownContext.evidence, ["angle-midheaven"]);
  }
  assert.deepEqual(unknown.reading.reflections.slice(0, 2), plain.reading.reflections.slice(0, 2));
  assert.match(unknown.reading.reflections[2], /Na situação que você relatou, existe uma atividade concreta para/i);
  assert.doesNotMatch(unknown.reading.reflections[2], /Qual parte da situação/i);
  assert.match(unknown.reading.limits.join(" "), /tema não foi classificado/i);
  assert.doesNotMatch(interpretiveSections(unknown).join(" "), /mudança de emprego|mudança de carreira/i);
  assert.equal(unknown.publication, "blocked");
});

test("authored readings avoid repeated words and conditions in reported situations", async () => {
  const cases = [
    ["Não quero liderar equipe.", /pode ser testado ao testar|sem assumir liderança formal, sem transformar/i],
    ["Não quero voltar a estudar.", /ocasião concreta para identificar uma necessidade concreta|ocasião concreta para testar uma ideia em uma tarefa concreta/i],
    ["Quero voltar a estudar.", /forma de estudo permitiria dar forma/i],
    ["Trabalho em equipe.", /corrigir uma falha em uma etapa delimitada|critério para uma decisão compartilhada|alternativa pequena a uma regra/i],
    ["Prefiro trabalhar sem equipe.", /critério de retorno definidos para explicitar o critério/i],
    ["Estou sobrecarregado.", /prazo e recurso permitiriam organizar uma etapa com prazo/i],
    ["Quero continuar liderando equipe.", /sem ampliar sua obrigação e sem ampliar suas atribuições/i],
  ];
  for (const [context, repeatedPhrase] of cases) {
    const signs = new Set();
    for (let hour = 0; hour < 24; hour++) {
      const result = await candidate(await calculation(`${String(hour).padStart(2, "0")}:00:00`, context));
      assert.equal(result.status, "prepared_for_review", `${hour}: ${result.reason}`);
      signs.add(result.facts.facts[0].display.split(" de ")[1]);
      assert.doesNotMatch(interpretiveSections(result).join(" "), repeatedPhrase, `${hour}: ${context}`);
      assert.equal(result.publication, "blocked");
    }
    assert.equal(signs.size, 12, context);
  }
});

test("refusing to return to study changes the delivered reading for every sign", async () => {
  const signs = new Set();
  for (let hour = 0; hour < 24; hour++) {
    const time = `${String(hour).padStart(2, "0")}:00:00`;
    const refused = await candidate(await calculation(time, "Não quero voltar a estudar."));
    const baseline = await candidate(await calculation(time));
    const affirmative = await candidate(await calculation(time, "Quero voltar a estudar."));
    assert.equal(refused.status, "prepared_for_review", `${time}: ${refused.reason}`);
    const sign = refused.facts.facts[0].display.split(" de ")[1];
    signs.add(sign);
    const refusedSections = interpretiveSections(refused);
    const baselineSections = interpretiveSections(baseline);
    const affirmativeSections = interpretiveSections(affirmative);
    for (let section = 0; section < 4; section++) {
      assert.notEqual(refusedSections[section], baselineSections[section], `${sign}: section ${section}`);
      assert.notEqual(refusedSections[section], affirmativeSections[section], `${sign}: section ${section}`);
    }
    assert.match(refusedSections[0], /não quer voltar a estudar/i, sign);
    assert.match(refusedSections[3], /sem voltar a estudar/i, sign);
    assert.doesNotMatch(refusedSections[3], /experimente experimentar/i, sign);
    assert.match(refusedSections.slice(0, 4).join(" "), /atividade breve|tentativa curta/i, sign);
    assert.doesNotMatch(refusedSections.join(" "), /ambiente com estudo|permite estudar|curso maior|estudo desejado|formas de aprendê-la/i, sign);
    assert.doesNotMatch(refused.reading.limits.join(" "), /tema não foi classificado/i, sign);
    for (const claim of refused.reading.claims.filter((claim) => claim.kind === "hypothesis"))
      assert.deepEqual(claim.evidence, ["angle-midheaven", "personal-context"], sign);
    assert.equal(refused.publication, "blocked");
  }
  assert.equal(signs.size, 12);
});

test("a study refusal retains its boundary beside another stated goal and leaves contradictions unresolved", async () => {
  const transitions = [];
  for (const statement of [
    "Não quero voltar a estudar e quero mudar de emprego.",
    "Não quero voltar a estudar, mas quero mudar de emprego.",
    "Quero mudar de emprego, mas não quero voltar a estudar.",
  ]) {
    const transition = await candidate(await calculation("14:00:00", statement));
    assert.equal(transition.status, "prepared_for_review", `${statement}: ${transition.reason}`);
    assert.match(interpretiveSections(transition)[0], /mudança de emprego/i, statement);
    assert.match(interpretiveSections(transition)[0], /sem voltar a estudar/i, statement);
    assert.doesNotMatch(interpretiveSections(transition).join(" "), /curso maior|formas de aprendê-la|estudo desejado/i, statement);
    transitions.push(transition);
  }

  const independent = await candidate(await calculation("14:00:00", "Prefiro trabalhar sem equipe e não quero voltar a estudar."));
  assert.equal(independent.status, "prepared_for_review", independent.reason);
  assert.match(interpretiveSections(independent)[0], /não quer voltar a estudar/i);
  assert.match(interpretiveSections(independent)[0], /entrega individual/i);

  const direct = await candidate(await calculation("14:00:00", "Não quero estudar."));
  assert.equal(direct.status, "prepared_for_review", direct.reason);
  assert.match(interpretiveSections(direct)[0], /não quer estudar/i);
  assert.match(interpretiveSections(direct)[3], /sem estudar/i);

  const contradictory = await candidate(await calculation("14:00:00", "Não quero voltar a estudar, mas quero estudar."));
  assert.equal(contradictory.status, "prepared_for_review", contradictory.reason);
  assert.match(contradictory.reading.limits.join(" "), /tema não foi classificado/i);
  assert.doesNotMatch(interpretiveSections(contradictory)[0], /você informou que não quer estudar|ao considerar voltar a estudar/i);
  for (const result of [...transitions, independent, direct, contradictory]) assert.equal(result.publication, "blocked");
});

test("continuing leadership keeps support and constraints fluent across every sign", async () => {
  const signs = new Set();
  for (let hour = 0; hour < 24; hour++) {
    const result = await candidate(await calculation(`${String(hour).padStart(2, "0")}:00:00`, "Não quero deixar de liderar equipe."));
    assert.equal(result.status, "prepared_for_review", `${hour}: ${result.reason}`);
    const sign = result.facts.facts[0].display.split(" de ")[1];
    signs.add(sign);
    const synthesis = result.reading.synthesis[0].text;
    const lastQuestion = result.reading.reflections[2];
    assert.match(synthesis, /Considere o apoio disponível e decida/i, sign);
    assert.doesNotMatch(synthesis, /com os recursos disponíveis com o apoio disponível|sem ampliar sua obrigação com o apoio disponível/i, sign);
    assert.doesNotMatch(lastQuestion, /sem revelar o que deve ficar reservado sem|sem ampliar sua obrigação sem/i, sign);
    assert.equal(result.publication, "blocked");
  }
  assert.equal(signs.size, 12);
});

test("Scorpio joins a privacy boundary to reported limits in fluent Portuguese", async () => {
  for (const [context, expected] of [
    ["Estou sobrecarregada.", /sem expor dados privados e sem ampliar a carga/i],
    ["Quero trabalhar em equipe, mas sem assumir liderança.", /sem revelar o que deve ficar reservado e sem assumir gestão de pessoas/i],
    ["Recebi um convite para liderar uma equipe, mas não quero liderar.", /sem expor dados privados e sem liderança formal/i],
    ["Quero mudar uma rotina de trabalho.", /sem expor dados privados e sem refazer todo o trabalho/i],
    ["Não quero liderar equipe.", /sem expor dados privados e sem assumir gestão de pessoas/i],
    ["Não quero mudar de emprego.", /sem revelar o que deve ficar reservado e sem mudar de emprego/i],
    ["Não quero mudar de profissão.", /sem expor dados privados e sem mudar de profissão/i],
  ]) {
    const result = await candidate(await calculation("09:00:00", context));
    assert.equal(result.status, "prepared_for_review", `${context}: ${result.reason}`);
    assert.match(result.facts.facts[0].display, /Escorpião/);
    const text = interpretiveSections(result).join(" ");
    assert.match(text, expected, context);
    assert.doesNotMatch(text, /sem expor dados privados sem|sem revelar o que deve ficar reservado sem/i, context);
    assert.equal(result.publication, "blocked");
  }
});

test("foreign facts, altered projection and invalid identity cannot produce a candidate", async () => {
  const snapshot = await calculation();
  const prepared = prepareProductFacts("career-compass", snapshot);
  assert.equal(prepared.status, "prepared");
  assert.equal(
    composeCareerCompassCandidate({
      ...prepared.facts,
      facts: [
        ...prepared.facts.facts,
        {
          id: "position-sun",
          kind: "calculated",
          display: "Sol: inventado",
          source: "synthetic",
        },
      ],
    }),
    null,
  );
  const altered = structuredClone(snapshot);
  altered.facts[0].display = "Meio do Céu: 00.000000° de Peixes";
  const invalidProjection = await candidate(altered);
  assert.equal(invalidProjection.status, "blocked");
  assert.equal(invalidProjection.publication, "blocked");
  const invalidRun = await prepareCareerCompassCandidate({
    runId: "invalid",
    revision: 1,
    tier: "free",
    calculation: snapshot,
  });
  assert.equal(invalidRun.status, "blocked");
  assert.equal(invalidRun.publication, "blocked");
  const invalidInput = await prepareCareerCompassCandidate(null);
  assert.equal(invalidInput.status, "blocked");
  const revised = await candidate(snapshot, 2);
  const original = await candidate(snapshot, 1);
  assert.equal(revised.status, "prepared_for_review");
  assert.notEqual(
    revised.assessment.basisDigest,
    original.assessment.basisDigest,
  );
  assert.equal(
    revised.assessment.outputDigest,
    original.assessment.outputDigest,
  );
  assert.notEqual(revised.candidateDigest, original.candidateDigest);
});

test("every Midheaven sign reached over a synthetic day produces a reviewable candidate", async () => {
  const seen = new Map();
  for (let hour = 0; hour < 24; hour++) {
    const result = await candidate(
      await calculation(`${String(hour).padStart(2, "0")}:00:00`),
    );
    assert.equal(
      result.status,
      "prepared_for_review",
      `${hour}: ${result.reason}`,
    );
    seen.set(result.facts.facts[0].display.split(" de ")[1], result.reading);
  }
  assert.equal(seen.size, 12);
  const authoredText = [...seen.values()].map((reading) => [
    ...reading.claims
      .filter((claim) => claim.kind === "hypothesis")
      .map((claim) => claim.text),
    reading.synthesis[0].text,
    ...reading.reflections,
  ]);
  for (let position = 0; position < 7; position++)
    assert.equal(
      new Set(authoredText.map((parts) => parts[position])).size,
      12,
      `editorial part ${position} must vary by calculated MC sign`,
    );
  const examples = [
    ["Áries", /iniciar|primeira decisão/i, /autonomia/i, /escuta/i],
    ["Câncer", /confiança/i, /responsabilidade/i, /limites/i],
    ["Capricórnio", /continuidade/i, /recursos/i, /desempenho/i],
  ];
  for (const [sign, direction, workMode, tension] of examples) {
    const claims = seen
      .get(sign)
      .claims.filter((claim) => claim.kind === "hypothesis");
    assert.match(claims[0].text, direction, sign);
    assert.match(claims[1].text, workMode, sign);
    assert.match(claims[2].text, tension, sign);
  }
  for (const reading of seen.values()) {
    const interpretation = [
      ...reading.claims
        .filter((claim) => claim.kind === "hypothesis")
        .map((claim) => claim.text),
      ...reading.synthesis.map((part) => part.text),
      ...reading.reflections,
    ].join(" ");
    assert.doesNotMatch(
      interpretation,
      /\b(?:Ascendente|regente|aspectos|Casa 10|Sol|Lua)\b/i,
    );
  }
});
