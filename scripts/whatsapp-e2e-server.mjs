// Local-only bindings; never authenticates or sends to a provider.
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const cwd = fileURLToPath(new URL("../apps/web/", import.meta.url));
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const wranglerPackage = require.resolve("wrangler/package.json");
const wranglerBin = resolve(
  dirname(wranglerPackage),
  JSON.parse(readFileSync(wranglerPackage, "utf8")).bin.wrangler,
);
const bindings = {
  PUBLIC_SITE_URL: "http://127.0.0.1:4196",
  PUBLIC_ENVIRONMENT: "test",
  FEATURE_AI: "false",
  FEATURE_HOTMART_LIVE: "false",
  FEATURE_ATV_PLUS_COMMERCIAL: "false",
  FEATURE_MAGIC_LINK: "false",
  FEATURE_PHYSICAL_CHECKOUT: "false",
  FEATURE_WHATSAPP_WEBHOOK: "true",
  FEATURE_WHATSAPP_CONSULTATION: "true",
  FEATURE_WHATSAPP_PUBLIC_ENTRY: "true",
  AUTOMATIC_SPEND_CAP_BRL: "0",
  WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED: "true",
  WHATSAPP_COMMERCIAL_NUMBER: "5511999999999",
  WHATSAPP_CONSULTATION_VERIFIED_AT: new Date().toISOString(),
  WHATSAPP_ACCESS_TOKEN: "test-only-not-a-provider-token",
  WHATSAPP_APP_SECRET: "test-only-app-secret",
  WHATSAPP_WABA_ID: "0000000000000001",
  WHATSAPP_PHONE_NUMBER_ID: "0000000000000002",
  WHATSAPP_GRAPH_VERSION: "v24.0",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "test-only-verification-token",
  WHATSAPP_CONSULTATION_SUBJECT_SECRET:
    "test-only-subject-secret-at-least-32-characters",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-not-a-service-key",
  PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  PUBLIC_SUPABASE_ANON_KEY: "",
};
let child;
let localConfigDirectory;
function cleanup() {
  if (
    localConfigDirectory &&
    dirname(localConfigDirectory) === resolve(tmpdir()) &&
    basename(localConfigDirectory).startsWith("atvna-p06-e2e-")
  )
    rmSync(localConfigDirectory, { recursive: true, force: true });
}
function run(command, args, commandCwd, shell = false) {
  return new Promise((resolve, reject) => {
    child = spawn(command, args, {
      cwd: commandCwd,
      stdio: "inherit",
      windowsHide: true,
      shell,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`p06_test_server_exit_${code}`)),
    );
  });
}
const stop = () => {
  child?.kill();
  cleanup();
  process.exit(0);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  if (!process.argv.includes("--skip-build")) {
    const pnpm = process.env.npm_execpath;
    if (pnpm && /[/\\]pnpm\.(?:cjs|mjs|js)$/.test(pnpm)) {
      await run(process.execPath, [pnpm, "build"], cwd);
    } else {
      // Only this fixed build command needs the Windows command shim.
      const windows = process.platform === "win32";
      await run(windows ? "pnpm.cmd" : "pnpm", ["build"], cwd, windows);
    }
  }
  // Pages requires the standard config filename in its cwd. A separate cwd keeps
  // real .dev.vars, production vars and their provider bindings out of this run.
  localConfigDirectory = mkdtempSync(join(tmpdir(), "atvna-p06-e2e-"));
  writeFileSync(
    join(localConfigDirectory, "wrangler.jsonc"),
    JSON.stringify({
      name: "atvna-p06-e2e-local",
      compatibility_date: "2026-09-02",
      compatibility_flags: ["nodejs_als"],
      pages_build_output_dir: resolve(cwd, ".svelte-kit/cloudflare"),
      vars: bindings,
    }),
  );
  await run(
    process.execPath,
    [wranglerBin, "pages", "dev", "--ip", "127.0.0.1", "--port", "4196"],
    localConfigDirectory,
  );
} finally {
  cleanup();
}
