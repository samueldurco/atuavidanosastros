import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const documentUrl = new URL('../docs/seo/keyword-map.v1.json', import.meta.url);
const map = JSON.parse(readFileSync(documentUrl, 'utf8'));
const normalize = (query) => query.normalize('NFD').replace(/\p{M}/gu, '')
  .toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ');
const validPath = (path) => typeof path === 'string'
  && /^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(path);

assert.equal(map.schema_version, 'atv-seo-keyword-map/1.0.0');
assert.equal(map.status, 'PREPARATION_ONLY');
assert.equal(map.canonical_origin, 'https://atuavidanosastros.com.br');
assert.equal(map.locale, 'pt-BR');
assert.equal(map.market, 'BR');
for (const flag of ['publish', 'hosted_validated', 'search_console_configured', 'radar_automation_enabled']) {
  assert.equal(map.release_flags[flag], false, `A preparação não autoriza ${flag}`);
}
assert.equal(map.release_flags.monthly_spend_brl, 0);
assert.equal(map.query_evidence_default.classification, 'CANDIDATE_UNMEASURED');
for (const field of ['source', 'observed_at', 'monthly_volume', 'trends_score', 'search_console_impressions']) {
  assert.equal(map.query_evidence_default[field], null, `Métrica sem evidência: ${field}`);
}
assert.equal(map.route_policy.public_content_only, true);
assert.equal(map.route_policy.published_only, true);
assert.equal(map.route_policy.staging_indexable, false);
assert.equal(map.route_policy.private_outputs_indexable, false);

const expectedSigns = ['aries', 'touro', 'gemeos', 'cancer', 'leao', 'virgem', 'libra', 'escorpiao', 'sagitario', 'capricornio', 'aquario', 'peixes'];
assert.deepEqual(map.sign_order.map(({ slug }) => slug), expectedSigns);
const allowedKinds = new Set(['SIGN_INDEX', 'HOROSCOPE_INDEX', 'COMPATIBILITY_INDEX', 'NEWS_INDEX', 'SIGN_PROFILE', 'SIGN_HOROSCOPE', 'SIGN_PAIR', 'EVENT_GUIDE', 'EVENT_CALENDAR', 'EVERGREEN_GUIDE']);
const allowedStates = new Set(['PROPOSED', 'LOCAL_EDITORIAL_SHELL', 'LOCAL_ROUTE']);
const knownPaths = new Set();
for (const record of [...map.foundation_routes, ...map.pages]) {
  assert(validPath(record.path), `Path inválido: ${record.path}`);
  assert(!knownPaths.has(record.path), `Path repetido: ${record.path}`);
  assert(allowedStates.has(record.observed_route_state), `Estado de rota inválido: ${record.path}`);
  knownPaths.add(record.path);
}

const queryOwners = new Map();
for (const page of map.pages) {
  assert(allowedKinds.has(page.content_kind), `Tipo inválido: ${page.path}`);
  assert(['SEO2', 'SEO3', 'SEO4'].includes(page.implementation_phase), `Fase inválida: ${page.path}`);
  assert.equal(typeof page.primary_query, 'string');
  assert(Array.isArray(page.secondary_queries));
  assert(page.title_template && page.h1_template, `Brief incompleto: ${page.path}`);
  assert(!Object.hasOwn(page, 'monthly_volume'), `Usar evidência explícita, não volume solto: ${page.path}`);
  for (const query of [page.primary_query, ...page.secondary_queries]) {
    assert.equal(typeof query, 'string');
    const key = normalize(query);
    assert(key.length > 0 && !/[{}]/.test(key), `Consulta concreta inválida: ${query}`);
    assert(!queryOwners.has(key), `Consulta duplicada: ${query} (${queryOwners.get(key)} / ${page.path})`);
    queryOwners.set(key, page.path);
  }
  assert.equal(new Set(page.contextual_links).size, page.contextual_links.length, `Link repetido: ${page.path}`);
  for (const path of page.contextual_links) {
    assert(knownPaths.has(path), `Destino sem registro: ${page.path} -> ${path}`);
    assert.notEqual(path, page.path, `Link contextual para si mesmo: ${path}`);
  }
}

for (const sign of expectedSigns) {
  assert.equal(map.pages.filter((page) => page.path === `/signos/${sign}` && page.content_kind === 'SIGN_PROFILE').length, 1);
  assert.equal(map.pages.filter((page) => page.path === `/horoscopo/${sign}` && page.content_kind === 'SIGN_HOROSCOPE').length, 1);
}
const pairs = map.pages.filter((page) => page.content_kind === 'SIGN_PAIR');
for (const page of pairs) {
  const [, prefix, first, second, extra] = page.path.split('/');
  assert.equal(prefix, 'compatibilidade');
  assert.equal(extra, undefined);
  const a = expectedSigns.indexOf(first), b = expectedSigns.indexOf(second);
  assert(a >= 0 && b >= 0 && a <= b, `Ordem de par inválida: ${page.path}`);
}
assert.equal(pairs.length, 78);
assert.equal(map.pair_policy.batch_publication, false);
assert.equal(map.pair_policy.potential_pair_count, pairs.length);
assert.equal(map.temporal_query_templates.length, 2);
for (const template of map.temporal_query_templates) {
  assert(template.path_template.startsWith('/noticias/'));
  assert(template.path_template.includes('{ano}'));
  assert(template.query_templates.every((query) => /\{(data_por_extenso|ano)\}/.test(query)));
}
assert.deepEqual(map.counts, {
  concrete_pages: map.pages.length,
  concrete_candidate_queries: queryOwners.size,
  sign_profiles: map.pages.filter((page) => page.content_kind === 'SIGN_PROFILE').length,
  sign_horoscopes: map.pages.filter((page) => page.content_kind === 'SIGN_HOROSCOPE').length,
  potential_pair_pages: pairs.length,
  temporal_templates: map.temporal_query_templates.length,
});

console.log(JSON.stringify({
  status: 'PASS',
  ...map.counts,
  normalized_query_conflicts: 0,
  dangling_manifest_links: 0,
  scope: 'Integridade local do manifesto; não valida demanda, conteúdo, rotas hospedadas ou elegibilidade Google.',
}, null, 2));
