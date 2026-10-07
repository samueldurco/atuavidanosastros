import { describe, expect, it } from 'vitest';
import { trialResponse } from './response';
describe('private trial responses', () => {
	it('explains an HTML resource error without leaking HTML or JSON syntax', async () => {
		await expect(
			trialResponse(
				new Response('<!DOCTYPE html>Error 1102', {
					status: 500,
					headers: { 'content-type': 'text/html' }
				})
			)
		).rejects.toThrow('dados preenchidos');
	});
	it('preserves a useful server validation message', async () => {
		await expect(
			trialResponse(Response.json({ message: 'Escolha quatro temas distintos.' }, { status: 422 }))
		).rejects.toThrow('quatro temas');
	});
	it('recovers a successful saved ID', async () => {
		expect(await trialResponse(Response.json({ id: 'saved' }))).toEqual({ id: 'saved' });
	});
});
