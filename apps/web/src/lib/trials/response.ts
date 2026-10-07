/** Providers may return HTML (for example a resource-limit page), never expose that as JSON syntax. */
export async function trialResponse<T extends { message?: string }>(
	response: Response
): Promise<T> {
	const fallback =
		'A geração foi interrompida pelo servidor. Seus dados preenchidos foram mantidos. Tente novamente; uma nova tentativa recupera a leitura se ela já foi salva.';
	if (!response.headers.get('content-type')?.includes('application/json'))
		throw new Error(fallback);
	let value: T;
	try {
		value = await response.json();
	} catch {
		throw new Error(fallback);
	}
	if (!response.ok) throw new Error(value.message ?? fallback);
	return value;
}
