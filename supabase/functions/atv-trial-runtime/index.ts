// runtime.js is reproducibly bundled by `pnpm build:trial-runtime` before deployment.
import { trialRuntimeHandler } from './runtime.js';
Deno.serve(trialRuntimeHandler(Deno.env.get('ATV_TRIAL_RUNTIME_KEY')));
