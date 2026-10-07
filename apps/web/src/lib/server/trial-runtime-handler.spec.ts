import { expect, it } from 'vitest';
import { trialRuntimeHandler } from '../../../../../supabase/functions/atv-trial-runtime/handler';
const handler = trialRuntimeHandler('synthetic-server-key');
const req = (
	body: string,
	runtimeKey = 'synthetic-server-key',
	extra: Record<string, string> = {}
) =>
	new Request('https://synthetic.invalid/', {
		method: 'POST',
		headers: { 'x-atv-runtime-key': runtimeKey, 'content-type': 'application/json', ...extra },
		body
	});
it('recusa chamadas públicas, JWT de usuário e chave ausente antes de ler o conteúdo', async () => {
	for (const token of [
		'',
		'Bearer anonymous',
		'Bearer ordinary-user-jwt',
		'Bearer synthetic-server-key'
	])
		expect((await handler(req('not json', token))).status).toBe(401);
	expect(
		(
			await handler(
				new Request('https://synthetic.invalid/', {
					method: 'POST',
					headers: { authorization: 'Bearer synthetic-server-key' },
					body: '{}'
				})
			)
		).status
	).toBe(401);
	expect((await trialRuntimeHandler(undefined)(req('{}'))).status).toBe(401);
});
it('limita tamanho, tipo e método sem retornar detalhes internos', async () => {
	expect((await handler(req('{}', undefined, { 'content-length': '2000001' }))).status).toBe(413);
	expect((await handler(req(' '.repeat(2000001)))).status).toBe(413);
	expect((await handler(req('{}', undefined, { 'content-type': 'text/plain' }))).status).toBe(400);
	expect((await handler(new Request('https://synthetic.invalid/'))).status).toBe(405);
	expect((await handler(req('not json'))).status).toBe(400);
	const rejected = await handler(req('{"operation":"invalid"}'));
	expect(rejected.status).toBe(422);
	expect(await rejected.json()).toEqual({ error: 'Não foi possível preparar a leitura.' });
});

it('permite rotação sem interromper a chave atual e recusa a chave retirada', async () => {
	const rotating = trialRuntimeHandler('synthetic-current-key', 'synthetic-next-key');
	for (const key of ['synthetic-current-key', 'synthetic-next-key'])
		expect((await rotating(req('not json', key))).status).toBe(400);
	for (const key of ['', 'synthetic-unrelated-key'])
		expect((await rotating(req('not json', key))).status).toBe(401);
	const finished = trialRuntimeHandler('synthetic-next-key');
	expect((await finished(req('not json', 'synthetic-current-key'))).status).toBe(401);
	expect((await finished(req('not json', 'synthetic-next-key'))).status).toBe(400);
});
