import { validDate } from "./workflows.ts";

export const DREAM_ATLAS_ENTRY_VERSION = "atv-dream-atlas-entry/1";

export interface DreamAtlasEntryInput {
  version: typeof DREAM_ATLAS_ENTRY_VERSION;
  dreamDate: string;
  narrative: string;
  emotions: string[];
  associations: string[];
  includeInSynthesis: boolean;
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value);
const texts = (
  value: unknown,
  maxItems: number,
  maxChars: number,
): value is string[] =>
  Array.isArray(value) &&
  value.length <= maxItems &&
  value.every((item) => text(item, maxChars));

/** A diary entry is explicit current-period data, never implied historical consent. */
export function parseDreamAtlasEntryInput(
  value: unknown,
): DreamAtlasEntryInput | null {
  if (
    !object(value) ||
    Object.keys(value).length !== 6 ||
    ![
      "version",
      "dreamDate",
      "narrative",
      "emotions",
      "associations",
      "includeInSynthesis",
    ].every((key) => Object.hasOwn(value, key)) ||
    value.version !== DREAM_ATLAS_ENTRY_VERSION ||
    !validDate(value.dreamDate) ||
    !text(value.narrative, 6000) ||
    !texts(value.emotions, 8, 80) ||
    !texts(value.associations, 8, 200) ||
    typeof value.includeInSynthesis !== "boolean"
  )
    return null;
  return structuredClone(value) as unknown as DreamAtlasEntryInput;
}

export function dreamAtlasDateWithinPeriod(
  startDate: unknown,
  dreamDate: unknown,
): boolean {
  if (
    !validDate(startDate) ||
    !validDate(dreamDate) ||
    startDate > "2099-12-02"
  )
    return false;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const day = Date.parse(`${dreamDate}T00:00:00Z`);
  return day >= start && day < start + 30 * 86_400_000;
}
