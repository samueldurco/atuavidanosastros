import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseDreamAtlasEntryInput,
  dreamAtlasDateWithinPeriod,
  DREAM_ATLAS_ENTRY_VERSION,
} from "./src/dream-atlas.ts";

const entry = () => ({
  version: DREAM_ATLAS_ENTRY_VERSION,
  dreamDate: "2026-02-28",
  narrative: "Relato sintético.",
  emotions: ["curiosidade"],
  associations: ["casa"],
  includeInSynthesis: true,
});

test("diary input keeps explicit exclusion and rejects forged history", () => {
  assert.deepEqual(parseDreamAtlasEntryInput(entry()), entry());
  assert.equal(
    parseDreamAtlasEntryInput({ ...entry(), includeInSynthesis: false })
      ?.includeInSynthesis,
    false,
  );
  assert.equal(
    parseDreamAtlasEntryInput({ ...entry(), history: ["outro sonho"] }),
    null,
  );
  assert.equal(
    parseDreamAtlasEntryInput({ ...entry(), narrative: "\u0000" }),
    null,
  );
  assert.equal(
    parseDreamAtlasEntryInput({ ...entry(), emotions: Array(9).fill("x") }),
    null,
  );
});

test("30-day window uses civil dates including leap day and final day", () => {
  assert.equal(dreamAtlasDateWithinPeriod("2026-02-01", "2026-03-02"), true);
  assert.equal(dreamAtlasDateWithinPeriod("2026-02-01", "2026-03-03"), false);
  assert.equal(dreamAtlasDateWithinPeriod("2024-02-28", "2024-02-29"), true);
  assert.equal(dreamAtlasDateWithinPeriod("2024-02-28", "2024-03-28"), true);
  assert.equal(dreamAtlasDateWithinPeriod("2024-02-28", "2024-03-29"), false);
  assert.equal(dreamAtlasDateWithinPeriod("2099-12-02", "2099-12-31"), true);
});
