import { visualUniverse } from './visual-v4';

// Approved V4 universe inks and rules: INTERNAS/universos-v002.css.
const palettes = {
	'meu-ceu': { ink: '#193345', line: '#c09c73' },
	ciclos: { ink: '#193549', line: '#8b7256' },
	amor: { ink: '#442d32', line: '#965c48' },
	proposito: { ink: '#303a2d', line: '#7d7048' },
	tarot: { ink: '#3d3027', line: '#8b673e' },
	sonhos: { ink: '#30364e', line: '#76748f' }
} as const;
export function visualExportPalette(identity: string) {
	const universe = visualUniverse(identity);
	return universe ? palettes[universe] : { ink: '#193549', line: '#966b36' };
}
