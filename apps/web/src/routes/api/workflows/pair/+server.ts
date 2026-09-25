import type { RequestHandler } from './$types';
import { pairRequestApi } from '$lib/server/pair-request-api';

export const POST: RequestHandler = (event) => pairRequestApi(event);
