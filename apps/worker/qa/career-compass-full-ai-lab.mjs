import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildPrompt, EditorialGateway, GeminiEditorialProvider, LabBudgetLedger,
  tierLimits, validateFacts,
} from '@atv/ai';
import { createPurposeCalculators } from '../src/purpose-calculators.ts';
import { createCareerCompassFullBasisCalculator } from '../src/career-compass-full-basis.ts';
import { prepareCareerCompassFullFacts } from '../src/career-compass-full-editorial.ts';
import {
  CAREER_COMPASS_FULL_CANDIDATE_VERSION, prepareCareerCompassFullCandidate,
} from '../src/career-compass-full-persistence.ts';

// Manual E3 Lab probe. Every input below is invented; this file has no runtime registration.
const runId = '00000000-0000-4000-8000-000000000092';
const workflowInput = {
  version: 'atv-workflow/1.0.0', productId: 'career-compass',
  consent: { storage: true, policyVersion: 'atv-input-consent/1',
    partner: false, continuity: false },
  birth: { localDateTime: '1992-05-17T08:40:00',
    utcInstant: '1992-05-17T11:40:00Z', timezone: 'America/Sao_Paulo',
    latitude: -19.9167, longitude: -43.9345, locationSource: 'synthetic' },
  context: 'Quero testar a cerâmica mantendo meu emprego.',
};
const signal = new AbortController().signal;
const correlationId = 'synthetic-career-v2-lab';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function main() {
  const mode = process.argv[2];
  if (!['--dry-run', '--run'].includes(mode) || process.argv.length !== 3) {
    console.error('Use --dry-run or --run. --run makes one external Lab request.');
    process.exitCode = 2;
    return;
  }
  const calculate = createCareerCompassFullBasisCalculator();
  const fullCalculation = await calculate(workflowInput, { runId, signal });
  const prepared = prepareCareerCompassFullFacts(workflowInput, fullCalculation);
  if (prepared.status !== 'prepared_for_review' || !validateFacts(prepared.facts))
    throw new Error('synthetic_full_facts_invalid');
  const request = { correlationId, tier: 'premium', facts: prepared.facts,
    dataClass: 'synthetic', consentToProcess: true };
  const prompt = buildPrompt(request);
  const promptDigest = sha256(JSON.stringify({ system: prompt.system,
    prompt: prompt.prompt, schema: prompt.schema }));
  const readiness = { dataClass: 'synthetic', publication: 'blocked',
    candidateVersion: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
    editorialProfile: prepared.facts.editorialProfile,
    factCount: prepared.facts.facts.length, promptChars: prompt.prompt.length,
    promptLimit: tierLimits.premium.maxInputChars,
    maxOutputTokens: prompt.maxOutputTokens, promptDigest };
  if (prompt.prompt.length > tierLimits.premium.maxInputChars)
    throw new Error('synthetic_full_prompt_exceeds_limit');
  if (mode === '--dry-run') {
    console.log(JSON.stringify({ status: 'ready_for_private_lab', ...readiness }));
    return;
  }

  // The operator must opt in to a pinned model and confirm the account's Free Tier.
  // The key is never written to the report or printed.
  const model = process.env.ATV_AI_LAB_MODEL;
  if (!process.env.GEMINI_API_KEY || !model ||
      process.env.ATV_AI_LAB_FREE_TIER_CONFIRMED !== 'true') {
    console.error('Private Lab blocked: GEMINI_API_KEY, ATV_AI_LAB_MODEL and ATV_AI_LAB_FREE_TIER_CONFIRMED=true are required.');
    process.exitCode = 2;
    return;
  }
  const gemini = new GeminiEditorialProvider({ model,
    credential: () => process.env.GEMINI_API_KEY ?? '' });
  let rawProviderOutput = null;
  let providerUsage = null;
  const provider = { id: gemini.id, model: gemini.model, kind: gemini.kind,
    async generate(payload, abortSignal) {
      const response = await gemini.generate(payload, abortSignal);
      rawProviderOutput = response.output;
      providerUsage = { inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        thoughtTokens: response.thoughtTokens ?? null,
        resolvedModel: response.resolvedModel ?? null };
      return response;
    } };
  const events = [];
  const gateway = new EditorialGateway({ enabled: true, mode: 'lab',
    freeTierConfirmed: true, providers: [provider], ledger: new LabBudgetLedger(),
    maxCallsPerDay: 1, maxReservedTokensPerDay: 100_000,
    observe: (event) => events.push(event) });
  const sourceCalculation = await createPurposeCalculators()['career-compass'](
    workflowInput, { runId, signal });
  const claim = { runId, revision: 3, contractVersion: 'atv-product/1.0.0',
    workflowInput, sourceCalculation,
    candidateVersion: CAREER_COMPASS_FULL_CANDIDATE_VERSION };
  let gatewayResult = null;
  let candidate = null;
  let failure = null;
  try {
    candidate = await prepareCareerCompassFullCandidate(claim, async (facts) => {
      gatewayResult = await gateway.generate({ ...request, facts });
      if (gatewayResult.status !== 'candidate')
        throw new Error(`gateway_${gatewayResult.reason}`);
      return gatewayResult.reading;
    }, signal, calculate);
  } catch (error) {
    failure = error instanceof Error ? error.message : 'unknown_failure';
  }
  const report = { ...readiness, generatedAt: new Date().toISOString(),
    runId, model, provider: gemini.id, providerUsage, events,
    gateway: gatewayResult?.status === 'candidate'
      ? { status: 'candidate', review: gatewayResult.review,
        degraded: gatewayResult.degraded }
      : { status: gatewayResult?.status ?? 'not_called',
        reason: gatewayResult?.reason ?? failure },
    // Raw synthetic output is retained when a schema or mechanical gate rejects it.
    rawProviderOutput, candidate };
  const directory = join(tmpdir(), 'atvna', 'career-compass-full-v2');
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`,
    { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: candidate?.status ?? 'unavailable',
    publication: 'blocked', report: path,
    gateway: report.gateway.status, reason: candidate?.reason ?? report.gateway.reason }));
  if (candidate?.status !== 'prepared_for_review') process.exitCode = 1;
}

await main();
