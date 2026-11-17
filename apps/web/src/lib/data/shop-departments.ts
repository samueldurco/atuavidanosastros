export type ShopDepartment = {
	id: string;
	label: string;
	description: string;
	href: string;
	categories: readonly string[];
};

export const shopDepartments: readonly ShopDepartment[] = [
	{
		id: 'roupas',
		label: 'Roupas',
		description: 'Camisetas, croppeds, regatas e peças esportivas',
		href: '/loja?categoria=roupas',
		categories: [
			'Camiseta',
			'Camiseta de casal',
			'Camiseta oversized',
			'Camiseta oversized de casal',
			'Cropped',
			'Regata',
			'Regata de casal',
			'Legging',
			'Top esportivo'
		]
	},
	{
		id: 'acessorios',
		label: 'Acessórios',
		description: 'Ecobags, bonés, gorros e pochetes',
		href: '/loja?categoria=acessorios',
		categories: ['Ecobag', 'Boné', 'Gorro', 'Pochete']
	},
	{
		id: 'casa-e-decoracao',
		label: 'Casa e decoração',
		description: 'Canecas, garrafas, quadros e pôsteres',
		href: '/loja?categoria=casa-e-decoracao',
		categories: ['Caneca', 'Garrafa', 'Quadro', 'Pôster']
	},
	{
		id: 'papelaria',
		label: 'Papelaria',
		description: 'Cadernos com artes dos signos',
		href: '/loja?categoria=papelaria',
		categories: ['Caderno']
	}
];

export const getShopDepartment = (id: string | null) =>
	shopDepartments.find((department) => department.id === id);
