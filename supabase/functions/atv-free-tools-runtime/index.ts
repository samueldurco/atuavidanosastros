// Bundle is reproducible with pnpm build:free-tools-runtime. No private trial grant is involved.
import { freeToolsRuntimeHandler } from './runtime.js';
Deno.serve(freeToolsRuntimeHandler(Deno.env.get('FREE_TOOL_RECEIPT_KEY')));
