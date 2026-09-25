import type { RequestHandler } from './$types';
import { natalRequestApi } from '$lib/server/natal-request-api';
export const POST: RequestHandler = natalRequestApi;
