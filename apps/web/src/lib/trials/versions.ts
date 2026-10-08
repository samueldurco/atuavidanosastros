export const CONTENT_VERSION = 'atv-ai-editorial-trials/3.0.0';
/** Historical editions keep their version; only an explicit revision uses the latest one. */
export const latestReadingVersion = (productId: string) =>
	[
		'career-compass',
		'purpose-career',
		'three-pillars',
		'birth-chart',
		'ascendant',
		'midheaven'
	].includes(productId)
		? 'atv-product-reconstruction/4.0.0'
		: CONTENT_VERSION;
export const POLICY_VERSION = 'atv-private-trial-approval/3.0.0';
