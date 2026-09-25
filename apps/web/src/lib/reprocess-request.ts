import { createWorkflowRequest, type WorkflowRequestState } from './workflow-request';

export type ReprocessState = WorkflowRequestState;

/** Keep the existing reader API and legacy session keys stable. */
export function createReprocessRequest(options: {
	runId: string;
	productId: string;
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
	fetch: typeof fetch;
	randomUUID: () => string;
}) {
	const { inspect, perform } = createWorkflowRequest({
		...options,
		operation: { kind: 'reprocess', runId: options.runId }
	});
	return { inspect, perform };
}
