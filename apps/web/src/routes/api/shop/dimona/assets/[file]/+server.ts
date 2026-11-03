import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { serveDimonaAsset } from '$lib/server/shop/dimona-assets';

export const GET: RequestHandler = ({ request, fetch }) => serveDimonaAsset(request, env, fetch);
export const HEAD = GET;
