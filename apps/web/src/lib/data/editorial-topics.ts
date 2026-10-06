// Discovery metadata is separate from the immutable, signed article packages.
export const editorialTopicPaths: Record<string, readonly string[]> = {
	'meu-ceu': [
		'/ascendente',
		'/noticias/2026/10/sol-lua-ascendente',
		'/mapa-astral',
		'/noticias/2026/10/horario-nascimento-mapa-astral'
	],
	ciclos: ['/mercurio-retrogrado', '/noticias/2026/10/fases-da-lua'],
	amor: [
		'/noticias/2026/10/sinastria-e-combinacao-de-signos',
		'/noticias/2026/10/sinastria-dados-e-consentimento'
	],
	tarot: [
		'/noticias/2026/10/arcanos-maiores-e-menores',
		'/noticias/2026/10/perguntas-para-o-tarot'
	],
	proposito: ['/noticias/2026/10/meio-do-ceu-e-reflexao-de-carreira'],
	sonhos: ['/noticias/2026/10/diario-de-sonhos']
};

export function editorialTopic(path: string): string | undefined {
	return Object.keys(editorialTopicPaths).find((id) => editorialTopicPaths[id].includes(path));
}
