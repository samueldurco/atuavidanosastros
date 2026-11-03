import { fail } from './freight-provider';
export function splitFactoryAddress(value: string) {
	const m = /^(.+),\s*(\d+[\p{L}]?|s\s*\/?\s*n|sem n[uú]mero),\s*([^,]+)$/iu.exec(value);
	if (!m || !m[1].trim() || !m[3].trim() || m[1].trim().length > 110 || m[3].trim().length > 60)
		return fail('invalid_address');
	return { street: m[1].trim(), number: m[2].trim(), neighborhood: m[3].trim() };
}
