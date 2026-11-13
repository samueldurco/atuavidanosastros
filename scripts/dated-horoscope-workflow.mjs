// Scheduling and delivery reporting stay outside the approved composition digest.
// They never change the facts, corpus, signature, admission or publication gates.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEDULE_CRON = "15 20,22 * * *";

export function resolvePreparation({ eventName, mode, cron, now = new Date() }) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw Error("A valid execution time is required");
  const reference = new Date(now);
  if (eventName === "schedule") {
    if (cron !== SCHEDULE_CRON)
      throw Error("Review the reference-date resolver when changing the cron");
    mode = "next";
    // GitHub can deliver the evening schedule after midnight. Until the next
    // 20:15 slot, the latest scheduled evening belongs to the previous UTC day.
    if (now.getUTCHours() * 60 + now.getUTCMinutes() < 20 * 60 + 15)
      reference.setUTCDate(reference.getUTCDate() - 1);
  } else if (eventName === "workflow_dispatch") {
    if (!["bootstrap", "next", "bootstrap-yesterday"].includes(mode))
      throw Error("An explicit supported manual mode is required");
    if (mode === "bootstrap-yesterday") {
      mode = "bootstrap";
      reference.setUTCDate(reference.getUTCDate() - 1);
    }
  } else {
    throw Error("Only schedule and workflow_dispatch can prepare this batch");
  }
  return { mode, referenceDate: reference.toISOString().slice(0, 10) };
}

export function signingSummary(index, { eventName, delivery, autopublish }) {
  const willPublish = autopublish === "true" &&
    (eventName === "schedule" || delivery === "github-token");
  return [
    "## Lote assinado; publicação ainda não comprovada",
    "",
    ...index.packages.map((item) => `- ${item.period}: ${item.startDate} a ${item.endDateExclusive} (fim exclusivo, UTC)`),
    "",
    willPublish
      ? "O job publish ainda precisa concluir admissão, CI, merge e verificação hospedada."
      : "**Publicação pelo owner CLI pendente.** Este run entrega somente o artefato assinado; não atualiza o site. Use o procedimento de docs/runbooks/dated-horoscope-publication.md, no SHA exato deste run e dentro da validade de admissão de 24 horas.",
    "",
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, outputPath] = process.argv.slice(2);
  if (!outputPath || !["prepare", "summary"].includes(command))
    throw Error("Usage: node scripts/dated-horoscope-workflow.mjs <prepare|summary> <path>");
  if (command === "prepare") {
    const now = new Date();
    const selection = resolvePreparation({
      eventName: process.env.GITHUB_EVENT_NAME,
      mode: process.env.BATCH_MODE,
      cron: process.env.SCHEDULE_CRON,
      now,
    });
    const { prepareScheduled } = await import("./prepare-dated-horoscope.mjs");
    console.log(JSON.stringify(await prepareScheduled({
      root: process.cwd(), ...selection, outputPath, now,
    })));
  } else {
    const summary = signingSummary(JSON.parse(fs.readFileSync(outputPath, "utf8")), {
      eventName: process.env.GITHUB_EVENT_NAME,
      delivery: process.env.BATCH_DELIVERY,
      autopublish: process.env.AUTOPUBLISH,
    });
    if (!process.env.GITHUB_STEP_SUMMARY) throw Error("GitHub step summary path is required");
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log(summary);
  }
}
