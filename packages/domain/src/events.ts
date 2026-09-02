export const analyticsEvents = [
  'page_view',
  'sign_up',
  'login',
  'generate_lead',
  'tool_started',
  'tool_completed',
  'begin_checkout',
  'purchase',
  'delivery_opened'
] as const;

export type AnalyticsEventName = (typeof analyticsEvents)[number];

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  payload: T;
}
