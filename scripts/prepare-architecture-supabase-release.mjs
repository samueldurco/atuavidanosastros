// Local preparation only. No provider access, credentials, grants or deployment.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sha = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sha ?? "") || git("rev-parse", "HEAD") !== sha)
  throw new Error(
    "Pass the exact approved, checked-out 40-character commit SHA.",
  );
if (git("status", "--porcelain"))
  throw new Error(
    "Commit or isolate pending changes before freezing the release.",
  );

const project = "irgnhvouvzyoqfmltrna";
const migrations = [
  "20261015145546_atv_plus_owner_simulation.sql",
  "20261015145634_expanded_free_tool_result_ids.sql",
  "20261015152322_private_dream_atlas_cycles.sql",
];
const functions = [
  {
    name: "atv-trial-runtime",
    build: "scripts/build-trial-runtime.mjs",
    verify_jwt: true,
  },
  {
    name: "atv-free-tools-runtime",
    build: "scripts/build-free-tools-runtime.mjs",
    verify_jwt: false,
  },
];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const directory = resolve(
  root,
  "test-results",
  `supabase-release-${sha.slice(0, 12)}`,
);
await mkdir(directory, { recursive: true });
// A failed re-preparation must never leave an earlier manifest looking complete.
await rm(resolve(directory, "manifest.json"), { force: true });
const manifest = {
  version: 1,
  project,
  sha,
  preparedAt: new Date().toISOString(),
  migrations: [],
  functions: [],
};

for (const filename of migrations) {
  const query = await readFile(
    resolve(root, "supabase/migrations", filename),
    "utf8",
  );
  const name = filename.replace(/^\d+_/, "").replace(/\.sql$/, "");
  const payload = { project_id: project, name, query };
  const output = `${filename}.mcp.json`;
  await writeFile(resolve(directory, output), JSON.stringify(payload), "utf8");
  manifest.migrations.push({
    source: `supabase/migrations/${filename}`,
    name,
    sha256: hash(query),
    payload: output,
  });
}

for (const fn of functions) {
  execFileSync(process.execPath, [fn.build], { cwd: root, stdio: "inherit" });
  const files = [];
  for (const filename of [
    "index.ts",
    "runtime.js",
    "deno.json",
    "deno.jsonc",
  ]) {
    try {
      files.push({
        name: filename,
        content: await readFile(
          resolve(root, "supabase/functions", fn.name, filename),
          "utf8",
        ),
      });
    } catch (error) {
      if (
        error.code !== "ENOENT" ||
        ["index.ts", "runtime.js"].includes(filename)
      )
        throw error;
    }
  }
  const payload = {
    project_id: project,
    name: fn.name,
    verify_jwt: fn.verify_jwt,
    entrypoint_path: "index.ts",
    files,
  };
  const output = `${fn.name}.mcp.json`;
  const serialized = JSON.stringify(payload);
  await writeFile(resolve(directory, output), serialized, "utf8");
  manifest.functions.push({
    name: fn.name,
    verify_jwt: fn.verify_jwt,
    sha256: hash(serialized),
    payload: output,
    files: files.map((file) => ({
      name: file.name,
      sha256: hash(file.content),
      bytes: Buffer.byteLength(file.content),
    })),
  });
}
if (git("rev-parse", "HEAD") !== sha || git("status", "--porcelain"))
  throw new Error(
    "Source changed during preparation. Discard this candidate and prepare again.",
  );
await writeFile(
  resolve(directory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log(
  JSON.stringify({
    directory,
    sha,
    migrations: manifest.migrations.length,
    functions: manifest.functions.length,
    hostedChanges: false,
  }),
);
