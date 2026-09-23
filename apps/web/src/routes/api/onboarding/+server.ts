import type { RequestHandler } from './$types';
import { onboardingApi } from '$lib/server/onboarding-api';

export const GET: RequestHandler = (event) => onboardingApi(event, 'read');
export const POST: RequestHandler = (event) => onboardingApi(event, 'write');
