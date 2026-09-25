import type { RequestHandler } from './$types';
import { dateRequestApi } from '$lib/server/date-request-api';
export const POST: RequestHandler = dateRequestApi;
