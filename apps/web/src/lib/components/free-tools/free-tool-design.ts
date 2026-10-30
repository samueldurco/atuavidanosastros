import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
import type { FreeTool } from '$lib/data/free-tools';

const artByTool: Record<string, string> = {
	ascendente: 'micro-horizonte',
	'mapa-astral': 'mandala-gravada',
	horoscopo: 'fases-lunares',
	'combinacao-do-casal': 'flor-gravada',
	'meio-do-ceu': 'bussola-gravada',
	'dinheiro-no-mapa': 'micro-ramo',
	'carta-do-dia': 'cartas-gravadas',
	'carta-do-amor': 'flor-gravada',
	'registro-de-sonho': 'sonhos-gravados'
};

export function freeToolDesign(tool: FreeTool) {
	const theme = mvpThemes[tool.topicId];
	return { ...theme, art: mvpArt(artByTool[tool.id] ?? theme.art) };
}

/** Each continuation describes this tool's next step, rather than a catalogue of offers. */
export const freeToolContinuation: Record<string, string> = {
	ascendente:
		'Seu Ascendente é um dos três pontos de partida. Veja como ele conversa com o Sol e a Lua na leitura do seu mapa.',
	'mapa-astral':
		'Você já conhece as posições do seu céu. A leitura completa reúne planetas, casas e aspectos para interpretar as relações entre eles.',
	'combinacao-do-casal':
		'Esta primeira comparação abre a conversa. A Sinastria aprofunda afinidades, diferenças e desafios a partir dos dois mapas.',
	'meio-do-ceu':
		'O Meio do Céu abre uma perspectiva sobre direção e reconhecimento. A leitura de propósito e carreira conecta esse ponto a outros elementos do seu mapa.',
	'dinheiro-no-mapa':
		'Os elementos ligados a recursos ajudam a observar sua relação com dinheiro. A leitura de propósito e carreira amplia essa reflexão para talentos, trabalho e escolhas.',
	'carta-do-dia':
		'Uma carta oferece um ponto de vista. Com três posições, a próxima leitura distingue a situação, o desafio e um conselho para refletir.',
	'carta-do-amor':
		'A carta abre uma pergunta sobre a relação. O Templo de Afrodite explora pensamentos, sentimentos e atitudes das duas pessoas em sete posições.',
	'registro-de-sonho':
		'Seu relato guarda as imagens e emoções que ficaram. A leitura de um sonho trabalha esse material e suas associações para aprofundar a reflexão.'
};
