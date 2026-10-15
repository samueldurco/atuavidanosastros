import type { WorkflowInput } from '@atv/domain';

// Fictional QA profiles. The first five share one synthetic birth to isolate context effects.
const sharedBirth: NonNullable<WorkflowInput['birth']> = {
	localDateTime: '1992-05-17T08:40:00',
	utcInstant: '1992-05-17T11:40:00Z',
	timezone: 'America/Sao_Paulo',
	latitude: -19.9167,
	longitude: -43.9345,
	locationSource: 'synthetic-local-qa'
};

const alternateBirth: NonNullable<WorkflowInput['birth']> = {
	localDateTime: '1985-08-21T17:20:00',
	utcInstant: '1985-08-21T17:20:00Z',
	timezone: 'UTC',
	latitude: 0,
	longitude: 0,
	locationSource: 'synthetic'
};

const secondAlternateBirth: NonNullable<WorkflowInput['birth']> = {
	localDateTime: '1998-11-09T14:15:00',
	utcInstant: '1998-11-09T14:15:00Z',
	timezone: 'UTC',
	latitude: 0,
	longitude: 0,
	locationSource: 'synthetic'
};

export type CompassQaProfile = {
	slug: string;
	id: string;
	input: WorkflowInput;
};

function profile(
	slug: string,
	id: string,
	name: string,
	context: string,
	birth: NonNullable<WorkflowInput['birth']> = sharedBirth
): CompassQaProfile {
	return {
		slug,
		id,
		input: {
			version: 'atv-workflow/1.0.0',
			productId: 'career-compass',
			presentation: {
				version: 'atv-reading-identity/1',
				name,
				city: birth === sharedBirth ? 'Belo Horizonte, MG' : 'Localidade fictícia (0° N, 0° L)'
			},
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			},
			context,
			birth: { ...birth }
		}
	};
}

export const compassQaProfiles: CompassQaProfile[] = [
	profile(
		'livia',
		'00000000-0000-4000-8000-000000001021',
		'Lívia Azevedo',
		'Lívia trabalha com comunicação e quer testar a ilustração editorial sem abandonar sua renda atual de imediato.'
	),
	profile(
		'ceramics-employment',
		'00000000-0000-4000-8000-000000001101',
		'Caio Martins',
		'Quero testar a cerâmica mantendo meu emprego.'
	),
	profile(
		'leadership',
		'00000000-0000-4000-8000-000000001102',
		'Joana Ribeiro',
		'Preciso coordenar uma equipe em uma entrega conjunta.'
	),
	profile(
		'workload',
		'00000000-0000-4000-8000-000000001103',
		'Marina Costa',
		'Estou com sobrecarga e preciso descansar.'
	),
	profile(
		'study',
		'00000000-0000-4000-8000-000000001104',
		'Rafael Nogueira',
		'Quero estudar uma nova habilidade antes de escolher um curso.'
	),
	profile(
		'different-birth',
		'00000000-0000-4000-8000-000000001105',
		'Helena Duarte',
		'Quero comparar a atividade atual com uma alternativa de trabalho.',
		alternateBirth
	)
];

export const compassQaCounterfactuals: CompassQaProfile[] = [
	profile(
		'consulting-employment',
		'00000000-0000-4000-8000-000000001201',
		'André Carvalho',
		'Quero experimentar uma consultoria mantendo meu emprego.'
	),
	profile(
		'negated-then-ceramics',
		'00000000-0000-4000-8000-000000001202',
		'Bianca Lima',
		'Não quero testar desenho agora, mas quero experimentar cerâmica mantendo meu emprego.'
	),
	profile(
		'workload-and-transition',
		'00000000-0000-4000-8000-000000001203',
		'Daniel Pereira',
		'Estou com sobrecarga e preciso descansar; também quero experimentar cerâmica mantendo meu emprego.'
	),
	profile(
		'second-birth-same-context',
		'00000000-0000-4000-8000-000000001204',
		'Ester Almeida',
		'Quero comparar a atividade atual com uma alternativa de trabalho.',
		secondAlternateBirth
	),
	profile(
		'without-rest',
		'00000000-0000-4000-8000-000000001205',
		'Fábio Rocha',
		'Estou sem descanso e preciso reduzir a carga.'
	),
	profile(
		'negated-study-then-team',
		'00000000-0000-4000-8000-000000001206',
		'Gabriela Souza',
		'Não quero estudar agora; preciso coordenar uma equipe.'
	),
	profile(
		'negated-job-change',
		'00000000-0000-4000-8000-000000001207',
		'Hugo Freitas',
		'Não quero mudar de emprego; quero apenas entender meu trabalho atual.'
	),
	profile(
		'negated-leadership',
		'00000000-0000-4000-8000-000000001208',
		'Isabela Castro',
		'Não quero liderar equipe agora; preciso rever minha rotina atual.'
	),
	profile(
		'no-rest-and-reduce-workload',
		'00000000-0000-4000-8000-000000001209',
		'Lucas Vieira',
		'Não tenho descanso e preciso reduzir a carga.'
	),
	profile(
		'unable-to-rest',
		'00000000-0000-4000-8000-000000001210',
		'Ana Martins',
		'Não consigo descansar e preciso reduzir a carga.'
	)
];
