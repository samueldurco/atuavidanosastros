import { productCatalog } from './catalog.ts';

export const artifactFormats = {
  web: { renderer: 'atv-web-export/1.0.0', mime: 'text/html; charset=utf-8', extension: 'html', maxBytes: 8388608 },
  pdf: { renderer: 'atv-pdf-export/1.0.0', mime: 'application/pdf', extension: 'pdf', maxBytes: 8388608 },
  svg: { renderer: 'atv-svg-export/1.0.0', mime: 'image/svg+xml; charset=utf-8', extension: 'svg', maxBytes: 2000000 },
  card: { renderer: 'atv-reading-card/1.0.0', mime: 'image/svg+xml; charset=utf-8', extension: 'svg', maxBytes: 2000000 }
} as const;
export type ArtifactFormat = keyof typeof artifactFormats;
export interface ArtifactManifest {
  id: string; runId: string; revision: number; reviewDigest: string; format: ArtifactFormat;
  section: number; rendererVersion: string; sha256: string; bytes: number; createdAt: string;
}
export interface ArtifactReading {
  id: string; productId: string; revision: number; reviewDigest: string; sectionCount: number;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const artifactUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const artifactDigest = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);

export function artifactEligible(productId: string, format: ArtifactFormat) {
  const product=productCatalog.find(p=>p.id===productId);
  return !!product && product.personalized && (format==='card' ? product.delivery.includes('web')
    : format==='svg' ? ['birth-chart','ascendant'].includes(productId) && product.delivery.includes('svg') : product.delivery.includes(format));
}

/** Explicit immutable projection. An artifact never proves publication; callers must freshly authorize the reading. */
export function parseArtifactManifest(value: unknown, reading: ArtifactReading): ArtifactManifest | null {
  if (!object(value) || !artifactUuid(value.id) || !artifactUuid(value.runId) || value.runId!==reading.id ||
    value.revision!==reading.revision || !Number.isInteger(value.revision) || Number(value.revision)<1 || Number(value.revision)>8 ||
    !artifactDigest(value.reviewDigest) || value.reviewDigest!==reading.reviewDigest ||
    typeof value.format!=='string' || !Object.hasOwn(artifactFormats,value.format)) return null;
  const format=value.format as ArtifactFormat, policy=artifactFormats[format];
  if (!artifactEligible(reading.productId,format) || !Number.isInteger(reading.sectionCount) || reading.sectionCount<1 || reading.sectionCount>40 ||
    !Number.isInteger(value.section) || (format==='card' ? Number(value.section)<0 || Number(value.section)>=reading.sectionCount : value.section!==-1) ||
    value.rendererVersion!==policy.renderer || !artifactDigest(value.sha256) || !Number.isInteger(value.bytes) || Number(value.bytes)<1 || Number(value.bytes)>policy.maxBytes ||
    typeof value.createdAt!=='string' || value.createdAt.length>40 || !Number.isFinite(Date.parse(value.createdAt))) return null;
  return Object.freeze({id:value.id,runId:value.runId,revision:value.revision as number,reviewDigest:value.reviewDigest,
    format,section:value.section as number,rendererVersion:policy.renderer,sha256:value.sha256,bytes:value.bytes as number,createdAt:value.createdAt});
}
