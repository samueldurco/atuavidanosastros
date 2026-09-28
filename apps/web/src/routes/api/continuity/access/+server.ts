import type { RequestHandler } from './$types';
import { productContinuityApi } from '$lib/server/product-continuity-api';
export const POST: RequestHandler = (event) => productContinuityApi(event, 'access');
