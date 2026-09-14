import type { RequestHandler } from './$types';
import { workflowApi } from '$lib/server/workflow-api';
export const POST: RequestHandler = (event) => workflowApi(event, 'create');
