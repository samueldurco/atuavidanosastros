#!/usr/bin/env node
// Authorized P03 simulation only. Credentials stay in memory; reports contain no
// emails, passwords, sessions, cookies, tokens, addresses, or provider responses.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const usage = `P03 hosted verification (synthetic accounts, no real payment or shipment)
node scripts/p03-hosted-verify.mjs --base-url https://domain.example \\
  --supabase-url https://project.supabase.co --fixtures /private/accounts.json \\
  --keys /private/keys.json --report /external/p03-hosted.json

fixtures: {accounts:[{role:"authorized"|"denied",email,password}]}
          or {authorized:{email,password},denied:{email,password}}
keys: Supabase CLI [{name:"anon",api_key:"..."}] or {anon:"..."}
Only the public/anon key is used. Service credentials are never used.
The run persists synthetic orders and simulated fulfillment in the preview.
`;
const args = {};
for (let index = 2; index < process.argv.length; index++) {
  const argument = process.argv[index];
  if (argument === '--help' || argument === '-h') { process.stdout.write(usage); process.exit(0); }
  if (!['--base-url', '--supabase-url', '--fixtures', '--keys', '--report'].includes(argument) || !process.argv[index + 1]) {
    process.stderr.write('P03_ARGUMENT_ERROR: use --help\n'); process.exit(2);
  }
  args[argument.slice(2)] = process.argv[++index];
}
const report = {
  schema: 'atvna.p03.hosted-verification.v1',
  startedAt: new Date().toISOString(),
  mode: 'simulation',
  commercialEnabled: false,
  checks: [],
  limitations: [
    'Prices, member scenarios, freight, payment outcomes, fulfillment, tracking and replacements are synthetic fixtures.',
    'Clock expiry and expired-cycle denial are covered by local domain tests; this hosted run does not change server time.',
    'No real charge, printing, editorial publication, carrier order or shipment is triggered.'
  ]
};
let reportAllowed = false;
class VerificationError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function assert(condition, code) { if (!condition) throw new VerificationError(code); }
function same(actual, expected, code) { assert(actual === expected, code); }
async function check(name, operation) {
  try {
    const details = await operation();
    report.checks.push({ name, status: 'passed', ...(details ? { details } : {}) });
    return details ?? true;
  } catch (error) {
    report.checks.push({ name, status: 'failed', code: error instanceof VerificationError ? error.code : 'INTERNAL_OR_NETWORK_ERROR' });
    return null;
  }
}
const skip = (name, code) => report.checks.push({ name, status: 'blocked', code });
const timeout = () => AbortSignal.timeout(30_000);
async function request(url, options = {}) {
  try { return await fetch(url, { redirect: 'manual', signal: timeout(), ...options }); }
  catch { throw new VerificationError('NETWORK_REQUEST_FAILED'); }
}
function privacy(response) {
  assert(response.headers.get('cache-control')?.includes('no-store'), 'PRIVATE_CACHE_MISSING');
  assert(response.headers.get('x-robots-tag')?.includes('noindex'), 'PRIVATE_ROBOTS_MISSING');
}
function parseJSON(text) {
  try { return JSON.parse(text); } catch { throw new VerificationError('RESPONSE_JSON_INVALID'); }
}

async function main() {
  for (const name of ['base-url', 'supabase-url', 'fixtures', 'keys', 'report']) assert(args[name], 'REQUIRED_ARGUMENT_MISSING');
  const app = new URL(args['base-url']);
  const supabase = new URL(args['supabase-url']);
  assert(app.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname), 'BASE_URL_INVALID');
  assert(supabase.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(supabase.hostname), 'SUPABASE_URL_INVALID');
  assert(!app.username && !app.password && !supabase.username && !supabase.password, 'URL_CREDENTIALS_FORBIDDEN');
  const repository = fileURLToPath(new URL('../', import.meta.url));
  const reportRelative = relative(repository, resolve(args.report));
  assert(reportRelative.startsWith('..') || isAbsolute(reportRelative), 'REPORT_MUST_BE_OUTSIDE_REPOSITORY');
  reportAllowed = true;
  report.baseUrl = app.origin;
  const fixtures = parseJSON(await readFile(resolve(args.fixtures), 'utf8'));
  const keys = parseJSON(await readFile(resolve(args.keys), 'utf8'));
  const publicKey = Array.isArray(keys)
    ? keys.find((entry) => entry.name === 'anon')?.api_key ?? keys.find((entry) => /publishable/.test(entry.name ?? ''))?.api_key
    : keys.anon ?? keys.publishable ?? keys.publicKey;
  assert(typeof publicKey === 'string' && publicKey.length > 15 && !publicKey.startsWith('sb_secret_'), 'PUBLIC_KEY_MISSING');
  if (publicKey.split('.').length === 3) {
    const claims = parseJSON(Buffer.from(publicKey.split('.')[1], 'base64url').toString('utf8'));
    same(claims.role, 'anon', 'PUBLIC_KEY_MUST_NOT_HAVE_PRIVILEGED_ROLE');
  } else assert(publicKey.startsWith('sb_publishable_'), 'PUBLIC_KEY_FORMAT_UNSUPPORTED');
  const authorizedFixture = fixtures.accounts?.find((entry) => entry.role === 'authorized') ?? fixtures.authorized;
  const deniedFixture = fixtures.accounts?.find((entry) => entry.role === 'denied') ?? fixtures.denied;
  const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const { createServerClient } = await import(pathToFileURL(require.resolve('@supabase/ssr')).href);
  async function login(fixture) {
    assert(typeof fixture?.email === 'string' && typeof fixture?.password === 'string', 'ACCOUNT_FIXTURE_MISSING');
    const jar = new Map();
    const client = createServerClient(supabase.origin, publicKey, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (values) => { for (const cookie of values) { if (cookie.options?.maxAge === 0) jar.delete(cookie.name); else jar.set(cookie.name, cookie.value); } }
      },
      auth: { autoRefreshToken: false, persistSession: true },
      global: { fetch: (url, options) => request(url, options) }
    });
    const result = await client.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
    assert(!result.error && result.data.session?.access_token && result.data.user?.id, 'AUTH_LOGIN_FAILED');
    assert(jar.size > 0, 'SSR_AUTH_COOKIE_MISSING');
    return { jar, userId: result.data.user.id, token: result.data.session.access_token };
  }
  const cookieHeader = (identity) => identity ? [...identity.jar].map(([name, value]) => `${name}=${value}`).join('; ') : '';
  async function appRequest(path, identity, options = {}) {
    const headers = new Headers(options.headers);
    if (identity) headers.set('cookie', cookieHeader(identity));
    const response = await request(new URL(path, app.origin), { ...options, headers });
    const body = await response.text();
    return { response, body, status: response.status };
  }
  const privateRoot = '/loja/livraria/previa';
  const api = '/api/livraria/previa';
  const cover = `${api}/capas/book-01.svg`;
  let publicHTML = '';
  await check('public_preparation_200', async () => {
    const result = await appRequest('/loja/livraria');
    same(result.status, 200, 'PUBLIC_STATUS');
    assert(/Em prepara(?:ç|&ccedil;|&#231;)ão|Em preparação/i.test(result.body), 'PUBLIC_PREPARATION_MESSAGE');
    assert(!result.body.includes('book-01'), 'PUBLIC_CATALOG_ID_LEAK');
    publicHTML = result.body;
    return { httpStatus: result.status };
  });
  for (const [name, path, type] of [
    ['anonymous_html_blocked', privateRoot, 'page'],
    ['anonymous_data_blocked', `${privateRoot}/__data.json`, 'data'],
    ['anonymous_api_blocked', api, 'api'],
    ['anonymous_cover_blocked', cover, 'api'],
    ['anonymous_club_cover_blocked', `${api}/capas/edition-01.svg`, 'api']
  ]) await check(name, async () => {
    const result = await appRequest(path);
    privacy(result.response);
    if (type === 'page') {
      assert([303, 307, 401, 403].includes(result.status), 'ANONYMOUS_PAGE_NOT_BLOCKED');
      if (result.status < 400) assert(result.response.headers.get('location')?.startsWith('/entrar?'), 'ANONYMOUS_REDIRECT_INVALID');
    } else if (type === 'data') {
      assert([303, 307, 401, 403].includes(result.status) || (result.status === 200 && /"type":"redirect"/.test(result.body) && result.body.includes('/entrar?')), 'ANONYMOUS_DATA_NOT_BLOCKED');
    } else same(result.status, 401, 'ANONYMOUS_API_NOT_BLOCKED');
    assert(!result.body.includes('"catalog"') && !result.body.includes('book-01'), 'ANONYMOUS_METADATA_LEAK');
    return { httpStatus: result.status };
  });
  let authorized;
  let denied;
  await check('authorized_account_login', async () => { authorized = await login(authorizedFixture); return { authenticated: true }; });
  await check('denied_account_login', async () => { denied = await login(deniedFixture); return { authenticated: true }; });
  if (denied) {
    for (const [name, path] of [
      ['denied_html_403', privateRoot], ['denied_data_403', `${privateRoot}/__data.json`],
      ['denied_api_403', api], ['denied_cover_403', cover]
    ]) await check(name, async () => {
      const result = await appRequest(path, denied);
      same(result.status, 403, 'DENIED_ACCOUNT_NOT_BLOCKED');
      privacy(result.response);
      assert(!result.body.includes('"catalog"'), 'DENIED_METADATA_LEAK');
      return { httpStatus: result.status };
    });
  } else skip('denied_authorization', 'DENIED_LOGIN_UNAVAILABLE');
  if (!authorized) { skip('authorized_preview_and_simulation', 'AUTHORIZED_LOGIN_UNAVAILABLE'); return; }

  async function snapshot(identity = authorized) {
    const result = await appRequest(api, identity);
    same(result.status, 200, 'SNAPSHOT_HTTP_STATUS');
    privacy(result.response);
    const value = parseJSON(result.body);
    same(value.mode, 'simulation', 'SNAPSHOT_MODE');
    same(value.commercialEnabled, false, 'COMMERCIAL_MUST_BE_DISABLED');
    return value;
  }
  async function post(body, expected = 200, headers = { origin: app.origin, 'content-type': 'application/json' }) {
    const result = await appRequest(api, authorized, { method: 'POST', headers, body: JSON.stringify(body) });
    same(result.status, expected, `ACTION_HTTP_${result.status}_EXPECTED_${expected}`);
    privacy(result.response);
    return parseJSON(result.body);
  }
  const run = `p03hosted_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  let sequence = 0;
  const eventKey = () => `${run}_${++sequence}`;
  const quoteInput = (overrides = {}) => ({ kind: 'book', bookId: 'book-01', quantity: 1, cep: '01001000', tier: 'none', condition: 'none', ...overrides });
  async function quote(overrides = {}) {
    const { quote: value } = await post({ action: 'quote', input: quoteInput(overrides) });
    assert(value?.id, 'QUOTE_ID_MISSING');
    same(value.mode, 'simulation', 'QUOTE_MODE');
    same(value.commercialEnabled, false, 'QUOTE_COMMERCIAL_ENABLED');
    same(value.shippingSource, 'SIMULATED_FIXTURE', 'SHIPPING_SOURCE');
    same(value.totalCents, value.itemsCents + value.shippingCents, 'QUOTE_TOTAL_MISMATCH');
    return value;
  }
  let initial;
  await check('authorized_catalog_21', async () => {
    initial = await snapshot();
    same(initial.catalog?.length, 21, 'CATALOG_COUNT');
    same(new Set(initial.catalog.map((book) => book.id)).size, 21, 'CATALOG_DUPLICATE');
    same(new Set(initial.catalog.map((book) => book.summary)).size, 21, 'SYNOPSES_DUPLICATE');
    same(initial.catalog.reduce((sum, book) => sum + book.chapters, 0), 392, 'CATALOG_CHAPTER_COUNT');
    assert(initial.catalog.every((book) => book.coverStatus === 'PROVISIONAL' && book.manuscriptStatus === 'IN_REWRITE'), 'CATALOG_EDITORIAL_STATUS');
    assert(initial.catalog.every((book) => book.coverUrl.startsWith(`${api}/capas/`)), 'CATALOG_FILES_NOT_GUARDED');
    assert(initial.catalog.every((book) => !publicHTML.includes(book.title)), 'PUBLIC_TITLE_LEAK');
    same(initial.club.editions.length, 3, 'CLUB_INITIAL_EDITIONS');
    same(initial.providerStatus, 'SIMULATED_ONLY', 'PROVIDER_STATUS');
    return { catalogCount: 21, chapters: 392, initialClubEditions: 3, commercialEnabled: false };
  });
  if (initial) {
    for (const [name, path] of [
      ['authorized_overview_200', privateRoot],
      ['authorized_book_detail_200', `${privateRoot}/livros/${initial.catalog[0].slug}`],
      ['authorized_club_200', `${privateRoot}/ceu-de-papel`],
      ['authorized_my_area_200', `${privateRoot}/minha-area`],
      ['authorized_data_200', `${privateRoot}/__data.json`]
    ]) await check(name, async () => {
      const result = await appRequest(path, authorized);
      same(result.status, 200, 'AUTHORIZED_PAGE_STATUS'); privacy(result.response);
      assert(!result.body.includes('Internal Error'), 'AUTHORIZED_PAGE_INTERNAL_ERROR');
      return { httpStatus: result.status };
    });
    await check('authorized_distinct_guarded_covers', async () => {
      const regular = await appRequest(cover, authorized);
      const exclusive = await appRequest(`${api}/capas/edition-01.svg`, authorized);
      for (const value of [regular, exclusive]) {
        same(value.status, 200, 'COVER_HTTP_STATUS'); privacy(value.response);
        assert(value.response.headers.get('content-type')?.includes('image/svg+xml'), 'COVER_CONTENT_TYPE');
        assert(value.body.startsWith('<svg') && value.body.includes('CAPA PROVISÓRIA'), 'COVER_PROVISIONAL_MARK');
      }
      assert(regular.body !== exclusive.body && exclusive.body.includes('CÉU DE PAPEL'), 'EXCLUSIVE_COVER_MUST_DIFFER');
      return { regular: 200, exclusive: 200, distinct: true };
    });
  }
  await check('json_csrf_and_validation_boundaries', async () => {
    const action = { action: 'quote', input: quoteInput() };
    await post(action, 403, { origin: 'https://unauthorized.example', 'content-type': 'application/json' });
    await post(action, 403, { 'content-type': 'application/json' });
    await post(action, 415, { origin: app.origin, 'content-type': 'text/plain' });
    await post({ ...action, input: quoteInput({ cep: '00000000' }) }, 400);
    await post({ ...action, input: quoteInput({ cep: '99999999' }) }, 400);
    await post({ ...action, input: quoteInput({ bookId: 'unknown-book' }) }, 404);
    return { csrfOriginChecks: 2, invalidRequestsRejected: 4 };
  });
  await check('atv_plus_single_best_price_and_freight_exclusion', async () => {
    const expected = { none: 7900, essencial: 7110, ampliado: 6715, premium: 6320 };
    for (const [tier, unitCents] of Object.entries(expected)) {
      const value = await quote({ tier });
      same(value.unitCents, unitCents, 'MEMBER_PRICE_MISMATCH');
      same(value.shippingCents, 1990, 'MEMBER_FREIGHT_CHANGED');
      same(value.totalCents, unitCents + 1990, 'MEMBER_TOTAL_MISMATCH');
      if (tier !== 'none') same(value.memberGate, 'cost-review-required', 'LIVE_MARGIN_GATE_MISSING');
    }
    const promotion = await quote({ tier: 'essencial', condition: 'promotion15' });
    same(promotion.unitCents, 6715, 'PROMOTION_BEST_PRICE'); same(promotion.priceSource, 'promotion', 'PROMOTION_SOURCE');
    const premium = await quote({ tier: 'premium', condition: 'promotion15' });
    same(premium.unitCents, 6320, 'MEMBER_DISCOUNT_STACKED'); same(premium.priceSource, 'member', 'MEMBER_SOURCE');
    const coupon = await quote({ condition: 'coupon12' });
    same(coupon.unitCents, 6952, 'COUPON_PRICE');
    for (const [cep, shippingCents] of [['20040002', 2490], ['40020000', 2990], ['80010000', 3490]]) {
      const value = await quote({ cep }); same(value.shippingCents, shippingCents, 'CEP_FIXTURE_FREIGHT');
    }
    return { physicalDiscountPercent: [10, 15, 20], bestPriceOnce: true, freightOutsideDiscount: true, freightSource: 'SIMULATED_FIXTURE', liveMarginGate: 'cost-review-required' };
  });
  const createdOrderIds = [];
  await check('single_checkout_idempotence_and_server_totals', async () => {
    const value = await quote({ tier: 'premium' });
    const payload = { action: 'checkout', quoteId: value.id, requestKey: eventKey(), method: 'pix', paymentOutcome: 'approved', renewalAuthorized: false, totalCents: 1, quote: { totalCents: 1 } };
    const first = await post(payload); const replay = await post(payload);
    same(first.order?.status, 'paid', 'SINGLE_PAYMENT_NOT_PAID'); same(first.order.quote.totalCents, value.totalCents, 'CLIENT_TOTAL_ACCEPTED');
    same(first.duplicate, false, 'FIRST_CHECKOUT_DUPLICATE'); same(replay.duplicate, true, 'CHECKOUT_REPLAY_NOT_DUPLICATE');
    same(replay.order.id, first.order.id, 'CHECKOUT_DUPLICATED_ORDER');
    await post({ ...payload, method: 'card' }, 409);
    await post({ ...payload, requestKey: eventKey() }, 409);
    const state = await snapshot();
    same(state.account.orders.filter((order) => order.id === first.order.id).length, 1, 'SINGLE_ORDER_NOT_UNIQUE');
    same(state.account.shipments.filter((shipment) => shipment.orderId === first.order.id).length, 1, 'SINGLE_SHIPMENT_NOT_UNIQUE');
    createdOrderIds.push(first.order.id);
    return { paymentMethod: 'pix', outcome: 'approved_simulated', duplicateSuppressed: true, serverTotalEnforced: true };
  });
  await check('failed_card_checkout_and_retry', async () => {
    const value = await quote();
    const failed = await post({ action: 'checkout', quoteId: value.id, requestKey: eventKey(), method: 'card', paymentOutcome: 'failed', renewalAuthorized: false });
    same(failed.order.status, 'failed', 'FAILED_PAYMENT_STATE');
    let state = await snapshot();
    same(state.account.shipments.filter((shipment) => shipment.orderId === failed.order.id).length, 0, 'FAILED_PAYMENT_CREATED_SHIPMENT');
    const retryPayload = { action: 'payment', orderId: failed.order.id, eventKey: eventKey(), outcome: 'approved' };
    const recovered = await post(retryPayload); const replay = await post(retryPayload);
    same(recovered.order.status, 'paid', 'PAYMENT_RETRY_NOT_RECOVERED'); same(replay.duplicate, true, 'PAYMENT_RETRY_REPLAY');
    await post({ action: 'payment', orderId: failed.order.id, eventKey: eventKey(), outcome: 'failed' });
    state = await snapshot();
    same(state.account.orders.find((order) => order.id === failed.order.id).status, 'paid', 'PAID_ORDER_DOWNGRADED');
    same(state.account.shipments.filter((shipment) => shipment.orderId === failed.order.id).length, 1, 'RETRY_DUPLICATED_SHIPMENT');
    createdOrderIds.push(failed.order.id);
    return { initial: 'failed_simulated', retry: 'approved_simulated', paidCannotDowngrade: true };
  });
  let quarterly;
  let annual;
  await check('quarterly_pending_failed_approved_three_shipments', async () => {
    const value = await quote({ kind: 'club', cycle: 'quarterly', tier: 'premium', condition: 'coupon12' });
    same(value.itemsCents, 18000, 'CLUB_MEMBER_DISCOUNT_APPLIED'); same(value.shippingCents, 1990 * 3, 'QUARTERLY_FREIGHT');
    same(value.memberGate, 'excluded-kind', 'CLUB_BENEFIT_GATE');
    await post({ action: 'checkout', quoteId: value.id, requestKey: eventKey(), method: 'pix', paymentOutcome: 'pending', renewalAuthorized: true }, 400);
    const pending = await post({ action: 'checkout', quoteId: value.id, requestKey: eventKey(), method: 'card', paymentOutcome: 'pending', renewalAuthorized: true });
    same(pending.order.status, 'pending', 'PENDING_PAYMENT_STATE');
    let state = await snapshot();
    same(state.account.shipments.filter((shipment) => shipment.orderId === pending.order.id).length, 0, 'PENDING_CREATED_SHIPMENTS');
    const failed = await post({ action: 'payment', orderId: pending.order.id, eventKey: eventKey(), outcome: 'failed' });
    same(failed.order.status, 'failed', 'PENDING_FAILURE_STATE');
    state = await snapshot(); same(state.account.shipments.filter((shipment) => shipment.orderId === pending.order.id).length, 0, 'FAILED_CREATED_SHIPMENTS');
    const payload = { action: 'payment', orderId: pending.order.id, eventKey: eventKey(), outcome: 'approved' };
    const [approved, replay] = [await post(payload), await post(payload)];
    same(approved.order.status, 'paid', 'CLUB_RECOVERY_STATE'); same(replay.duplicate, true, 'CLUB_RECOVERY_DUPLICATE');
    quarterly = approved.order; createdOrderIds.push(quarterly.id);
    state = await snapshot();
    const shipments = state.account.shipments.filter((shipment) => shipment.orderId === quarterly.id);
    same(shipments.length, 3, 'QUARTERLY_SHIPMENT_COUNT'); same(new Set(shipments.map((shipment) => shipment.competence)).size, 3, 'QUARTERLY_DUPLICATED_COMPETENCE');
    return { cycleMonths: 3, states: ['pending', 'failed', 'paid'], shipments: 3, paymentMethod: 'card', noClubDiscount: true };
  });
  await check('annual_approved_twelve_shipments_and_equal_initial_content', async () => {
    const value = await quote({ kind: 'club', cycle: 'annual', tier: 'premium', condition: 'promotion15' });
    same(value.itemsCents, 60000, 'ANNUAL_MEMBER_DISCOUNT_APPLIED'); same(value.shippingCents, 1990 * 12, 'ANNUAL_FREIGHT');
    const result = await post({ action: 'checkout', quoteId: value.id, requestKey: eventKey(), method: 'card', paymentOutcome: 'approved', renewalAuthorized: false });
    annual = result.order; createdOrderIds.push(annual.id);
    same(annual.status, 'paid', 'ANNUAL_PAYMENT_STATE');
    const state = await snapshot();
    const shipments = state.account.shipments.filter((shipment) => shipment.orderId === annual.id);
    same(shipments.length, 12, 'ANNUAL_SHIPMENT_COUNT'); same(new Set(shipments.map((shipment) => shipment.competence)).size, 12, 'ANNUAL_DUPLICATED_COMPETENCE');
    if (quarterly) {
      const initialQuarter = state.account.shipments.filter((shipment) => shipment.orderId === quarterly.id);
      same(JSON.stringify(shipments.slice(0, 3).map((shipment) => shipment.editionId)), JSON.stringify(initialQuarter.map((shipment) => shipment.editionId)), 'CYCLE_CONTENT_DIFFERS');
    }
    await post({ action: 'renewal', orderId: annual.id, eventKey: eventKey(), enabled: true }, 409);
    return { cycleMonths: 12, shipments: 12, noClubDiscount: true, renewalRequiresPriorConsent: true };
  });
  for (const [cycle, order, count] of [['quarterly', quarterly, 3], ['annual', annual, 12]]) {
    if (!order) { skip(`${cycle}_fulfillment_lifecycle`, 'CLUB_ORDER_UNAVAILABLE'); continue; }
    await check(`${cycle}_fulfillment_lifecycle`, async () => {
      const state = await snapshot();
      const shipments = state.account.shipments.filter((shipment) => shipment.orderId === order.id);
      for (const shipment of shipments) {
        const payload = { action: 'fulfillment', orderId: order.id, competence: shipment.competence };
        await post({ ...payload, eventKey: eventKey(), operation: 'ship' }, 409);
        await post({ ...payload, eventKey: eventKey(), operation: 'cutoff', addressValid: false, editionReady: true });
        let current = (await snapshot()).account.shipments.find((item) => item.id === shipment.id);
        same(current.status, 'address_invalid', 'INVALID_ADDRESS_NOT_HELD');
        await post({ ...payload, eventKey: eventKey(), operation: 'cutoff', addressValid: true, editionReady: false });
        current = (await snapshot()).account.shipments.find((item) => item.id === shipment.id);
        same(current.status, 'edition_missing', 'MISSING_EDITION_NOT_HELD');
        const ready = { ...payload, eventKey: eventKey(), operation: 'cutoff', addressValid: true, editionReady: true };
        await post(ready); const replay = await post(ready); same(replay.duplicate, true, 'CUTOFF_REPLAY_NOT_IDEMPOTENT');
        await post({ ...payload, eventKey: eventKey(), operation: 'ship' });
        await post({ ...payload, eventKey: eventKey(), operation: 'deliver' });
        const replacement = { ...payload, eventKey: eventKey(), operation: 'replace' };
        await post(replacement); const replacementReplay = await post(replacement);
        same(replacementReplay.duplicate, true, 'REPLACEMENT_REPLAY_NOT_IDEMPOTENT');
        await post({ ...replacement, eventKey: eventKey() }, 409);
      }
      const final = (await snapshot()).account.shipments.filter((shipment) => shipment.orderId === order.id);
      same(final.length, count, 'FULFILLMENT_DUPLICATED_BASE_ROWS');
      assert(final.every((shipment) => shipment.status === 'delivered' && shipment.attempts === 3 && shipment.replacementCount === 1 && shipment.tracking?.startsWith('SIM-') && shipment.replacementTracking?.startsWith('SIM-REP-')), 'FULFILLMENT_FINAL_STATE');
      return { shipments: count, delivered: count, invalidAddressHeld: count, missingEditionHeld: count, retries: count, replacements: count, idempotence: true, tracking: 'SIMULATED_ONLY' };
    });
  }
  if (quarterly) await check('renewal_disable_preserves_current_cycle_without_charge', async () => {
    const before = await snapshot();
    await post({ action: 'renewal', orderId: quarterly.id, eventKey: eventKey(), enabled: false });
    const after = await snapshot();
    same(after.account.orders.length, before.account.orders.length, 'RENEWAL_CREATED_NEW_CYCLE');
    const order = after.account.orders.find((entry) => entry.id === quarterly.id);
    same(order.renewalEnabled, false, 'RENEWAL_NOT_DISABLED'); same(order.effectiveStatus, 'paid', 'CURRENT_CYCLE_ACCESS_CHANGED');
    return { renewalEnabled: false, currentCyclePreserved: true, newCharges: 0 };
  });
  await check('persistence_after_fresh_login', async () => {
    assert(createdOrderIds.length >= 4, 'EXPECTED_TEST_ORDERS_UNAVAILABLE');
    const reopened = await login(authorizedFixture);
    const value = await snapshot(reopened);
    assert(createdOrderIds.every((id) => value.account.orders.some((order) => order.id === id)), 'PERSISTED_ORDER_MISSING');
    for (const [order, count] of [[quarterly, 3], [annual, 12]]) if (order) same(value.account.shipments.filter((shipment) => shipment.orderId === order.id).length, count, 'PERSISTED_SHIPMENT_MISSING');
    return { freshSession: true, persistedTestOrders: createdOrderIds.length, clubShipments: (quarterly ? 3 : 0) + (annual ? 12 : 0) };
  });
  await check('direct_data_api_read_and_write_denied', async () => {
    const endpoint = new URL('/rest/v1/p03_preview_accounts', supabase.origin);
    endpoint.searchParams.set('owner_id', `eq.${authorized.userId}`);
    const attempts = [
      { role: 'anonymous', method: 'GET', token: publicKey },
      { role: 'authenticated', method: 'GET', token: authorized.token },
      { role: 'authenticated', method: 'POST', token: authorized.token, body: { owner_id: authorized.userId, data_json: { quotes: [], orders: [], shipments: [], events: [] } } },
      { role: 'authenticated', method: 'PATCH', token: authorized.token, body: { version: 999999, data_json: { quotes: [], orders: [], shipments: [], events: [] } } }
    ];
    for (const attempt of attempts) {
      const response = await request(endpoint, { method: attempt.method, headers: { apikey: publicKey, authorization: `Bearer ${attempt.token}`, 'content-type': 'application/json' }, ...(attempt.body ? { body: JSON.stringify(attempt.body) } : {}) });
      // Do not read or persist error bodies containing request context.
      await response.body?.cancel();
      assert([401, 403].includes(response.status), 'DIRECT_DATA_API_NOT_DENIED');
    }
    const state = await snapshot();
    assert(createdOrderIds.every((id) => state.account.orders.some((order) => order.id === id)), 'DIRECT_API_TAMPER_CHANGED_DATA');
    return { anonymousReadDenied: true, authenticatedReadDenied: true, authenticatedInsertDenied: true, authenticatedUpdateDenied: true, persistedDataUnchanged: true };
  });
}

try { await main(); }
catch (error) { report.checks.push({ name: 'verification_setup', status: 'failed', code: error instanceof VerificationError ? error.code : 'SETUP_FAILED' }); }
report.finishedAt = new Date().toISOString();
report.summary = {
  passed: report.checks.filter((entry) => entry.status === 'passed').length,
  failed: report.checks.filter((entry) => entry.status === 'failed').length,
  blocked: report.checks.filter((entry) => entry.status === 'blocked').length
};
report.ok = report.summary.failed === 0 && report.summary.blocked === 0;
if (args.report && reportAllowed) {
  try { await mkdir(dirname(resolve(args.report)), { recursive: true }); await writeFile(resolve(args.report), `${JSON.stringify(report, null, 2)}\n`); }
  catch { report.ok = false; process.stderr.write('P03_REPORT_WRITE_FAILED\n'); }
}
process.stdout.write(`${JSON.stringify({ ok: report.ok, ...report.summary })}\n`);
process.exitCode = report.ok ? 0 : 1;
