import {
	NATAL_CONSENT_VERSION,
	ONBOARDING_VERSION,
	parseOnboardingCommand,
	type OnboardingCommand,
	type OnboardingSnapshot
} from './onboarding';

export interface NatalForm {
	date: string;
	time: string;
	precision: 'EXACT' | 'APPROXIMATE' | 'UNKNOWN';
	location: string;
	country: string;
	latitude: string;
	longitude: string;
	timezone: string;
	offset: string;
	source: string;
}
export const emptyNatalForm = (): NatalForm => ({
	date: '',
	time: '',
	precision: 'UNKNOWN',
	location: '',
	country: '',
	latitude: '',
	longitude: '',
	timezone: '',
	offset: '',
	source: ''
});
export function formFromNatal(natal: OnboardingSnapshot['natal']): NatalForm {
	if (!natal) return emptyNatalForm();
	const seconds = (Date.parse(`${natal.localDateTime}Z`) - Date.parse(natal.utcInstant)) / 1000;
	const abs = Math.abs(seconds);
	const pad = (n: number) => String(n).padStart(2, '0');
	return {
		date: natal.localDateTime.slice(0, 10),
		time: natal.localDateTime.slice(11),
		precision: natal.timePrecision,
		location: natal.locationLabel,
		country: natal.countryCode,
		latitude: String(natal.latitude),
		longitude: String(natal.longitude),
		timezone: natal.timezone,
		offset: `${seconds < 0 ? '-' : '+'}${pad(Math.floor(abs / 3600))}:${pad(Math.floor((abs % 3600) / 60))}:${pad(abs % 60)}`,
		source: natal.locationSource
	};
}
export function natalFormCommand(
	form: NatalForm,
	revision: number,
	consent: boolean
): { command: OnboardingCommand | null; error: string } {
	const fail = (error: string) => ({ command: null, error });
	if (form.precision === 'UNKNOWN')
		return fail(
			'Sem horário conhecido, você pode continuar depois. Não preenchemos um horário por você.'
		);
	if (!consent) return fail('Autorize o armazenamento do seu perfil natal para salvar.');
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
		!/^\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(form.time)
	)
		return fail('Confira a data e a hora de nascimento.');
	const localDateTime = `${form.date}T${form.time.length === 5 ? `${form.time}:00` : form.time}`;
	const local = new Date(`${localDateTime}Z`);
	if (
		!Number.isFinite(local.valueOf()) ||
		local.toISOString().slice(0, 19) !== localDateTime.slice(0, 19)
	)
		return fail('Confira a data e a hora de nascimento.');
	const offset = /^([+-])(\d{2}):([0-5]\d)(?::([0-5]\d))?$/.exec(form.offset.trim());
	if (!offset || Number(offset[2]) > 23)
		return fail('Informe o deslocamento UTC da data de nascimento, como -03:00.');
	const offsetSeconds =
		(Number(offset[2]) * 3600 + Number(offset[3]) * 60 + Number(offset[4] ?? 0)) *
		(offset[1] === '-' ? -1 : 1);
	const utcInstant = new Date(local.valueOf() - offsetSeconds * 1000).toISOString();
	if (utcInstant < '1900-01-01T00:00:00.000Z' || utcInstant > '2099-12-31T23:59:59.999Z')
		return fail('O instante de nascimento deve estar entre 1900 e 2099.');
	const decimal = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
	if (!decimal.test(form.latitude.trim()) || !decimal.test(form.longitude.trim()))
		return fail('Informe latitude e longitude em graus decimais, usando ponto.');
	const command = parseOnboardingCommand({
		version: ONBOARDING_VERSION,
		expectedRevision: revision,
		action: 'save-natal',
		natal: {
			localDateTime,
			utcInstant,
			timezone: form.timezone.trim(),
			latitude: Number(form.latitude),
			longitude: Number(form.longitude),
			locationSource: form.source.trim(),
			timePrecision: form.precision,
			locationLabel: form.location.trim(),
			countryCode: form.country.trim().toUpperCase()
		},
		consent: { storage: true, policyVersion: NATAL_CONSENT_VERSION }
	});
	return command
		? { command, error: '' }
		: fail('Confira o local, país, coordenadas, fonte e identificador de fuso.');
}
