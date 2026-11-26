import { launchProductIds, productCatalog, productTrialHref } from '@atv/domain';
import { savedFreeToolIds } from './free-tool-result';

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
			'/testar-lancamentos',
			'/testar-produtos/atv-plus',
			'/loja/livraria/previa',
			'/loja/livraria/previa/ceu-de-papel',
			'/loja/livraria/previa/minha-area'
		].includes(value)
	)
		return value;
	// Route syntax only: the protected server route validates the private catalog.
	const book = value.match(/^\/loja\/livraria\/previa\/livros\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1];
	if (book && book.length <= 120) return value;
	if (
		savedFreeToolIds.some((id) => value === `/ferramentas/${id}`) ||
		value === '/ferramentas/horoscopo'
	)
		return value;
	const trial = value.match(/^\/testar-produtos\/([a-z0-9-]+)$/)?.[1];
	if (trial && productCatalog.some((item) => item.id === trial && item.universe !== 'global'))
		return productTrialHref(trial);
	const launch = value.match(/^\/testar-lancamentos\/([a-z0-9-]+)$/)?.[1];
	if (launch && launchProductIds.some((id) => id === launch)) return value;
	if (
		/^\/testar-lancamentos\/preparacoes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			value
		)
	)
		return value;
	const product = value.match(/^\/biblioteca\/nova\/([a-z0-9-]+)$/)?.[1];
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
