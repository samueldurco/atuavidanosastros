import { couplePreviews } from './shop-couples';
import { framePreviews } from './shop-frames';
import { classicShirtPreviews } from './shop-classic-shirts';
import { activewearPreviews } from './shop-activewear';
import { pochetePreviews } from './shop-pochetes';
import { apparelPreviews } from './shop-apparel';
import { embroideryPreviews } from './shop-embroidery';
import { notebookPreviews } from './shop-notebooks';
import { posterPreviews } from './shop-posters';
import { bottlePreviews } from './shop-bottles';
import { mugPreviews } from './shop-mugs';
import { ecobagPreviews } from './shop-ecobags';
import reviewedOffers from './shop-reviewed-offers.json' with { type: 'json' };
import nationalPreviews from './shop-caps-croppeds.json' with { type: 'json' };

/** Existing collection artwork and product specifications; live offers come from Shopify. */
export interface ShopPreview {
	slug: string;
	title: string;
	sign: string;
	subjectKind?: 'single_sign' | 'canonical_pair';
	pairId?: string;
	signs?: string[];
	category: string;
	description: string;
	model: string;
	material: string;
	provider: 'Printful' | 'Gelato' | 'Dimona';
	imageNote?: string;
	artOnly?: boolean;
	measurements?: readonly (readonly string[])[];
	care?: string;
	construction: { label: string; value: string };
	imageSize?: number;
	printDescription?: string;
	colors: { name: string; images: { src: string; alt: string; label: string }[] }[];
}
const base = '/brand/shop/colecao-202610';
const previews: ShopPreview[] = [
	{
		slug: 'cropped-aries',
		title: 'Cropped Aries',
		sign: 'Áries',
		category: 'Cropped',
		description:
			'O carneiro de Áries entre flores vermelhas, em uma aquarela com glifo e nome latino.',
		model: 'AS Colour 4062',
		material: '100% algodão penteado · 180 g/m²',
		provider: 'Printful',
		construction: {
			label: 'Caimento',
			value: 'Comprimento cropped, caimento solto e ombros caídos.'
		},
		colors: [
			{
				name: 'Bone',
				images: [
					{
						src: `${base}/cropped-aries-bone-produto.webp`,
						alt: 'Cropped Aries na cor Bone, visto de frente, com carneiro vermelho, flores, glifo de Áries e nome Aries.',
						label: 'Frente da peça'
					},
					{
						src: `${base}/cropped-aries-bone-modelo.webp`,
						alt: 'Modelo vestindo o cropped Aries na cor Bone, com a estampa centralizada na frente.',
						label: 'No corpo'
					}
				]
			},
			{
				name: 'Branco',
				images: [
					{
						src: `${base}/cropped-aries-branco-produto.webp`,
						alt: 'Cropped Aries branco visto de frente, com carneiro vermelho, flores, glifo de Áries e nome Aries.',
						label: 'Frente da peça'
					},
					{
						src: `${base}/cropped-aries-branco-modelo.webp`,
						alt: 'Modelo vestindo o cropped Aries branco, com a estampa centralizada na frente.',
						label: 'No corpo'
					}
				]
			}
		]
	},
	{
		slug: 'camiseta-oversized-taurus',
		title: 'Camiseta Oversized Taurus',
		sign: 'Touro',
		category: 'Camiseta oversized',
		description:
			'O touro em aquarela terrosa, entre folhagens e flores, com glifo e nome latino. A composição ganha espaço no caimento amplo da camiseta.',
		model: 'AS Colour 5082',
		material: '100% algodão cardado · 240 g/m²',
		provider: 'Printful',
		construction: {
			label: 'Caimento',
			value: 'Modelagem oversized de corte amplo, ombros caídos e tecido pré-encolhido.'
		},
		colors: [
			{
				name: 'Faded Bone',
				images: [
					{
						src: `${base}/oversized-taurus-bone-produto.webp`,
						alt: 'Camiseta oversized Taurus na cor Faded Bone, vista de frente, com touro em aquarela, folhagens, glifo de Touro e nome Taurus.',
						label: 'Frente da peça'
					},
					{
						src: `${base}/oversized-taurus-bone-modelo.webp`,
						alt: 'Modelo vestindo a camiseta oversized Taurus na cor Faded Bone, com estampa centralizada na frente.',
						label: 'No corpo'
					}
				]
			}
		]
	},
	{
		slug: 'ecobag-taurus',
		title: 'Ecobag Taurus',
		sign: 'Touro',
		category: 'Ecobag',
		description:
			'Taurus em aquarela, entre flores e folhagens, com glifo e nome latino. Uma composição na frente da ecobag de algodão natural.',
		model: 'Ecobag de algodão cru · M',
		material: 'Algodão cru',
		provider: 'Dimona',
		imageNote:
			'As imagens ilustram a arte em uma ecobag de referência. A ecobag Dimona é produzida no Brasil em algodão cru e mede cerca de 36 × 30 cm. O formato, as alças e a proporção da aplicação podem diferir da prévia; as cores podem variar conforme a tela e a impressão.',
		construction: {
			label: 'Dimensões',
			value: 'Aproximadamente 36 × 30 cm. Produção nacional sob demanda.'
		},
		printDescription:
			'Estampa frontal por DTF. Arquivo aplicado sem corte nem distorção, em área de 15,24 × 15,24 cm, incluindo as margens transparentes da composição.',
		imageSize: 1000,
		colors: [
			{
				name: 'Natural',
				images: [
					{
						src: `${base}/ecobag-taurus-natural-produto.webp`,
						alt: 'Ecobag de algodão natural vista de frente, com touro em aquarela, flores, folhagens, glifo de Touro e nome Taurus.',
						label: 'Frente da peça'
					}
				]
			}
		]
	},
	...ecobagPreviews,
	...mugPreviews,
	...bottlePreviews,
	...posterPreviews,
	...notebookPreviews,
	...embroideryPreviews,
	...apparelPreviews,
	...activewearPreviews,
	...classicShirtPreviews,
	...pochetePreviews,
	...framePreviews,
	...couplePreviews
];

const reviewedSlugs = new Set(reviewedOffers.map((offer) => offer.slug));
const capPreviews: Record<string, { image: string; area: string }> = nationalPreviews.caps;
const croppedPreviews: Record<string, { images: string[]; area: string }> =
	nationalPreviews.croppeds;
const shirtSizes = [
	['P', '46–50', '65–69'],
	['M', '48–52', '67–71'],
	['G', '53–57', '69–73'],
	['GG', '56–60', '72–76'],
	['XGG', '59–63', '73–77'],
	['G1', '64–68', '72–76']
];
const tankSizes = [
	['P', '45–49', '64–68'],
	['M', '47–51', '66–70'],
	['G', '52–56', '68–72'],
	['GG', '55–59', '71–75'],
	['XGG', '58–62', '72–76']
];
export const shopPreviews: ShopPreview[] = previews.map((piece) => {
	const cap = capPreviews[piece.slug];
	if (reviewedSlugs.has(piece.slug) && cap) {
		return {
			...piece,
			provider: 'Dimona',
			model: 'Boné americano Dimona',
			material: 'Sarja de algodão',
			description: `O glifo de ${piece.sign} aparece na frente deste boné de aba anatômica. Disponível em preto e azul-marinho, com ajuste traseiro.`,
			construction: { label: 'Tamanho', value: 'Tamanho único com ajuste traseiro.' },
			printDescription: `Estampa frontal em DTF plano. O desenho mede aproximadamente ${cap.area}.`,
			imageNote:
				'A imagem de referência mostra o desenho da estampa que será aplicado na frente do boné.',
			artOnly: true,
			care: undefined,
			colors: [
				{
					name: 'Estampa frontal',
					images: [
						{
							src: cap.image,
							label: 'Glifo frontal',
							alt: `Desenho do glifo de ${piece.sign} para a frente do boné.`
						}
					]
				}
			]
		};
	}
	const cropped = croppedPreviews[piece.slug];
	if (reviewedSlugs.has(piece.slug) && cropped) {
		const images = piece.colors
			.flatMap((color) => color.images)
			.filter((photo) => cropped.images.includes(photo.src.split('/').at(-1)!));
		return {
			...piece,
			provider: 'Dimona',
			model: 'Cropped branco Dimona',
			material: '100% algodão penteado, fio 30.1 · 165 g/m²',
			construction: {
				label: 'Modelagem',
				value:
					'Cropped branco nos tamanhos G e GG. Compare largura e comprimento com uma peça sua, estendida.'
			},
			measurements: [
				['G', '52–56', '39–43'],
				['GG', '54–58', '41–45']
			],
			printDescription: `Estampa frontal em Silk HD de aproximadamente ${cropped.area}.`,
			imageNote:
				'As imagens ilustram a estampa em um cropped branco de referência. A malha pode encolher de 4 a 7% no comprimento e de 3 a 5% na largura.',
			care: undefined,
			colors: [{ name: 'Branco', images }]
		};
	}
	const tank = piece.slug.startsWith('regata-casal-');
	if (
		!reviewedSlugs.has(piece.slug) ||
		(!tank && !piece.slug.startsWith('camiseta-')) ||
		piece.slug.startsWith('camiseta-oversized-')
	)
		return piece;
	return {
		...piece,
		provider: 'Dimona',
		model: tank ? 'Regata Dimona de corte masculino' : 'Camiseta Dimona de corte masculino',
		material: '100% algodão penteado, fio 30.1 · 165 g/m²',
		construction: {
			label: 'Caimento',
			value:
				'Corte masculino. Compare largura e comprimento com uma peça sua, estendida sobre uma superfície plana.'
		},
		measurements: tank ? tankSizes : shirtSizes,
		printDescription:
			'Estampa frontal em Silk HD de aproximadamente ' +
			(tank ? '12,7 × 15,2 cm.' : '15,2 × 20,3 cm.'),
		imageNote:
			'As imagens mostram a estampa em uma peça de referência. A Dimona fabrica a peça no Brasil. O caimento e a aplicação podem variar em relação à imagem.',
		care: undefined
	};
});
