import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTikTokAuthorizationUrl,
  exchangeTikTokAuthorizationCode,
  TikTokApiError,
  TikTokDisplayClient
} from './tiktok.ts';

test('gera autorização com state e somente perfil básico por padrão', () => {
  const url = createTikTokAuthorizationUrl({
    clientKey: 'client-key',
    redirectUri: 'https://atuavidanosastros.com.br/api/integrations/tiktok/callback',
    state: 'csrf-state'
  });
  assert.equal(url.origin, 'https://www.tiktok.com');
  assert.equal(url.searchParams.get('client_key'), 'client-key');
  assert.equal(url.searchParams.get('scope'), 'user.info.basic');
  assert.equal(url.searchParams.get('state'), 'csrf-state');
});

test('troca authorization code sem enviar segredo na URL', async () => {
  let observedUrl = '';
  let observedBody = '';
  const tokens = await exchangeTikTokAuthorizationCode({
    clientKey: 'key',
    clientSecret: 'secret',
    code: 'code',
    redirectUri: 'https://example.com/callback',
    now: new Date('2026-09-16T12:00:00.000Z'),
    fetchImpl: async (input, init) => {
      assert.equal(init?.redirect, 'manual');
      assert.ok(init?.signal);
      observedUrl = String(input);
      observedBody = String(init?.body);
      return Response.json({
        access_token: 'access',
        refresh_token: 'refresh',
        open_id: 'open-id',
        scope: 'user.info.basic,video.list',
        expires_in: 86_400,
        refresh_expires_in: 31_536_000
      });
    }
  });
  assert.equal(observedUrl.includes('secret'), false);
  assert.match(observedBody, /client_secret=secret/);
  assert.equal(tokens.accessExpiresAt, '2026-09-17T12:00:00.000Z');
  assert.deepEqual(tokens.scopes, ['user.info.basic', 'video.list']);
});

test('rejeita callbacks inseguros antes de solicitar credenciais', async () => {
  let requested = false;
  for (const redirectUri of ['http://example.com/callback', 'https://example.com/callback?x=1', 'https://example.com/callback#x', 'https://user:password@example.com/callback', `https://example.com/${'a'.repeat(512)}`]) {
    assert.throws(() => createTikTokAuthorizationUrl({ clientKey: 'key', redirectUri, state: 'state' }));
    await assert.rejects(() => exchangeTikTokAuthorizationCode({ clientKey: 'key', clientSecret: 'secret', code: 'code', redirectUri, fetchImpl: async () => { requested = true; return Response.json({}); } }));
  }
  assert.equal(requested, false);
});

test('não propaga mensagens de transporte ou provedor que podem conter segredos', async () => {
  const canary = 'secret-canary-never-log';
  for (const fetchImpl of [
    async () => { throw new Error(canary); },
    async () => Response.json({ error: 'invalid_grant', error_description: canary }, { status: 400 })
  ]) {
    await assert.rejects(() => exchangeTikTokAuthorizationCode({ clientKey: 'key', clientSecret: canary, code: 'code', redirectUri: 'https://example.com/callback', fetchImpl }), (error) => {
      assert.ok(error instanceof TikTokApiError);
      assert.equal(error.message.includes(canary), false);
      return true;
    });
  }
});

test('recusa redirecionamentos sem ler respostas nem encaminhar credenciais', async () => {
  for (const status of [300, 301, 302, 303, 304, 307, 308, 399]) {
    let requests = 0;
    let bodyRead = false;
    await assert.rejects(() => exchangeTikTokAuthorizationCode({
      clientKey: 'key', clientSecret: 'secret-canary', code: 'code', redirectUri: 'https://example.com/callback',
      fetchImpl: async (input, init) => {
        requests += 1;
        assert.equal(String(input), 'https://open.tiktokapis.com/v2/oauth/token/');
        assert.equal(init?.redirect, 'manual');
        const response = new Response(null, { status, headers: { Location: 'https://example.invalid/secret-sink' } });
        response.json = async () => { bodyRead = true; throw new Error('secret-canary'); };
        return response;
      }
    }), (error) => {
      assert.ok(error instanceof TikTokApiError);
      assert.equal(error.code, 'network_error');
      assert.equal(error.message.includes('secret-canary'), false);
      return true;
    });
    assert.equal(requests, 1);
    assert.equal(bodyRead, false);
  }
});

test('lê perfil e vídeos e preserva erro estruturado do TikTok', async () => {
  const responses = [
    Response.json({
      data: {
        user: {
          open_id: 'open-id',
          union_id: 'union-id',
          avatar_url: 'https://example.com/avatar.jpg',
          display_name: 'ATV'
        }
      },
      error: { code: 'ok', message: '', log_id: 'log-profile' }
    }),
    Response.json({
      data: {
        videos: [
          {
            id: 'video-1',
            title: 'Vídeo',
            duration: 12,
            embed_link: 'https://www.tiktok.com/player/v1/video-1'
          }
        ],
        cursor: 1,
        has_more: false
      },
      error: { code: 'ok', message: '', log_id: 'log-videos' }
    }),
    Response.json(
      { data: {}, error: { code: 'access_token_invalid', message: 'Token inválido', log_id: 'log-error' } },
      { status: 401 }
    )
  ];
  const client = new TikTokDisplayClient({
    accessToken: 'access',
    fetchImpl: async () => responses.shift() ?? Response.json({}, { status: 500 })
  });

  assert.equal((await client.getProfile()).displayName, 'ATV');
  assert.equal((await client.listVideos()).videos[0]?.id, 'video-1');
  await assert.rejects(() => client.getProfile(), (error) => {
    assert.equal(error instanceof TikTokApiError, true);
    assert.equal((error as TikTokApiError).code, 'access_token_invalid');
    return true;
  });
});
