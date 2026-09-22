import {
	artifactDigest,
	artifactEligible,
	artifactFormats,
	artifactUuid,
	type ArtifactFormat
} from '@atv/domain';
import {
	ArtifactError,
	persistRenderedProductArtifact,
	type ArtifactRpc
} from '../../../../worker/src/product-artifacts';
import { parseProductRun } from '../product-run';
import { renderProductWebExport, WEB_EXPORT_VERSION } from './product-export';
import { renderProductPdf, PDF_EXPORT_VERSION } from './product-pdf';
import { renderProductSvg, SVG_EXPORT_VERSION } from './product-svg';
import { renderProductCard, CARD_EXPORT_VERSION } from './product-card';

export interface ArtifactJob {
	owner: string;
	runId: string;
	revision: number;
	reviewDigest: string;
	format: ArtifactFormat;
	section: number;
}
export interface ArtifactProductionEvent {
	outcome: 'disabled' | 'stored' | 'failed';
	format: ArtifactFormat | 'unknown';
	elapsedMs: number;
	bytes: number;
}
export interface ArtifactProducerDependencies {
	/** Fresh owner-scoped projection from read_product_run, never a browser-supplied result. */
	read: (owner: string, runId: string, signal: AbortSignal) => Promise<unknown>;
	persist: ArtifactRpc;
}

/** One trusted server job, disabled by default. No route, credentials, queue or network transport.
 * SQL still rechecks current gates and ownership at persistence. Renderers are fixed here;
 * jobs cannot supply bytes, HTML, URLs or renderer functions. Deadlines are cooperative for CPU work. */
export function createArtifactProducer(
	dependencies: ArtifactProducerDependencies,
	options: {
		enabled?: boolean;
		timeoutMs?: number;
		emit?: (event: ArtifactProductionEvent) => void;
	} = {}
) {
	const { read, persist } = dependencies;
	const { enabled = false, timeoutMs = 15000, emit } = options;
	if (
		typeof enabled !== 'boolean' ||
		typeof read !== 'function' ||
		typeof persist !== 'function' ||
		!Number.isInteger(timeoutMs) ||
		timeoutMs < 1 ||
		timeoutMs > 15000 ||
		(emit !== undefined && typeof emit !== 'function')
	)
		throw new ArtifactError('artifact_invalid');
	return Object.freeze({
		async produce(input: ArtifactJob, signal?: AbortSignal) {
			const started = performance.now();
			const job = { ...input };
			let outcome: ArtifactProductionEvent['outcome'] = 'failed',
				bytes = 0;
			const controller = new AbortController();
			let timer: ReturnType<typeof setTimeout> | undefined;
			let interrupt: () => void = () => {};
			const abort = () => {
				controller.abort();
				interrupt();
			};
			const check = () => {
				if (controller.signal.aborted || performance.now() - started >= timeoutMs)
					throw new ArtifactError('deadline_exceeded');
			};
			try {
				if (!enabled) {
					outcome = 'disabled';
					return { status: 'disabled' as const };
				}
				if (
					!artifactUuid(job.owner) ||
					!artifactUuid(job.runId) ||
					!artifactDigest(job.reviewDigest) ||
					!Number.isInteger(job.revision) ||
					job.revision < 1 ||
					job.revision > 8 ||
					!Object.hasOwn(artifactFormats, job.format) ||
					!Number.isInteger(job.section) ||
					(job.format === 'card' ? job.section < 0 || job.section > 39 : job.section !== -1) ||
					Object.keys(job).some(
						(key) =>
							!['owner', 'runId', 'revision', 'reviewDigest', 'format', 'section'].includes(key)
					)
				)
					throw new ArtifactError('artifact_invalid');
				const interrupted = new Promise<never>((_, reject) => {
					interrupt = () => reject(new ArtifactError('deadline_exceeded'));
				});
				signal?.addEventListener('abort', abort, { once: true });
				timer = setTimeout(abort, timeoutMs);
				if (signal?.aborted) abort();
				return await Promise.race([
					interrupted,
					(async () => {
						check();
						const run = parseProductRun(await read(job.owner, job.runId, controller.signal));
						check();
						if (
							!run?.released ||
							!run.calculation ||
							!run.editorial ||
							run.id !== job.runId ||
							run.revision !== job.revision ||
							run.editorial.reviewDigest !== job.reviewDigest ||
							!artifactEligible(run.productId, job.format) ||
							(job.format === 'card' && job.section >= run.editorial.sections.length) ||
							(job.format === 'svg' && !run.cartography)
						)
							throw new ArtifactError('artifact_unavailable');
						let rendered: Uint8Array | undefined, version: string;
						switch (job.format) {
							case 'web': {
								const result = renderProductWebExport(run);
								rendered = result ? new TextEncoder().encode(result.html) : undefined;
								version = WEB_EXPORT_VERSION;
								break;
							}
							case 'pdf': {
								const result = await renderProductPdf(run);
								rendered = result?.bytes;
								version = PDF_EXPORT_VERSION;
								break;
							}
							case 'svg': {
								const result = renderProductSvg(run);
								rendered = result ? new TextEncoder().encode(result.svg) : undefined;
								version = SVG_EXPORT_VERSION;
								break;
							}
							case 'card': {
								const result = renderProductCard(run, job.section);
								rendered = result ? new TextEncoder().encode(result.svg) : undefined;
								version = CARD_EXPORT_VERSION;
								break;
							}
						}
						check();
						if (!rendered || !rendered.length) throw new ArtifactError('artifact_unavailable');
						const remaining = Math.floor(timeoutMs - (performance.now() - started));
						if (remaining < 1) throw new ArtifactError('deadline_exceeded');
						const artifact = await persistRenderedProductArtifact(
							persist,
							{
								owner: job.owner,
								reading: {
									id: run.id,
									productId: run.productId,
									revision: run.revision,
									reviewDigest: run.editorial.reviewDigest,
									sectionCount: run.editorial.sections.length
								},
								format: job.format,
								section: job.section,
								rendererVersion: version,
								bytes: rendered
							},
							{ signal: controller.signal, timeoutMs: Math.min(10000, remaining) }
						);
						check();
						bytes = artifact.bytes;
						outcome = 'stored';
						return { status: 'stored' as const, artifact };
					})()
				]);
			} catch (error) {
				if (error instanceof ArtifactError) throw error;
				throw new ArtifactError(
					controller.signal.aborted ? 'deadline_exceeded' : 'artifact_unavailable'
				);
			} finally {
				clearTimeout(timer);
				signal?.removeEventListener('abort', abort);
				try {
					void Promise.resolve(
						emit?.({
							outcome,
							format: Object.hasOwn(artifactFormats, job.format) ? job.format : 'unknown',
							elapsedMs: Math.max(0, Math.round(performance.now() - started)),
							bytes
						})
					).catch(() => {});
				} catch {
					/* Observability cannot change delivery. */
				}
			}
		}
	});
}
