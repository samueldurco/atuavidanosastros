import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SIGNS,
  BODIES,
  PAIRS,
  ASPECTS,
  MOVEMENTS,
  APPLICATIONS,
  MOTION_CONSEQUENCES,
} from "./public-horoscope-corpus.mjs";
import {
  composeHoroscope,
  corpusDigest,
  contentDigest,
  assertRuntimeComposition,
} from "./public-horoscope-compose.mjs";
import { scheduledPeriods } from "../prepare-dated-horoscope.mjs";

// Deliberately synthetic composition fixtures. These are not astronomical
// evidence and are never submitted to signing, review or publication.
const at = "2026-10-20T00:00:00.000Z";
const bodies = Object.keys(BODIES);
const angles = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};
function fixture(factors, positions = {}) {
  const row = [Date.parse(at), ...bodies.map((body) => positions[body] ?? 10)];
  return {
    fixtureOnly: true,
    period: "daily",
    startDate: "2026-10-20",
    endDateExclusive: "2026-10-21",
    bodies,
    rows: [
      row,
      [row[0] + 21600000, ...row.slice(1)],
      [row[0] + 43200000, ...row.slice(1)],
      [row[0] + 64800000, ...row.slice(1)],
    ],
    candidates: factors,
    selectedIds: factors.map((f) => f.id),
  };
}
function factor(kind, names, extra = {}) {
  return {
    id: `${kind}:${names.join(":")}:${extra.aspect?.kind ?? extra.retrograde ?? ""}`,
    kind,
    bodies: names,
    category: "fast",
    score: 50,
    representativeAt: at,
    firstObservedAt: at,
    lastObservedAt: "2026-10-20T06:00:00.000Z",
    ...extra,
  };
}
function signChange(body, fromSign = 11, toSign = 0) {
  return factor("sign-change", [body], { fromSign, toSign });
}
function assertReadable(reading) {
  assert.ok(reading.paragraphs.length >= 3);
  assert.equal(new Set(reading.paragraphs).size, reading.paragraphs.length);
  for (const paragraph of reading.paragraphs) {
    assert.ok(paragraph.split(/\s+/).length >= 40);
    assert.doesNotMatch(
      paragraph,
      /undefined|NaN|\[object Object\]|\{\w+\}|O encontro sua|A sextil|A trígono|\bde a |à partilha e os|às parcerias e os|menos espaço para o espaço|pode conservar decidir|compreender, nomear e trocar informações e escolher|com tempo e responsabilidade definidos oferece|com limites compreensíveis para o grupo oferece|com contorno, que ajude a voltar ou a concluir precisa/,
    );
  }
}
const evidence = {
  schema: "atv-horoscope-composition-domain-checks-v1",
  fixtureOnly: true,
  purpose:
    "Syntax, binding and semantic differentiation; not factual or editorial approval",
  corpusDigest: corpusDigest(),
  aspectCases: 0,
  movementCases: 0,
  signChangeCases: 0,
  relationalSynthesisCases: 0,
  samples: [],
};

test("all 45 reviewed body pairs × 5 aspect modes × 12 solar perspectives remain bound and distinct", () => {
  assert.equal(Object.keys(PAIRS).length, 45);
  const samples = new Set();
  for (const [pair, meaning] of Object.entries(PAIRS)) {
    const [a, b] = pair.split(":");
    const acrossAspects = [];
    for (const kind of Object.keys(ASPECTS)) {
      const f = factor("aspect", [a, b], { aspect: { kind } });
      const facts = fixture([f, signChange(a)], {
        [a]: 10,
        [b]: (10 + angles[kind]) % 360,
      });
      const acrossSigns = [];
      for (const [sign] of SIGNS) {
        const reading = composeHoroscope(facts, sign);
        assertReadable(reading);
        const paragraph = reading.paragraphs[reading.factorIds.indexOf(f.id)];
        assert.ok(paragraph.includes(meaning));
        assert.ok(paragraph.includes(ASPECTS[kind].name));
        assert.ok(
          paragraph
            .toLowerCase()
            .includes(kind === "square" ? BODIES[a].shadow : BODIES[a].need),
        );
        assert.ok(paragraph.toLowerCase().includes(BODIES[b].need));
        acrossSigns.push(paragraph);
        evidence.aspectCases++;
        if (!samples.has(`${kind}:${sign}`) && pair === "sun:moon") {
          evidence.samples.push({
            kind,
            pair,
            sign,
            paragraph,
          });
          samples.add(`${kind}:${sign}`);
        }
      }
      assert.equal(new Set(acrossSigns).size, 12);
      acrossAspects.push(acrossSigns[0]);
    }
    assert.equal(new Set(acrossAspects).size, 5);
  }
  assert.equal(evidence.aspectCases, 2700);
});

test("all supported motion bodies × directions × sectors use body-specific applications", () => {
  const byBody = new Set();
  for (const body of Object.keys(MOVEMENTS)) {
    assert.ok(APPLICATIONS[body]);
    for (const retrograde of [true, false]) {
      const f = factor("motion-change", [body], { retrograde, score: 60 });
      for (const [sign] of SIGNS) {
        const reading = composeHoroscope(fixture([f, signChange(body)]), sign);
        assertReadable(reading);
        assert.ok(
          reading.paragraphs[0].includes(
            MOVEMENTS[body][retrograde ? "retrograde" : "direct"],
          ),
        );
        if (sign === "aries" && retrograde) byBody.add(reading.paragraphs[0]);
        evidence.movementCases++;
        if (sign === "aries")
          evidence.samples.push({
            body,
            retrograde,
            sign,
            paragraph: reading.paragraphs[0],
          });
      }
    }
  }
  assert.equal(byBody.size, 8);
  assert.equal(evidence.movementCases, 192);
});

test("all ten bodies and all twelve sectors handle forward and backward sign changes", () => {
  for (const body of bodies)
    for (const direction of [-1, 1])
      for (const [sign] of SIGNS) {
        const companion = bodies.find((b) => b !== body);
        const f = signChange(body, direction === 1 ? 11 : 1, 0);
        const reading = composeHoroscope(
          fixture([f, signChange(companion)]),
          sign,
        );
        assertReadable(reading);
        assert.ok(
          reading.paragraphs[reading.factorIds.indexOf(f.id)].includes(
            BODIES[body].need,
          ),
        );
        evidence.signChangeCases++;
      }
  assert.equal(evidence.signChangeCases, 240);
});

test("all 28 motion pairs × 4 directions × 12 perspectives have a relational consequence and depend on the third factor", () => {
  assert.equal(Object.keys(MOTION_CONSEQUENCES).length, 28);
  const conclusions = new Set();
  for (const [pair, consequence] of Object.entries(MOTION_CONSEQUENCES)) {
    const [body, companion] = pair.split(":");
    assert.ok(MOVEMENTS[body] && MOVEMENTS[companion]);
    conclusions.add(consequence);
    for (const directionA of [true, false])
      for (const directionB of [true, false]) {
        const one = factor("motion-change", [body], {
          retrograde: directionA,
          score: 80,
        });
        const two = factor("motion-change", [companion], {
          retrograde: directionB,
          score: 70,
        });
        const thirdBody = bodies.find((b) => b !== body && b !== companion);
        const facts = fixture([one, two, signChange(thirdBody)]);
        for (const [sign] of SIGNS) {
          const reading = composeHoroscope(facts, sign);
          assertReadable(reading);
          assert.ok(reading.paragraphs.at(-1).includes(consequence));
          assert.ok(reading.paragraphs.at(-1).includes("registrada em"));
          const changed = structuredClone(facts);
          changed.candidates[2].fromSign = 1;
          assert.notEqual(
            composeHoroscope(changed, sign).paragraphs.at(-1),
            reading.paragraphs.at(-1),
          );
          evidence.relationalSynthesisCases++;
          if (sign === "aries" && directionA && !directionB)
            evidence.samples.push({
              kind: "motion-pair-synthesis",
              pair,
              sign,
              paragraph: reading.paragraphs.at(-1),
            });
        }
      }
  }
  assert.equal(conclusions.size, 28);
  assert.equal(evidence.relationalSynthesisCases, 1344);
});

test("same-day sample boundaries retain hours and metadata does not repeat one area as two", () => {
  const facts = fixture([
    factor("motion-change", ["mercury"], { retrograde: true, score: 80 }),
    factor("motion-change", ["venus"], { retrograde: true, score: 70 }),
    signChange("venus"),
  ]);
  const reading = composeHoroscope(facts, "aries");
  assert.match(
    reading.paragraphs[0],
    /20\/10\/2026 às 00:00 e 20\/10\/2026 às 06:00 \(UTC\)/,
  );
  assert.match(reading.paragraphs[0], /não determina o instante exato/);
  assert.doesNotMatch(reading.description, /e suas relações com/);
  assert.equal(
    reading.description.match(/sua maneira de se apresentar e começar/g)
      ?.length,
    1,
  );
});

test("unsupported factors fail closed instead of using generic copy", () => {
  const square = factor("aspect", ["sun", "moon"], {
    aspect: { kind: "square" },
  });
  const base = fixture([square, signChange("sun")], { moon: 100 });
  for (const mutate of [
    (f) => (f.candidates[0].bodies[0] = "chiron"),
    (f) => (f.candidates[0].aspect.kind = "quincunx"),
    (f) => (f.candidates[0].kind = "invented"),
    (f) => (f.candidates[1].kind = "ingress-without-contract"),
    (f) => f.selectedIds.push("missing"),
    (f) => f.candidates.forEach((c) => (c.category = "background")),
  ]) {
    const changed = structuredClone(base);
    mutate(changed);
    assert.throws(() => composeHoroscope(changed, "aries"));
  }
  for (const body of ["sun", "moon"]) {
    assert.throws(() =>
      composeHoroscope(
        fixture([
          factor("motion-change", [body], { retrograde: true, score: 80 }),
          signChange(body),
        ]),
        "aries",
      ),
    );
  }
});

test("UTC scheduling handles Mondays, month/year boundaries, leap days and bounded years", () => {
  assert.deepEqual(scheduledPeriods("bootstrap", "2026-10-20"), {
    startDate: "2026-10-20",
    periods: ["daily", "weekly", "monthly"],
  });
  assert.deepEqual(scheduledPeriods("next", "2026-10-25"), {
    startDate: "2026-10-26",
    periods: ["daily", "weekly"],
  });
  assert.deepEqual(scheduledPeriods("next", "2026-10-31"), {
    startDate: "2026-11-01",
    periods: ["daily", "monthly"],
  });
  assert.deepEqual(scheduledPeriods("next", "2026-05-31"), {
    startDate: "2026-06-01",
    periods: ["daily", "weekly", "monthly"],
  });
  assert.equal(scheduledPeriods("next", "2026-12-31").startDate, "2027-01-01");
  assert.equal(scheduledPeriods("next", "2028-02-28").startDate, "2028-02-29");
  for (const date of [
    "2026-02-29",
    "2026-13-01",
    "invalid",
    "1899-12-31",
    "2100-01-01",
    "2099-12-31",
  ]) {
    assert.throws(() => scheduledPeriods("next", date));
  }
  assert.throws(() => scheduledPeriods("everywhere", "2026-10-20"));
});

test(
  "real prepared documents replay exactly and reject text, factor, coverage and corpus tampering",
  () => {
    const dir = process.env.ATV_HOROSCOPE_REPLAY_DIR
      ? path.resolve(process.env.ATV_HOROSCOPE_REPLAY_DIR)
      : fileURLToPath(
          new URL(
            "../../docs/editorial/horoscope-2026-10-20/recurring-v3-monthly/",
            import.meta.url,
          ),
        );
    const scope = JSON.parse(
      fs.readFileSync(path.join(dir, "scope.json"), "utf8"),
    );
    const facts = JSON.parse(
      fs.readFileSync(path.join(dir, "facts.json"), "utf8"),
    );
    const id = Object.keys(scope.documentDigests)[0];
    const document = JSON.parse(
      fs.readFileSync(path.join(dir, `${id}.document.json`), "utf8"),
    );
    const claims = JSON.parse(
      fs.readFileSync(path.join(dir, `${id}.claims.json`), "utf8"),
    );
    assert.equal(
      assertRuntimeComposition({ document, claims, facts, scope }).composition,
      "PASS",
    );
    for (const change of [
      (p) => (p.document.sections[0].paragraphs[0] += " Extra."),
      (p) => (p.claims.claims[0].factorIds[0] = "not-observed"),
      (p) => (p.scope.startDate = "2020-01-01"),
      (p) => (p.scope.composition.corpusDigest = "0".repeat(64)),
      (p) => (p.facts.rows[0][1] += 1),
      (p) =>
        delete p.scope.documentDigests[Object.keys(p.scope.documentDigests)[1]],
    ]) {
      const packet = structuredClone({ document, claims, facts, scope });
      change(packet);
      assert.throws(() => assertRuntimeComposition(packet));
    }
  },
);

test("write bounded composition-domain evidence when explicitly requested", () => {
  if (process.env.ATV_HOROSCOPE_DOMAIN_OUTPUT) {
    assert.equal(evidence.aspectCases, 2700);
    assert.equal(evidence.movementCases, 192);
    assert.equal(evidence.signChangeCases, 240);
    assert.equal(evidence.relationalSynthesisCases, 1344);
    evidence.result = "PASS";
    evidence.sampleDigest = contentDigest(evidence.samples);
    fs.writeFileSync(
      process.env.ATV_HOROSCOPE_DOMAIN_OUTPUT,
      JSON.stringify(evidence, null, 2) + "\n",
    );
  }
});
