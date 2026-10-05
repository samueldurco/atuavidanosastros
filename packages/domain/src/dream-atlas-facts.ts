import {
  dreamAtlasDateWithinPeriod,
  parseDreamAtlasEntryInput,
} from "./dream-atlas.ts";
import { validDate } from "./workflows.ts";
import type { DreamAtlasEntryInput } from "./dream-atlas.ts";

export const DREAM_ATLAS_FACTS_VERSION = "atv-dream-atlas-facts/1";

export interface DreamAtlasFactSource extends DreamAtlasEntryInput {
  id: string;
  revision: number;
}

export interface DreamAtlasFacts {
  version: typeof DREAM_ATLAS_FACTS_VERSION;
  period: { startDate: string; endDate: string };
  recordedCount: number;
  includedEntryIds: string[];
  excludedCount: number;
  windows: {
    index: number;
    startDate: string;
    endDate: string;
    includedEntryIds: string[];
  }[];
  recurrences: {
    source: "reported-emotion" | "personal-association";
    label: string;
    entryIds: string[];
  }[];
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const dateAt = (start: string, offset: number) =>
  new Date(Date.parse(`${start}T00:00:00Z`) + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
const compare = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

/** Reported, consented observations only. No narrative mining or symbolic interpretation. */
export function prepareDreamAtlasFacts(
  startDate: unknown,
  sources: unknown,
): DreamAtlasFacts | null {
  if (
    !validDate(startDate) ||
    startDate > "2099-12-02" ||
    !Array.isArray(sources) ||
    sources.length > 150
  )
    return null;
  const seen = new Set<string>();
  const entries: DreamAtlasFactSource[] = [];
  for (const source of sources) {
    if (
      !object(source) ||
      typeof source.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        source.id,
      ) ||
      seen.has(source.id) ||
      !Number.isInteger(source.revision) ||
      Number(source.revision) < 1 ||
      Number(source.revision) >= 2147483647
    )
      return null;
    const entry = parseDreamAtlasEntryInput({
      version: source.version,
      dreamDate: source.dreamDate,
      narrative: source.narrative,
      emotions: source.emotions,
      associations: source.associations,
      includeInSynthesis: source.includeInSynthesis,
    });
    if (!entry || !dreamAtlasDateWithinPeriod(startDate, entry.dreamDate))
      return null;
    seen.add(source.id);
    entries.push({
      ...entry,
      id: source.id,
      revision: Number(source.revision),
    });
  }
  entries.sort(
    (a, b) => compare(a.dreamDate, b.dreamDate) || compare(a.id, b.id),
  );
  const included = entries.filter((entry) => entry.includeInSynthesis);
  const windows = Array.from({ length: 5 }, (_, position) => {
    const firstDay = position * 7;
    const lastDay = Math.min(firstDay + 6, 29);
    const windowStart = dateAt(startDate, firstDay);
    const windowEnd = dateAt(startDate, lastDay);
    return {
      index: position + 1,
      startDate: windowStart,
      endDate: windowEnd,
      includedEntryIds: included
        .filter(
          (entry) =>
            entry.dreamDate >= windowStart && entry.dreamDate <= windowEnd,
        )
        .map((entry) => entry.id),
    };
  });
  const groups = new Map<
    string,
    {
      source: "reported-emotion" | "personal-association";
      label: string;
      entryIds: string[];
    }
  >();
  for (const entry of included) {
    for (const [source, values] of [
      ["reported-emotion", entry.emotions],
      ["personal-association", entry.associations],
    ] as const) {
      for (const value of values) {
        const label = value.trim().normalize("NFC");
        const key = `${source}:${label.toLocaleLowerCase("pt-BR")}`;
        const group = groups.get(key) ?? { source, label, entryIds: [] };
        if (!group.entryIds.includes(entry.id)) group.entryIds.push(entry.id);
        groups.set(key, group);
      }
    }
  }
  const recurrences = [...groups.entries()]
    .filter(([, group]) => group.entryIds.length >= 2)
    .sort(([left], [right]) => compare(left, right))
    .map(([, group]) => group);
  return {
    version: DREAM_ATLAS_FACTS_VERSION,
    period: { startDate, endDate: dateAt(startDate, 29) },
    recordedCount: entries.length,
    includedEntryIds: included.map((entry) => entry.id),
    excludedCount: entries.length - included.length,
    windows,
    recurrences,
  };
}
