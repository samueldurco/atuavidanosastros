import { describe, expect, it } from 'vitest';
import { signFreeToolRuntimeRequest, verifyFreeToolRuntimeRequest } from './free-tool-runtime-auth';
import { freeToolsRuntimeHandler } from '../../../../../supabase/functions/atv-free-tools-runtime/handler';

const secret = 'synthetic-free-tools-runtime-request-key';
const body = JSON.stringify({ tool: 'carta-do-dia', input: {} });

describe('authentication of the private calculation runtime', () => {
	it('binds authorization to the exact body and a short server timestamp', async () => {
		const now = 1793200000000;
		const headers = new Headers(await signFreeToolRuntimeRequest(body, secret, now));
		expect(await verifyFreeToolRuntimeRequest(headers, body, secret, now + 1000)).toBe(true);
		expect(await verifyFreeToolRuntimeRequest(headers, body + ' ', secret, now)).toBe(false);
		expect(await verifyFreeToolRuntimeRequest(headers, body, secret + 'changed', now)).toBe(false);
		expect(await verifyFreeToolRuntimeRequest(headers, body, secret, now + 61000)).toBe(false);
		expect(await verifyFreeToolRuntimeRequest(headers, body, secret, now - 6000)).toBe(false);
		expect(await verifyFreeToolRuntimeRequest(new Headers(), body, secret, now)).toBe(false);
	});
	it('denies direct public invocation so the quota endpoint cannot be bypassed', async () => {
		const response = await freeToolsRuntimeHandler(secret)(
			new Request('https://synthetic.invalid/', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body
			})
		);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: 'runtime_auth_required' });
	});
});
