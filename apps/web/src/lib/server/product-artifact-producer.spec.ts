import { expect, it, vi } from 'vitest';
import { artifactFormats, type ArtifactFormat } from '@atv/domain';
import {
	cardFixture,
	exportFixture,
	pdfFixture,
	svgFixture
} from '../../../tests/fixtures/product-export';
import {
	createArtifactProducer,
	type ArtifactJob,
	type ArtifactProductionEvent
} from './product-artifact-producer';
import type { ProductRunView } from '../product-run';
import { renderProductWebExport } from './product-export';
import { renderProductPdf } from './product-pdf';
import { renderProductSvg } from './product-svg';
import { renderProductCard } from './product-card';

const owner = '00000000-0000-4000-8000-000000000003';
const jobFor = (run: ProductRunView, format: ArtifactFormat = 'web'): ArtifactJob => ({
	owner,
	runId: run.id,
	revision: run.revision,
	reviewDigest: run.editorial!.reviewDigest,
	format,
	section: format === 'card' ? 0 : -1
});
const receipt = (args: Record<string, unknown>) => ({
	id: '00000000-0000-4000-8000-000000000002',
	runId: args.p_run_id,
	revision: args.p_revision,
	reviewDigest: args.p_review_digest,
	format: args.p_format,
	section: args.p_section,
	rendererVersion: args.p_renderer,
	sha256: args.p_sha256,
	bytes: atob(args.p_body_base64 as string).length,
	createdAt: '2026-09-22T10:00:00Z'
});

it('is disabled by default and captures server configuration without calls or secrets in telemetry', async () => {
	const events: ArtifactProductionEvent[] = [],
		read = vi.fn(),
		persist = vi.fn();
	const config = { enabled: false, emit: (event: ArtifactProductionEvent) => events.push(event) };
	const producer = createArtifactProducer({ read, persist }, config);
	config.enabled = true;
	expect(await producer.produce(jobFor(exportFixture()))).toEqual({ status: 'disabled' });
	expect(read).not.toHaveBeenCalled();
	expect(persist).not.toHaveBeenCalled();
	expect(events).toEqual([
		{ outcome: 'disabled', format: 'web', elapsedMs: expect.any(Number), bytes: 0 }
	]);
	for (const timeoutMs of [0, -1, 1.5, 15001])
		expect(() => createArtifactProducer({ read, persist }, { timeoutMs })).toThrow(
			'artifact_invalid'
		);
});

it.each(['web', 'pdf', 'svg', 'card'] as const)(
	'composes the actual %s renderer, exact bytes and identical retries',
	async (format) => {
		const run =
			format === 'pdf'
				? pdfFixture()
				: format === 'svg'
					? svgFixture()
					: format === 'card'
						? cardFixture()
						: exportFixture();
		const expected =
			format === 'pdf'
				? (await renderProductPdf(run))!.bytes
				: new TextEncoder().encode(
						format === 'web'
							? renderProductWebExport(run)!.html
							: format === 'svg'
								? renderProductSvg(run)!.svg
								: renderProductCard(run, 0)!.svg
					);
		const read = vi.fn(async () => run),
			calls: Record<string, unknown>[] = [],
			events: ArtifactProductionEvent[] = [];
		const producer = createArtifactProducer(
			{
				read,
				persist: async (name, args, signal) => {
					expect(name).toBe('persist_product_artifact');
					expect(signal.aborted).toBe(false);
					calls.push(args);
					return receipt(args);
				}
			},
			{ enabled: true, emit: (event) => events.push(event) }
		);
		const result = await producer.produce(jobFor(run, format));
		expect(result.status).toBe('stored');
		expect(await producer.produce(jobFor(run, format))).toEqual(result);
		expect(calls[1]).toEqual(calls[0]);
		expect(Uint8Array.from(atob(calls[0].p_body_base64 as string), (c) => c.charCodeAt(0))).toEqual(
			expected
		);
		expect(calls[0].p_renderer).toBe(artifactFormats[format].renderer);
		expect(read).toHaveBeenCalledWith(owner, run.id, expect.any(AbortSignal));
		expect(events).toEqual(
			Array.from({ length: 2 }, () => ({
				outcome: 'stored',
				format,
				elapsedMs: expect.any(Number),
				bytes: expected.length
			}))
		);
	}
);

it('refuses malformed envelopes before reading and stale, revoked or ineligible projections before writing', async () => {
	let run: unknown = exportFixture();
	const job = jobFor(run as ProductRunView);
	const read = vi.fn(async () => run),
		persist = vi.fn();
	const producer = createArtifactProducer({ read, persist }, { enabled: true });
	for (const input of [
		{ ...job, owner: 'bad' },
		{ ...job, section: 0 },
		{ ...job, format: 'audio' },
		{ ...job, bytes: new Uint8Array([1]) },
		{ ...job, revision: 9 }
	]) {
		await expect(producer.produce(input as ArtifactJob)).rejects.toThrow('artifact_invalid');
	}
	expect(read).not.toHaveBeenCalled();
	for (const projection of [
		null,
		{ ...exportFixture(), released: false },
		{ ...exportFixture(), id: owner },
		{
			...exportFixture(),
			editorial: { ...exportFixture().editorial, reviewDigest: 'a'.repeat(64) }
		}
	]) {
		run = projection;
		await expect(producer.produce(job)).rejects.toThrow('artifact_unavailable');
	}
	run = exportFixture();
	for (const format of ['pdf', 'svg'] as const)
		await expect(producer.produce({ ...job, format })).rejects.toThrow('artifact_unavailable');
	await expect(producer.produce({ ...job, format: 'card', section: 39 })).rejects.toThrow(
		'artifact_unavailable'
	);
	expect(persist).not.toHaveBeenCalled();
});

it('captures a job before await, isolates observer failures and rejects uncertain receipts without automatic retries', async () => {
	const run = exportFixture(),
		job = jobFor(run);
	const producer = createArtifactProducer(
		{
			read: async () => {
				job.runId = owner;
				return run;
			},
			persist: async (_, args) => receipt(args)
		},
		{
			enabled: true,
			emit: () => {
				throw new Error('observer failure');
			}
		}
	);
	expect((await producer.produce(job)).status).toBe('stored');
	for (const response of [null, { id: owner }, new Error('private provider detail')]) {
		const persist = vi.fn(async () => {
			if (response instanceof Error) throw response;
			return response;
		});
		const unsafe = createArtifactProducer({ read: async () => run, persist }, { enabled: true });
		await expect(unsafe.produce(jobFor(run))).rejects.toThrow('artifact_unavailable');
		expect(persist).toHaveBeenCalledTimes(1);
	}
});

it('aborts before reading, times out uncooperative reads and never writes after their late completion', async () => {
	const run = exportFixture(),
		job = jobFor(run),
		persist = vi.fn(),
		read = vi.fn(async () => run);
	const cancelled = new AbortController();
	cancelled.abort();
	await expect(
		createArtifactProducer({ read, persist }, { enabled: true }).produce(job, cancelled.signal)
	).rejects.toThrow('deadline_exceeded');
	expect(read).not.toHaveBeenCalled();
	let finish!: (value: unknown) => void;
	const late = vi.fn(
		() =>
			new Promise<unknown>((resolve) => {
				finish = resolve;
			})
	);
	await expect(
		createArtifactProducer({ read: late, persist }, { enabled: true, timeoutMs: 10 }).produce(job)
	).rejects.toThrow('deadline_exceeded');
	finish(run);
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(persist).not.toHaveBeenCalled();
});

it('aborts an in-flight write without reporting an uncertain commit as stored or retrying it', async () => {
	const run = exportFixture(),
		controller = new AbortController(),
		events: ArtifactProductionEvent[] = [];
	let finish!: (value: unknown) => void;
	let args!: Record<string, unknown>;
	const persist = vi.fn(async (_name, input: Record<string, unknown>, signal: AbortSignal) => {
		args = input;
		const pending = new Promise((resolve) => {
			finish = resolve;
		});
		controller.abort();
		expect(signal.aborted).toBe(true);
		return pending;
	});
	const producer = createArtifactProducer(
		{ read: async () => run, persist },
		{ enabled: true, emit: (event) => events.push(event) }
	);
	await expect(producer.produce(jobFor(run), controller.signal)).rejects.toThrow(
		'deadline_exceeded'
	);
	finish(receipt(args));
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(persist).toHaveBeenCalledTimes(1);
	expect(events).toEqual([
		{ outcome: 'failed', format: 'web', elapsedMs: expect.any(Number), bytes: 0 }
	]);
});
