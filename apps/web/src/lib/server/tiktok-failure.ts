import { TikTokApiError } from '@atv/integrations';

export type TikTokConnectionStage = 'tokens' | 'profile' | 'encryption' | 'storage';

// Only fixed codes may reach the authenticated error page. Provider messages,
// log IDs, request URLs and credentials must never be interpolated here.
const SAFE_CODES = new Set([
	'invalid_client',
	'invalid_grant',
	'invalid_request',
	'invalid_scope',
	'unauthorized_client',
	'access_denied',
	'access_token_invalid',
	'scope_not_authorized',
	'rate_limit_exceeded',
	'internal_error',
	'network_error',
	'token_exchange_failed',
	'display_api_failed'
]);

export function tikTokConnectionFailure(stage: TikTokConnectionStage, failure: unknown): string {
	const code =
		failure instanceof TikTokApiError && SAFE_CODES.has(failure.code)
			? failure.code
			: 'unexpected_error';
	return `Não foi possível concluir a conexão do TikTok. Referência: ${stage}/${code}. Inicie uma nova autorização pelo painel administrativo.`;
}
