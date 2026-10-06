import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  createHash,
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
const request = JSON.parse(
  fs.readFileSync("docs/editorial/authority-request.json", "utf8"),
);
const expectedRepo = "samueldurco/atuavidanosastros";
const expectedRef = "refs/heads/codex/editorial-seo-piloto-20261006";
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.GITHUB_REPOSITORY !== expectedRepo ||
  process.env.GITHUB_REF !== expectedRef ||
  process.env.GITHUB_EVENT_NAME !== "push"
)
  throw Error("Trusted external runner required");
if (
  request.scope.join(",") !==
    Array.from(
      { length: 12 },
      (_, i) => `P${String(i + 1).padStart(2, "0")}`,
    ).join(",") ||
  !/^[a-f0-9]{64}$/.test(request.ownerDecisionDigest)
)
  throw Error("Finite owner authorization required");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const canonical = (value) =>
  JSON.stringify(
    value === null || typeof value !== "object"
      ? value
      : Array.isArray(value)
        ? value.map((v) => JSON.parse(canonical(v)))
        : Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((k) => [k, JSON.parse(canonical(value[k]))]),
          ),
  );
const publicRaw = (privateKey) =>
  createPublicKey(privateKey)
    .export({ type: "spki", format: "der" })
    .subarray(-32)
    .toString("base64");
const emit = (payload) =>
  console.log("ATVNA_EDITORIAL_PUBLIC_RECEIPT=" + JSON.stringify(payload));
if (request.operation === "provision") {
  if (!process.env.GH_TOKEN || process.env.ATVNA_EDITORIAL_SIGNING_KEY)
    throw Error(
      "Temporary provisioning credential required; existing key must never be overwritten",
    );
  const names = JSON.parse(
    execFileSync(
      "gh",
      [
        "secret",
        "list",
        "--repo",
        expectedRepo,
        "--env",
        "atvna-editorial-signing",
        "--json",
        "name",
      ],
      { encoding: "utf8" },
    ),
  );
  if (names.some((s) => s.name === "ATVNA_EDITORIAL_SIGNING_KEY"))
    throw Error("Key already provisioned");
  const pair = generateKeyPairSync("ed25519");
  const now = new Date().toISOString();
  const provisioning = {
    schemaVersion: "atvna-editorial-provisioning-v1",
    requestId: request.requestId,
    ownerDecisionDigest: request.ownerDecisionDigest,
    repository: expectedRepo,
    ref: expectedRef,
    commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    workflowRef: process.env.GITHUB_WORKFLOW_REF,
    generatedAt: now,
    keyId: request.keyId,
    publicKey: publicRaw(pair.privateKey),
    keyAlgorithm: "Ed25519",
    custody: "GitHub environment secret ATVNA_EDITORIAL_SIGNING_KEY",
    scope: request.scope,
    privateKeyExportedToApp: false,
    privateKeyLogged: false,
    costBRL: 0,
  };
  const secret = pair.privateKey.export({ type: "pkcs8", format: "pem" });
  execFileSync(
    "gh",
    [
      "secret",
      "set",
      "ATVNA_EDITORIAL_SIGNING_KEY",
      "--repo",
      expectedRepo,
      "--env",
      "atvna-editorial-signing",
    ],
    { input: secret, stdio: ["pipe", "pipe", "pipe"] },
  );
  const authority = {
    identityType: "automated-service",
    reviewerId: request.reviewerId,
    publicKey: provisioning.publicKey,
    enabled: true,
    revokedAt: null,
    policyVersion: "atvna-editorial-policy-2026-10-06-v1",
    allowedKinds: ["guide"],
    risk: "low-educational-evergreen",
    validFrom: now,
    validUntil: new Date(Date.parse(now) + 90 * 86400000).toISOString(),
    provisioningEvidence: {
      id: `github-actions:${expectedRepo}:${process.env.GITHUB_RUN_ID}`,
      digest: sha256(canonical(provisioning)),
    },
  };
  emit({
    operation: "provision",
    keyId: request.keyId,
    authority,
    provisioning,
  });
} else if (request.operation === "sign") {
  const {
    canonicalJson,
    digest,
    byteDigest,
    attestationPayload,
    assessReport,
    verifyAutomatedApproval,
  } = await import("../apps/web/src/lib/server/editorial-automation.ts");
  if (!process.env.ATVNA_EDITORIAL_SIGNING_KEY || process.env.GH_TOKEN)
    throw Error(
      "Signing custody required; bootstrap credential must be absent",
    );
  const privateKey = createPrivateKey(process.env.ATVNA_EDITORIAL_SIGNING_KEY);
  const authorities = JSON.parse(
    fs.readFileSync(
      "docs/editorial/release-2026-10-06/authorities.json",
      "utf8",
    ),
  );
  const authority = authorities[request.keyId];
  if (
    !authority ||
    publicRaw(privateKey) !== authority.publicKey ||
    authority.reviewerId !== request.reviewerId
  )
    throw Error("Custodied key does not match audited authority");
  const attestations = [];
  for (const code of request.scope) {
    const dir = `docs/editorial/release-2026-10-06/${code}`;
    const document = JSON.parse(
      fs.readFileSync(`${dir}/document.json`, "utf8"),
    );
    const report = JSON.parse(fs.readFileSync(`${dir}/report.json`, "utf8"));
    const evidenceManifest = JSON.parse(
      fs.readFileSync(`${dir}/manifest.json`, "utf8"),
    );
    if (
      request.documentDigests?.[code] !== (await digest(document)) ||
      (await assessReport(document, report, new Date())).decision !==
        "APROVADO_AUTOMATICAMENTE"
    )
      throw Error(`Final review not eligible: ${code}`);
    const evidenceFiles = new Map(
      evidenceManifest.files.map((file) => {
        const resolved = path.resolve(dir, file.path);
        if (!resolved.startsWith(path.resolve(dir) + path.sep))
          throw Error("Evidence outside package");
        return [file.path, new Uint8Array(fs.readFileSync(resolved))];
      }),
    );
    for (const file of evidenceManifest.files)
      if ((await byteDigest(evidenceFiles.get(file.path))) !== file.sha256)
        throw Error(`Evidence bytes changed: ${code}`);
    const approvedAt = new Date().toISOString();
    const attestation = {
      protocol: "atv-editorial-automation-v2",
      keyId: request.keyId,
      reviewerId: request.reviewerId,
      documentId: document.id,
      revision: document.revision,
      digest: await digest(document),
      policyVersion: authority.policyVersion,
      decision: "APROVADO_AUTOMATICAMENTE",
      reviewMode: "separate-pass",
      risk: "low-educational-evergreen",
      reportDigest: await digest(report),
      evidenceManifestDigest: await digest(evidenceManifest),
      approvedAt,
      expiresAt: new Date(Date.parse(approvedAt) + 86400000).toISOString(),
      signature: "",
    };
    attestation.signature = sign(
      null,
      Buffer.from(canonicalJson(attestationPayload(attestation))),
      privateKey,
    ).toString("base64");
    const verified = await verifyAutomatedApproval({
      document,
      report,
      evidenceManifest,
      evidenceFiles,
      attestation,
      authorities,
      now: new Date(approvedAt),
    });
    if (!verified.approved)
      throw Error(`Cryptographic review failed: ${code}: ${verified.reason}`);
    attestations.push({ code, attestation });
  }
  emit({
    operation: "sign",
    requestId: request.requestId,
    repository: expectedRepo,
    commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    attestations,
  });
} else throw Error("Unsupported operation");
