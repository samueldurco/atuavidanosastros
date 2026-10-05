import type { RequestHandler } from './$types';
import { dreamAtlasApi } from '$lib/server/dream-atlas-api';
export const POST: RequestHandler = (event) => dreamAtlasApi(event, 'read');
