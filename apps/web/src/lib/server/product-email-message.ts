import { parseProductEmailReceipt } from '../product-email';
import { parseProductRun } from '../product-run';

export const EMAIL_MESSAGE_VERSION = 'atv-email-message/1.1.0';
export interface EmailMessageConfiguration {
	/** Fixed trusted server configuration, never a request origin/URL/header. */
	accountOrigin?: string;
}
function accountOrigin(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 260) return null;
	try {
		const url = new URL(value);
		if (
			url.protocol !== 'https:' ||
			url.username ||
			url.password ||
			url.port ||
			url.search ||
			url.hash ||
			url.pathname !== '/' ||
			(value !== url.origin && value !== `${url.origin}/`) ||
			!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(url.hostname)
		)
			return null;
		return url.origin;
	} catch {
		return null;
	}
}
async function digest(value: unknown) {
	const bytes = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(JSON.stringify(value))
	);
	return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Pure private composition from fresh trusted owner-scoped reader/receipt projections.
 * Matching snapshots are NOT authentication, current consent, recipient verification or dispatch permission. */
export async function prepareProductEmailMessage(
	reading: unknown,
	requestReceipt: unknown,
	configuration: EmailMessageConfiguration = {}
) {
	const origin = accountOrigin(configuration.accountOrigin);
	if (!origin) return null;
	const run = parseProductRun(reading);
	const receipt = parseProductEmailReceipt(requestReceipt);
	if (
		!run?.released ||
		!run.calculation ||
		!run.editorial ||
		!run.libraryItemId ||
		!receipt ||
		receipt.state !== 'REQUESTED' ||
		receipt.runId.toLowerCase() !== run.id.toLowerCase() ||
		receipt.revision !== run.revision ||
		receipt.reviewDigest !== run.editorial.reviewDigest
	)
		return null;
	const message = {
		subject: 'Sua leitura na Biblioteca ATV',
		text: [
			'A Tua Vida nos Astros',
			'Aqui está o link que você pediu para acessar sua leitura.',
			`Entre na sua conta para consultar: ${origin}/biblioteca`,
			'Na Biblioteca, você encontra o andamento e o resultado disponível.',
			'Sua leitura e seus dados de nascimento ficam na sua conta.'
		].join('\n\n')
	};
	// Capture primitives before asynchronous hashing; do not retain caller-owned objects.
	const basis = {
		receiptId: receipt.id.toLowerCase(),
		runId: run.id.toLowerCase(),
		productId: run.productId,
		revision: run.revision,
		reviewDigest: receipt.reviewDigest,
		requestedAt: receipt.createdAt,
		accountOrigin: origin
	};
	const messageDigest = await digest(message);
	const basisDigest = await digest({ version: EMAIL_MESSAGE_VERSION, basis, messageDigest });
	return {
		version: EMAIL_MESSAGE_VERSION,
		status: 'prepared' as const,
		dispatch: 'blocked' as const,
		providerAcceptance: 'not-attempted' as const,
		contentType: 'text/plain; charset=utf-8' as const,
		message,
		messageDigest,
		basis,
		basisDigest
	};
}
