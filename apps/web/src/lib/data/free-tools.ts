import type { PublicTopicId } from './public-navigation';

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
}

// A public tool's availability is independent of a personalized product's release.
export const freeTools: readonly FreeTool[] = [
	{
		id: 'ascendente',
		label: 'Ascendente',
		href: '/ferramentas/ascendente',
		topicId: 'meu-ceu',
		description: 'Calcule o signo e a posição do seu Ascendente com seus dados de nascimento.',
		action: 'Descobrir meu ascendente',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Data, hora e local de nascimento. A hora influencia o resultado.'
	},
	{
		id: 'mapa-astral',
		label: 'Mapa astral grátis',
		href: '/ferramentas/mapa-astral',
		topicId: 'meu-ceu',
		description: 'Veja as posições e os principais elementos do seu mapa natal calculado.',
		action: 'Calcular meu mapa astral',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Data, hora e local de nascimento.'
	},
	{
		id: 'horoscopo',
		label: 'Horóscopo por signo',
		href: '/ferramentas/horoscopo',
		topicId: 'ciclos',
		description:
			'Escolha seu signo e consulte as publicações disponíveis. Previsões datadas aparecem somente quando publicadas e aprovadas.',
		action: 'Consultar meu signo',
		availability: 'partial',
		availabilityLabel: 'Disponibilidade parcial',
		requirements: 'Seu signo. A existência de previsões depende do período publicado.'
	},
	{
		id: 'combinacao-do-casal',
		label: 'Combinação do Casal',
		href: '/ferramentas/combinacao-do-casal',
		topicId: 'amor',
		description: 'Compare elementos dos dois mapas em uma primeira exploração de afinidades.',
		action: 'Explorar nossa combinação',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Dados de nascimento das duas pessoas, com autorização para utilizá-los.'
	},
	{
		id: 'bussola-de-carreira',
		label: 'Bússola de Carreira',
		href: '/bussola-de-carreira',
		topicId: 'proposito',
		description:
			'Calcule o signo e a posição do seu Meio do Céu para começar a explorar carreira no mapa.',
		action: 'Fazer minha Bússola de Carreira',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Data, hora e local de nascimento.'
	},
	{
		id: 'carta-do-dia',
		label: 'Carta do dia',
		href: '/ferramentas/carta-do-dia',
		topicId: 'tarot',
		description: 'Tire uma carta e use seu simbolismo como convite à reflexão sobre o seu dia.',
		action: 'Tirar minha carta do dia',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Nenhum dado de nascimento.'
	},
	{
		id: 'tarot-sim-ou-nao',
		label: 'Tarot para uma pergunta',
		href: '/ferramentas/tarot-sim-ou-nao',
		topicId: 'tarot',
		description: 'Uma carta para explorar sua pergunta. Esta leitura não responde sim ou não.',
		action: 'Explorar minha pergunta',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Uma pergunta ou foco de reflexão, sem dados de nascimento.'
	},
	{
		id: 'registro-de-sonho',
		label: 'Registro de sonho',
		href: '/ferramentas/registro-de-sonho',
		topicId: 'sonhos',
		description: 'Anote seu sonho, as emoções e as associações que você lembra.',
		action: 'Registrar meu sonho',
		availability: 'available',
		availabilityLabel: 'Grátis',
		requirements: 'Seu relato. Não exige dados de nascimento.'
	}
];

export function freeToolById(id: string) {
	return freeTools.find((tool) => tool.id === id);
}
