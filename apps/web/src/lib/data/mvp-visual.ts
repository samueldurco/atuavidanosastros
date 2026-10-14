import productDesign from './mvp-product-design.json';

export const mvpAssets = '/brand/mvp/assets';

export const mvpThemes: Record<string, { art: string; accent: string; ink: string; tint: string }> =
	{
		'meu-ceu': { art: 'mandala-gravada', accent: '#cf9a44', ink: '#174c69', tint: '#d8e5e8' },
		ciclos: { art: 'fases-lunares', accent: '#e8bd6b', ink: '#22647b', tint: '#dcebee' },
		amor: { art: 'flor-gravada', accent: '#de765d', ink: '#983e4b', tint: '#f3d8cf' },
		proposito: { art: 'bussola-gravada', accent: '#ce9b45', ink: '#4d6231', tint: '#e1e7cc' },
		tarot: { art: 'cartas-gravadas', accent: '#ddb168', ink: '#92501f', tint: '#f0ddbb' },
		sonhos: { art: 'sonhos-gravados', accent: '#bea7e2', ink: '#625096', tint: '#e7dff2' }
	};

const aliases: Record<string, string> = {
	'mapa-astral': 'meu-ceu',
	previsoes: 'ciclos',
	'ciclos-tempo': 'ciclos',
	'amor-relacoes': 'amor',
	carreira: 'proposito',
	'proposito-prosperidade': 'proposito',
	'tarot-arcanos': 'tarot',
	'sonhos-simbolos': 'sonhos'
};

export const mvpTheme = (identity: string) =>
	aliases[identity] ?? (mvpThemes[identity] ? identity : 'meu-ceu');
export const mvpArt = (name: string) =>
	`${mvpAssets}/revisao/${name === 'lettering-descoberta' ? 'lettering-refinado' : name}.webp`;
export const mvpProductDesign = (productId: string) =>
	productDesign[productId as keyof typeof productDesign];
