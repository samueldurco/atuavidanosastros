import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
	ledger: vi.fn(),
	pdf: vi.fn(),
	PdfCharacterError: class extends Error {
		code = 'pdf_unsupported_character';
		codePoint = 'U+1F319';
	},
	env: {} as Record<string, string>
}));
vi.mock('$env/dynamic/private', () => ({ env: mocks.env }));
vi.mock('./free-tool-ledger', () => ({
	freeToolLedger: mocks.ledger,
	FreeToolLedgerError: class extends Error {}
}));
vi.mock('./free-tool-pdf', () => ({
	renderFreeToolPdf: mocks.pdf,
	FreeToolPdfCharacterError: mocks.PdfCharacterError
}));
import { GET as download } from '../../routes/api/free-tools/[tool]/pdf/+server';
import { POST as identity } from '../../routes/api/free-tools/identity/+server';

function event(user: unknown = null) {
	return {
		params: { tool: 'carta-do-dia' },
		url: new URL('https://local.example/'),
		request: new Request('https://local.example/'),
		locals: {
			supabase: {
				auth: {
					getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
					signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
					verifyOtp: vi.fn().mockResolvedValue({ error: null })
				}
			}
		},
		platform: { env: {} }
	};
}
beforeEach(() => {
	vi.clearAllMocks();
	delete mocks.env.FEATURE_MAGIC_LINK;
});
describe('download autenticado e confirmação por código', () => {
	it('nega PDF anônimo ou com e-mail não confirmado antes de consultar a leitura', async () => {
		for (const user of [null, { id: 'synthetic' }])
			expect((await download(event(user) as never)).status).toBe(401);
		expect(mocks.ledger).not.toHaveBeenCalled();
	});
	it('usa somente a leitura do sujeito no servidor e devolve PDF privado', async () => {
		const result = { id: '00000000-0000-4000-8000-000000000001' };
		mocks.ledger.mockResolvedValue({ read: vi.fn().mockResolvedValue({ result }) });
		mocks.pdf.mockResolvedValue(new TextEncoder().encode('%PDF-1.7'));
		const response = await download(event({ email_confirmed_at: '2026-10-28T12:00:00Z' }) as never);
		expect(response.status).toBe(200);
		expect(mocks.pdf).toHaveBeenCalledWith(result);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('x-atv-result-id')).toBe(result.id);
	});
	it('fecha o envio de e-mail pelo gate vigente e rejeita origem externa', async () => {
		const e = event();
		e.request = new Request(e.url, {
			method: 'POST',
			headers: { origin: e.url.origin, 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'request', email: 'synthetic@example.test' })
		});
		expect((await identity(e as never)).status).toBe(503);
		expect(e.locals.supabase.auth.signInWithOtp).not.toHaveBeenCalled();
		mocks.env.FEATURE_MAGIC_LINK = 'true';
		e.request = new Request(e.url, {
			method: 'POST',
			headers: { origin: 'https://other.example' }
		});
		expect((await identity(e as never)).status).toBe(403);
	});
	it('explica o caractere não exportável sem substituir ou modificar a leitura', async () => {
		const result = { id: '00000000-0000-4000-8000-000000000001', text: 'Sonhei com a lua 🌙' };
		mocks.ledger.mockResolvedValue({ read: vi.fn().mockResolvedValue({ result }) });
		mocks.pdf.mockRejectedValueOnce(new mocks.PdfCharacterError());
		const response = await download(event({ email_confirmed_at: '2026-10-28T12:00:00Z' }) as never);
		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({
			code: 'pdf_unsupported_character',
			codePoint: 'U+1F319'
		});
		expect(result.text).toBe('Sonhei com a lua 🌙');
		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});
	it('baixa o sonho histórico escolhido em vez do resultado de hoje', async () => {
		const result = { id: '00000000-0000-4000-8000-000000000002' };
		const history = vi.fn().mockResolvedValue({ history: [{ result }] });
		const read = vi.fn();
		mocks.ledger.mockResolvedValue({ read, history });
		mocks.pdf.mockResolvedValue(new TextEncoder().encode('%PDF-1.7'));
		const e = event({ email_confirmed_at: '2026-10-28T12:00:00Z' });
		e.params.tool = 'registro-de-sonho';
		e.url.searchParams.set('resultado', result.id);
		const response = await download(e as never);
		expect(response.status).toBe(200);
		expect(history).toHaveBeenCalledWith(null, result.id);
		expect(read).not.toHaveBeenCalled();
		expect(mocks.pdf).toHaveBeenCalledWith(result);
	});
	it('não substitui um resultado desconhecido ou de outra pessoa pelo resultado atual', async () => {
		const id = '00000000-0000-4000-8000-000000000002';
		mocks.ledger.mockResolvedValue({
			history: vi.fn().mockResolvedValue({ history: [] }),
			read: vi.fn().mockResolvedValue({ result: { id: '00000000-0000-4000-8000-000000000001' } })
		});
		for (const tool of ['registro-de-sonho', 'carta-do-dia']) {
			const e = event({ email_confirmed_at: '2026-10-28T12:00:00Z' });
			e.params.tool = tool;
			e.url.searchParams.set('resultado', id);
			expect((await download(e as never)).status).toBe(404);
		}
		expect(mocks.pdf).not.toHaveBeenCalled();
	});
	it('usa o token do provedor e não aceita código local de demonstração', async () => {
		mocks.env.FEATURE_MAGIC_LINK = 'true';
		const e = event();
		e.locals.supabase.auth.verifyOtp.mockResolvedValue({ error: { message: 'invalid' } } as never);
		e.request = new Request(e.url, {
			method: 'POST',
			headers: { origin: e.url.origin, 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'verify', email: 'synthetic@example.test', code: '123456' })
		});
		expect((await identity(e as never)).status).toBe(400);
		expect(e.locals.supabase.auth.verifyOtp).toHaveBeenCalledWith({
			email: 'synthetic@example.test',
			token: '123456',
			type: 'email'
		});
	});
});
