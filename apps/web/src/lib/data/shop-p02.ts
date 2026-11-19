import type { PriceVersion } from '@atv/domain';

// Fixed catalog approved by the owner. Supplier identifiers are manufacturing
// bindings, not ATVNA identity. Prices remain DRAFT until commerce is released.
export const p02PriceVersions: readonly PriceVersion[] = [
	{
		id: 'P02-A001-BRL-20261007-v1',
		productId: 'P02-CONCEITO-A001-POS01',
		currency: 'BRL',
		amountMinor: 14900,
		validFrom: '2026-10-07T16:00:00Z',
		status: 'DRAFT'
	},
	{
		id: 'P02-A003-BRL-20261007-v1',
		productId: 'P02-CONCEITO-A003-POS01',
		currency: 'BRL',
		amountMinor: 14900,
		validFrom: '2026-10-07T16:00:00Z',
		status: 'DRAFT'
	}
];

export const p02Products = [
	{
		id: 'P02-CONCEITO-A001-POS01',
		variantId: 'ATV-P02-A001-POS01-12X16',
		designId: 'P02-CONCEITO-A001',
		slug: 'atlas-dos-simbolos',
		name: 'Atlas dos símbolos',
		eyebrow: 'O vocabulário do céu',
		description:
			'Uma esfera armilar em tons quentes ocupa o centro da composição. A faixa inferior reúne os glifos de Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão, com seus nomes. Uma peça para decorar o espaço de quem aprecia a linguagem simbólica da astrologia ocidental.',
		image: '/shop/p02/atlas-simbolos.jpg',
		imageAlt: 'Pôster Atlas dos símbolos, sem moldura, com esfera armilar e faixa de glifos.',
		priceVersionId: 'P02-A001-BRL-20261007-v1',
		binding: {
			provider: 'printful',
			storeId: 18869352,
			syncProductId: 479172253,
			syncVariantId: 5559253193,
			catalogVariantId: 1349,
			fileId: 1081714367,
			externalId: 'ATV-P02-A001-POS01-PF-12X16'
		}
	},
	{
		id: 'P02-CONCEITO-A003-POS01',
		variantId: 'ATV-P02-A003-POS01-12X16',
		designId: 'P02-CONCEITO-A003',
		slug: 'campos-de-experiencia',
		name: 'Campos de experiência',
		eyebrow: 'A vida como território',
		description:
			'Uma cidade imaginária de pátios, jardins e passagens traduz a ideia de campos de experiência. A composição se inspira nas doze casas da astrologia, com verdes profundos, pedra clara e detalhes em terracota. A arquitetura é uma interpretação artística geral; não representa casas calculadas nem um mapa individual.',
		image: '/shop/p02/campos-experiencia.jpg',
		imageAlt: 'Pôster Campos de experiência, sem moldura, com cidade imaginária, pátios e jardins.',
		priceVersionId: 'P02-A003-BRL-20261007-v1',
		binding: {
			provider: 'printful',
			storeId: 18869352,
			syncProductId: 479172390,
			syncVariantId: 5559253855,
			catalogVariantId: 1349,
			fileId: 1081714566,
			externalId: 'ATV-P02-A003-POS01-PF-12X16'
		}
	}
] as const;

export const p02Specifications = {
	widthCm: 30.48,
	heightCm: 40.64,
	material: 'Papel fosco de 189 g/m²',
	included: 'Um pôster impresso, sem moldura e sem acessórios de fixação.',
	personalized: false,
	production: 'Produção sob demanda após a compra. País de fabricação não confirmado.',
	care: 'Manuseie com as mãos limpas e secas. Proteja da umidade e da luz solar direta.',
	imageNotice: 'Prévia digital oficial do fornecedor. As cores podem variar entre tela e impressão.'
} as const;

// No checkout URL, availability/Offer schema or fulfillment action is generated
// from native Printful registration. Release requires the common shop gates.
export const p02Commerce = {
	state: 'PREPARING',
	checkoutUrl: null,
	shipping: 'Frete e condições de entrega serão informados antes da compra.',
	blockers: ['PAYMENT_ACCESS', 'DESTINATION_TOTAL', 'FULFILLMENT']
} as const;

export function p02PriceFor(product: (typeof p02Products)[number]): PriceVersion {
	const price = p02PriceVersions.find(
		(value) => value.id === product.priceVersionId && value.productId === product.id
	);
	if (!price) throw new Error('Versão de preço ausente para o produto P02.');
	return price;
}
