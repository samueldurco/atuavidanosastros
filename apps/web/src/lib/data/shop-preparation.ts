/** Editorial directions, NOT products, supplier listings, stock or offers. */
export const shopFormats = {
	shirt: 'Camisetas',
	polo: 'Polos',
	hoodie: 'Moletons',
	cap: 'Bonés e gorros',
	patch: 'Patches',
	tote: 'Ecobags',
	bag: 'Bolsas e mochilas',
	poster: 'Pôsteres',
	framed: 'Quadros com moldura',
	canvas: 'Telas',
	metal: 'Painéis metálicos',
	mug: 'Canecas',
	bottle: 'Garrafas e copos',
	notebook: 'Cadernos',
	calendar: 'Calendários',
	card: 'Cartões e papelaria',
	book: 'Livros fotográficos',
	phone: 'Capas de celular',
	pillow: 'Almofadas',
	blanket: 'Mantas',
	towel: 'Toalhas',
	apron: 'Aventais',
	coaster: 'Porta-copos',
	candle: 'Velas',
	puzzle: 'Quebra-cabeças',
	sticker: 'Adesivos',
	baby: 'Bodies e peças de bebê',
	kids: 'Roupas infantis',
	sport: 'Moda esportiva',
	aop: 'Peças com estampa integral',
	swim: 'Moda praia',
	pet: 'Acessórios para pets',
	rug: 'Tapetes',
	luggage: 'Acessórios de viagem'
} as const;
export const shopTechniques = {
	print: 'Estampa localizada',
	embroidery: 'Bordado',
	aop: 'Estampa integral',
	fineArt: 'Impressão de arte',
	sublimation: 'Sublimação',
	editorial: 'Impressão editorial'
} as const;
export const shopAudiences = {
	adult: 'Adulto',
	child: 'Infantil',
	baby: 'Bebê',
	home: 'Casa',
	gift: 'Presentes',
	pet: 'Pets'
} as const;
export type ShopFormat = keyof typeof shopFormats;
export type ShopTechnique = keyof typeof shopTechniques;
export type ShopAudience = keyof typeof shopAudiences;
export interface ShopDirection {
	id: string;
	title: string;
	summary: string;
	artDirection: string;
	formats: ShopFormat[];
	techniques: ShopTechnique[];
	audiences: ShopAudience[];
	zodiac: boolean;
}
export const shopDirections: ShopDirection[] = [
	{
		id: 'signos-essenciais',
		title: 'Signos Essenciais',
		summary: 'Identidade zodiacal para usar todos os dias.',
		artDirection: 'Símbolos legíveis, tipografia autoral e versões claras e escuras.',
		formats: ['shirt', 'hoodie', 'tote'],
		techniques: ['print'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'galeria-do-ceu',
		title: 'Galeria do Céu',
		summary: 'Uma parede como lugar de contemplação.',
		artDirection: 'Composições celestes com respiro, pensadas para proporções e papéis diferentes.',
		formats: ['poster', 'framed', 'canvas', 'metal'],
		techniques: ['fineArt'],
		audiences: ['home', 'gift'],
		zodiac: true
	},
	{
		id: 'ceu-cotidiano',
		title: 'Céu Cotidiano',
		summary: 'Pequenos rituais, objetos que acompanham.',
		artDirection: 'Frases curtas e desenhos que funcionem em superfícies curvas e pequenas.',
		formats: ['mug', 'tote', 'notebook', 'bottle'],
		techniques: ['print', 'sublimation', 'editorial'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'biblioteca-arcanos',
		title: 'Biblioteca dos Arcanos',
		summary: 'Arquétipos em linguagem editorial.',
		artDirection: 'Reinterpretar os esboços existentes em páginas, capas e composições de parede.',
		formats: ['poster', 'notebook', 'card', 'book'],
		techniques: ['fineArt', 'editorial'],
		audiences: ['adult', 'home', 'gift'],
		zodiac: false
	},
	{
		id: 'entre-dois-signos',
		title: 'Entre Dois Signos',
		summary: 'Afinidades, contrastes e encontros.',
		artDirection:
			'Duplas de símbolos com uma composição compartilhada, sem promessas de compatibilidade.',
		formats: ['shirt', 'poster', 'mug', 'card'],
		techniques: ['print', 'fineArt', 'sublimation', 'editorial'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'simbolos-bordados',
		title: 'Símbolos do Céu · Bordado',
		summary: 'Uma direção premium, discreta e tátil.',
		artDirection:
			'Monogramas celestes e traços simplificados, próprios para pontos e linhas de bordado.',
		formats: ['shirt', 'polo', 'hoodie', 'cap', 'tote', 'patch'],
		techniques: ['embroidery'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'noturna',
		title: 'Noturna · Vigílias',
		summary: 'O céu noturno em uma edição de presença.',
		artDirection:
			'Contrastes profundos e símbolos contidos; bordado e estampa serão estudados separadamente.',
		formats: ['shirt', 'hoodie', 'cap', 'poster'],
		techniques: ['print', 'embroidery', 'fineArt'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'ceu-de-bolso',
		title: 'Céu de Bolso',
		summary: 'Um universo em escala pequena.',
		artDirection: 'Ícones simples e padrões que preservem a leitura em objetos compactos.',
		formats: ['phone', 'sticker', 'notebook', 'patch'],
		techniques: ['print', 'editorial', 'embroidery'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'ceu-em-casa',
		title: 'Céu em Casa',
		summary: 'Texturas e atmosfera para habitar.',
		artDirection: 'Padrões coordenados e composições suaves, com atenção a costuras e repetição.',
		formats: ['pillow', 'blanket', 'towel', 'apron', 'coaster', 'rug'],
		techniques: ['print', 'aop', 'sublimation'],
		audiences: ['home', 'gift'],
		zodiac: true
	},
	{
		id: 'tempo-dos-astros',
		title: 'Tempo dos Astros',
		summary: 'O tempo visto com cuidado editorial.',
		artDirection:
			'Calendários e papelaria com hierarquia clara; datas e conteúdo precisam de revisão.',
		formats: ['calendar', 'notebook', 'card'],
		techniques: ['editorial'],
		audiences: ['adult', 'home', 'gift'],
		zodiac: true
	},
	{
		id: 'miniastros',
		title: 'Miniastros',
		summary: 'Imaginação celeste para a infância.',
		artDirection: 'Formas acolhedoras, leitura simples e versões específicas para peças infantis.',
		formats: ['kids', 'poster', 'puzzle', 'sticker'],
		techniques: ['print', 'fineArt', 'sublimation'],
		audiences: ['child', 'gift'],
		zodiac: true
	},
	{
		id: 'primeiro-ceu',
		title: 'Primeiro Céu',
		summary: 'Uma lembrança delicada de novos começos.',
		artDirection:
			'Composições leves para bebê e quarto; personalização depende de validação futura.',
		formats: ['baby', 'blanket', 'poster', 'card'],
		techniques: ['print', 'fineArt', 'editorial'],
		audiences: ['baby', 'home', 'gift'],
		zodiac: true
	},
	{
		id: 'presentes-do-ceu',
		title: 'Presentes do Céu',
		summary: 'Escolher pelo gesto e pela ocasião.',
		artDirection:
			'Famílias coordenadas para aniversários e encontros; kits não significam envio único.',
		formats: ['mug', 'card', 'candle', 'puzzle', 'coaster'],
		techniques: ['sublimation', 'editorial', 'print'],
		audiences: ['adult', 'home', 'gift'],
		zodiac: true
	},
	{
		id: 'companhia-celeste',
		title: 'Companhia Celeste',
		summary: 'O afeto também tem suas constelações.',
		artDirection: 'Personagens e símbolos de companhia para acessórios e retratos editoriais.',
		formats: ['pet', 'tote', 'poster'],
		techniques: ['print', 'fineArt'],
		audiences: ['pet', 'gift'],
		zodiac: false
	},
	{
		id: 'orbita-zodiacal',
		title: 'Órbita Zodiacal',
		summary: 'Padrões que se expandem pela peça.',
		artDirection: 'Repetições sem emendas e áreas de segurança para cortes, costuras e movimento.',
		formats: ['aop', 'sport', 'swim', 'bag'],
		techniques: ['aop'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'bolsas-viagem',
		title: 'Bolsas e Viagem',
		summary: 'Levar um pequeno céu pelo mundo.',
		artDirection: 'Símbolos de orientação e padrões resistentes a recortes e bolsos.',
		formats: ['bag', 'tote', 'luggage'],
		techniques: ['print', 'aop', 'embroidery'],
		audiences: ['adult', 'gift'],
		zodiac: true
	},
	{
		id: 'livros-do-ceu',
		title: 'Livros do Céu',
		summary: 'Narrativas visuais para folhear.',
		artDirection:
			'Sequências de imagens, capas e margens editoriais; não confundir livro fotográfico com livro textual.',
		formats: ['book', 'notebook', 'card'],
		techniques: ['editorial'],
		audiences: ['adult', 'child', 'gift'],
		zodiac: true
	},
	{
		id: 'dois-ceus',
		title: 'Dois Céus',
		summary: 'Duas presenças, uma composição.',
		artDirection:
			'Pares e retratos celestes com campos de personalização a definir, sem coletar dados agora.',
		formats: ['poster', 'framed', 'mug', 'card'],
		techniques: ['fineArt', 'sublimation', 'editorial'],
		audiences: ['adult', 'home', 'gift'],
		zodiac: true
	},
	{
		id: 'arcanos-vestiveis',
		title: 'Arcanos Vestíveis',
		summary: 'Arquétipos que ganham movimento.',
		artDirection:
			'Adaptar as referências dos arcanos para estampa, sem reduzir uma página inteira em uma camiseta.',
		formats: ['shirt', 'hoodie', 'tote'],
		techniques: ['print'],
		audiences: ['adult', 'gift'],
		zodiac: false
	}
];
function searchable(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}
export function filterShopDirections(filters: {
	query?: string;
	collection?: string;
	format?: string;
	technique?: string;
	audience?: string;
	sign?: string;
}): ShopDirection[] {
	const query = searchable((filters.query ?? '').trim());
	return shopDirections.filter(
		(item) =>
			(!filters.collection || item.id === filters.collection) &&
			(!filters.format || item.formats.some((value) => value === filters.format)) &&
			(!filters.technique || item.techniques.some((value) => value === filters.technique)) &&
			(!filters.audience || item.audiences.some((value) => value === filters.audience)) &&
			(!filters.sign || item.zodiac) &&
			(!query ||
				searchable(
					[
						item.title,
						item.summary,
						item.artDirection,
						...item.formats.map((value) => shopFormats[value])
					].join(' ')
				).includes(query))
	);
}
