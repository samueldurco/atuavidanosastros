import { json, type RequestEvent } from '@sveltejs/kit';
import { artifactFormats, artifactUuid, parseArtifactManifest } from '@atv/domain';
import { workflowApi } from './workflow-api';
import { parseProductRun } from '../product-run';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow',
	'x-content-type-options': 'nosniff',
	'cross-origin-resource-policy': 'same-origin'
};
const fail = (error: string, status: number) => json({ error }, { status, headers });

/** Recover actual stored bytes. Neither a manifest nor a prior page load substitutes for current authorization. */
export async function workflowArtifacts(
	event: Pick<RequestEvent, 'request' | 'url' | 'locals'>,
	id: string,
	artifactId?: string
): Promise<Response> {
	try {
		if (event.request.method !== 'GET') return fail('method_not_allowed', 405);
		const origin = event.request.headers.get('origin');
		if (
			(origin && origin !== event.url.origin) ||
			event.request.headers.get('sec-fetch-site') === 'cross-site'
		)
			return fail('same_origin_required', 403);
		if (
			[...event.url.searchParams].length ||
			!artifactUuid(id) ||
			(artifactId !== undefined && !artifactUuid(artifactId))
		)
			return fail('artifact_not_found', 404);
		const response = await workflowApi(event, 'read', id);
		if (!response.ok) return response;
		const payload = await response.json();
		const run = parseProductRun(
			payload && typeof payload === 'object' && 'run' in payload ? payload.run : null
		);
		if (!run?.released || !run.editorial || !run.calculation)
			return fail('artifact_not_found', 404);
		const reading = {
			id: run.id,
			productId: run.productId,
			revision: run.revision,
			reviewDigest: run.editorial.reviewDigest,
			sectionCount: run.editorial.sections.length
		};
		const client = event.locals.supabase!;
		const { data, error } =
			artifactId === undefined
				? await client.rpc('list_product_artifacts', { p_run_id: id })
				: await client.rpc('read_product_artifact', { p_run_id: id, p_id: artifactId });
		if (error) return fail('artifact_unavailable', 503);
		if (artifactId === undefined) {
			if (!Array.isArray(data) || data.length > 200) return fail('artifact_unavailable', 503);
			const artifacts = data.map((v) => parseArtifactManifest(v, reading));
			if (
				artifacts.some((v) => !v || (v.format === 'svg' && !run.cartography)) ||
				new Set(artifacts.map((v) => v?.id)).size !== artifacts.length
			)
				return fail('artifact_unavailable', 503);
			return json({ artifacts }, { headers });
		}
		if (data === null) return fail('artifact_not_found', 404);
		const manifest = parseArtifactManifest(data, reading);
		if (
			!manifest ||
			manifest.id !== artifactId ||
			(manifest.format === 'svg' && !run.cartography) ||
			typeof data.bodyBase64 !== 'string' ||
			data.bodyBase64.length > Math.ceil(manifest.bytes / 3) * 4
		)
			return fail('artifact_unavailable', 503);
		const binary = atob(data.bodyBase64);
		if (binary.length !== manifest.bytes || btoa(binary) !== data.bodyBase64)
			return fail('artifact_unavailable', 503);
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) =>
			v.toString(16).padStart(2, '0')
		).join('');
		if (digest !== manifest.sha256) return fail('artifact_unavailable', 503);
		const policy = artifactFormats[manifest.format];
		return new Response(bytes, {
			headers: {
				...headers,
				'content-type': policy.mime,
				'content-disposition': `attachment; filename="atv-${run.productId}-${id}-r${run.revision}-${manifest.id}.${policy.extension}"`,
				'content-security-policy':
					"default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; base-uri 'none'; form-action 'none'; sandbox; frame-ancestors 'none'",
				'x-atv-artifact-id': manifest.id,
				'x-atv-export-version': manifest.rendererVersion,
				'x-atv-artifact-sha256': digest
			}
		});
	} catch {
		return fail('artifact_unavailable', 503);
	}
}
