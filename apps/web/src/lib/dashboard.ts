export type NatalSummary =
	| { state: 'PREVIEW' | 'UNAVAILABLE' | 'NOT_STARTED' | 'IN_PROGRESS' }
	| { state: 'COMPLETE'; timePrecision: 'EXACT' | 'APPROXIMATE' };

export interface DashboardData {
	preview: boolean;
	items: { id: string; title: string; created_at: string }[];
	libraryError: boolean;
	natal: NatalSummary;
}

export function natalSummaryCopy(natal: NatalSummary) {
	switch (natal.state) {
		case 'PREVIEW':
			return {
				title: 'Seu contexto, quando você quiser.',
				description:
					'Entre para iniciar ou recuperar seu perfil natal. Nenhum dado de nascimento é necessário para explorar o site.',
				action: 'Entrar na minha conta',
				href: '/entrar'
			};
		case 'UNAVAILABLE':
			return {
				title: 'Não foi possível recuperar seu perfil natal.',
				description:
					'Não sabemos se o cadastro está completo. Tente recuperar o estado salvo antes de fazer alterações.',
				action: 'Recuperar perfil natal',
				href: '/conta/nascimento'
			};
		case 'NOT_STARTED':
			return {
				title: 'Seu perfil natal ainda não foi iniciado.',
				description:
					'Você escolhe se deseja guardar seus dados de nascimento. Pode começar agora ou deixar para depois.',
				action: 'Iniciar perfil natal',
				href: '/conta/nascimento'
			};
		case 'IN_PROGRESS':
			return {
				title: 'Seu perfil natal está em andamento.',
				description:
					'Retome quando tiver os dados necessários. Se não souber a hora, não precisa inventar uma.',
				action: 'Retomar perfil natal',
				href: '/conta/nascimento'
			};
		case 'COMPLETE':
			return {
				title: 'Seu perfil natal está salvo.',
				description:
					natal.timePrecision === 'APPROXIMATE'
						? 'A hora foi informada como aproximada; essa incerteza permanece registrada. Revise os dados quando precisar.'
						: 'Você pode revisar, corrigir ou apagar os dados guardados. Salvar o perfil não gera uma leitura nem libera produtos.',
				action: 'Revisar perfil natal',
				href: '/conta/nascimento'
			};
	}
}
