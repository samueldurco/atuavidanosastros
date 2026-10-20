/**
 * Independent factual/integrity review support. It is not an editorial approver
 * or a signer, and agreement with the same engine is not precision certification.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const root = process.cwd();
const directories = process.argv.slice(2);
if (directories.length !== 3) throw Error("Pass the three frozen day/week/month package directories");
const canonical = v => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}` : JSON.stringify(v);
const sha = v => createHash("sha256").update(v).digest("hex");
const digest = v => sha(canonical(v));
const read = file => JSON.parse(fs.readFileSync(path.resolve(root, file), "utf8"));
const moduleAt = relative => import(pathToFileURL(path.resolve(root, relative)).href);
const { calculationAdapter } = await moduleAt("scripts/prepare-dated-horoscope.mjs");
const { assertPublicHoroscopeSnapshot, calculatePublicHoroscope } = await calculationAdapter(root);
const { assertRuntimeComposition, compositionFactors, composeHoroscope, corpusDigest } = await moduleAt("scripts/lib/public-horoscope-compose.mjs");
const { CORPUS, SIGNS } = await moduleAt("scripts/lib/public-horoscope-corpus.mjs");
const errors = [], batches = [], rejections = [];
const check = (ok, label) => { if (!ok) errors.push(label); };
const reject = (label, fn) => { let rejected = false; try { fn(); } catch { rejected = true; } rejections.push({ label, rejected }); check(rejected, label); };
const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
for (const directory of directories) {
  const scope = read(`${directory}/scope.json`), facts = read(`${directory}/facts.json`);
  assertPublicHoroscopeSnapshot(facts);
  const reproduced = await calculatePublicHoroscope(facts.startDate, facts.period, new AbortController().signal);
  for (const field of ["rows", "candidates", "selectedIds"]) check(canonical(reproduced[field]) === canonical(facts[field]), `${directory}: recalculated ${field}`);
  check(digest(facts) === scope.factsDigest, `${directory}: facts digest`);
  check(digest(CORPUS) === corpusDigest() && scope.composition.corpusDigest === corpusDigest(), `${directory}: corpus digest`);
  for (const [file, hash] of Object.entries(scope.algorithmManifest)) check(sha(fs.readFileSync(path.resolve(root, file))) === hash, `${directory}: algorithm ${file}`);
  check(digest(scope.algorithmManifest) === scope.composition.algorithmDigest, `${directory}: algorithm manifest digest`);
  for (const entry of scope.evidence) check(sha(fs.readFileSync(path.resolve(root, directory, entry.path))) === entry.sha256, `${directory}: evidence ${entry.path}`);
  const paragraphs = new Set(), documents = [];
  for (const [sign] of SIGNS) {
    const id = `horoscopo-${sign}-${facts.period}-${facts.startDate}`;
    const document = read(`${directory}/${id}.document.json`);
    const claims = read(`${directory}/${id}.claims.json`);
    const runtime = read(`${directory}/${id}.runtime.json`);
    check(digest(document) === scope.documentDigests[id], `${id}: document digest`);
    check(digest(claims) === scope.claimsDigests[id], `${id}: claims digest`);
    check(claims.authoringAgent !== "/root/temporal_final", `${id}: distinct identity`);
    assertRuntimeComposition({ document, claims, facts, scope });
    check(runtime.documentDigest === digest(document) && runtime.claimsDigest === digest(claims) && runtime.scopeDigest === digest(scope), `${id}: runtime binding`);
    for (const claim of claims.claims) {
      check(document.sections[claim.section].paragraphs[claim.paragraph] === claim.interpretation, `${id}: interpretation mapped`);
      for (const position of claim.positionObservations) {
        const row = facts.rows.find(r => r[0] === position.at);
        for (const [body, sector] of Object.entries(position.sectors)) check(sector === 1 + ((Math.floor(row[1 + facts.bodies.indexOf(body)] / 30) - SIGNS.findIndex(([s]) => s === sign) + 12) % 12), `${id}: sector ${body}`);
      }
      for (const factor of claim.sampledFactors) {
        check(claim.factorIds.includes(factor.id) && facts.selectedIds.includes(factor.id), `${id}: selected ${factor.id}`);
        check(canonical(factor) === canonical(facts.candidates.find(f => f.id === factor.id)), `${id}: factor bytes ${factor.id}`);
        if (factor.kind === "aspect") {
          const observations = facts.rows.filter(row => {
            const [a, b] = factor.bodies.map(body => row[1 + facts.bodies.indexOf(body)]);
            return Math.abs(Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) - angles[factor.aspect.kind]) <= 2;
          }).map(row => new Date(row[0]).toISOString());
          check(canonical(observations) === canonical(claim.observedAtByFactor[factor.id]), `${id}: observed times ${factor.id}`);
          check(observations[0] === factor.firstObservedAt && observations.at(-1) === factor.lastObservedAt, `${id}: observed bounds ${factor.id}`);
        }
      }
    }
    for (const p of document.sections[0].paragraphs) { check(!paragraphs.has(p), `${id}: duplicate paragraph`); paragraphs.add(p); }
    documents.push({ id, revision: document.revision, documentDigest: digest(document), claimsDigest: digest(claims), words: document.sections[0].paragraphs.join(" ").split(/\s+/).length, claimCount: claims.claims.length });
    if (sign === "aries") {
      const base = { document, claims, facts, scope };
      for (const [label, mutate] of [
        ["rewritten conclusion", x => { x.document.sections[0].paragraphs[0] += " Uma conclusão adulterada."; }],
        ["invented sector", x => { x.claims.claims[0].positionObservations[0].sectors[Object.keys(x.claims.claims[0].positionObservations[0].sectors)[0]] = 13; }],
        ["falsified coverage", x => { x.scope.endDateExclusive = "2099-01-01"; }],
        ["human review invented", x => { x.document.automationDisclosure.humanReview = true; }],
        ["scope missing sign", x => { delete x.scope.documentDigests[id]; }],
      ]) reject(`${facts.period}: ${label}`, () => { const changed = structuredClone(base); mutate(changed); assertRuntimeComposition(changed); });
      reject(`${facts.period}: insufficient factors`, () => compositionFactors({ ...facts, selectedIds: facts.selectedIds.slice(0, 1) }));
      reject(`${facts.period}: unsupported sign`, () => composeHoroscope(facts, "invented"));
      reject(`${facts.period}: unsupported body`, () => {
        const changed = structuredClone(facts);
        for (const f of changed.candidates) if (changed.selectedIds.includes(f.id)) f.bodies[0] = "invented";
        composeHoroscope(changed, "aries");
      });
      reject(`${facts.period}: unsupported relation`, () => {
        const changed = structuredClone(facts);
        for (const f of changed.candidates) if (changed.selectedIds.includes(f.id)) {
          f.kind = "aspect"; f.bodies = ["sun", "moon"]; f.aspect = { kind: "invented" };
        }
        composeHoroscope(changed, "aries");
      });
      reject(`${facts.period}: unsupported movement`, () => {
        const changed = structuredClone(facts);
        for (const f of changed.candidates) if (changed.selectedIds.includes(f.id)) f.kind = "invented";
        composeHoroscope(changed, "aries");
      });
      reject(`${facts.period}: only background factors`, () => {
        const changed = structuredClone(facts);
        for (const f of changed.candidates) if (changed.selectedIds.includes(f.id)) f.category = "background";
        compositionFactors(changed);
      });
    }
  }
  batches.push({ directory, period: facts.period, startDate: facts.startDate, endDateExclusive: facts.endDateExclusive, scopeDigest: digest(scope), factsDigest: digest(facts), composition: scope.composition, rowsReproduced: facts.rows.length, longitudesReproduced: facts.rows.length * facts.bodies.length, selectedFactors: compositionFactors(facts), distinctInterpretiveParagraphs: paragraphs.size, documents });
}
check(new Set(batches.map(b => b.period)).size === 3, "all three scales");
const result = { schemaVersion: "atv-independent-horoscope-corpus-checks-v1", reviewedAt: new Date().toISOString(), reviewerAgent: "/root/temporal_final", batches, rejections, errors, decision: errors.length ? "FAIL" : "PASS", limits: ["Factual consistency uses the same authorized Caelus adapter; this is not independent astronomical precision certification.", "Digest and replay checks do not establish narrative value. Editorial judgment is documented separately.", "No external signature, admission, hosted check, visual/a11y approval or release is performed."] };
const outputPath = process.env.ATV_HOROSCOPE_INDEPENDENT_OUTPUT ?? "docs/editorial/horoscope-2026-10-20/corpus-independent-checks.json";
fs.writeFileSync(path.resolve(root, outputPath), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ decision: result.decision, errors, batches: batches.map(b => ({ period: b.period, rows: b.rowsReproduced, documents: b.documents.length })), rejections: rejections.length }));
