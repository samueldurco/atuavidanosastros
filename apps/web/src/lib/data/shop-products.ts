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

/** Real provider mockups of the current collection; no purchasable offers. */
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
	provider: 'Printful' | 'Gelato';
	construction: { label: string; value: string };
	imageSize?: number;
	printDescription?: string;
	colors: { name: string; images: { src: string; alt: string; label: string }[] }[];
}
const base = '/brand/shop/colecao-202610';
export const shopPreviews: ShopPreview[] = [
	{
		slug: 'cropped-aries',
		title: 'Cropped Aries',
		sign: 'Áries',
		category: 'Cropped',
		description:
			'O carneiro de Áries entre flores vermelhas, em uma aquarela com glifo e nome latino. Uma estampa delicada para acompanhar o corte curto e solto da peça.',
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
			'Taurus em aquarela, entre flores e folhagens, com glifo e nome latino. Uma composição ampliada na frente da ecobag de algodão natural.',
		model: 'Ecobag clássica',
		material: 'Algodão',
		provider: 'Gelato',
		construction: { label: 'Dimensões', value: 'Bolsa de 38 × 42 cm; alças de 67 cm.' },
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
