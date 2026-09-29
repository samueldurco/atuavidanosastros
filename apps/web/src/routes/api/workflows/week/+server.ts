import type { RequestHandler } from './$types';
import { weekRequestApi } from '$lib/server/week-request-api';
export const POST: RequestHandler = weekRequestApi;
