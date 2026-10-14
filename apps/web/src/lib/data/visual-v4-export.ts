import { visualUniverse } from './visual-v4';

// Approved MVP universe inks. Calculation geometry and export contracts are independent.
const palettes = {
	'meu-ceu': { ink: '#174c69', line: '#a16f27' },
	ciclos: { ink: '#22647b', line: '#9e742f' },
	amor: { ink: '#983e4b', line: '#b75640' },
	proposito: { ink: '#4d6231', line: '#977025' },
	tarot: { ink: '#92501f', line: '#9d6c30' },
	sonhos: { ink: '#625096', line: '#8971ad' }
} as const;
export function visualExportPalette(identity: string) {
	const universe = visualUniverse(identity);
	return universe ? palettes[universe] : { ink: '#193549', line: '#966b36' };
}
