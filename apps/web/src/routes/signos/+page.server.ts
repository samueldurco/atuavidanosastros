import { signs } from '$lib/data/site';
import { hubSeo, signWithHoroscope } from '$lib/server/editorial';
import { publishedEditorial } from '$lib/server/editorial-registry';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async () => {
	const documents = await publishedEditorial();
	const available = new Set(documents.map(signWithHoroscope));
	return {
		seo: hubSeo('/signos', documents),
		entries: signs.map((sign) => ({
			sign,
			profile: documents.find(
				(doc) => doc.kind === 'sign-profile' && doc.path === `/signos/${sign}`
			)?.path,
			horoscope: available.has(sign) ? `/horoscopo/${sign}` : null
		}))
	};
};
