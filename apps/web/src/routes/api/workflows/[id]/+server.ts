import type { RequestHandler } from './$types';
import { workflowApi } from '$lib/server/workflow-api';
export const GET: RequestHandler = (event) => workflowApi(event, 'read', event.params.id);
export const DELETE: RequestHandler = (event) => workflowApi(event, 'delete', event.params.id);
