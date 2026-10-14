/** Presentation only: saved library records identify a universe, not a product. */
const themes = {
	'meu-ceu': { key: 'meu-ceu', color: '#235d7a' },
	ciclos: { key: 'ciclos', color: '#377b85' },
	amor: { key: 'amor', color: '#b95363' },
	proposito: { key: 'proposito', color: '#687342' },
	tarot: { key: 'tarot', color: '#a96232' },
	sonhos: { key: 'sonhos', color: '#7564a0' }
} as const;
type ThemeKey = keyof typeof themes;
const aliases: Record<string, ThemeKey> = {
	'meu-ceu': 'meu-ceu',
	MEU_CEU: 'meu-ceu',
	ciclos: 'ciclos',
	'ciclos-tempo': 'ciclos',
	CYCLES: 'ciclos',
	CICLOS: 'ciclos',
	amor: 'amor',
	'amor-relacoes': 'amor',
	LOVE: 'amor',
	AMOR: 'amor',
	proposito: 'proposito',
	'proposito-prosperidade': 'proposito',
	PURPOSE: 'proposito',
	PROPOSITO: 'proposito',
	tarot: 'tarot',
	'tarot-arcanos': 'tarot',
	TAROT: 'tarot',
	sonhos: 'sonhos',
	'sonhos-simbolos': 'sonhos',
	DREAMS: 'sonhos',
	SONHOS: 'sonhos'
};

export function privateUniverseVisual(universe: string) {
	const theme = themes[aliases[universe]];
	return theme
		? { ...theme, image: `/brand/mvp/assets/universos/fundo-${theme.key}.webp` }
		: { key: 'marca', color: '#183f50', image: '/brand/mvp/assets/fundo-home.webp' };
}
