import type { PublicTopicId } from './public-navigation';
import type { OfferedProductId } from '@atv/domain';

export interface FreeTool {
	id: string;
	label: string;
	href: string;
	topicId: PublicTopicId;
	description: string;
	action: string;
	availability: 'available' | 'partial';
	availabilityLabel: string;
	requirements: string;
	offerIds: readonly OfferedProductId[];
}

// A public tool's availability is independent of a personalized product's release.
export const freeTools: readonly FreeTool[] = [
	{
		id: 'ascendente',
		label: 'Calculadora de Ascendente',
		href: '/ferramentas/ascendente',
		topicId: 'meu-ceu',
		description: 'Calcule o signo e a posição do seu Ascendente com seus dados de nascimento.',
		action: 'Descobrir meu ascendente',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Data, hora e local de nascimento. A hora influencia o resultado.',
		offerIds: ['three-pillars', 'birth-chart']
	},
	{
		id: 'mapa-astral',
		label: 'Mapa Astral Grátis',
		href: '/ferramentas/mapa-astral',
		topicId: 'meu-ceu',
		description: 'Veja as posições e os principais elementos do seu mapa natal calculado.',
		action: 'Calcular meu mapa astral',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Data, hora e local de nascimento.',
		offerIds: ['birth-chart', 'life-atlas']
	},
	{
		id: 'horoscopo',
		label: 'Horóscopo de Hoje',
		href: '/ferramentas/horoscopo',
		topicId: 'ciclos',
		description: 'Escolha seu signo e consulte a previsão de hoje quando estiver disponível.',
		action: 'Consultar meu signo',
		availability: 'partial',
		availabilityLabel: 'Disponibilidade parcial',
		requirements: 'Seu signo. A previsão depende da publicação do dia.',
		offerIds: ['week-reading', 'personal-calendar', 'date-reading', 'solar-return']
	},
	{
		id: 'combinacao-do-casal',
		label: 'Combinação Astral do Casal',
		href: '/ferramentas/combinacao-do-casal',
		topicId: 'amor',
		description: 'Compare elementos dos dois mapas em uma primeira exploração de afinidades.',
		action: 'Explorar nossa combinação',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Dados de nascimento das duas pessoas, com autorização para utilizá-los.',
		offerIds: ['synastry', 'couple-dossier']
	},
	{
		id: 'meio-do-ceu',
		label: 'Calculadora do Meio do Céu',
		href: '/ferramentas/meio-do-ceu',
		topicId: 'proposito',
		description:
			'Calcule o signo e a posição do seu Meio do Céu para começar a explorar carreira no mapa.',
		action: 'Calcular meu Meio do Céu',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Data, hora e local de nascimento.',
		offerIds: ['purpose-career', 'career-forecast-30d']
	},
	{
		id: 'dinheiro-no-mapa',
		label: 'Dinheiro no Seu Mapa Astral',
		href: '/ferramentas/dinheiro-no-mapa',
		topicId: 'proposito',
		description: 'Conheça elementos do seu mapa ligados à sua relação com recursos e dinheiro.',
		action: 'Explorar dinheiro no meu mapa',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Data, hora e local de nascimento.',
		offerIds: ['purpose-career', 'career-forecast-30d']
	},
	{
		id: 'carta-do-dia',
		label: 'Carta do Dia',
		href: '/ferramentas/carta-do-dia',
		topicId: 'tarot',
		description: 'Tire uma carta e use seu simbolismo como convite à reflexão sobre o seu dia.',
		action: 'Tirar minha carta do dia',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Não exige dados de nascimento nem uma pergunta.',
		offerIds: [
			'tarot-situation-challenge-advice',
			'tarot-peladan-cross',
			'tarot-celtic-cross',
			'tarot-astrological-mandala'
		]
	},
	{
		id: 'carta-do-amor',
		label: 'Carta do Amor',
		href: '/ferramentas/carta-do-amor',
		topicId: 'tarot',
		description:
			'Tire uma carta para refletir sobre sua maneira de viver o amor e os relacionamentos.',
		action: 'Tirar minha carta do amor',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Não exige dados de nascimento nem uma pergunta.',
		offerIds: ['tarot-aphrodite-temple']
	},
	{
		id: 'registro-de-sonho',
		label: 'Registro de Sonhos',
		href: '/ferramentas/registro-de-sonho',
		topicId: 'sonhos',
		description: 'Anote seu sonho, as emoções e as associações que você lembra.',
		action: 'Registrar meu sonho',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Seu relato. Não exige dados de nascimento.',
		offerIds: ['dream-reading', 'dream-dossier', 'dream-atlas']
	}
];

export const freeToolIdAliases: Readonly<Record<string, string>> = {
	'bussola-de-carreira': 'meio-do-ceu',
	'tarot-sim-ou-nao': 'carta-do-amor'
};

export function freeToolById(id: string) {
	const canonical = Object.hasOwn(freeToolIdAliases, id) ? freeToolIdAliases[id] : id;
	return freeTools.find((tool) => tool.id === canonical);
}
