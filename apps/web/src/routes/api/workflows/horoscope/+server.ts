import type { RequestHandler } from './$types';
import { horoscopeRequestApi } from '$lib/server/horoscope-request-api';
export const POST: RequestHandler = horoscopeRequestApi;
