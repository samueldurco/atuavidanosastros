import type { ContinuitySummary } from '$lib/continuity-summary';

export type NatalSummary =
	| { state: 'PREVIEW' | 'UNAVAILABLE' | 'NOT_STARTED' | 'IN_PROGRESS' }
	| { state: 'COMPLETE'; timePrecision: 'EXACT' | 'APPROXIMATE' };

export interface DashboardData {
	preview: boolean;
	items: { id: string; title: string; created_at: string }[];
	libraryError: boolean;
	natal: NatalSummary;
	continuity: ContinuitySummary;
}

export function natalSummaryCopy(natal: NatalSummary) {
	switch (natal.state) {
		case 'PREVIEW':
			return {
				title: 'Dados de nascimento',
				description: 'Entre para salvar ou consultar seus dados de nascimento.',
				action: 'Entrar na minha conta',
				href: '/entrar?next=%2Fconta%2Fnascimento'
			};
		case 'UNAVAILABLE':
			return {
				title: 'Não foi possível carregar seus dados de nascimento.',
				description: 'Tente carregar os dados salvos antes de fazer alterações.',
				action: 'Carregar dados de nascimento',
				href: '/conta/nascimento'
			};
		case 'NOT_STARTED':
			return {
				title: 'Cadastre seus dados de nascimento',
				description: 'Salve data, hora e local de nascimento para usar nas leituras.',
				action: 'Cadastrar dados de nascimento',
				href: '/conta/nascimento'
			};
		case 'IN_PROGRESS':
			return {
				title: 'Complete seus dados de nascimento',
				description: 'Complete os dados que faltam. Se não souber a hora, marque essa opção.',
				action: 'Completar dados de nascimento',
				href: '/conta/nascimento'
			};
		case 'COMPLETE':
			return {
				title: 'Dados de nascimento salvos',
				description:
					natal.timePrecision === 'APPROXIMATE'
						? 'Você informou uma hora aproximada. Isso pode alterar o Ascendente e as casas do mapa.'
						: 'Consulte, corrija ou exclua seus dados de nascimento.',
				action: 'Revisar dados de nascimento',
				href: '/conta/nascimento'
			};
	}
}
