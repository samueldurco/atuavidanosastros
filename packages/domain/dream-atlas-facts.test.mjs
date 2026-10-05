import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  DREAM_ATLAS_ENTRY_VERSION,
  DREAM_ATLAS_FACTS_VERSION,
  prepareDreamAtlasFacts,
} from "./src/index.ts";

const id = (suffix) =>
  `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const entry = (suffix, dreamDate, changes = {}) => ({
  version: DREAM_ATLAS_ENTRY_VERSION,
  id: id(suffix),
  revision: 1,
  dreamDate,
  narrative: "Relato sintético sem interpretação.",
  emotions: ["Curiosidade"],
  associations: ["Casa"],
  includeInSynthesis: true,
  ...changes,
});

test("facts use only explicitly included entries and retain five calendar windows", () => {
  const sources = [
    entry(3, "2024-03-28", { emotions: ["curiosidade", "CURIOSIDADE"] }),
    entry(2, "2024-03-06", { includeInSynthesis: false, emotions: ["medo"] }),
    entry(1, "2024-02-28"),
  ];
  const facts = prepareDreamAtlasFacts("2024-02-28", sources);
  assert.equal(facts?.version, DREAM_ATLAS_FACTS_VERSION);
  assert.deepEqual(facts?.period, {
    startDate: "2024-02-28",
    endDate: "2024-03-28",
  });
  assert.equal(facts?.recordedCount, 3);
  assert.equal(facts?.excludedCount, 1);
  assert.deepEqual(facts?.includedEntryIds, [id(1), id(3)]);
  assert.deepEqual(
    facts?.windows.map((window) => window.includedEntryIds),
    [[id(1)], [], [], [], [id(3)]],
  );
  assert.deepEqual(facts?.recurrences, [
    { source: "personal-association", label: "Casa", entryIds: [id(1), id(3)] },
    {
      source: "reported-emotion",
      label: "Curiosidade",
      entryIds: [id(1), id(3)],
    },
  ]);
  assert.deepEqual(
    prepareDreamAtlasFacts("2024-02-28", [...sources].reverse()),
    facts,
  );
});

test("same term repeated in one entry is not a recurrence; narratives are not mined", () => {
  const facts = prepareDreamAtlasFacts("2026-10-01", [
    entry(1, "2026-10-01", { emotions: ["medo", "Medo"], associations: [] }),
    entry(2, "2026-10-02", { emotions: [], associations: [] }),
  ]);
  assert.deepEqual(facts?.recurrences, []);
  assert.equal(JSON.stringify(facts).includes("Relato sintético"), false);
});

test("invalid period, duplicate or out-of-period entries cannot produce facts", () => {
  const source = entry(1, "2026-10-01");
  assert.equal(prepareDreamAtlasFacts("2026-10-02", [source]), null);
  assert.equal(prepareDreamAtlasFacts("2026-10-01", [source, source]), null);
  assert.equal(
    prepareDreamAtlasFacts("2026-10-01", [entry(1, "2026-10-31")]),
    null,
  );
  assert.equal(prepareDreamAtlasFacts("2099-12-03", []), null);
  assert.equal(
    prepareDreamAtlasFacts("2026-10-01", [
      entry(1, "2026-10-01", { revision: 0 }),
    ]),
    null,
  );
});
