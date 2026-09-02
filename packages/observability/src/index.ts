const forbiddenKeys = /email|name|birth|password|secret|token|hottok|authorization|cookie/i;
export function redact(attributes: Readonly<Record<string, unknown>>): Record<string, unknown> { return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, forbiddenKeys.test(key) ? '[REDACTED]' : value])); }
export interface TelemetryEvent { name: string; version: number; correlationId: string; timestamp: string; attributes: Readonly<Record<string, unknown>>; }
