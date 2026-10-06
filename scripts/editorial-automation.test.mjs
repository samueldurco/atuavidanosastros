// Somente fixtures sintéticas e chaves efêmeras em memória. Nenhuma autoridade real é emitida.
import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalJson,
  digest,
  byteDigest,
  attestationPayload,
  verifyAutomatedApproval,
  verifyAdmittedApproval,
  assessReport,
  POLICY,
  PROTOCOL,
  GATE,
} from "../apps/web/src/lib/server/editorial-automation.ts";
const now = new Date("2026-10-06T13:00:00Z");
const weights = {
  intent: 20,
  value: 20,
  accuracy: 15,
  trust: 10,
  language: 10,
  journey: 10,
  metadata: 10,
  maintenance: 5,
};
const checks = [
  "scope",
  "claims",
  "rights",
  "identity",
  "safety",
  "originality",
  "tools",
  "integrity",
];
const b64 = (x) => Buffer.from(x).toString("base64");
async function fixture() {
  const keys = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  const d = {
    id: "fixture-guide",
    revision: 1,
    state: "APPROVED",
    path: "/fixture-guide",
    kind: "guide",
    title: "Fixture sintética",
    description: "Exemplo exclusivo para testar o protocolo.",
    author: {
      id: "fixture-publisher",
      type: "Organization",
      name: "Organização fictícia de teste",
      bio: "Fixture sem credenciais ou publicação.",
    },
    automationDisclosure: {
      generatedWithAI: true,
      humanReview: false,
      reviewMode: "separate-pass",
    },
    publishedAt: "2026-10-06T12:00:00Z",
    modifiedAt: "2026-10-06T12:00:00Z",
    sections: [
      {
        heading: "Fixture",
        paragraphs: ["Este texto não é conteúdo aprovado ou publicado."],
      },
    ],
    sources: [],
  };
  const h = await digest(d);
  const content = new TextEncoder().encode(
    JSON.stringify({ fixtureOnly: true, noRealReview: true }),
  );
  const r = {
    policyVersion: POLICY,
    documentId: d.id,
    revision: 1,
    digest: h,
    reviewedAt: "2026-10-06T12:01:00Z",
    reviewMode: "separate-pass",
    risk: "low-educational-evergreen",
    checks: checks.map((id) => ({
      id,
      status: "PASS",
      reason: "Fixture exclusiva do teste criptográfico.",
      evidence: ["evidencias/fixture.json#fixtureOnly"],
    })),
    scores: Object.entries(weights).map(([id, points]) => ({
      id,
      points,
      reason: "Fixture sintética.",
      evidence: ["evidencias/fixture.json"],
    })),
    decision: "APROVADO_AUTOMATICAMENTE",
    corrections: [],
    publicationGate: GATE,
  };
  const e = {
    schemaVersion: "atv-editorial-evidence-manifest-v1",
    documentId: d.id,
    revision: 1,
    documentDigest: h,
    files: [
      { path: "evidencias/fixture.json", sha256: await byteDigest(content) },
    ],
  };
  const authority = {
    identityType: "automated-service",
    reviewerId: "fixture-automated-reviewer",
    publicKey: b64(await crypto.subtle.exportKey("raw", keys.publicKey)),
    enabled: true,
    revokedAt: null,
    policyVersion: POLICY,
    allowedKinds: ["guide"],
    risk: "low-educational-evergreen",
    validFrom: "2026-10-06T11:00:00Z",
    validUntil: "2026-10-07T13:00:00Z",
    provisioningEvidence: {
      id: "FIXTURE_ONLY_NOT_PROVISIONED",
      digest: "a".repeat(64),
    },
  };
  const a = {
    protocol: PROTOCOL,
    keyId: "fixture-key",
    reviewerId: authority.reviewerId,
    documentId: d.id,
    revision: 1,
    digest: h,
    policyVersion: POLICY,
    decision: r.decision,
    reviewMode: r.reviewMode,
    risk: r.risk,
    reportDigest: await digest(r),
    evidenceManifestDigest: await digest(e),
    approvedAt: "2026-10-06T12:02:00Z",
    expiresAt: "2026-10-06T14:00:00Z",
  };
  const input = {
    document: d,
    report: r,
    evidenceManifest: e,
    evidenceFiles: new Map([["evidencias/fixture.json", content]]),
    attestation: a,
    authorities: { "fixture-key": authority },
    now,
  };
  async function sign() {
    const { signature: ignored, ...payload } = input.attestation;
    input.attestation.signature = b64(
      await crypto.subtle.sign(
        "Ed25519",
        keys.privateKey,
        attestationPayload(payload),
      ),
    );
  }
  async function rebind() {
    const h = await digest(input.document);
    input.report.digest = h;
    input.evidenceManifest.documentDigest = h;
    input.attestation.digest = h;
    input.attestation.reportDigest = await digest(input.report);
    input.attestation.evidenceManifestDigest = await digest(
      input.evidenceManifest,
    );
    await sign();
  }
  await sign();
  return { input, sign, rebind };
}
test("assinatura Ed25519 sintética vincula documento, relatório e evidências; release permanece pendente", async () => {
  const { input } = await fixture();
  const r = await verifyAutomatedApproval(input);
  assert.equal(r.approved, true);
  assert.equal(r.publicationGate, GATE);
});
test("canonicalização lexical mantém bytes estáveis em objetos reordenados e distingue arrays", async () => {
  assert.equal(
    canonicalJson({ z: 1, a: { b: 2, a: 1 } }),
    canonicalJson({ a: { a: 1, b: 2 }, z: 1 }),
  );
  assert.notEqual(await digest([1, 2]), await digest([2, 1]));
});
const cases = [
  [
    "corpo alterado sem nova revisão",
    (f) => {
      f.input.document.sections[0].paragraphs[0] = "Alterado";
    },
  ],
  [
    "revisão alterada",
    (f) => {
      f.input.document.revision = 2;
    },
  ],
  [
    "relatório alterado",
    (f) => {
      f.input.report.scores[0].reason = "Alterado";
    },
  ],
  [
    "bytes de evidência adulterados",
    (f) => {
      f.input.evidenceFiles.set(
        "evidencias/fixture.json",
        new Uint8Array([1, 2]),
      );
    },
  ],
  [
    "evidência ausente",
    (f) => {
      f.input.evidenceFiles.clear();
    },
  ],
  [
    "manifesto adulterado",
    (f) => {
      f.input.evidenceManifest.files[0].sha256 = "0".repeat(64);
    },
  ],
  [
    "assinatura de outro documento",
    (f) => {
      f.input.attestation.signature = b64(new Uint8Array(64));
    },
  ],
  [
    "chave não autorizada",
    (f) => {
      f.input.authorities = {};
    },
  ],
  [
    "identidade humana disfarçada",
    (f) => {
      f.input.authorities["fixture-key"].identityType = "human";
    },
  ],
  [
    "autor usado como revisor",
    (f) => {
      f.input.authorities["fixture-key"].reviewerId =
        f.input.document.author.id;
      f.input.attestation.reviewerId = f.input.document.author.id;
    },
  ],
  [
    "chave revogada",
    (f) => {
      f.input.authorities["fixture-key"].revokedAt = "2026-10-06T12:30:00Z";
    },
  ],
  [
    "autoridade desativada",
    (f) => {
      f.input.authorities["fixture-key"].enabled = false;
    },
  ],
  [
    "provisionamento sem evidência",
    (f) => {
      delete f.input.authorities["fixture-key"].provisioningEvidence;
    },
  ],
  [
    "atestação expirada mesmo assinada",
    async (f) => {
      f.input.attestation.expiresAt = "2026-10-06T12:30:00Z";
      await f.sign();
    },
  ],
  [
    "autoridade expirada",
    (f) => {
      f.input.authorities["fixture-key"].validUntil = "2026-10-06T12:30:00Z";
    },
  ],
  [
    "data impossível assinada",
    async (f) => {
      f.input.attestation.approvedAt = "2026-02-30T12:00:00Z";
      await f.sign();
    },
  ],
  [
    "assinatura antes da revisão",
    async (f) => {
      f.input.attestation.approvedAt = "2026-10-06T12:00:30Z";
      await f.sign();
    },
  ],
  [
    "revisão futura",
    async (f) => {
      f.input.report.reviewedAt = "2026-10-06T13:01:00Z";
      await f.rebind();
    },
  ],
  [
    "v1 não serve como protocolo automatizado",
    async (f) => {
      f.input.attestation.protocol = "atv-editorial-approval-v1";
      await f.sign();
    },
  ],
  [
    "política desconhecida assinada",
    async (f) => {
      f.input.attestation.policyVersion = "unknown";
      await f.sign();
    },
  ],
  [
    "bloqueador UNKNOWN com assinatura válida",
    async (f) => {
      f.input.report.checks[0].status = "UNKNOWN";
      f.input.report.decision = "BLOQUEADO";
      f.input.report.corrections = ["Fonte ausente"];
      await f.rebind();
    },
  ],
  [
    "baixa qualidade com decisão falsificada e assinatura válida",
    async (f) => {
      f.input.report.scores.forEach((r) => {
        r.points = Math.ceil(weights[r.id] / 2);
      });
      await f.rebind();
    },
  ],
  [
    "dimensão abaixo da metade apesar de total 90",
    async (f) => {
      f.input.report.scores.find((r) => r.id === "trust").points = 5;
      f.input.report.scores.find((r) => r.id === "maintenance").points = 0;
      await f.rebind();
    },
  ],
  [
    "bloqueador duplicado",
    async (f) => {
      f.input.report.checks[1] = structuredClone(f.input.report.checks[0]);
      await f.rebind();
    },
  ],
  [
    "correção pendente em relatório aprovado",
    async (f) => {
      f.input.report.corrections = ["Corrigir antes de publicar"];
      await f.rebind();
    },
  ],
  [
    "referência ausente do manifesto com assinatura válida",
    async (f) => {
      f.input.report.checks[0].evidence = ["evidencias/nao-incluida.json"];
      await f.rebind();
    },
  ],
  [
    "manifesto com caminhos duplicados",
    async (f) => {
      f.input.evidenceManifest.files.push(
        structuredClone(f.input.evidenceManifest.files[0]),
      );
      await f.rebind();
    },
  ],
  [
    "caminho de evidência fora do pacote",
    async (f) => {
      f.input.evidenceManifest.files[0].path = "../segredo.json";
      await f.rebind();
    },
  ],
  [
    "notícia não entra no escopo",
    async (f) => {
      f.input.document.kind = "reporting";
      await f.rebind();
    },
  ],
  [
    "cálculo não entra no escopo",
    async (f) => {
      f.input.document.calculation = { engine: "fixture" };
      await f.rebind();
    },
  ],
  [
    "autoria apresentada como pessoa",
    async (f) => {
      f.input.document.author.type = "Person";
      await f.rebind();
    },
  ],
  [
    "revisão humana inventada",
    async (f) => {
      f.input.document.automationDisclosure.humanReview = true;
      await f.rebind();
    },
  ],
  [
    "metadados de rascunho não são pacote final",
    async (f) => {
      f.input.document.state = "DRAFT";
      await f.rebind();
    },
  ],
];
for (const [name, mutate] of cases)
  test("rejeita " + name, async () => {
    const f = await fixture();
    await mutate(f);
    assert.equal((await verifyAutomatedApproval(f.input)).approved, false);
  });
test("rejeita assinatura criptograficamente válida de chave não pinada", async () => {
  const f = await fixture();
  const other = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  const { signature: ignored, ...payload } = f.input.attestation;
  f.input.attestation.signature = b64(
    await crypto.subtle.sign(
      "Ed25519",
      other.privateKey,
      attestationPayload(payload),
    ),
  );
  assert.equal((await verifyAutomatedApproval(f.input)).approved, false);
});
test("rejeita prazo assinado maior que 24 horas", async () => {
  const f = await fixture();
  f.input.attestation.expiresAt = "2026-10-07T12:03:00Z";
  await f.sign();
  assert.equal((await verifyAutomatedApproval(f.input)).approved, false);
});

async function admittedFixture() {
  const f = await fixture();
  f.input.admission = {
    acceptedAt: now.toISOString(),
    attestationDigest: await digest(f.input.attestation),
    gateEvidenceDigest: "b".repeat(64),
  };
  return f;
}
test("admissão válida mantém leitura após expirar a janela para novas publicações", async () => {
  const f = await admittedFixture();
  assert.equal((await verifyAdmittedApproval(f.input)).approved, true);
  f.input.now = new Date("2026-11-06T13:00:00Z");
  assert.equal((await verifyAutomatedApproval(f.input)).approved, false);
  assert.equal((await verifyAdmittedApproval(f.input)).approved, true);
});
for (const [name, mutate] of [
  [
    "aceite fora da validade da atestação",
    (f) => {
      f.input.admission.acceptedAt = "2026-10-06T15:00:00Z";
      f.input.now = new Date("2026-10-06T16:00:00Z");
    },
  ],
  [
    "aceite futuro",
    (f) => {
      f.input.admission.acceptedAt = "2026-10-06T13:01:00Z";
    },
  ],
  [
    "digest de atestação adulterado",
    (f) => {
      f.input.admission.attestationDigest = "0".repeat(64);
    },
  ],
  [
    "prova de gates ausente",
    (f) => {
      delete f.input.admission.gateEvidenceDigest;
    },
  ],
  [
    "autoridade revogada após o aceite",
    (f) => {
      f.input.authorities["fixture-key"].revokedAt = "2026-10-06T13:01:00Z";
      f.input.now = new Date("2026-10-06T13:02:00Z");
    },
  ],
  [
    "bytes adulterados após o aceite",
    (f) => {
      f.input.evidenceFiles.set("evidencias/fixture.json", new Uint8Array([0]));
    },
  ],
  [
    "assinatura adulterada após o aceite",
    (f) => {
      f.input.attestation.signature = "x".repeat(88);
    },
  ],
])
  test("admissão rejeita " + name, async () => {
    const f = await admittedFixture();
    mutate(f);
    assert.equal((await verifyAdmittedApproval(f.input)).approved, false);
  });
