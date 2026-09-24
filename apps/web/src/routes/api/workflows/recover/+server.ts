import type { RequestHandler } from './$types';
import { recoverWorkflowRequest } from '$lib/server/workflow-recovery';

export const POST: RequestHandler = recoverWorkflowRequest;
