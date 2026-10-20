// Owner CLI bootstrap: public signed artifacts only; signing remains in the
// existing external environment. The same publication/CI gates remain mandatory.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { publishBatch } from "./publish-dated-horoscope.mjs";

export const REPOSITORY = "samueldurco/atuavidanosastros";
export function assertSigningRun({ run, jobs, artifacts, sourceSha, now = new Date() }) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha) || run.head_sha !== sourceSha ||
      run.head_branch !== "main" || run.path !== ".github/workflows/dated-horoscope.yml" ||
      !["workflow_dispatch", "schedule"].includes(run.event) ||
      run.status !== "completed" || run.conclusion !== "success" ||
      run.repository?.full_name !== REPOSITORY ||
      !Number.isFinite(Date.parse(run.run_started_at)) ||
      !Number.isFinite(now.getTime()) ||
      !Number.isSafeInteger(run.id) || run.id <= 0 ||
      !Number.isSafeInteger(run.run_attempt) || run.run_attempt <= 0)
    throw Error("A successful signing run from this exact main commit is required");
  const signJobs = jobs.filter((job) => job.name === "sign");
  const publishers = jobs.filter((job) => job.name === "publish");
  if (signJobs.length !== 1 || signJobs[0].status !== "completed" ||
      signJobs[0].conclusion !== "success" ||
      signJobs[0].run_id !== run.id || signJobs[0].head_sha !== sourceSha ||
      publishers.some((job) => job.conclusion !== "skipped"))
    throw Error("Owner bootstrap requires successful signing and no concurrent token publication");
  const candidates = artifacts.filter((artifact) => artifact.name === "signed-dated-horoscope");
  if (candidates.length !== 1 || candidates[0].expired !== false ||
      candidates[0].workflow_run?.id !== run.id ||
      candidates[0].workflow_run?.head_sha !== sourceSha ||
      !Number.isSafeInteger(candidates[0].id) || candidates[0].id <= 0 ||
      !Number.isFinite(Date.parse(candidates[0].created_at)) ||
      Date.parse(candidates[0].created_at) < Date.parse(run.run_started_at) ||
      Date.parse(candidates[0].created_at) > now.getTime() ||
      now.getTime() - Date.parse(candidates[0].created_at) >= 86400000)
    throw Error("One unexpired signed artifact from this run attempt is required");
  return { runId: String(run.id), attempt: String(run.run_attempt), artifactId: candidates[0].id };
}

export async function bootstrap({ root, runId }) {
  if (process.env.GITHUB_ACTIONS === "true" || !/^\d+$/.test(runId))
    throw Error("This entry point is for the authenticated owner CLI and a numeric signing run ID");
  const command = (executable, args) => execFileSync(executable, args, {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const api = (endpoint) => JSON.parse(command("gh", [
    "api", `repos/${REPOSITORY}/${endpoint}`,
  ]));
  const sourceSha = command("git", ["rev-parse", "HEAD"]);
  const run = api(`actions/runs/${runId}`);
  const jobs = api(`actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100`);
  const artifacts = api(`actions/runs/${runId}/artifacts?per_page=100`);
  const verified = assertSigningRun({ run, jobs: jobs.jobs, artifacts: artifacts.artifacts, sourceSha });
  if (command("git", ["diff", "--name-only"]) ||
      command("git", ["diff", "--cached", "--name-only"]))
    throw Error("Bootstrap requires a clean checkout of the signing source");
  const output = path.resolve(root, "output", `dated-horoscope-bootstrap-${runId}-${verified.attempt}`);
  if (fs.existsSync(output)) throw Error("Bootstrap output already exists; inspect the previous attempt before retrying");
  fs.mkdirSync(output, { recursive: true });
  command("gh", ["run", "download", runId, "--repo", REPOSITORY,
    "--name", "signed-dated-horoscope", "--dir", output]);
  const batch = JSON.parse(fs.readFileSync(path.join(output, "dated-horoscope-signed.json"), "utf8"));
  // gh owns existing authentication; the token stays only in this process and
  // is never printed, written to disk or passed as a command-line argument.
  const token = command("gh", ["auth", "token", "--hostname", "github.com"]);
  return publishBatch({
    root, batch, repository: REPOSITORY, token, sourceSha,
    runId: verified.runId, attempt: verified.attempt,
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await bootstrap({ root: process.cwd(), runId: process.argv[2] ?? "" });
  console.log(JSON.stringify(result));
}
