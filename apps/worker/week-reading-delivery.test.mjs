import test from "node:test";
import assert from "node:assert/strict";
import { createWeekReadingCalculators } from "./src/week-reading-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import { prepareProductDelivery, PRODUCT_DELIVERY_VERSION } from "./src/product-delivery.ts";
import { weekReadingEditorialTestFixture } from "../../scripts/helpers/week-reading-editorial-test-fixture.mjs";

async function draft(withContext = true) {
  const runId = "00000000-0000-4000-8000-000000000183";
  const calculation = await createWeekReadingCalculators()["week-reading"]({
    version: "atv-workflow/1.0.0", productId: "week-reading",
    birth: {localDateTime:"2000-01-01T12:00:00", utcInstant:"2000-01-01T12:00:00Z", timezone:"UTC", latitude:0, longitude:0, locationSource:"synthetic-delivery-test"},
    targetDate: "2026-09-29",
    consent: {storage:true,partner:false,continuity:false,policyVersion:"atv-input-consent/1"},
    ...(withContext ? {context:"  Relato sintético consentido.\n"} : {}),
  }, {runId, signal:new AbortController().signal});
  const prepared = prepareProductFacts("week-reading", calculation);
  assert.equal(prepared.status,"prepared");
  return {runId,revision:4,productId:"week-reading",tier:"free",calculation,output:weekReadingEditorialTestFixture(prepared.facts)};
}
for (const withContext of [true,false]) test(`Week preserves seven samples, eight hypotheses and synthesis (${withContext})`, async () => {
  const input = await draft(withContext), original = structuredClone(input);
  const result = await prepareProductDelivery(input);
  assert.equal(result.status,"prepared_for_review",result.reason);
  assert.equal(result.publication,"blocked");
  assert.deepEqual(input,original);
  const {content} = result;
  assert.equal(content.version,PRODUCT_DELIVERY_VERSION);
  assert.equal(content.sections.length,withContext ? 19 : 18);
  const recorded = content.sections.filter(s=>s.title.endsWith("— Fatos registrados"));
  assert.deepEqual(recorded.flatMap(s=>s.evidence),input.calculation.facts.map(f=>f.id));
  for (const row of recorded) assert.equal(row.text,input.calculation.facts.filter(f=>row.evidence.includes(f.id)).map(f=>f.display).join("\n\n"));
  for (let day=1;day<=7;day++) {
    const row = recorded.find(s=>s.title===`Amostra ${day} (12h UTC) — Fatos registrados`);
    assert.equal(row.evidence.length,11);
    assert.ok(row.evidence.every(id=>id.startsWith(`day-${day}-`)));
  }
  const hypotheses=content.sections.filter(s=>s.title.includes("— Hipótese"));
  assert.equal(hypotheses.length,8);
  input.output.claims.forEach((claim,i)=>{assert.equal(hypotheses[i].text,claim.text);assert.deepEqual(hypotheses[i].evidence,claim.evidence);});
  const synthesis = content.sections.at(-1);
  assert.equal(synthesis.title,"Síntese da Semana (1) e três perguntas práticas");
  assert.equal(synthesis.evidence.length,withContext ? 89 : 88);
  input.output.reflections.forEach(q=>assert.ok(synthesis.text.includes(q)));
  input.output.limits.forEach(l=>assert.ok(content.limits.includes(l)));
  assert.equal(content.limits.includes("Nenhum contexto adicional foi informado para esta semana."),!withContext);
  assert.equal(Object.hasOwn(content,"promotionId"),false);
  assert.equal(Object.hasOwn(content,"reviewDigest"),false);
});
test("Week refuses altered persisted geometry, exchanged dates and incomplete hypotheses",async()=>{
  const input = await draft();
  for (const mutate of [
    d=>d.calculation.facts.pop(),
    d=>d.calculation.facts[11].display+=" forged",
    d=>d.output.claims[1].evidence.splice(-11,11,...d.output.claims[2].evidence.slice(-11)),
    d=>d.output.claims[1].text=d.output.claims[1].text.replace("2026-09-29","2026-09-30"),
    d=>d.output.claims.pop(),
    d=>d.output.claims.push({...d.output.claims[0],id:"extra"}),
    d=>d.output.relations.push({kind:"tension",claimIds:["week-day-1","week-day-2"],text:"Untrusted relation"}),
    d=>d.output.limits.pop(),
  ]) {const changed=structuredClone(input);mutate(changed);assert.equal((await prepareProductDelivery(changed)).status,"rejected");}
});
