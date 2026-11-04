import { launchProductDefinitions } from '@atv/domain';
import metadata from '../../../../../docs/p02-lancamentos/launch-metadata.json';

/** Approved P02 descriptions; publication and access remain domain decisions. */
export const launchProducts = metadata.products.map((spec) => {
	const definition = launchProductDefinitions.find((product) => product.id === spec.id);
	if (!definition || definition.slug !== spec.slug || definition.name !== spec.name)
		throw new Error(`Contrato de lançamento divergente: ${spec.id}`);
	return {
		...definition,
		phase: spec.debut ? ('debut' as const) : ('next' as const),
		summary: spec.promise,
		promise: spec.promise,
		inputs: spec.publicInputs,
		method: spec.methodSummary,
		sampleInput: spec.sampleInput,
		sampleDelivery: spec.sampleDelivery,
		receive: spec.receive,
		distinction: spec.difference,
		boundaries: spec.limits,
		subtitle: spec.id === 'love-restart-map' ? 'Previsão de 30 dias' : undefined,
		href: `/produtos/${definition.slug}`,
		cta: 'Conhecer a proposta'
	};
});

export const launchCopy = Object.fromEntries(
	launchProducts.map((product) => [
		product.id,
		{ summary: product.summary, action: 'Conhecer a proposta' }
	])
);
export const launchDetails = Object.fromEntries(
	launchProducts.map((product) => [
		product.id,
		{ input: product.inputs.join('. ') + '.', scope: product.promise }
	])
);
export const launchProduct = (id: string) => launchProducts.find((product) => product.id === id);
