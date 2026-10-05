const TIKTOK_AUTHORIZATION_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_API_BASE_URL = 'https://open.tiktokapis.com/v2';

export const TIKTOK_LOGIN_SCOPES = ['user.info.basic'] as const;
/** Account identification and draft upload; does not grant Direct Post access. */
export const TIKTOK_UPLOAD_SCOPES = ['user.info.basic', 'video.upload'] as const;
export const TIKTOK_DISPLAY_SCOPES = ['user.info.basic', 'video.list'] as const;

type Fetch = typeof fetch;

export interface TikTokOAuthTokens {
  accessToken: string;
  refreshToken: string;
  openId: string;
  scopes: readonly string[];
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

interface TikTokTokenResponse {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  scope?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  error?: string;
  error_description?: string;
  log_id?: string;
}

interface TikTokEnvelope<T> {
  data?: T;
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
}

export interface TikTokProfile {
  openId: string;
  unionId?: string;
  displayName: string;
  avatarUrl: string;
}

export interface TikTokVideo {
  id: string;
  title?: string;
  videoDescription?: string;
  duration?: number;
  coverImageUrl?: string;
  embedLink?: string;
  createTime?: number;
}

export interface TikTokVideoPage {
  videos: readonly TikTokVideo[];
  cursor?: number;
  hasMore: boolean;
}

export class TikTokApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly logId: string | undefined;

  constructor(input: { message: string; status: number; code: string; logId?: string }) {
    super(input.message);
    this.name = 'TikTokApiError';
    this.status = input.status;
    this.code = input.code;
    this.logId = input.logId;
  }
}

function requireValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} ausente`);
  return normalized;
}

function splitScopes(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function validateRedirectUri(value: string): string {
  const normalized = requireValue(value, 'TikTok redirect URI');
  const uri = new URL(normalized);
  if (uri.protocol !== 'https:' || uri.username || uri.password || normalized.includes('?') || normalized.includes('#') || normalized.length >= 512) {
    throw new Error('TikTok redirect URI deve ser HTTPS estático, sem credenciais, query ou fragmento, e menor que 512 caracteres');
  }
  return normalized;
}

async function safeTikTokFetch(fetchImpl: Fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    // workerd supports manual/follow only. Never forward credentials through a redirect.
    const response = await fetchImpl(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    if (response.status >= 300 && response.status < 400) {
      throw new Error('Redirecionamento do TikTok não permitido');
    }
    return response;
  } catch {
    throw new TikTokApiError({ message: 'Falha de comunicação com o TikTok', status: 0, code: 'network_error' });
  }
}

function tokenExpiry(now: Date, seconds: number | undefined): string {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) {
    throw new Error('TikTok retornou validade de token inválida');
  }
  return new Date(now.getTime() + seconds * 1_000).toISOString();
}

function mapTokens(payload: TikTokTokenResponse, now: Date): TikTokOAuthTokens {
  return {
    accessToken: requireValue(payload.access_token ?? '', 'TikTok access token'),
    refreshToken: requireValue(payload.refresh_token ?? '', 'TikTok refresh token'),
    openId: requireValue(payload.open_id ?? '', 'TikTok open id'),
    scopes: splitScopes(payload.scope),
    accessExpiresAt: tokenExpiry(now, payload.expires_in),
    refreshExpiresAt: tokenExpiry(now, payload.refresh_expires_in)
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestTokens(
  parameters: Record<string, string>,
  fetchImpl: Fetch,
  now: Date
): Promise<TikTokOAuthTokens> {
  const response = await safeTikTokFetch(fetchImpl, `${TIKTOK_API_BASE_URL}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(parameters)
  });
  const payload = (await readJson(response)) as TikTokTokenResponse | null;
  if (!response.ok || !payload || payload.error) {
    throw new TikTokApiError({
      message: 'Falha ao obter credenciais do TikTok',
      status: response.status,
      code: payload?.error || 'token_exchange_failed',
      ...(payload?.log_id ? { logId: payload.log_id } : {})
    });
  }
  return mapTokens(payload, now);
}

export function createTikTokAuthorizationUrl(input: {
  clientKey: string;
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}): URL {
  const clientKey = requireValue(input.clientKey, 'TikTok client key');
  const redirectUri = validateRedirectUri(input.redirectUri);
  const state = requireValue(input.state, 'TikTok OAuth state');
  const scopes = input.scopes ?? TIKTOK_LOGIN_SCOPES;
  if (scopes.length === 0) throw new Error('Ao menos um escopo TikTok é obrigatório');

  const url = new URL(TIKTOK_AUTHORIZATION_URL);
  url.searchParams.set('client_key', clientKey);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(','));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url;
}

export async function exchangeTikTokAuthorizationCode(input: {
  clientKey: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  fetchImpl?: Fetch;
  now?: Date;
}): Promise<TikTokOAuthTokens> {
  return requestTokens(
    {
      client_key: requireValue(input.clientKey, 'TikTok client key'),
      client_secret: requireValue(input.clientSecret, 'TikTok client secret'),
      code: requireValue(input.code, 'TikTok authorization code'),
      grant_type: 'authorization_code',
      redirect_uri: validateRedirectUri(input.redirectUri)
    },
    input.fetchImpl ?? fetch,
    input.now ?? new Date()
  );
}

export async function refreshTikTokAccessToken(input: {
  clientKey: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl?: Fetch;
  now?: Date;
}): Promise<TikTokOAuthTokens> {
  return requestTokens(
    {
      client_key: requireValue(input.clientKey, 'TikTok client key'),
      client_secret: requireValue(input.clientSecret, 'TikTok client secret'),
      grant_type: 'refresh_token',
      refresh_token: requireValue(input.refreshToken, 'TikTok refresh token')
    },
    input.fetchImpl ?? fetch,
    input.now ?? new Date()
  );
}

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('TikTok retornou resposta inválida');
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapVideo(value: unknown): TikTokVideo {
  const video = requireObject(value);
  const title = optionalString(video.title);
  const videoDescription = optionalString(video.video_description);
  const duration = optionalNumber(video.duration);
  const coverImageUrl = optionalString(video.cover_image_url);
  const embedLink = optionalString(video.embed_link);
  const createTime = optionalNumber(video.create_time);
  return {
    id: requireValue(String(video.id ?? ''), 'TikTok video id'),
    ...(title ? { title } : {}),
    ...(videoDescription ? { videoDescription } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(coverImageUrl ? { coverImageUrl } : {}),
    ...(embedLink ? { embedLink } : {}),
    ...(createTime !== undefined ? { createTime } : {})
  };
}

export class TikTokDisplayClient {
  readonly #accessToken: string;
  readonly #fetch: Fetch;

  constructor(input: { accessToken: string; fetchImpl?: Fetch }) {
    this.#accessToken = requireValue(input.accessToken, 'TikTok access token');
    this.#fetch = input.fetchImpl ?? fetch;
  }

  async #request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await safeTikTokFetch(this.#fetch, `${TIKTOK_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.#accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      }
    });
    const payload = (await readJson(response)) as TikTokEnvelope<T> | null;
    if (!response.ok || !payload || (payload.error?.code && payload.error.code !== 'ok')) {
      throw new TikTokApiError({
        message: 'Falha na Display API do TikTok',
        status: response.status,
        code: payload?.error?.code || 'display_api_failed',
        ...(payload?.error?.log_id ? { logId: payload.error.log_id } : {})
      });
    }
    if (payload.data === undefined) throw new Error('TikTok retornou resposta sem dados');
    return payload.data;
  }

  async getProfile(): Promise<TikTokProfile> {
    const fields = ['open_id', 'union_id', 'avatar_url', 'display_name'].join(',');
    const data = await this.#request<{ user?: unknown }>(`/user/info/?fields=${fields}`);
    const user = requireObject(data.user);
    const unionId = optionalString(user.union_id);
    return {
      openId: requireValue(String(user.open_id ?? ''), 'TikTok open id'),
      ...(unionId ? { unionId } : {}),
      displayName: requireValue(String(user.display_name ?? ''), 'TikTok display name'),
      avatarUrl: requireValue(String(user.avatar_url ?? ''), 'TikTok avatar URL')
    };
  }

  async listVideos(input: { maxCount?: number; cursor?: number } = {}): Promise<TikTokVideoPage> {
    const maxCount = input.maxCount ?? 20;
    if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > 20) {
      throw new Error('TikTok maxCount deve ser um inteiro entre 1 e 20');
    }
    const fields = [
      'id',
      'title',
      'video_description',
      'duration',
      'cover_image_url',
      'embed_link',
      'create_time'
    ].join(',');
    const data = await this.#request<{
      videos?: unknown[];
      cursor?: number;
      has_more?: boolean;
    }>(`/video/list/?fields=${fields}`, {
      method: 'POST',
      body: JSON.stringify({
        max_count: maxCount,
        ...(input.cursor !== undefined ? { cursor: input.cursor } : {})
      })
    });
    const cursor = optionalNumber(data.cursor);
    return {
      videos: (data.videos ?? []).map(mapVideo),
      ...(cursor !== undefined ? { cursor } : {}),
      hasMore: data.has_more === true
    };
  }
}
