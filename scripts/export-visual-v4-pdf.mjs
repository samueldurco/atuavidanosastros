import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.env.ATV_VISUAL_SHARP_PATH || 'sharp');
const root = process.env.ATV_VISUAL_V4_ROOT || 'E:/ATVNA/DESING SITE/SITE atvna desing/V4';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await fs.readFile(path.join(root, 'FECHAMENTO_V001/MANIFEST_REFERENCIAS_INTEGRACAO_V001.json'));
if (hash(manifestBytes) !== '576f6d5fa1dee7d009f066b85432a5e5c84ea3dc9fc59efd6cf8f4160b49061d') throw Error('Approved V4 manifest changed');
const approved = new Map(JSON.parse(manifestBytes).files.map((item) => [item.file, item]));
const boards = { 'meu-ceu': 'B01', 'ciclos-tempo': 'B02', 'amor-relacoes': 'B03', 'proposito-prosperidade': 'B04', 'tarot-arcanos': 'B05', 'sonhos-simbolos': 'B06' };
const themes = {}, files = [];
for (const [universe, board] of Object.entries(boards)) {
  const source = `CARDS/recortes/${board}-figure-1.webp`;
  const bytes = await fs.readFile(path.join(root, source));
  const entry = approved.get(source);
  if (!entry || hash(bytes) !== entry.sha256 || bytes.length !== entry.bytes) throw Error(`Unapproved PDF source: ${source}`);
  const png = await sharp(bytes).resize({ width: 240, height: 320, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  const metadata = await sharp(png).metadata();
  themes[universe] = png.toString('base64');
  files.push({ universe, board, source, source_sha256: entry.sha256, png_sha256: hash(png), bytes: png.length, width: metadata.width, height: metadata.height });
}
await fs.writeFile('apps/web/src/lib/data/visual-v4-pdf.generated.json', JSON.stringify({ version: 4, themes }) + '\n');
await fs.mkdir('docs/design', { recursive: true });
await fs.writeFile('docs/design/visual-v4-pdf-assets.json', JSON.stringify({ run_id: 'ATV-20260902-170644Z-01A0630F', approved_manifest_sha256: hash(manifestBytes), derivation: 'Bounded PNG from approved transparent WebP; proportional embedding on white print paper.', files }, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, total_bytes: files.reduce((sum, file) => sum + file.bytes, 0) }));
