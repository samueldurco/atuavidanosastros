import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ document: vi.fn(), pdf: vi.fn(), ledger: vi.fn() }));
vi.mock('./editorial-registry', () => ({
	createEditorialRead: () => ({ document: mocks.document })
}));
vi.mock('./free-tool-ledger', () => ({ freeToolLedger: mocks.ledger }));
vi.mock('./free-tool-pdf', () => ({
	renderPublicHoroscopePdf: mocks.pdf,
	FreeToolPdfCharacterError: class extends Error {}
}));
import { GET as download } from '../../routes/api/free-tools/horoscopo/pdf/+server';
import { GET as availability } from '../../routes/api/free-tools/horoscopo/reading/+server';
import { publicHoroscopeOperationId } from './public-horoscope-download';

const document = {
	id: 'synthetic-horoscope',
	kind: 'horoscope',
	path: '/horoscopo/aries/daily/2026-10-28',
	revision: 1,
	calculation: { coverageEnd: '2026-10-29T00:00:00.000Z' },
	sections: [{ heading: 'Publicação sintética', paragraphs: ['Mesmo texto consultado.'] }]
};
function event(user: unknown = { email_confirmed_at: '2026-10-28T12:00:00.000Z' }) {
	const url = new URL('https://local.example/api/free-tools/horoscopo/pdf');
	url.searchParams.set('leitura', document.path);
	url.searchParams.set('revisao', '1');
	return {
		url,
		request: new Request(url),
		fetch: vi.fn(),
		locals: {
			supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) } }
		}
	};
}
beforeEach(() => {
	vi.clearAllMocks();
	mocks.document.mockResolvedValue(document);
	mocks.pdf.mockResolvedValue(new TextEncoder().encode('%PDF-1.7'));
});

describe('PDF de publicação admitida por signo, período e revisão', () => {
	it('exige e-mail confirmado antes de ler ou renderizar a publicação', async () => {
		for (const user of [null, { id: 'synthetic-unconfirmed' }])
			expect((await download(event(user) as never)).status).toBe(401);
		expect(mocks.document).not.toHaveBeenCalled();
		expect(mocks.pdf).not.toHaveBeenCalled();
	});
	it('rejeita requisição cross-site antes de autenticar ou ler', async () => {
		const e = event();
		e.request = new Request(e.url, { headers: { 'sec-fetch-site': 'cross-site' } });
		expect((await download(e as never)).status).toBe(403);
		expect(e.locals.supabase.auth.getUser).not.toHaveBeenCalled();
		expect(mocks.document).not.toHaveBeenCalled();
	});
	it('exporta exatamente a revisão consultada, privada e sem criar/consumir cota', async () => {
		const e = event();
		const response = await download(e as never);
		expect(response.status).toBe(200);
		expect(mocks.document).toHaveBeenCalledWith(document.path, e.fetch);
		expect(mocks.pdf).toHaveBeenCalledWith(document);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('content-type')).toBe('application/pdf');
		expect(response.headers.get('x-atv-result-id')).toBe(
			await publicHoroscopeOperationId(document.id, 1)
		);
		expect(mocks.ledger).not.toHaveBeenCalled();
	});
	it('permite uma publicação antiga ainda admitida sem substituí-la pela atual', async () => {
		// A data histórica não é uma cota nem um prazo de conta: a admissão rege o acesso.
		const response = await availability(event(null) as never);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ available: true });
		expect(mocks.document).toHaveBeenCalledWith(document.path, expect.any(Function));
		expect(mocks.ledger).not.toHaveBeenCalled();
	});
	it.each([
		undefined,
		{ ...document, revision: 2 },
		{ ...document, path: '/horoscopo/aries/daily/2026-10-29' },
		{ ...document, kind: 'guide' },
		{ ...document, calculation: undefined }
	])(
		'nega publicação revogada/substituída/não compatível sem trocar texto',
		async (replacement) => {
			mocks.document.mockResolvedValue(replacement);
			expect((await download(event() as never)).status).toBe(404);
			expect((await availability(event(null) as never)).status).toBe(404);
			expect(mocks.pdf).not.toHaveBeenCalled();
			expect(mocks.ledger).not.toHaveBeenCalled();
		}
	);
	it.each([
		['/noticias/teste', '1'],
		['https://evil.example/document', '1'],
		[document.path, '0'],
		[document.path, '1.5'],
		[document.path, ''],
		['/horoscopo/aries/daily/2026-02-31', '1']
	])('rejeita referência inválida (%s, %s) antes de consultar', async (path, revision) => {
		const e = event();
		e.url.searchParams.set('leitura', path);
		e.url.searchParams.set('revisao', revision);
		expect((await download(e as never)).status).toBe(404);
		expect(mocks.document).not.toHaveBeenCalled();
		expect(mocks.pdf).not.toHaveBeenCalled();
	});
});
