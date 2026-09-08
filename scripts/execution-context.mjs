import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspace = resolve(repo, "..");
const stateDir = resolve(workspace, "docs/30-execucao");
const maxChars = 8000;
const read = (path) => readFileSync(path, "utf8");
const git = (...args) =>
  execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
const digest = (data) => createHash("sha256").update(data).digest("hex");

function emit(value) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (text.length <= maxChars) return console.log(text);
  const boundary = text.lastIndexOf("\n", maxChars - 250);
  console.log(text.slice(0, boundary > 0 ? boundary : maxChars - 250));
  console.log(
    "\n[SAÍDA LIMITADA: consulte um intervalo menor com lines. O conteúdo omitido NÃO foi validado nem descartado do arquivo.]",
  );
}

const [mode = "resume", file, selector, amount] = process.argv.slice(2);
try {
  if (mode === "resume") {
    const checkpointFile = resolve(stateDir, "EXECUCAO_CHECKPOINT.json");
    if (statSync(checkpointFile).size > 6000)
      throw new Error(
        "Checkpoint excede 6000 bytes; sintetize-o preservando decisões e evidências.",
      );
    const checkpoint = JSON.parse(read(checkpointFile));
    const logPath = resolve(stateDir, "EXECUCAO_MESTRA_LOG.md");
    const log = readFileSync(logPath);
    const head = git("rev-parse", "HEAD");
    const changes = git("status", "--porcelain=v1")
      .split(/\r?\n/)
      .filter(Boolean);
    const logFresh =
      checkpoint.source_log?.sha256 === digest(log) &&
      checkpoint.source_log?.bytes === log.length;
    const result = {
      checkpoint,
      observed: {
        head,
        changed_files_count: changes.length,
        changed_files: changes.slice(0, 15),
      },
      reconcile: {
        head_changed: checkpoint.git_head !== head,
        log_changed: !logFresh,
      },
      next_read: logFresh
        ? "Apenas arquivos/seções da próxima ação; concilie alterações locais relevantes."
        : "Execute log e reconcilie o delta antes de atualizar source_log.",
    };
    // Estado de retomada nunca deve sofrer truncamento silencioso.
    if (JSON.stringify(result, null, 2).length > maxChars)
      throw new Error(
        "Pacote de retomada excede 8000 caracteres; reduza o checkpoint.",
      );
    emit(result);
  } else if (mode === "log") {
    const lines = read(resolve(stateDir, "EXECUCAO_MESTRA_LOG.md")).split(
      /\r?\n/,
    );
    const starts = lines.flatMap((line, i) => (/^### /.test(line) ? [i] : []));
    const start = starts.at(-2) ?? starts[0] ?? 0;
    emit(
      lines
        .slice(start)
        .map((line, i) => `${start + i + 1}: ${line}`)
        .join("\n"),
    );
  } else if (["headings", "section", "lines"].includes(mode)) {
    if (!file)
      throw new Error(
        "Informe o arquivo. Caminhos relativos usam o diretório atual.",
      );
    const lines = read(resolve(file)).split(/\r?\n/);
    if (mode === "headings") {
      emit(
        lines
          .flatMap((line, i) =>
            /^#{1,6} /.test(line) ? [`${i + 1}: ${line}`] : [],
          )
          .join("\n"),
      );
    } else {
      let start;
      let end;
      if (mode === "lines") {
        const count = Number(amount ?? 60);
        start = Number(selector) - 1;
        if (
          !Number.isInteger(start) ||
          start < 0 ||
          !Number.isInteger(count) ||
          count < 1 ||
          count > 120
        )
          throw new Error("Use início >= 1 e quantidade de 1 a 120 linhas.");
        end = start + count;
      } else {
        if (!/^\d+$/.test(selector ?? ""))
          throw new Error("section requer o número de uma seção (ex.: 19).");
        const pattern = new RegExp(`^(#{1,6}) ${selector}\\. `);
        start = lines.findIndex((line) => pattern.test(line));
        if (start < 0)
          throw new Error("Seção não encontrada; consulte headings.");
        const depth = lines[start].match(pattern)[1].length;
        end = lines.findIndex(
          (line, i) => i > start && new RegExp(`^#{1,${depth}} `).test(line),
        );
        if (end < 0) end = lines.length;
      }
      emit(
        lines
          .slice(start, end)
          .map((line, i) => `${start + i + 1}: ${line}`)
          .join("\n"),
      );
    }
  } else {
    throw new Error(
      "Uso: execution-context.mjs resume | log | headings ARQUIVO | section ARQUIVO NUMERO | lines ARQUIVO INICIO [QUANTIDADE]",
    );
  }
} catch (error) {
  console.error(`Contexto: ${error.message}`);
  process.exitCode = 1;
}
