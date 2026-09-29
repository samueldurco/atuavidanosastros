import { validDate, type ImportantDatesInput } from "@atv/domain";

export const SOLAR_RETURN_CALENDAR_VERSION = "atv-solar-return-calendar/1.0.0";

export interface SolarReturnCalendar {
  version: typeof SOLAR_RETURN_CALENDAR_VERSION;
  basis: "declared-civil-anniversary";
  startDate: string;
  endDateExclusive: string;
  months: {
    number: number;
    startDate: string;
    endDateExclusive: string;
    importantDateIds: string[];
  }[];
  boundaryImportantDateIds: string[];
}

/** Civil coverage only. These windows make no astrological timing claim. */
export function buildSolarReturnCalendar(
  anchorDate: string,
  entries: ImportantDatesInput["entries"] = [],
): SolarReturnCalendar {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchorDate);
  if (!match) throw new Error("invalid_solar_calendar_anchor");
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  if (
    year < 1900 ||
    year > 2099 ||
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !==
      anchorDate
  )
    throw new Error("invalid_solar_calendar_anchor");
  const boundary = (offset: number): string => {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1));
    const lastDay = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  };
  const months = Array.from({ length: 12 }, (_, index) => ({
    number: index + 1,
    startDate: boundary(index),
    endDateExclusive: boundary(index + 1),
    importantDateIds: [] as string[],
  }));
  const endDateExclusive = months[11]!.endDateExclusive;
  const boundaryImportantDateIds: string[] = [];
  const seenDates = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    if (
      !validDate(entry.date) ||
      entry.date < anchorDate ||
      entry.date > endDateExclusive ||
      seenDates.has(entry.date)
    )
      throw new Error("invalid_solar_calendar_date");
    seenDates.add(entry.date);
    const id = `important-date-${index + 1}`;
    if (entry.date === endDateExclusive) {
      boundaryImportantDateIds.push(id);
      continue;
    }
    const window = months.find(
      (item) =>
        item.startDate <= entry.date && entry.date < item.endDateExclusive,
    );
    if (!window) throw new Error("invalid_solar_calendar_date");
    window.importantDateIds.push(id);
  }
  return {
    version: SOLAR_RETURN_CALENDAR_VERSION,
    basis: "declared-civil-anniversary",
    startDate: anchorDate,
    endDateExclusive,
    months,
    boundaryImportantDateIds,
  };
}
