import { artifactFormats, artifactUuid, parseArtifactManifest, type ArtifactFormat, type ArtifactReading } from '@atv/domain';

export type ArtifactRpc = (name: 'persist_product_artifact', args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>;
export class ArtifactError extends Error {
  readonly code: 'artifact_invalid' | 'artifact_unavailable' | 'artifact_conflict' | 'artifact_limit' | 'deadline_exceeded';
  constructor(code: ArtifactError['code']) { super(code); this.code=code; }
}

/** Trusted renderer composition only, never browser input. No credentials or network transport here.
 * SQL independently verifies publication, revision, digest, content hash, quotas and idempotency.
 * An uncertain response may be retried with identical bytes; it must not be called a stored artifact. */
export async function persistRenderedProductArtifact(rpc: ArtifactRpc, input: {
  owner: string; reading: ArtifactReading; format: ArtifactFormat; section: number; rendererVersion: string; bytes: Uint8Array;
}, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
  const timeoutMs=options.timeoutMs??10000;
  if (!Number.isInteger(timeoutMs) || timeoutMs<1 || timeoutMs>10000 || typeof rpc!=='function' || !artifactUuid(input.owner) ||
    !Object.hasOwn(artifactFormats,input.format) || input.rendererVersion!==artifactFormats[input.format].renderer ||
    !(input.bytes instanceof Uint8Array) || input.bytes.byteLength<1 || input.bytes.byteLength>artifactFormats[input.format].maxBytes)
    throw new ArtifactError('artifact_invalid');
  // Capture before any await so caller mutation cannot change identity or bytes under a computed hash.
  const owner=input.owner, reading={...input.reading}, format=input.format, section=input.section, renderer=input.rendererVersion;
  const bytes=new Uint8Array(input.bytes), controller=new AbortController();
  const abort=()=>controller.abort(); options.signal?.addEventListener('abort',abort,{once:true});
  if(options.signal?.aborted) abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort();reject(new ArtifactError('deadline_exceeded'));},timeoutMs);});
  const check=()=>{if(controller.signal.aborted) throw new ArtifactError('deadline_exceeded');};
  try {
    return await Promise.race([deadline,(async()=>{
      check();
      const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
      const expected={id:'00000000-0000-4000-8000-000000000000',runId:reading.id,revision:reading.revision,reviewDigest:reading.reviewDigest,
        format,section,rendererVersion:renderer,sha256,bytes:bytes.length,createdAt:new Date().toISOString()};
      if(!parseArtifactManifest(expected,reading)) throw new ArtifactError('artifact_invalid');
      let binary=''; for(let offset=0;offset<bytes.length;offset+=8192) {check();binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));}
      check();
      const result=await rpc('persist_product_artifact',{p_run_id:reading.id,p_owner:owner,p_revision:reading.revision,
        p_review_digest:reading.reviewDigest,p_format:format,p_section:section,p_renderer:renderer,p_body_base64:btoa(binary),p_sha256:sha256},controller.signal);
      check();
      const saved=parseArtifactManifest(result,reading);
      if(!saved || saved.sha256!==sha256 || saved.bytes!==bytes.length || saved.format!==format || saved.section!==section || saved.rendererVersion!==renderer)
        throw new ArtifactError('artifact_unavailable');
      return saved;
    })()]);
  } catch(error) {
    if(error instanceof ArtifactError) throw error;
    throw new ArtifactError(controller.signal.aborted?'deadline_exceeded':'artifact_unavailable');
  } finally {clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
