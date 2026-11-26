import { createHmac, timingSafeEqual } from 'node:crypto';
import { file, owner, other } from './product-database.mjs';

// Loopback test transport, never imported by the application or deployed.
// Auth is synthetic; table operations use the real migration and service credential boundary.
export const bookshopOwner = owner;
export const bookshopOther = other;
export const bookshopAnonKey = 'p03-loopback-anon-test-only';
const signingKey = 'p03-loopback-jwt-test-only-20261126';
export function bookshopSession(id = owner, anonymous = false) {
  const now = Math.floor(Date.now() / 1000);
  const user = { id, email: `p03-${id.slice(-1)}@example.test`, aud: 'authenticated', role: 'authenticated', is_anonymous: anonymous, email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: id, aud: user.aud, role: user.role, is_anonymous: anonymous, iat: now, exp: now + 3600 })).toString('base64url');
  const signature = createHmac('sha256', signingKey).update(`${header}.${payload}`).digest('base64url');
  return { access_token: `${header}.${payload}.${signature}`, refresh_token: 'p03-loopback-refresh-test-only', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user };
}
function verifiedSession(request) {
  const token = request.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return null;
  try {
    const [header, payload, signature] = token.split('.');
    const expected = createHmac('sha256', signingKey).update(`${header}.${payload}`).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (![owner, other].includes(claims.sub) || claims.role !== 'authenticated' || claims.exp <= Date.now() / 1000) return null;
    return bookshopSession(claims.sub, claims.is_anonymous === true);
  } catch { return null; }
}
async function readBody(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk.toString();
    if (Buffer.byteLength(raw) > 2_100_000) throw new Error('body_too_large');
  }
  return JSON.parse(raw || '{}');
}
export async function setupBookshopTransport(db, serviceKey) {
  await db.exec(await file('supabase/migrations/20261126125656_p03_preview.sql'));
  return async (request, send) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const isUser = url.pathname === '/auth/v1/user';
    const isAccess = url.pathname === '/rest/v1/rpc/has_atv_trial_access';
    const isAccount = url.pathname === '/rest/v1/p03_preview_accounts';
    if (!isUser && !isAccess && !isAccount) return false;
    const session = verifiedSession(request);
    const service = request.headers.apikey === serviceKey && request.headers.authorization === `Bearer ${serviceKey}`;
    if (isAccount ? !service : request.headers.apikey !== bookshopAnonKey || !session) { send(401, { message: 'invalid_p03_test_session' }); return true; }
    if (isUser) { send(200, session.user); return true; }
    if (isAccess) { send(200, false); return true; }
    try {
      const input = request.method === 'GET' ? null : await readBody(request);
      const result = await db.transaction(async (transaction) => {
        await transaction.exec('set local role service_role');
        const ownerFilter = url.searchParams.get('owner_id')?.replace(/^eq\./, '');
        if (request.method === 'GET') return (await transaction.query('select version,data_json from public.p03_preview_accounts where owner_id=$1', [ownerFilter])).rows;
        if (request.method === 'POST') {
          await transaction.query('insert into public.p03_preview_accounts(owner_id,version,data_json) values ($1,$2,$3)', [input.owner_id, input.version, JSON.stringify(input.data_json)]);
          return null;
        }
        if (request.method === 'PATCH') return (await transaction.query('update public.p03_preview_accounts set version=$1,data_json=$2,updated_at=$3 where owner_id=$4 and version=$5 returning version', [input.version, JSON.stringify(input.data_json), input.updated_at, ownerFilter, url.searchParams.get('version')?.replace(/^eq\./, '')])).rows;
        throw new Error('unsupported_test_method');
      });
      send(request.method === 'POST' ? 201 : 200, result);
    } catch (error) { send(error.code === '23505' ? 409 : 400, { code: error.code, message: error.message }); }
    return true;
  };
}
