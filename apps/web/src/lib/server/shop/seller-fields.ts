function words(value: string): string[] {
	return (
		value
			.normalize('NFKD')
			.replace(/\p{M}/gu, '')
			.toLowerCase()
			.match(/\p{L}+|\d+/gu) ?? []
	);
}

const placeholders =
	/\b(placeholder|pendente|preencher|exemplo|teste|ficticio|ficticia|responsavel|vendedor|informado|cadastrar)\b/;

export function validSellerName(name: string): boolean {
	const tokens = words(name);
	const normalized = tokens.join(' ');
	const unbrandedName = tokens
		.filter((token) => !['loja', 'oficial', 'marca', 'atvna'].includes(token))
		.join(' ');
	return (
		tokens.filter((token) => /^\p{L}{2,}$/u.test(token)).length >= 2 &&
		!placeholders.test(normalized) &&
		!['', 'a tua vida nos astros', 'tua vida nos astros'].includes(unbrandedName) &&
		!['nome completo', 'nome civil', 'nome da empresa', 'seu nome', 'razao social'].includes(
			normalized
		)
	);
}

export function publicAddressIssue(
	address: string,
	privateLocation?: string
):
	| 'address_missing'
	| 'address_postcode'
	| 'address_location_missing'
	| 'address_placeholder'
	| 'reserved_address'
	| 'private_location_config'
	| null {
	if (!privateLocation) return 'private_location_config';
	let location;
	try {
		location = JSON.parse(privateLocation);
	} catch {
		return 'private_location_config';
	}
	if (
		!location ||
		typeof location.street !== 'string' ||
		(typeof location.number !== 'string' && typeof location.number !== 'number')
	)
		return 'private_location_config';
	const street = words(location.street);
	if (
		['r', 'rua', 'av', 'avenida', 'trav', 'travessa', 'al', 'alameda', 'praca'].includes(street[0])
	)
		street.shift();
	const number = String(location.number).trim();
	if (
		!street.length ||
		!/^\d+$/.test(number) ||
		!Number.isSafeInteger(Number(number)) ||
		Number(number) < 1
	)
		return 'private_location_config';
	const tokens = words(address);
	// Match the street and the exact numeric token independently of separators, nº, CEP and unit formatting.
	const containsStreet = (' ' + tokens.join(' ') + ' ').includes(' ' + street.join(' ') + ' ');
	const containsNumber = tokens.some(
		(token) => /^\d+$/.test(token) && Number(token) === Number(number)
	);
	if (containsStreet && containsNumber) return 'reserved_address';
	if (!address.trim()) return 'address_missing';
	const postcode = address.match(/\b\d{2}\.?\d{3}[-\s]?\d{3}\b/);
	if (!postcode) return 'address_postcode';
	const locationWords = words(address.replace(postcode[0], '')).filter(
		(token) => token !== 'cep' && /^\p{L}{2,}$/u.test(token)
	);
	if (!locationWords.length) return 'address_location_missing';
	// A word such as “vendedor” can be part of a real street name.
	const addressPrompt =
		/\b(placeholder|pendente|preencher|exemplo|teste|ficticio|ficticia|cadastrar|endereco (?:do |da )?(?:responsavel|vendedor)|nao informad[oa])\b/;
	if (
		addressPrompt.test(locationWords.join(' ')) ||
		locationWords.every((word) => placeholders.test(word))
	)
		return 'address_placeholder';
	return null;
}

function checkDigit(body: string, weights: number[]): string {
	const sum = Array.from(body, (char, i) => (char.charCodeAt(0) - 48) * weights[i]).reduce(
		(a, b) => a + b,
		0
	);
	const remainder = sum % 11;
	return String(remainder < 2 ? 0 : 11 - remainder);
}

export function validSellerDocument(raw: string): boolean {
	const formatted = raw.trim().toUpperCase();
	const prefix = formatted.match(/^(CPF|CNPJ)\s*:?\s*/)?.[1];
	const id = formatted.replace(/^(CPF|CNPJ)\s*:?\s*/, '').replace(/[.\-/\s]/g, '');
	if (!id || /^(.)\1+$/.test(id)) return false;
	let firstWeights: number[];
	let secondWeights: number[];
	if (/^\d{11}$/.test(id) && prefix !== 'CNPJ') {
		firstWeights = [10, 9, 8, 7, 6, 5, 4, 3, 2];
		secondWeights = [11, ...firstWeights];
	} else if (/^[A-Z0-9]{12}\d{2}$/.test(id) && prefix !== 'CPF') {
		firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		secondWeights = [6, ...firstWeights];
	} else return false;
	const body = id.slice(0, -2);
	const first = checkDigit(body, firstWeights);
	return id.endsWith(first + checkDigit(body + first, secondWeights));
}
