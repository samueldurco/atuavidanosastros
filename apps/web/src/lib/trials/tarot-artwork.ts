/** The recorded RWS card ID selects the artwork; no new draw happens in the reader. */
export function tarotArtwork(cardId: string): string {
	const match = /^(major|cups|wands|swords|pentacles)-(\d{1,2})$/.exec(cardId);
	const number = match ? Number(match[2]) : -1;
	if (
		!match ||
		String(number) !== match[2] ||
		(match[1] === 'major' ? number < 0 || number > 21 : number < 1 || number > 14)
	)
		throw Error('tarot_artwork_card');
	return `/tarot/rws/${cardId}.jpg`;
}

export const tarotArtworkCredit = {
	artist: 'Pamela Colman Smith',
	deck: 'Rider–Waite–Smith',
	source: 'https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)'
};
