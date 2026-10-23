// Kit 3 retains these runtime wrappers until Kit 4. Keep their types tied to
// the generated explicit environment, including the private/public boundary.
declare module '$app/environment' {
	export * from '$app/env';
}

declare module '$env/dynamic/private' {
	export const env: typeof import('$app/env/private');
}

declare module '$env/dynamic/public' {
	export const env: typeof import('$app/env/public');
}
