import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import type { TikTokOAuthTokens } from '@atv/integrations';
import { decryptTikTokTokens, encryptTikTokTokens, oauthStateMatches } from './tiktok-credentials';

const tokens: TikTokOAuthTokens = {
	accessToken: 'access-token',
	refreshToken: 'refresh-token',
	openId: 'open-id',
	scopes: ['user.info.basic', 'video.list'],
	accessExpiresAt: '2026-09-17T12:00:00.000Z',
	refreshExpiresAt: '2027-09-16T12:00:00.000Z'
};

describe('credenciais TikTok', () => {
	it('criptografa e recupera tokens sem armazenar texto puro', async () => {
		const key = Buffer.alloc(32, 7).toString('base64');
		const encrypted = await encryptTikTokTokens(tokens, key);
		expect(encrypted.ciphertext).not.toContain(tokens.accessToken);
		expect(await decryptTikTokTokens(encrypted, key)).toEqual(tokens);
	});

	it('compara state OAuth sem aceitar valor ausente ou diferente', async () => {
		expect(await oauthStateMatches('state', 'state')).toBe(true);
		expect(await oauthStateMatches('state', 'outro')).toBe(false);
		expect(await oauthStateMatches('', '')).toBe(false);
	});
});
