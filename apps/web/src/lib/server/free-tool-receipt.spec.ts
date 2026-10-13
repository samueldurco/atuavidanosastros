import { beforeAll, describe, expect, it } from 'vitest';
import type { FreeToolResult } from '../free-tools';
import { calculateFreeToolResult } from './free-tools-calculation';
import { signFreeToolResult, verifyFreeToolReceipt } from './free-tool-receipt';

// Synthetic key and time; the result is produced by the real public draw implementation.
const key = 'synthetic-free-tools-unit-test-key-2026';
const timestamp = Date.parse('2026-10-13T12:00:00.000Z');
let result: FreeToolResult;
let receipt: string;
beforeAll(async () => {
	result = await calculateFreeToolResult(
		'carta-do-dia',
		{},
		{
			uuid: () => '10000000-0000-4000-8000-000000000001',
			now: () => new Date(timestamp)
		}
	);
	receipt = (await signFreeToolResult(result, key))!;
});

function reordered(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(reordered);
	if (value && typeof value === 'object')
		return Object.fromEntries(
			Object.entries(value)
				.reverse()
				.map(([k, v]) => [k, reordered(v)])
		);
	return value;
}

describe('recibo público mantém o sorteio e a entrega imutáveis', () => {
	it('valida resultado real e continua válido após reordenação de chaves jsonb', async () => {
		expect(receipt).toMatch(/^[0-9a-f]{64}$/);
		expect(await verifyFreeToolReceipt(result, receipt, key, timestamp)).toBe(true);
		const jsonb = JSON.parse(JSON.stringify(reordered(result)));
		expect(Object.keys(jsonb)).not.toEqual(Object.keys(result));
		expect(await verifyFreeToolReceipt(jsonb, receipt, key, timestamp)).toBe(true);
		expect(await signFreeToolResult(jsonb, key)).toBe(receipt);
	});
	it('rejeita alteração de carta, data, id, fatos, reflexão e ordem dos arrays', async () => {
		const changes: ((value: FreeToolResult) => void)[] = [
			(value) => {
				value.draw!.cardId = 'altered-card';
			},
			(value) => {
				value.createdAt = new Date(timestamp + 1000).toISOString();
			},
			(value) => {
				value.id = '20000000-0000-4000-8000-000000000001';
			},
			(value) => {
				value.facts[0]!.value = 'Carta escolhida pelo cliente';
			},
			(value) => {
				value.sections[0]!.body += ' Acréscimo.';
			},
			(value) => {
				value.sections.reverse();
			}
		];
		for (const change of changes) {
			const tampered = structuredClone(result);
			change(tampered);
			expect(await verifyFreeToolReceipt(tampered, receipt, key, timestamp)).toBe(false);
		}
	});
	it('respeita 48 horas e somente um minuto de tolerância para relógio futuro', async () => {
		expect(await verifyFreeToolReceipt(result, receipt, key, timestamp + 48 * 60 * 60 * 1000)).toBe(
			true
		);
		expect(
			await verifyFreeToolReceipt(result, receipt, key, timestamp + 48 * 60 * 60 * 1000 + 1)
		).toBe(false);
		expect(await verifyFreeToolReceipt(result, receipt, key, timestamp - 60000)).toBe(true);
		expect(await verifyFreeToolReceipt(result, receipt, key, timestamp - 60001)).toBe(false);
	});
	it('não produz nem aceita recibo sem chave suficiente e rejeita chave diferente', async () => {
		for (const missing of [undefined, '', 'short-key']) {
			expect(await signFreeToolResult(result, missing)).toBeNull();
			expect(await verifyFreeToolReceipt(result, receipt, missing, timestamp)).toBe(false);
		}
		expect(await verifyFreeToolReceipt(result, receipt, `${key}-wrong`, timestamp)).toBe(false);
	});
	it('rejeita recibos e envelopes inválidos sem exceção', async () => {
		for (const invalid of [
			null,
			undefined,
			'',
			'x'.repeat(64),
			'f'.repeat(63),
			receipt.toUpperCase(),
			{}
		])
			expect(await verifyFreeToolReceipt(result, invalid, key, timestamp)).toBe(false);
		for (const invalid of [
			null,
			[],
			{},
			{ ...result, version: 'atv-free-tool-result/2.0.0' },
			{ ...result, createdAt: 'invalid' }
		]) {
			expect(await signFreeToolResult(invalid as FreeToolResult, key)).toBeNull();
			expect(await verifyFreeToolReceipt(invalid, receipt, key, timestamp)).toBe(false);
		}
	});
});
