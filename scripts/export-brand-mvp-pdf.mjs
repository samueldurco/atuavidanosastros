import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.env.ATV_VISUAL_SHARP_PATH || 'sharp');
const root = path.resolve('apps/web/static');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const source = 'apps/web/src/lib/data/mvp-product-design.json';
const sourceBytes = await fs.readFile(source);
const designs = JSON.parse(sourceBytes);
const products = {}, files = [];
const css = (d) => `.pa-drawing{fill:none;stroke:${d.ink};stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}.pa-fine{stroke-width:.65;opacity:.7}.pa-paper{fill:#faf3e5;stroke:#b8a78d;stroke-width:.7}.pa-grid-point{fill:${d.ink};stroke:none;opacity:.4}.pa-library-volume{fill:${d.accent};fill-opacity:.16;stroke:${d.accent};stroke-width:1}.pa-writing{stroke-width:.7;opacity:.48}.pa-accent{stroke:${d.accent};stroke-width:1.5}.pa-accent-fill{fill:${d.accent};stroke:${d.ink};stroke-width:.7}.pa-book-spine{stroke:${d.accent};stroke-width:2.4}.pa-drawing text{fill:${d.ink};stroke:none;text-anchor:middle;letter-spacing:2px;font-family:Georgia,serif;font-weight:500}`;
for (const [id, design] of Object.entries(designs)) {
  const match = design.art.match(/<svg\b[\s\S]*<\/svg>/);
  if (!match) throw Error(`Missing approved composition: ${id}`);
  let svg = match[0];
  const sources = [];
  for (const href of new Set([...svg.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))) {
    if (!href.startsWith('/brand/mvp/')) throw Error(`Unexpected source: ${id}`);
    const resolved = path.resolve(root, '.' + href);
    if (!resolved.startsWith(root + path.sep)) throw Error('Source outside static');
    const bytes = await fs.readFile(resolved);
    // librsvg does not decode embedded WebP consistently; normalize the existing artwork.
    const embedded = href.endsWith('.svg') ? bytes : await sharp(bytes).resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    const mime = href.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    svg = svg.replaceAll(`href="${href}"`, `href="data:${mime};base64,${embedded.toString('base64')}"`);
    sources.push({ path: href, sha256: hash(bytes) });
  }
  if (!svg.includes('xmlns=')) svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  svg = svg.replace(/(<svg[^>]*>)/, `$1<style>${css(design)}</style><rect width="600" height="440" fill="${design.tint}"/>`);
  const png = await sharp(Buffer.from(svg)).resize(480, 352).png({ palette: true, colours: 64, dither: 0, compressionLevel: 9 }).toBuffer();
  if (png.length > 100000) throw Error(`Cover exceeds byte budget: ${id}`);
  products[id] = png.toString('base64');
  files.push({ product: id, sources, png_sha256: hash(png), bytes: png.length, width: 480, height: 352 });
}
const brandPath = '/brand/mvp/assets/marca-escura.svg';
const brandSource = await fs.readFile(path.join(root, brandPath));
const brandPng = await sharp(brandSource).resize(100, 100).png({ palette: true, colours: 32, compressionLevel: 9 }).toBuffer();
const themes = { 'meu-ceu': 'birth-chart', 'ciclos-tempo': 'week-reading', 'amor-relacoes': 'synastry', 'proposito-prosperidade': 'career-compass', 'tarot-arcanos': 'tarot-single-card', 'sonhos-simbolos': 'dream-reading' };
for (const id of Object.values(themes)) if (!products[id]) throw Error(`Missing fallback cover: ${id}`);
const generated = JSON.stringify({ version: 'mvp-2026-10-14', brand: brandPng.toString('base64'), themes, products }, null, '\t') + '\n';
if (Buffer.byteLength(generated) > 2000000) throw Error('PDF art bundle exceeds byte budget');
await fs.writeFile('apps/web/src/lib/data/visual-v4-pdf.generated.json', generated);
await fs.mkdir('docs/design', { recursive: true });
await fs.writeFile('docs/design/visual-v4-pdf-assets.json', JSON.stringify({ run_id: 'ATV-20260902-170644Z-01A0630F', direction: 'MVP aprovado 2026-10-14', source, source_sha256: hash(sourceBytes), derivation: 'Individual approved product SVG compositions rasterized to bounded 480x352 indexed PNG. PNG API and renderer versions retained; data, calculations and reading content unchanged. White reading pages retain print legibility.', bundle_bytes: Buffer.byteLength(generated), brand: { source: brandPath, source_sha256: hash(brandSource), png_sha256: hash(brandPng), bytes: brandPng.length }, files }, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, png_bytes: files.reduce((sum, file) => sum + file.bytes, 0), bundle_bytes: Buffer.byteLength(generated) }));
