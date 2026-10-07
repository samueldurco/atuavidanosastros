import { executeTrialRuntime } from '../../../apps/web/src/lib/server/trial-computation';

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
async function matches(actual: string, expected: string) {
 const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
 const [a, b] = await Promise.all([hash(actual), hash(expected)]);
 let difference = 0;
 for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
 return difference === 0;
}
/** Only the trusted web server can call this service. User/anon JWTs grant no access. */
export function trialRuntimeHandler(runtimeKey: string | undefined) {
 return async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return json({ error: 'Método indisponível.' }, 405);
  if (!runtimeKey || !(await matches(request.headers.get('x-atv-runtime-key') ?? '', runtimeKey))) return json({ error: 'Acesso indisponível.' }, 401);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Solicitação inválida.' }, 400);
  if (Number(request.headers.get('content-length')) > 2000000) return json({ error: 'Solicitação muito extensa.' }, 413);
  try {
   const reader = request.body?.getReader();
   if (!reader) return json({ error: 'Solicitação inválida.' }, 400);
   const chunks: Uint8Array[] = []; let size = 0;
   while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 2000000) { await reader.cancel(); return json({ error: 'Solicitação muito extensa.' }, 413); }
    chunks.push(next.value);
   }
   const body = new Uint8Array(size); let offset = 0;
   for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
   let value;
   try { value = JSON.parse(new TextDecoder().decode(body)); } catch { return json({ error: 'Solicitação inválida.' }, 400); }
   return json({ protocol: 'atv-trial-runtime/1', result: await executeTrialRuntime(value) });
  } catch (e) {
   const message = e instanceof Error && /^(Confira|Salve|Autorize|Produto sem)/.test(e.message) ? e.message : 'Não foi possível preparar a leitura.';
   return json({ error: message }, 422);
  }
 };
}
