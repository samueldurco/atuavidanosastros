import { env } from '$env/dynamic/private';
import { shopDiagnostic } from '$lib/server/shop/shop-http';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request, fetch }) => shopDiagnostic(request, env, fetch);
