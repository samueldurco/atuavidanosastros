import { calculateLaunchFacts } from './launch-calculation';
import { composeLaunchReading, evaluateLaunchReading } from '../trials/launch-reading';
import {
	launchRuntimeDigest,
	parseLaunchRuntimeRequest,
	type LaunchRuntimeResult
} from './launch-runtime-contract';

/** CPU service only. It never reads the database, grants access, persists or calls an external model. */
export async function executeLaunchRuntime(value: unknown): Promise<LaunchRuntimeResult> {
	const request = await parseLaunchRuntimeRequest(value);
	const version = 'atv-launch-runtime-result/1' as const;
	if (request.operation === 'launch-calculation') {
		const calculation = await calculateLaunchFacts(request.input, request.executionId);
		return {
			version,
			operation: request.operation,
			calculation,
			calculationDigest: await launchRuntimeDigest(calculation)
		};
	}
	const calculationDigest = await launchRuntimeDigest(request.calculation);
	const reading =
		request.operation === 'launch-generate'
			? await composeLaunchReading(request.input, request.calculation)
			: request.reading;
	const review = await evaluateLaunchReading(request.input, request.calculation, reading);
	const readingDigest = await launchRuntimeDigest(reading);
	return request.operation === 'launch-generate'
		? { version, operation: request.operation, calculationDigest, readingDigest, reading, review }
		: { version, operation: request.operation, calculationDigest, readingDigest, review };
}
