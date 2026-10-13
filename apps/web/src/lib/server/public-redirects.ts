// Exact public aliases only: articles and account/API routes keep their identities.
const publicAliases: Readonly<Record<string, string>> = {
	'/meu-ceu': '/temas/mapa-astral',
	'/ciclos': '/temas/previsoes',
	'/amor': '/temas/amor',
	'/proposito': '/temas/carreira',
	'/tarot': '/temas/tarot',
	'/sonhos': '/temas/sonhos',
	'/caderno': '/revista'
};

// Keep /mapa-de-proposito indexable at its existing URL while the product is preparing.
// Its product route is noindex and must not replace this public landing in search.

export function permanentPublicDestination(url: URL): string | null {
	const destination = publicAliases[url.pathname.replace(/\/$/, '')];
	return destination ? `${destination}${url.search}` : null;
}
