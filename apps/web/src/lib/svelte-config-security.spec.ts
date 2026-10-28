import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

type Config = Record<string, unknown>;
type ResolveOptions = (
	inlineOptions: Config,
	viteConfig: { root: string },
	env: { command: 'build'; mode: string }
) => Promise<Config>;

async function loadPluginOptions() {
	const require = createRequire(path.join(process.cwd(), 'package.json'));
	const entry = await realpath(require.resolve('@sveltejs/vite-plugin-svelte'));
	const optionsUrl = pathToFileURL(path.join(path.dirname(entry), 'utils/options.js')).href;
	const module = (await import(/* @vite-ignore */ optionsUrl)) as {
		preResolveOptions: ResolveOptions;
	};
	return { resolve: module.preResolveOptions, require: createRequire(entry) };
}

async function withConfig(
	source: string,
	run: (root: string, configFile: string) => Promise<void>
) {
	const root = await mkdtemp(path.join(tmpdir(), 'atvna-svelte-config-'));
	const configFile = path.join(root, 'svelte.config.mjs');
	try {
		await writeFile(configFile, source, 'utf8');
		await run(root, configFile);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

describe('installed Svelte config merge security', () => {
	it('does not poison a returned nested object when a config layer replaces null', async () => {
		const { resolve } = await loadPluginOptions();
		await withConfig(
			'export default { compilerOptions: { experimental: { placeholder: null } } };',
			async (root, configFile) => {
				const payload: Config = JSON.parse('{"__proto__":{"isAdmin":true}}');
				const merged = await resolve(
					{ configFile, compilerOptions: { experimental: { placeholder: payload } } },
					{ root },
					{ command: 'build', mode: 'production' }
				);
				const compiler = merged.compilerOptions as Config;
				const experimental = compiler.experimental as Config;
				const placeholder = experimental.placeholder as Config;
				expect(placeholder.isAdmin).toBeUndefined();
				expect(Object.getPrototypeOf(placeholder)).toBe(Object.prototype);
				expect(Object.prototype).not.toHaveProperty('isAdmin');
			}
		);
	});

	it('preserves array replacement, compiler settings and function identity', async () => {
		const { resolve } = await loadPluginOptions();
		const runes = () => true;
		const preprocess = { markup: () => ({ code: '' }) };
		await withConfig(
			'export default { extensions: [".svx"], compilerOptions: { dev: true }, preprocess: [{ markup() {} }] };',
			async (root, configFile) => {
				const merged = await resolve(
					{
						configFile,
						extensions: ['.svelte'],
						compilerOptions: { runes },
						preprocess: [preprocess]
					},
					{ root },
					{ command: 'build', mode: 'production' }
				);
				expect(merged.extensions).toEqual(['.svelte']);
				expect(merged.preprocess).toEqual([preprocess]);
				expect((merged.compilerOptions as Config).dev).toBe(true);
				expect((merged.compilerOptions as Config).runes).toBe(runes);
				expect(merged.isBuild).toBe(true);
			}
		);
	});

	it('resolves the replacement dependency and blocks all advisory target shapes', async () => {
		const { require } = await loadPluginOptions();
		const createMerge = require('@fastify/deepmerge') as (options: {
			symbols: boolean;
			mergeArray: () => (target: unknown[], source: unknown[]) => unknown[];
		}) => (target: Config, source: Config) => Config;
		const merge = createMerge({ symbols: true, mergeArray: () => (_target, source) => source });
		const payload = () => JSON.parse('{"__proto__":{"isAdmin":true}}') as Config;
		const nullTarget = Object.create(null) as Config;
		nullTarget.safe = true;
		const poisonedCopy = merge(nullTarget, payload());
		const nested = merge({ placeholder: null }, { placeholder: payload() }).placeholder as Config;
		const copiedTarget = merge(payload(), {});
		for (const result of [poisonedCopy, nested, copiedTarget]) {
			expect(result.isAdmin).toBeUndefined();
			expect(Object.hasOwn(result, '__proto__')).toBe(false);
		}
		expect(() => require.resolve('deepmerge')).toThrow();
	});
});
