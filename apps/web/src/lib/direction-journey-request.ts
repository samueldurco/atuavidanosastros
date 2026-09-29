import { parseWorkflowInput, validDate, WORKFLOW_VERSION } from '@atv/domain';

const hasControl = (value: string) =>
	[...value].some((char) => {
		const code = char.charCodeAt(0);
		return code < 32 && code !== 9 && code !== 10 && code !== 13;
	});

/** Keep the user's declaration in memory until an explicit, consented submit. */
export function parseDirectionJourneyForm(form: FormData) {
	const errors: Record<string, string> = {};
	const allowed = ['goal', 'startDate', 'context', 'storage'];
	const value = (name: string) => {
		const entries = form.getAll(name);
		if (entries.length > 1 || entries.some((entry) => typeof entry !== 'string')) {
			errors[name] = 'Revise este campo antes de enviar.';
			return '';
		}
		return (entries[0] as string | undefined) ?? '';
	};
	const goal = value('goal');
	const startDate = value('startDate');
	const context = value('context');
	if (!goal.trim() || goal.length > 400 || hasControl(goal))
		errors.goal = 'Descreva seu objetivo em até 400 caracteres.';
	if (!validDate(startDate) || startDate > '2099-12-02')
		errors.startDate = 'Escolha uma data válida que permita completar os 30 dias.';
	if (context && (context.length > 1200 || !context.trim() || hasControl(context)))
		errors.context = 'Use até 1.200 caracteres, sem caracteres de controle.';
	if (value('storage') !== 'on') errors.storage = 'Autorize o armazenamento deste pedido.';
	if ([...form.keys()].some((key) => !allowed.includes(key)))
		errors.form = 'Este formulário contém um campo inesperado.';
	const input = Object.keys(errors).length
		? null
		: parseWorkflowInput({
				version: WORKFLOW_VERSION,
				productId: 'direction-journey',
				consent: {
					storage: true,
					policyVersion: 'atv-input-consent/1',
					partner: false,
					continuity: false
				},
				journey: { goal, startDate },
				...(context ? { context } : {})
			});
	if (!input && !Object.keys(errors).length) errors.form = 'Revise os dados antes de enviar.';
	return { input, errors };
}
