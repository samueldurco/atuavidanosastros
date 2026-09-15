import type { RequestHandler } from './$types';
import { workflowArtifacts } from '$lib/server/workflow-artifacts';
export const GET: RequestHandler = (event) =>
	workflowArtifacts(event, event.params.id, event.params.artifactId);
