import type { RequestHandler } from './$types';
import { solarReturnRequestApi } from '$lib/server/solar-return-request-api';

export const POST: RequestHandler = solarReturnRequestApi;
