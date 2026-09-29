import type { RequestHandler } from './$types';
import { personalCalendarRequestApi } from '$lib/server/personal-calendar-request-api';

export const POST: RequestHandler = (event) => personalCalendarRequestApi(event);
