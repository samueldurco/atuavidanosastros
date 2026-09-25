import { parseWorkflowInput, workflowFor, WORKFLOW_VERSION, validDate } from '@atv/domain';

export const symbolicProducts = [
	'daily-card',
	'three-questions',
	'dream-reading',
	'dream-journal'
] as const;
export const symbolicProduct = (id: string) =>
	symbolicProducts.some((candidate) => candidate === id) ? workflowFor(id) : undefined;
export type IntakeAccess = 'AVAILABLE' | 'UNRELEASED' | 'ACCESS_REQUIRED' | 'UNAVAILABLE';

/** Form values remain in memory only. The domain parser remains the wire-contract authority. */
export function parseSymbolicForm(productId: string, form: FormData) {
	const product = symbolicProduct(productId);
	const errors: Record<string, string> = {};
	const value = (name: string) => {
		const values = form.getAll(name);
		if (values.length > 1 || values.some((entry) => typeof entry !== 'string')) {
			errors[name] = 'Revise este campo antes de enviar.';
			return '';
		}
		return (values[0] as string | undefined) ?? '';
	};
	const text = (name: string, max: number, required = false) => {
		const v = value(name);
		if (
			(required && !v.trim()) ||
			v.length > max ||
			// Reject controls while allowing tab/newline in prose.
			// eslint-disable-next-line no-control-regex
			/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)
		)
			errors[name] =
				required && !v.trim()
					? 'Preencha este campo.'
					: `Use até ${max} caracteres, sem caracteres de controle.`;
		return v;
	};
	const storage = value('storage');
	if (storage !== 'on') errors.storage = 'Confirme o armazenamento para criar o pedido.';
	const continuity = value('continuity');
	if (!['', 'on'].includes(continuity)) errors.continuity = 'Revise sua escolha de continuidade.';
	const context = text('context', 1200);
	const consent = {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: continuity === 'on'
	};
	const base = {
		version: WORKFLOW_VERSION,
		productId,
		consent,
		...(context.trim() ? { context } : {})
	};
	const allowed = ['storage', 'context'];
	let candidate: unknown;
	if (product?.kind === 'tarot') {
		const questions = Array.from({ length: productId === 'three-questions' ? 3 : 1 }, (_, i) => {
			const name = `question${i + 1}`;
			allowed.push(name);
			return text(name, 400, true);
		});
		candidate = { ...base, questions };
	} else if (product?.kind === 'dream') {
		allowed.push('continuity', 'date', 'narrative', 'associations', 'emotions');
		const date = value('date');
		if (!validDate(date)) errors.date = 'Informe uma data válida entre 1900 e 2099.';
		const narrative = text('narrative', 6000, true);
		const lines = (name: string, max: number) => {
			const entries = value(name)
				.split(/\r?\n/)
				.filter((line) => line.trim());
			if (
				entries.length > 8 ||
				// Single-line tags cannot carry control characters.
				// eslint-disable-next-line no-control-regex
				entries.some((line) => line.length > max || /[\u0000-\u001f]/.test(line))
			)
				errors[name] = `Use até 8 linhas, com até ${max} caracteres em cada uma.`;
			return entries;
		};
		candidate = {
			...base,
			dream: {
				date,
				narrative,
				associations: lines('associations', 200),
				emotions: lines('emotions', 80)
			}
		};
	}
	if (!product || [...form.keys()].some((key) => !allowed.includes(key)))
		errors.form = 'Este formulário não corresponde a um produto de entrada disponível.';
	const input = Object.keys(errors).length ? null : parseWorkflowInput(candidate);
	if (!input && !Object.keys(errors).length) errors.form = 'Revise os dados antes de enviar.';
	return { input, errors };
}
