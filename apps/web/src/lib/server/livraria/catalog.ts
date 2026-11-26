// Server-only metadata reconciled with the 21-title inventory and editorial matrix.
// Manuscripts, source archive names and manuscript hashes are deliberately absent.
import summaries from './summaries.json';
const entries = [
	['Seu Mapa Astral por Inteiro', 66990, 18],
	['Ascendente', 60516, 25],
	['Áries por Inteiro', 32456, 18],
	['Touro por Inteiro', 32161, 18],
	['Gêmeos por Inteiro', 32115, 18],
	['Câncer por Inteiro', 32252, 18],
	['Leão por Inteiro', 32126, 18],
	['Virgem por Inteiro', 32450, 18],
	['Libra por Inteiro', 32313, 18],
	['Escorpião por Inteiro', 32131, 18],
	['Sagitário por Inteiro', 32325, 18],
	['Capricórnio por Inteiro', 32121, 18],
	['Aquário por Inteiro', 32353, 18],
	['Peixes por Inteiro', 32141, 18],
	['Sinastrias Amorosas', 95564, 24],
	['Anuário Astrológico 2027', 85372, 31],
	['Atlas do Zodíaco', 28324, 17],
	['Constelações do Zodíaco', 4493, 8],
	['As 78 Cartas por Inteiro', 105378, 16],
	['Tarot para Perguntas Reais', 58144, 18],
	['Tarot dos 12 Signos', 62524, 19]
] as const;

export const catalog = entries.map(([title, words, chapters], index) => {
	const id = `book-${String(index + 1).padStart(2, '0')}`;
	const theme = index >= 18 ? 'Tarot' : 'Astrologia';
	return {
		id,
		slug: title
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-'),
		title,
		words,
		chapters,
		theme,
		summary: summaries[id as keyof typeof summaries],
		coverStatus: 'PROVISIONAL' as const,
		manuscriptStatus: 'IN_REWRITE' as const,
		rightsStatus: 'PENDING_LAUNCH_REVIEW' as const,
		coverUrl: `/api/livraria/previa/capas/${id}.svg`
	};
});
export type Book = (typeof catalog)[number];

export const clubEditions = [
	{
		id: 'edition-01',
		title: 'Seu Mapa Astral por Inteiro — edição Céu de Papel',
		theme: 'Astrologia',
		sourceBookId: 'book-01',
		coverUrl: '/api/livraria/previa/capas/edition-01.svg',
		exclusive: 'Capa própria e caderno inédito no mesmo volume; o livro regular continua avulso.'
	},
	{
		id: 'edition-02',
		title: 'Tarot para Perguntas Reais — edição Céu de Papel',
		theme: 'Tarot',
		sourceBookId: 'book-20',
		coverUrl: '/api/livraria/previa/capas/edition-02.svg',
		exclusive: 'Casos inéditos e exercícios para a edição do clube.'
	},
	{
		id: 'edition-03',
		title: 'Ascendente e seu regente — edição Céu de Papel',
		theme: 'Astrologia',
		sourceBookId: 'book-02',
		coverUrl: '/api/livraria/previa/capas/edition-03.svg',
		exclusive: 'Recorte e material complementar próprios da edição do clube.'
	}
] as const;

export function editionFor(index: number) {
	return (
		clubEditions[index] ?? {
			id: `edition-${String(index + 1).padStart(2, '0')}`,
			title: `Edição ${index + 1} — pauta em preparação`,
			theme: index % 2 ? 'Tarot' : 'Astrologia',
			sourceBookId: null,
			exclusive: 'Edição exclusiva em planejamento; sem promessa de conteúdo ou disponibilidade.'
		}
	);
}
