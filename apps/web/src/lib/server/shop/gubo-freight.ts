import { fail, provider, record, zip, type PrivateEnv } from './freight-provider';

// Official v1 host published at https://gubo.com.br/docs-api/fretes .
const api =
	'https://kx75xapy8azwdvdnd4brts7y098e5qvg.buildprintusercontent.com/gubo-api/latest/live/v1';
export interface GuboVariant {
	sku: string;
	product: string;
	size: string;
	maxCostCents: number;
}

function headers(env: PrivateEnv) {
	const token = env.GUBO_FRETE_TOKEN;
	if (!token || !/^gubo_live_[A-Za-z0-9_-]+$/.test(token)) return fail('carrier_unavailable', 503);
	return {
		Authorization: 'Bearer ' + token,
		Accept: 'application/json',
		'Content-Type': 'application/json'
	};
}

export async function guboAvailable(env: PrivateEnv, fetcher: typeof fetch, variant: GuboVariant) {
	const params = new URLSearchParams({ sku: variant.sku, disponivel: 'true' });
	const data = record(
		await provider(fetcher, api + '/catalogo/variantes?' + params, { headers: headers(env) })
	);
	if (data.objeto !== 'lista' || !Array.isArray(data.dados))
		return fail('carrier_unavailable', 503);
	if (data.dados.length !== 1) return false;
	const item = record(data.dados[0]);
	const color = record(item.cor);
	return (
		item.objeto === 'variante' &&
		item.sku === variant.sku &&
		item.produto === variant.product &&
		item.tamanho === variant.size &&
		typeof color.nome === 'string' &&
		/^branc[ao]$/i.test(color.nome.trim()) &&
		item.disponivel === true &&
		typeof item.preco_unitario_centavos === 'number' &&
		Number.isSafeInteger(item.preco_unitario_centavos) &&
		item.preco_unitario_centavos > 0 &&
		item.preco_unitario_centavos <= variant.maxCostCents
	);
}

const positiveInteger = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

function selectedRate(raw: Record<string, unknown>, cep: string, variant: GuboVariant) {
	const items = raw.itens;
	const sku = Array.isArray(items) && items.length === 1 ? record(items[0]) : {};
	const validUntil = typeof raw.valida_ate === 'string' ? Date.parse(raw.valida_ate) : NaN;
	if (
		raw.situacao !== 'pronta' ||
		raw.simulada !== false ||
		zip(raw.cep) !== cep ||
		!Number.isFinite(validUntil) ||
		validUntil <= Date.now() + 600_000 ||
		record(raw.pacote).pecas !== 1 ||
		sku.sku !== variant.sku ||
		sku.produto !== variant.product ||
		sku.tamanho !== variant.size ||
		sku.quantidade !== 1
	)
		return fail('carrier_unavailable', 503);
	const noService = record(raw.sem_escolha).codigo;
	if (!raw.escolha && (noService === 'frete_indisponivel' || noService === 'servico_indisponivel'))
		return fail('delivery_unavailable');
	const choice = record(raw.escolha);
	if (
		raw.erro ||
		raw.sem_escolha ||
		choice.regra !== 'mais_barata' ||
		typeof choice.servico !== 'string' ||
		!/^[a-z0-9-]{1,40}$/.test(choice.servico) ||
		choice.servico.startsWith('gubo-teste-') ||
		!Array.isArray(raw.opcoes)
	)
		return fail('carrier_unavailable', 503);
	const matching = raw.opcoes.map(record).filter((option) => option.servico === choice.servico);
	if (matching.length !== 1) return fail('carrier_unavailable', 503);
	const option = matching[0],
		cents = option.preco_centavos,
		transit = option.prazo_transporte_dias_uteis,
		production = option.prazo_producao_dias_uteis,
		total = option.prazo_total_dias_uteis;
	if (
		!positiveInteger(cents) ||
		cents !== choice.preco_centavos ||
		!positiveInteger(transit) ||
		!positiveInteger(production) ||
		!positiveInteger(total) ||
		total !== transit + production
	)
		return fail('carrier_unavailable', 503);
	if (cents > 50000 || total + 2 > 90) return fail('delivery_unavailable');
	return {
		id: 'gubo-' + choice.servico,
		name: 'Entrega padrão',
		cents,
		days: total + 2,
		basis: JSON.stringify([variant.sku, choice.servico, cents, transit, production, total])
	};
}

export async function guboRate(
	env: PrivateEnv,
	fetcher: typeof fetch,
	cep: string,
	variant: GuboVariant
) {
	const auth = headers(env);
	const body = JSON.stringify({
		cep,
		itens: [{ sku: variant.sku, quantidade: 1 }],
		entrega: { preferencia: 'mais_barata' }
	});
	let delay = 2000;
	const retryAfter = (h: Headers) => {
		const value = h.get('retry-after');
		const seconds =
			value === null
				? 2
				: /^\d+$/.test(value)
					? Number(value)
					: (Date.parse(value) - Date.now()) / 1000;
		delay = Math.max(2000, Math.ceil(seconds * 1000));
	};
	const url = api + '/fretes/cotacoes';
	let raw = record(
		await provider(fetcher, url, { method: 'POST', headers: auth, body }, 25000, retryAfter)
	);
	const id = raw.id;
	if (
		raw.objeto !== 'cotacao_frete' ||
		typeof id !== 'string' ||
		!/^cot_[A-Za-z0-9_-]{1,96}$/.test(id)
	)
		return fail('carrier_unavailable', 503);
	for (let attempt = 0; attempt < 3 && raw.situacao === 'pendente'; attempt++) {
		if (!Number.isFinite(delay) || delay > 5000) return fail('carrier_unavailable', 503);
		await new Promise((resolve) => setTimeout(resolve, delay));
		raw = record(await provider(fetcher, url + '/' + id, { headers: auth }, 7000, retryAfter));
		if (raw.objeto !== 'cotacao_frete' || raw.id !== id) return fail('carrier_unavailable', 503);
	}
	return selectedRate(raw, cep, variant);
}
