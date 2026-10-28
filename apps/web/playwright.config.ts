import { defineConfig } from '@playwright/test';

const port = Number(process.env.ATV_E2E_PORT ?? 4173);

export default defineConfig({
	timeout: 60_000,
	expect: { timeout: 10_000 },
	use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
	webServer: {
		command: 'pnpm exec node ../../scripts/free-tools-e2e-server.mjs',
		env: { ATV_E2E_PORT: String(port), ATV_E2E_RPC_PORT: String(port + 1) },
		port,
		stdout: 'pipe',
		stderr: 'pipe',
		reuseExistingServer: false,
		timeout: 300_000
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	testMatch: '**/*.e2e.{ts,js}'
});
