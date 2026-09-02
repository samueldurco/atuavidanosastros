export interface WebhookEnvelope<T = unknown> { provider: 'hotmart'; externalEventId: string; receivedAt: string; signatureVerified: boolean; payload: T; }
export interface LocationCandidate { label: string; countryCode: string; region?: string; latitude: number; longitude: number; timezone: string; source: string; }
export interface LocationProvider { search(query: string, locale: 'pt-BR'): Promise<readonly LocationCandidate[]>; }
export interface TransactionalEmailProvider { send(input: { template: string; recipientUserId: string; parameters: Readonly<Record<string, string>> }): Promise<{ providerMessageId: string }>; }

export interface HotmartNotification {
  id: string;
  event: string;
  version?: string;
  creationDate?: number;
  data: Readonly<Record<string, unknown>>;
}

export function parseHotmartNotification(value: unknown): HotmartNotification | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.event !== 'string' || !record.data || typeof record.data !== 'object') return null;
  return {
    id: record.id,
    event: record.event,
    ...(typeof record.version === 'string' ? { version: record.version } : {}),
    ...(typeof record.creation_date === 'number' ? { creationDate: record.creation_date } : {}),
    data: record.data as Readonly<Record<string, unknown>>
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyHotmartHottok(received: string | null, expected: string): Promise<boolean> {
  if (!received || !expected) return false;
  const [left, right] = await Promise.all([sha256Hex(received), sha256Hex(expected)]);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
