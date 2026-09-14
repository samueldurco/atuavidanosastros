import type { RequestHandler } from './$types';
import { workflowDownload } from '$lib/server/workflow-download';
export const GET: RequestHandler = (event) => workflowDownload(event, event.params.id);
