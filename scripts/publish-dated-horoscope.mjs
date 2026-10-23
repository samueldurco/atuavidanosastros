// Publication uses the existing GitHub/Cloudflare integration. No local signing key.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { admitBatch } from "./admit-dated-horoscope.mjs";
import { repoFile } from "./dated-horoscope-authority.mjs";
export const REQUIRED_JOBS = ["dispatch-guard", "quality", "accessibility", "secrets", "current-readings", "user-area", "sbom"];
export const INDEX_PATH = "apps/web/src/lib/server/editorial-release/dated-index.json";
const ASSET_PATH = /^apps\/web\/static\/_editorial\/dated\/[a-f0-9]{64}\.json$/;
export function assertPublicationFiles(files) {
  const indices = files.filter((file) => file.filename === INDEX_PATH);
  const assets = files.filter((file) => ASSET_PATH.test(file.filename));
  if (indices.length !== 1 || !["modified", "added"].includes(indices[0].status) ||
      assets.length < 1 || assets.length > 3 || assets.some((file) => file.status !== "added") ||
      new Set(files.map((file) => file.filename)).size !== files.length ||
      files.length !== assets.length + 1)
    throw Error("Publication may update only the compact index and add one to three immutable interval assets");
}
export function assertSuccessfulRun(run, jobs, sha) {
  if (run.head_sha !== sha || run.event !== "workflow_dispatch" ||
      run.path !== ".github/workflows/ci.yml" || run.status !== "completed" ||
      run.conclusion !== "success") throw Error("Exact dispatched CI did not pass");
  for (const name of REQUIRED_JOBS) {
    const matches = jobs.filter((job) => job.name === name);
    if (matches.length !== 1 || matches[0].conclusion !== "success")
      throw Error(`Required CI job missing or not successful: ${name}`);
  }
}
export function assertMergeCandidate(pr, files, head, base) {
  if (pr.state !== "open" || pr.draft || pr.head.sha !== head ||
      pr.base.ref !== "main" || pr.base.sha !== base ||
      pr.mergeable !== true || pr.mergeable_state !== "clean")
    throw Error("PR changed, is blocked, or is not mergeable");
  assertPublicationFiles(files);
}
export function containsPublishedArticle(html, document) {
  const nodes = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const visit = (value) => Array.isArray(value) ? value.some(visit) :
    value && typeof value === "object" &&
    (((value["@type"] === "Article" || (Array.isArray(value["@type"]) && value["@type"].includes("Article"))) &&
      value.headline === document.title && value.description === document.description &&
      value.mainEntityOfPage === `https://atuavidanosastros.com.br${document.path}` &&
      value.datePublished === document.publishedAt && value.dateModified === document.modifiedAt) ||
      Object.values(value).some(visit));
  const metadataMatches = nodes.some(([, source]) => { try { return visit(JSON.parse(source)); } catch { return false; } });
  if (!metadataMatches) return false;
  // Verify visible reading paragraphs, not merely data embedded in a script.
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (!article) return false;
  const text = (source) => source
    .replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name) => {
      if (name[0] === "#") {
        const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
      }
      return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[name.toLowerCase()];
    })
    .replace(/\s+/g, " ").trim();
  const rendered = [...article.matchAll(/<section\b[^>]*aria-labelledby=["']artigo-secao-\d+["'][^>]*>([\s\S]*?)<\/section>/gi)]
    .map(([, section]) => ({
      heading: text(section.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? ""),
      paragraphs: [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(([, paragraph]) => text(paragraph)),
    }));
  const expected = document.sections.map((section) => ({
    heading: section.heading.replace(/\s+/g, " ").trim(),
    paragraphs: section.paragraphs.map((paragraph) => paragraph.replace(/\s+/g, " ").trim()),
  }));
  return JSON.stringify(rendered) === JSON.stringify(expected);
}
export function currentApiMatches(payload, expected, sign, period, now) {
  if (payload?.sign !== sign || payload.period !== period) return false;
  const today = now.toISOString().slice(0, 10), current = payload.current;
  if (expected) return current?.id === expected.id && current.path === expected.path &&
    current.revision === expected.revision &&
    JSON.stringify(current.sections) === JSON.stringify(expected.sections);
  // A prepared future interval must not replace today's reading prematurely.
  return current === null || (current?.sign === sign && current.period === period &&
    current.startDate <= today && today < current.endDateExclusive &&
    Array.isArray(current.sections) && current.sections.length > 0);
}
export async function waitForPublication(documents, { fetcher = fetch, wait = sleep, attempts = 40, now = new Date() } = {}) {
  let remaining = [...documents];
  const today = now.toISOString().slice(0, 10);
  let apiChecks = [...new Map(documents.map((document) => {
    const [, , sign, period] = document.path.split("/");
    const expected = documents.find((candidate) => candidate.path.startsWith(`/horoscopo/${sign}/${period}/`) &&
      candidate.calculation.coverageStart.slice(0, 10) <= today &&
      today < candidate.calculation.coverageEnd.slice(0, 10));
    return [`${sign}/${period}`, { sign, period, expected }];
  })).values()];
  const totalApiChecks = apiChecks.length;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const results = await Promise.all(remaining.map(async (document) => {
      if (!/^\/horoscopo\/[a-z-]+\/(?:daily|weekly|monthly)\/\d{4}-\d\d-\d\d$/.test(document.path))
        throw Error("Unexpected public document path");
      try {
        const response = await fetcher(`https://atuavidanosastros.com.br${document.path}`, {
          headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(15000),
        });
        return response.status === 200 && containsPublishedArticle(await response.text(), document);
      } catch { return false; }
    }));
    remaining = remaining.filter((_, index) => !results[index]);
    const apiResults = await Promise.all(apiChecks.map(async ({ sign, period, expected }) => {
      try {
        const response = await fetcher(`https://atuavidanosastros.com.br/api/free-tools/horoscopo?sign=${sign}&period=${period}`, {
          headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(15000),
        });
        return response.status === 200 && currentApiMatches(await response.json(), expected, sign, period, now);
      } catch { return false; }
    }));
    apiChecks = apiChecks.filter((_, index) => !apiResults[index]);
    if (!remaining.length && !apiChecks.length) return { articlePaths: documents.length, currentApiChecks: totalApiChecks };
    if (attempt + 1 < attempts) await wait(15000);
  }
  throw Error(`Merge completed, but hosted publication was not verified for ${remaining.length} documents and ${apiChecks.length} current API queries`);
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
export const PUBLICATION_LOCK = "heads/automation/horoscope-publication-lock";
export async function withPublicationLock(api, sourceSha, work) {
  // Creating this ref is atomic. Never take over an existing lock, even when it
  // points to the same commit; an interrupted owner must be inspected first.
  await api("git/refs", "POST", { ref: `refs/${PUBLICATION_LOCK}`, sha: sourceSha });
  try {
    return await work();
  } finally {
    const held = await api(`git/ref/${PUBLICATION_LOCK}`);
    if (held.object.sha !== sourceSha)
      throw Error("Publication lock changed; inspect it before any further publication");
    await api(`git/refs/${PUBLICATION_LOCK}`, "DELETE");
  }
}
export async function publishBatch({ root, batch, repository, token, sourceSha, runId, attempt, fetcher = fetch }) {
  if (repository !== "samueldurco/atuavidanosastros" || !/^[a-f0-9]{40}$/.test(sourceSha) ||
      !/^\d+$/.test(runId) || !/^\d+$/.test(attempt) || !token) throw Error("Trusted publisher context required");
  const api = async (endpoint, method = "GET", body) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}/${endpoint}`, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error(`GitHub ${method} ${endpoint.split("?")[0]} failed: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  return withPublicationLock(api, sourceSha, async () => {
    const mainHead = async () => (await api("git/ref/heads/main")).object.sha;
    if (await mainHead() !== sourceSha) throw Error("Main advanced since signing; rerun from the current main");
    const admitted = await admitBatch({ root, batch, runnerEvidence: {
      stage: "cryptographic-admission-before-ci-and-release", repository, sourceCommit: sourceSha, workflowRun: runId,
    } });
    if (!admitted.changed) {
      await waitForPublication(admitted.effectiveDocuments, { fetcher });
      return { changed: false, hosted: true };
    }
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    if (git("rev-parse", "HEAD") !== sourceSha) throw Error("Checkout does not match the signing source");
    const changed = git("diff", "--name-only").split(/\r?\n/).filter(Boolean);
    const added = git("ls-files", "--others", "--exclude-standard", "--", "apps/web/static/_editorial/dated", INDEX_PATH)
      .split(/\r?\n/).filter(Boolean);
    assertPublicationFiles([
      ...changed.map((filename) => ({ filename, status: "modified" })),
      ...added.map((filename) => ({ filename, status: "added" })),
    ]);
    const contentPaths = [...changed, ...added].sort();
    const branch = `automation/horoscope/${runId}-${attempt}`;
    git("checkout", "-b", branch);
    git("config", "user.name", "github-actions[bot]");
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
    git("add", "--", ...contentPaths);
    git("commit", "-m", `Publish reviewed horoscope batch (${admitted.documents} documents)`);
    const head = git("rev-parse", "HEAD");
    git("push", "origin", `HEAD:refs/heads/${branch}`);
    const pr = await api("pulls", "POST", {
      title: `Horóscopo: ${admitted.documents} leituras com corpus revisado`,
      head: branch, base: "main",
      body: "Publica coberturas finitas com a autoridade existente, reprodução dos fatos e do texto, assinatura Ed25519 e parecer independente do corpus. A integração exige todos os jobs da CI no commit exato. O workflow confirma os artigos no site após o merge; a revisão por execução é automatizada e não representa uma nova revisão humana.",
    });
    const dispatchedAt = Date.now();
    await api("actions/workflows/ci.yml/dispatches", "POST", { ref: branch, inputs: { expected_sha: head } });
    let completed;
    for (let poll = 0; poll < 160; poll++) {
      const runs = await api(`actions/workflows/ci.yml/runs?event=workflow_dispatch&head_sha=${head}&per_page=20`);
      const run = runs.workflow_runs.filter((value) => value.head_sha === head &&
        Date.parse(value.created_at) >= dispatchedAt - 5000).sort((a, b) => b.id - a.id)[0];
      if (run?.status === "completed") {
        const jobs = await api(`actions/runs/${run.id}/jobs?per_page=100`);
        assertSuccessfulRun(run, jobs.jobs, head);
        completed = run;
        break;
      }
      await sleep(15000);
    }
    if (!completed) throw Error("CI deadline exceeded; PR remains unmerged");
    if (await mainHead() !== sourceSha) throw Error("Main advanced during CI; PR remains unmerged for a fresh run");
    const latest = await api(`pulls/${pr.number}`);
    const files = await api(`pulls/${pr.number}/files?per_page=100`);
    assertMergeCandidate(latest, files, head, sourceSha);
    // API obeys repository rules/reviews. No admin override, approval or global setting change.
    const merged = await api(`pulls/${pr.number}/merge`, "PUT", { sha: head, merge_method: "merge" });
    if (merged.merged !== true) throw Error("Repository did not admit the merge");
    console.log(JSON.stringify({ stage: "merged-awaiting-hosted-verification", pr: pr.html_url, sha: merged.sha, ci: completed.html_url }));
    await waitForPublication(admitted.effectiveDocuments, { fetcher });
    return { changed: true, documents: admitted.documents, pr: pr.html_url, sha: merged.sha, hosted: true };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REF !== "refs/heads/main" ||
      !["schedule", "workflow_dispatch"].includes(process.env.GITHUB_EVENT_NAME))
    throw Error("Trusted main runner required");
  const result = await publishBatch({
    root: process.cwd(), batch: JSON.parse(fs.readFileSync(repoFile(process.cwd(), process.argv[2]), "utf8")),
    repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN,
    sourceSha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT,
  });
  console.log(JSON.stringify(result));
}
