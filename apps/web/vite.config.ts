import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			experimental: { instrumentation: { server: true } },
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				routes: {
					// Group public brand assets so they do not exhaust Pages' 100-rule limit.
					exclude: [
						'<build>',
						'/brand/*',
						'/locations/*',
						'/manifest.webmanifest',
						'/google15945b45fa79e7d3.html',
						'<prerendered>',
						'<redirects>'
					]
				}
			})
		})
	],
	test: {
		// Bound simultaneous PGlite/PDF work so real rendering deadlines remain meaningful.
		maxWorkers: 2,
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
