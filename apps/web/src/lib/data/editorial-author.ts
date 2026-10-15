type EditorialAuthor = {
	id: string;
	name: string;
	bio: string;
	type?: 'Person' | 'Organization';
};

/** Public institutional identity; the signed source document remains unchanged. */
export function publicEditorialAuthor(author: EditorialAuthor): EditorialAuthor {
	if (author.id !== 'atvna-redacao-automatizada' || author.type !== 'Organization') return author;
	return {
		id: 'atvna',
		name: 'ATVNA',
		bio: 'Publicações da A Tua Vida nos Astros sobre astrologia, tarot e sonhos. Consulte as fontes de cada artigo e conheça nosso método.',
		type: 'Organization'
	};
}
