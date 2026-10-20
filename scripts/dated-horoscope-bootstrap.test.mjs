import assert from "node:assert/strict";
import test from "node:test";
import { assertSigningRun, REPOSITORY } from "./bootstrap-dated-horoscope.mjs";

const sourceSha = "a".repeat(40);
function fixture() {
  return {
    sourceSha, now: new Date("2026-10-20T12:00:00.000Z"),
    run: {
      id: 123, run_attempt: 2, head_sha: sourceSha, head_branch: "main",
      path: ".github/workflows/dated-horoscope.yml", event: "workflow_dispatch",
      status: "completed", conclusion: "success", repository: { full_name: REPOSITORY },
      run_started_at: "2026-10-20T11:00:00.000Z",
    },
    jobs: [
      { name: "sign", status: "completed", conclusion: "success", run_id: 123, head_sha: sourceSha },
      { name: "publish", status: "completed", conclusion: "skipped", run_id: 123, head_sha: sourceSha },
    ],
    artifacts: [{
      id: 456, name: "signed-dated-horoscope", expired: false,
      workflow_run: { id: 123, head_sha: sourceSha },
      created_at: "2026-10-20T11:15:00.000Z",
    }],
  };
}
test("owner bootstrap accepts the successful exact main signing attempt", () => {
  assert.deepEqual(assertSigningRun(fixture()), { runId: "123", attempt: "2", artifactId: 456 });
});
test("bootstrap rejects another commit, repository, workflow or incomplete signing", () => {
  for (const mutate of [
    f => { f.run.head_sha = "b".repeat(40); },
    f => { f.run.head_branch = "feature"; },
    f => { f.run.repository.full_name = "other/repo"; },
    f => { f.run.path = ".github/workflows/other.yml"; },
    f => { f.run.conclusion = "failure"; },
    f => { delete f.run.run_started_at; },
    f => { f.run.run_started_at = "invalid"; },
    f => { f.now = new Date("invalid"); },
    f => { f.jobs[0].conclusion = "failure"; },
    f => { f.jobs[0].head_sha = "b".repeat(40); },
    f => { f.jobs.push({ ...f.jobs[0] }); },
    f => { f.jobs[1].conclusion = "success"; },
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => assertSigningRun(f));
  }
});
test("bootstrap rejects expired, substituted, duplicate or previous-attempt artifacts", () => {
  for (const mutate of [
    f => { f.artifacts[0].expired = true; },
    f => { f.artifacts[0].workflow_run.id = 124; },
    f => { f.artifacts[0].workflow_run.head_sha = "b".repeat(40); },
    f => { f.artifacts.push({ ...f.artifacts[0] }); },
    f => { f.artifacts[0].created_at = "2026-10-20T10:59:59.000Z"; },
    f => { f.now = new Date("2026-10-21T11:15:00.000Z"); },
    f => { f.artifacts[0].created_at = "2026-10-20T12:01:00.000Z"; },
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => assertSigningRun(f));
  }
});
