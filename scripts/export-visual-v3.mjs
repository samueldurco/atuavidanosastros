import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

// Only selected delivery assets enter the app. Original matrices remain in the design archive.
const require = createRequire(import.meta.url);
const sharp = require(process.env.ATV_VISUAL_SHARP_PATH || "sharp");
const root = path.resolve(
  process.argv[2] || "../DESING SITE/SITE atvna desing/V3",
);
const target = path.resolve("apps/web/static/brand/v3");
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "MANIFEST_PRODUCAO_V3.json")),
);
const coverage = JSON.parse(
  await fs.readFile(path.join(root, "MATRIZ_COBERTURA_V3.json")),
);
await fs.mkdir(target, { recursive: true });
const files = [];
async function exportAsset(source, name, width) {
  const original = await fs.readFile(path.join(root, source));
  const svg = source.endsWith(".svg");
  const output = svg
    ? original
    : await sharp(original)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toBuffer();
  await fs.writeFile(path.join(target, name), output);
  const dimensions = svg ? undefined : await sharp(output).metadata();
  files.push({
    source,
    sourceSha256: crypto.createHash("sha256").update(original).digest("hex"),
    output: `/brand/v3/${name}`,
    sha256: crypto.createHash("sha256").update(output).digest("hex"),
    bytes: output.length,
    width: dimensions?.width,
    height: dimensions?.height,
  });
  return `/brand/v3/${name}`;
}
const themes = {};
for (let i = 1; i <= 6; i++) {
  const board = `B0${i}`;
  const prefix = `03_UNIVERSOS/${board}`;
  const theme = { board };
  theme.title = await exportAsset(
    `04_LETTERING/MATRIZES/ATVNA_V3_${board}_TITULO_V001.png`,
    `${board}-title.webp`,
    720,
  );
  theme.figures = [];
  for (let j = 1; j <= 3; j++)
    theme.figures.push(
      await exportAsset(
        `${prefix}/EXPORTS/ATVNA_V3_${board}_FIG_0${j}_ESCURO_V001.png`,
        `${board}-figure-${j}.webp`,
        520,
      ),
    );
  for (const [key, suffix, width] of [
    ["left", "DESKTOP_ESQUERDA", 220],
    ["right", "DESKTOP_DIREITA", 220],
    ["top", "MOBILE_TOPO", 480],
    ["bottom", "MOBILE_BASE", 480],
  ]) {
    let source = `${prefix}/LATERAIS/ATVNA_V3_${board}_LATERAL_${suffix}_V001.png`;
    try {
      await fs.access(path.join(root, source));
    } catch {
      source = source
        .replace("MOBILE_TOPO", "MOBILE_SUPERIOR")
        .replace("MOBILE_BASE", "MOBILE_INFERIOR");
    }
    theme[key] = await exportAsset(source, `${board}-${key}.webp`, width);
  }
  theme.divider = await exportAsset(
    `${prefix}/EXPORTS/ATVNA_V3_${board}_DIV_01_ESCURO_V001.svg`,
    `${board}-divider.svg`,
  );
  themes[board] = theme;
}
const products = {};
for (const board of coverage.boards.filter((b) => /^C\d\d$/.test(b.id))) {
  const id = board.productId || "atv-plus";
  const index = Number(board.id.slice(1));
  const universe =
    index <= 4
      ? "B01"
      : index <= 9
        ? "B02"
        : index <= 12
          ? "B03"
          : index <= 17
            ? "B05"
            : index <= 21
              ? "B04"
              : index <= 25
                ? "B06"
                : "B01";
  products[id] = {
    board: board.id,
    universe,
    title: await exportAsset(
      `04_LETTERING/MATRIZES/ATVNA_V3_${board.id}_TITULO_V001.png`,
      `${board.id}-title.webp`,
      720,
    ),
    vignette: await exportAsset(
      `04_PRODUTOS/${board.id}/vinheta.svg`,
      `${board.id}-vignette.svg`,
    ),
  };
}
const hero = await exportAsset(
  "05_JORNADAS/D01/gravura-oficial.png",
  "home-engraving.webp",
  760,
);
for (const [name, source] of [
  [
    "divider.svg",
    "02_BIBLIOTECA_GLOBAL/EXPORTS/ATVNA_V3_GLOBAL_DIV_01_ESCURO_V001.svg",
  ],
  [
    "corner.svg",
    "02_BIBLIOTECA_GLOBAL/EXPORTS/ATVNA_V3_GLOBAL_CANTO_01_ESCURO_V001.svg",
  ],
])
  await exportAsset(source, name);
const data = { version: 3, hero, themes, products };
await fs.writeFile(
  "apps/web/src/lib/data/visual-v3.generated.json",
  JSON.stringify(data, null, 2) + "\n",
);
// Self-contained cover art: downloads and server exports never fetch a remote image.
const pdfThemes = {};
const pdfFiles = [];
for (const board of Object.keys(themes)) {
  const source = `03_UNIVERSOS/${board}/EXPORTS/ATVNA_V3_${board}_FIG_01_ESCURO_V001.png`;
  const png = await sharp(path.join(root, source))
    .resize({ width: 240, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  pdfThemes[board] = png.toString("base64");
  pdfFiles.push({
    board,
    source,
    bytes: png.length,
    sha256: crypto.createHash("sha256").update(png).digest("hex"),
  });
}
await fs.writeFile(
  "apps/web/src/lib/data/visual-v3-pdf.generated.json",
  JSON.stringify({
    themes: pdfThemes,
    products: Object.fromEntries(
      Object.entries(products).map(([id, product]) => [id, product.universe]),
    ),
  }) + "\n",
);
await fs.writeFile(
  "docs/design/visual-v3-pdf-assets.json",
  JSON.stringify(
    { files: pdfFiles, totalBytes: pdfFiles.reduce((n, f) => n + f.bytes, 0) },
    null,
    2,
  ) + "\n",
);
await fs.mkdir("docs/design", { recursive: true });
await fs.writeFile(
  "docs/design/visual-v3-assets.json",
  JSON.stringify(
    {
      version: 3,
      source: "DESING SITE/SITE atvna desing/V3/MANIFEST_PRODUCAO_V3.json",
      sourceManifestSha256: crypto
        .createHash("sha256")
        .update(await fs.readFile(path.join(root, "MANIFEST_PRODUCAO_V3.json")))
        .digest("hex"),
      policy: manifest.policy,
      totalBytes: files.reduce((n, f) => n + f.bytes, 0),
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    assets: files.length,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    themes: Object.keys(themes).length,
    products: Object.keys(products).length,
  }),
);
