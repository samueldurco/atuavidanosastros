import { productCatalog } from '@atv/domain';
import { parseProductRun } from '../product-run';

export const NARRATION_VERSION = 'atv-audio-transcript/1.0.0';
export const NARRATION_MAX_BYTES = 90_000;
export interface NarrationSegment {
	id: string;
	kind:
		| 'title'
		| 'notice'
		| 'heading'
		| 'section'
		| 'evidence'
		| 'fact-label'
		| 'fact'
		| 'source'
		| 'limit'
		| 'method';
	text: string;
	evidence: string[];
}
const kinds = {
	calculated: 'Dado calculado',
	reported: 'Relato informado',
	drawn: 'Carta sorteada'
};
const encoder = new TextEncoder();
function speakable(text: string) {
	for (const char of text) {
		const cp = char.codePointAt(0)!;
		if (
			(cp < 32 && ![9, 10, 13].includes(cp)) ||
			(cp >= 127 && cp <= 159) ||
			(cp >= 0xd800 && cp <= 0xdfff) ||
			(cp >= 0x202a && cp <= 0x202e) ||
			(cp >= 0x2066 && cp <= 0x2069) ||
			cp === 0x200e ||
			cp === 0x200f ||
			cp === 0x061c
		)
			return false;
	}
	return true;
}
async function digest(text: string) {
	const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(text));
	return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Internal pure preparation from a fresh trusted owner projection. NOT auth, synthesis or approval.
 * Never send this candidate to a provider based only on these flags/digests. No network or storage. */
export async function prepareProductNarration(value: unknown) {
	const run = parseProductRun(value);
	const product = productCatalog.find((entry) => entry.id === run?.productId);
	if (!run?.released || !run.calculation || !run.editorial || !product?.delivery.includes('audio'))
		return null;
	const { calculation, editorial } = run;
	const segments: NarrationSegment[] = [];
	const add = (
		id: string,
		kind: NarrationSegment['kind'],
		text: string,
		evidence: string[] = []
	) => {
		segments.push({ id, kind, text, evidence: [...evidence] });
	};
	add('product', 'notice', `A Tua Vida nos Astros. ${product.name}.`);
	add('title', 'title', editorial.title);
	add(
		'scope',
		'notice',
		'Esta leitura é simbólica e não determina suas escolhas. Não substitui orientação profissional.'
	);
	for (const [i, section] of editorial.sections.entries()) {
		add(`section-${i}-heading`, 'heading', section.title);
		add(`section-${i}`, 'section', section.text, section.evidence);
		add(
			`section-${i}-evidence`,
			'evidence',
			`Referências desta seção: ${section.evidence.join('; ')}.`,
			section.evidence
		);
	}
	add('basis', 'heading', 'Base e limites da leitura');
	for (const [i, fact] of calculation.facts.entries()) {
		add(
			`fact-${i}-label`,
			'fact-label',
			`${kinds[fact.kind as keyof typeof kinds]}. Referência: ${fact.id}.`,
			[fact.id]
		);
		add(`fact-${i}`, 'fact', fact.display, [fact.id]);
		add(`fact-${i}-source`, 'source', fact.source, [fact.id]);
	}
	add('calculation-method', 'method', `Método: ${calculation.version}.`);
	add('editorial-method', 'method', `Edição: ${editorial.version}.`);
	add('calculation-limits', 'heading', 'Limites da base');
	calculation.limits.forEach((limit, i) => add(`calculation-limit-${i}`, 'limit', limit));
	add('editorial-limits', 'heading', 'Limites da interpretação');
	editorial.limits.forEach((limit, i) => add(`editorial-limit-${i}`, 'limit', limit));
	add(
		'privacy',
		'notice',
		'Esta é uma leitura pessoal. Proteja suas cópias: excluir ou revogar o registro na Biblioteca não apaga arquivos já baixados. Consulte a Biblioteca para verificar o estado atual desta versão.'
	);
	if (segments.some((segment) => !speakable(segment.text))) return null;
	const text = segments.map((segment) => segment.text).join('\n\n');
	const bytes = encoder.encode(text).byteLength;
	if (bytes > NARRATION_MAX_BYTES) return null;
	const binding = {
		runId: run.id,
		productId: run.productId,
		revision: run.revision,
		calculationVersion: calculation.version,
		editorialVersion: editorial.version,
		promotionId: editorial.promotionId,
		reviewDigest: editorial.reviewDigest
	};
	const transcriptDigest = await digest(text);
	const manifest = { version: NARRATION_VERSION, binding, segments, transcriptDigest };
	return {
		...manifest,
		status: 'prepared' as const,
		synthesis: 'blocked' as const,
		publication: 'blocked' as const,
		contentType: 'text/plain; charset=utf-8' as const,
		language: 'pt-BR' as const,
		text,
		bytes,
		manifestDigest: await digest(JSON.stringify(manifest))
	};
}
