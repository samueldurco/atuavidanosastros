import type { RequestHandler } from './$types';
import { productEmailApi } from '$lib/server/product-email-api';
export const POST: RequestHandler = (event) => productEmailApi(event, 'cancel');
