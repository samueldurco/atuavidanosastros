// Local-only bindings; never authenticates or sends to a provider.
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const cwd = fileURLToPath(new URL("../apps/web/", import.meta.url));
const bindings = {
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
function run(args) {
  return new Promise((resolve, reject) => {
    const pnpm = process.env.npm_execpath;
    child = pnpm
      ? spawn(process.execPath, [pnpm, ...args], { cwd, stdio: "inherit" })
      : spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
          cwd,
          stdio: "inherit",
          shell: process.platform === "win32",
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
  process.exit(0);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
if (!process.argv.includes("--skip-build")) await run(["build"]);
await run([
  "exec",
  "wrangler",
  "pages",
  "dev",
  ".svelte-kit/cloudflare",
  "--ip",
  "127.0.0.1",
  "--port",
  "4196",
  ...Object.entries(bindings).flatMap(([key, value]) => [
    "--binding",
    `${key}=${value}`,
  ]),
]);
