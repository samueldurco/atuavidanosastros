import { workflows } from '@atv/domain';
import { createNatalCalculators } from './natal-calculators.ts';
import { createSymbolicCalculators } from './symbolic-calculators.ts';
import { createContextCalculators } from './context-calculators.ts';
import { createWorkflowRepository, processNextProductRun, type WorkflowRpc, type ProcessingEvent } from './product-processing.ts';

/** Calculation availability is not entitlement, release or editorial/motor approval. */
export function createProductCalculators() {
  return Object.freeze({...createNatalCalculators(),...createSymbolicCalculators(),...createContextCalculators()});
}

export function productCalculationCoverage() {
  const calculators=createProductCalculators();
  return workflows.map(product=>Object.freeze({productId:product.id,universe:product.universe,
    kind:product.kind,calculation:Object.hasOwn(calculators,product.id)?'partial-base':'unavailable',
    publication:'blocked'} as const));
}

/** Server-owned configuration only. One bounded step, no drain loop or scheduled/network side effect.
 * Even configured products must pass the database release/contract and ownership gates.
 * RPC transport/authentication/deadline enforcement belongs to the hosting integration. */
export function createProductProcessor(rpc: WorkflowRpc, options: {
  enabledProducts?: readonly string[]; timeoutMs?: number; emit?: (event: ProcessingEvent) => void;
} = {}) {
  const all=createProductCalculators(),requested=options.enabledProducts??[],timeoutMs=options.timeoutMs??20000;
  if(!Array.isArray(requested)||requested.length>Object.keys(all).length||new Set(requested).size!==requested.length||
    requested.some(id=>typeof id!=='string'||!Object.hasOwn(all,id))) throw new Error('invalid_product_configuration');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>25000) throw new Error('invalid_processing_deadline');
  if(typeof rpc!=='function'||(options.emit!==undefined&&typeof options.emit!=='function')) throw new Error('invalid_product_configuration');
  const selected=Object.freeze(Object.fromEntries(requested.map(id=>[id,all[id]])));
  const repository=createWorkflowRepository(rpc),emit=options.emit;
  return Object.freeze({
    products:Object.freeze(Object.keys(selected)),
    // Capture configuration now; mutations to the caller's options never broaden later claims.
    step:()=>processNextProductRun(repository,selected,{timeoutMs,...(emit?{emit}:{})})
  });
}
