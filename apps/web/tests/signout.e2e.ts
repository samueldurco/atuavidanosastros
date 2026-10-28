import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { get } from 'node:https';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Reuse the bundle built by Playwright's webServer. This worker has its own local
// Auth endpoint, so the real SSR cookie handling runs without a Supabase project.
const workerPort = Number(
	process.env.ATV_SIGNOUT_E2E_PORT ?? String(Number(process.env.ATV_E2E_PORT ?? 4173) + 1)
);
// Exercise the production HTTPS cookie and native form submission behavior.
const baseURL = `https://localhost:${workerPort}`;
const cookieName = 'sb-127-auth-token';
const user = {
	id: '00000000-0000-4000-8000-000000000053',
	email: 'signout-fixture@example.test',
	aud: 'authenticated',
	role: 'authenticated',
	app_metadata: {},
	user_metadata: {},
	created_at: '2026-01-01T00:00:00.000Z'
};
type AuthCall = { method: string; path: string; authorization?: string };
let calls: AuthCall[] = [];
let unexpectedCalls: string[] = [];
let failLogout = false;
let authServer: Server | undefined;
let worker: ChildProcess | undefined;
let workerOutput = '';
let workerError: Error | undefined;

function makeSession() {
	const now = Math.floor(Date.now() / 1000);
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
	const payload = Buffer.from(
		JSON.stringify({
			sub: user.id,
			email: user.email,
			aud: user.aud,
			role: user.role,
			iat: now,
			exp: now + 3600
		})
	).toString('base64url');
	const signature = createHmac('sha256', 'local-signout-fixture-only')
		.update(`${header}.${payload}`)
		.digest('base64url');
	return {
		access_token: `${header}.${payload}.${signature}`,
		refresh_token: 'local-signout-refresh-token',
		expires_at: now + 3600,
		expires_in: 3600,
		token_type: 'bearer',
		user
	};
}

async function seedSession(context: BrowserContext) {
	const session = makeSession();
	await context.addCookies([
		{
			name: cookieName,
			value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
			url: baseURL,
			sameSite: 'Lax',
			secure: true,
			httpOnly: false
		}
	]);
	return session.access_token;
}

async function stopLocalServices() {
	if (worker?.pid && worker.exitCode === null) {
		if (process.platform === 'win32') {
			spawnSync('taskkill.exe', ['/PID', String(worker.pid), '/T', '/F'], {
				windowsHide: true,
				stdio: 'ignore',
				timeout: 5000
			});
		} else {
			try {
				process.kill(-worker.pid, 'SIGTERM');
			} catch {
				worker.kill('SIGTERM');
			}
		}
	}
	worker = undefined;
	if (authServer?.listening) {
		authServer.closeAllConnections();
		await new Promise<void>((resolve) => authServer!.close(() => resolve()));
	}
	authServer = undefined;
}

async function startLocalServices() {
	authServer = createServer((request, response) => {
		const url = new URL(request.url ?? '/', 'http://127.0.0.1');
		const method = request.method ?? 'GET';
		if (method === 'GET' && url.pathname === '/cross-origin-form') {
			response.setHeader('content-type', 'text/html; charset=utf-8');
			response.end(
				`<form method="POST" action="${baseURL}/sair"><button>Encerrar sessão alheia</button></form>`
			);
			return;
		}
		calls.push({
			method,
			path: `${url.pathname}${url.search}`,
			authorization: request.headers.authorization
		});
		response.setHeader('content-type', 'application/json');
		if (method === 'GET' && url.pathname === '/auth/v1/user') {
			response.end(JSON.stringify(user));
		} else if (method === 'POST' && url.pathname === '/rest/v1/rpc/has_atv_trial_access') {
			response.end('false');
		} else if (method === 'POST' && url.pathname === '/auth/v1/logout') {
			if (failLogout) {
				response.writeHead(400);
				response.end(
					JSON.stringify({ code: 'unexpected_failure', message: 'Local logout failure' })
				);
			} else {
				response.writeHead(204);
				response.end();
			}
		} else {
			unexpectedCalls.push(`${method} ${url.pathname}${url.search}`);
			response.writeHead(500);
			response.end(JSON.stringify({ message: 'Unexpected local Auth fixture request' }));
		}
	});
	await new Promise<void>((resolve, reject) => {
		authServer!.once('error', reject);
		authServer!.listen(0, '127.0.0.1', resolve);
	});
	const address = authServer.address();
	if (!address || typeof address === 'string') throw new Error('Local Auth fixture did not bind');
	const authURL = `http://127.0.0.1:${address.port}`;
	worker = spawn(
		process.execPath,
		[
			fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)),
			'pages',
			'dev',
			'.svelte-kit/cloudflare',
			'--ip',
			'127.0.0.1',
			'--port',
			String(workerPort),
			'--local-protocol',
			'https',
			'--binding',
			`PUBLIC_SUPABASE_URL=${authURL}`,
			'--binding',
			'PUBLIC_SUPABASE_PUBLISHABLE_KEY=local-signout-publishable-key'
		],
		{
			cwd: fileURLToPath(new URL('..', import.meta.url)),
			env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
			windowsHide: true,
			detached: process.platform !== 'win32',
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);
	worker.once('error', (error) => {
		workerError = error;
	});
	const capture = (chunk: Buffer) => {
		workerOutput = (workerOutput + chunk.toString()).slice(-6000);
	};
	worker.stdout?.on('data', capture);
	worker.stderr?.on('data', capture);
	const deadline = Date.now() + 45_000;
	while (Date.now() < deadline) {
		if (workerError || worker.exitCode !== null) {
			throw new Error(
				`Signout worker failed: ${workerError?.message ?? worker.exitCode}\n${workerOutput}`
			);
		}
		try {
			const ready = await new Promise<boolean>((resolve, reject) => {
				const request = get(
					`${baseURL}/dashboard/_spec`,
					{ rejectUnauthorized: false },
					(response) => {
						response.resume();
						resolve(response.statusCode === 200);
					}
				);
				request.setTimeout(1000, () => request.destroy(new Error('Worker not ready')));
				request.once('error', reject);
			});
			if (ready) return;
		} catch {
			// The worker is still binding its local listener.
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`Signout worker was not ready after 45 seconds\n${workerOutput}`);
}

async function openAuthenticatedDashboard(page: Page, context: BrowserContext) {
	const token = await seedSession(context);
	const response = await page.goto('/dashboard/_spec?state=exact');
	expect(response!.headers()['referrer-policy']).toBe('same-origin');
	expect(response!.headers()['cache-control']).toContain('no-store');
	const reject = page.getByRole('button', { name: 'Recusar opcionais' });
	if (await reject.isVisible()) await reject.click();
	await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
	expect(
		calls.some((call) => call.path === '/auth/v1/user' && call.authorization === `Bearer ${token}`)
	).toBe(true);
	return token;
}

async function submitSignout(page: Page, buttonName: string, expectedState: 'encerrada' | 'erro') {
	const responsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/sair' && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: buttonName, exact: true }).click();
	const response = await responsePromise;
	expect(response.status()).toBe(303);
	expect(response.headers()['location']).toBe(`/entrar?sessao=${expectedState}`);
	expect(response.headers()['cache-control']).toContain('no-store');
	await expect(page).toHaveURL(`${baseURL}/entrar?sessao=${expectedState}`);
}

async function expectSessionCleared(context: BrowserContext) {
	expect(
		(await context.cookies()).filter((cookie) => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name))
	).toEqual([]);
}

async function expectPrivatePagesRequireLogin(page: Page) {
	for (const path of ['/dashboard', '/biblioteca/00000000-0000-4000-8000-000000000052']) {
		await page.goto(path);
		await expect(page).toHaveURL(
			(url) => url.pathname === '/entrar' && url.searchParams.get('next') === path
		);
		await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toHaveCount(0);
	}
}

test.describe('real SSR signout with local Auth fixture', () => {
	test.describe.configure({ mode: 'serial' });
	test.use({ baseURL, ignoreHTTPSErrors: true });
	test.beforeAll(async () => {
		test.setTimeout(60_000);
		try {
			await startLocalServices();
		} catch (error) {
			await stopLocalServices();
			throw error;
		}
	});
	test.afterAll(stopLocalServices);
	test.beforeEach(() => {
		calls = [];
		unexpectedCalls = [];
		failLogout = false;
	});
	test.afterEach(() => {
		expect(unexpectedCalls).toEqual([]);
	});

	test('cross-origin native logout form is rejected without ending the session', async ({
		page,
		context
	}) => {
		await openAuthenticatedDashboard(page, context);
		const address = authServer!.address();
		if (!address || typeof address === 'string') throw new Error('Auth fixture is not listening');
		await page.goto(`http://127.0.0.1:${address.port}/cross-origin-form`);
		const responsePromise = page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname === '/sair' && response.request().method() === 'POST'
		);
		await page.getByRole('button', { name: 'Encerrar sessão alheia' }).click();
		const response = await responsePromise;
		expect(response.status()).toBe(403);
		expect(calls.filter((call) => call.path.startsWith('/auth/v1/logout'))).toEqual([]);
		expect((await context.cookies()).some((cookie) => cookie.name === cookieName)).toBe(true);
		await page.goto('/dashboard/_spec?state=exact');
		await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
	});

	for (const viewport of [
		{ width: 1440, height: 1000 },
		{ width: 390, height: 844 },
		{ width: 320, height: 812 }
	]) {
		for (const shell of ['authenticated', 'public']) {
			test(`${shell} signout clears the session and protects private pages at ${viewport.width}px`, async ({
				page,
				context
			}, testInfo) => {
				await page.setViewportSize(viewport);
				const token = await openAuthenticatedDashboard(page, context);
				if (shell === 'public') {
					await page.goto('/privacidade');
					const mobileMenu = page.getByRole('button', { name: 'Menu', exact: true });
					if (await mobileMenu.isVisible()) {
						await mobileMenu.click();
						await expect(
							page.getByRole('button', { name: 'Fechar menu', exact: true })
						).toHaveAttribute('aria-expanded', 'true');
					}
				}
				await expect(
					page.getByRole('button', { name: 'Sair da conta', exact: true })
				).toBeVisible();
				const button = await page
					.getByRole('button', { name: 'Sair da conta', exact: true })
					.boundingBox();
				expect(button).not.toBeNull();
				expect(button!.x).toBeGreaterThanOrEqual(0);
				expect(button!.x + button!.width).toBeLessThanOrEqual(viewport.width);
				expect(button!.width).toBeGreaterThanOrEqual(44);
				expect(button!.height).toBeGreaterThanOrEqual(44);
				expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
					viewport.width
				);
				await page.screenshot({ path: testInfo.outputPath('signout-header.png') });
				await submitSignout(page, 'Sair da conta', 'encerrada');
				await expect(page.getByText('Sessão encerrada', { exact: true })).toBeVisible();
				const logoutCalls = calls.filter((call) => call.path.startsWith('/auth/v1/logout'));
				expect(logoutCalls).toEqual([
					{ method: 'POST', path: '/auth/v1/logout?scope=local', authorization: `Bearer ${token}` }
				]);
				await expectSessionCleared(context);
				await expectPrivatePagesRequireLogin(page);
			});
		}
	}

	test('logout failure explains the problem and offers an idempotent retry', async ({
		page,
		context
	}) => {
		await openAuthenticatedDashboard(page, context);
		failLogout = true;
		await submitSignout(page, 'Sair da conta', 'erro');
		await expect(
			page.getByText('Não foi possível confirmar sua saída', { exact: true })
		).toBeVisible();
		await expect(page.getByText('Sessão encerrada', { exact: true })).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: 'Tentar sair novamente', exact: true })
		).toBeVisible();
		expect(calls.filter((call) => call.path === '/auth/v1/logout?scope=local')).toHaveLength(1);
		// Auth-js can clear local cookies while returning a remote logout error.
		// Retrying without a remaining session must still confirm a successful exit.
		failLogout = false;
		await submitSignout(page, 'Tentar sair novamente', 'encerrada');
		await expect(page.getByText('Sessão encerrada', { exact: true })).toBeVisible();
		await expectSessionCleared(context);
		await expectPrivatePagesRequireLogin(page);
	});
});
