import { productCatalog } from '@atv/domain';

/** Only known internal destinations may survive authentication. Never carry personal form data. */
export function authReturnPath(value: string | null | undefined): string {
	if (!value || /[\\\s%?#]/.test(value)) return '/dashboard';
	if (
		[
			'/dashboard',
			'/biblioteca',
			'/conta/nascimento',
			'/bussola-de-carreira',
			'/testar-produtos',
			'/testar-produtos/atv-plus'
		].includes(value)
	)
		return value;
	const trial = value.match(/^\/testar-produtos\/([a-z-]+)$/)?.[1];
	if (trial && productCatalog.some((item) => item.id === trial && item.universe !== 'global'))
		return value;
	const product = value.match(/^\/biblioteca\/nova\/([a-z-]+)$/)?.[1];
	if (product && productCatalog.some((item) => item.id === product && item.personalized))
		return value;
	if (/^\/biblioteca\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
		return value;
	if (
		/^\/testar-produtos\/leituras\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			value
		)
	)
		return value;
	return '/dashboard';
}

export function loginHref(destination: string): string {
	return `/entrar?next=${encodeURIComponent(authReturnPath(destination))}`;
}

export function authCallbackHref(origin: string, destination: string | null): string {
	const callback = new URL('/auth/callback', origin);
	callback.searchParams.set('next', authReturnPath(destination));
	return callback.href;
}
