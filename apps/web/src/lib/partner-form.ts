import { PAIR_REQUEST_VERSION, parsePairRequestInput, type PairRequestInput } from './pair-request';

export interface PartnerForm {
	date: string;
	time: string;
	precision: string;
	timezone: string;
	offset: string;
	latitude: string;
	longitude: string;
}
export const emptyPartnerForm = (): PartnerForm => ({
	date: '',
	time: '',
	precision: '',
	timezone: '',
	offset: '',
	latitude: '',
	longitude: ''
});

/** Local validation helps the form; SQL remains the independent authority. No guessed time/zone. */
export function partnerFormValue(form: PartnerForm): {
	partner: PairRequestInput['partner'] | null;
	error: string;
} {
	const fail = (error: string) => ({ partner: null, error });
	if (form.precision !== 'EXACT')
		return fail(
			'O horário da outra pessoa precisa ser conhecido e exato. Não transforme uma estimativa em certeza.'
		);
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
		!/^\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(form.time)
	)
		return fail('Confira a data e a hora de nascimento da outra pessoa.');
	const localDateTime = `${form.date}T${form.time.length === 5 ? `${form.time}:00` : form.time}`;
	const local = new Date(`${localDateTime}Z`);
	if (
		!Number.isFinite(local.valueOf()) ||
		local.toISOString().slice(0, 19) !== localDateTime.slice(0, 19)
	)
		return fail('Confira a data e a hora de nascimento da outra pessoa.');
	const offset = /^([+-])(\d{2}):([0-5]\d)(?::([0-5]\d))?$/.exec(form.offset.trim());
	if (!offset || Number(offset[2]) > 23)
		return fail('Informe o deslocamento UTC válido na data de nascimento, como -03:00.');
	const seconds =
		(Number(offset[2]) * 3600 + Number(offset[3]) * 60 + Number(offset[4] ?? 0)) *
		(offset[1] === '-' ? -1 : 1);
	const instant = new Date(local.valueOf() - seconds * 1000);
	const utcInstant = instant.toISOString();
	if (utcInstant < '1900-01-01T00:00:00.000Z' || utcInstant > '2099-12-31T23:59:59.999Z')
		return fail('O instante de nascimento deve estar entre 1900 e 2099.');
	const timezone = form.timezone.trim();
	try {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		}).formatToParts(instant);
		const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
		if (
			`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` !==
			localDateTime.slice(0, 19)
		)
			return fail(
				'O fuso, o deslocamento UTC e a hora local não correspondem. Confira o horário de verão daquela data.'
			);
	} catch {
		return fail('Informe um identificador de fuso válido, como America/Sao_Paulo.');
	}
	const decimal = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
	if (!decimal.test(form.latitude.trim()) || !decimal.test(form.longitude.trim()))
		return fail('Informe latitude e longitude em graus decimais, usando ponto.');
	// Constant technical provenance, never identity or free context.
	const command = parsePairRequestInput({
		version: PAIR_REQUEST_VERSION,
		productId: 'pair-preview',
		expectedRevision: 1,
		partner: {
			localDateTime,
			utcInstant,
			timezone,
			latitude: Number(form.latitude),
			longitude: Number(form.longitude),
			locationSource: 'manual-partner/1',
			timePrecision: 'EXACT'
		},
		consent: {
			storage: true,
			policyVersion: 'atv-input-consent/1',
			partner: true,
			continuity: false
		},
		partnerConsent: {
			storage: true,
			policyVersion: 'atv-partner-storage/1',
			permissionDeclared: true,
			sharing: false
		}
	});
	return command
		? { partner: command.partner, error: '' }
		: fail('Confira o fuso e os limites das coordenadas (latitude ±90, longitude ±180).');
}
