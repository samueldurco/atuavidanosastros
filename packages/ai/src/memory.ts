import type { Capability } from "./contracts.ts";
import { redact } from "./prompt.ts";

export interface MemoryEntry {
  id: string;
  ownerId: string;
  capability: Capability;
  kind: "theme" | "preference" | "recurrence" | "prior-hypothesis";
  summary: string;
  relevance: "relevant" | "irrelevant" | "unreviewed";
  sensitive: boolean;
  consent: {
    purpose: "reading-continuity";
    expiresAt: string;
    revoked: boolean;
  };
  deleted: boolean;
}

/** Projection only; storage/RLS, consent UI and erasure are separate application responsibilities. */
export function memoryContext(
  entries: readonly MemoryEntry[],
  ownerId: string,
  capability: Capability,
  now: Date,
): { kind: MemoryEntry["kind"]; summary: string }[] {
  if (!ownerId || !Number.isFinite(now.getTime())) return [];
  return entries
    .filter(
      (entry) =>
        entry.ownerId === ownerId &&
        entry.capability === capability &&
        !entry.deleted &&
        !entry.sensitive &&
        entry.relevance === "relevant" &&
        entry.consent.purpose === "reading-continuity" &&
        !entry.consent.revoked &&
        Date.parse(entry.consent.expiresAt) > now.getTime(),
    )
    .slice(0, 5)
    .map((entry) => ({
      kind: entry.kind,
      summary: redact(entry.summary).slice(0, 200),
    }));
}
