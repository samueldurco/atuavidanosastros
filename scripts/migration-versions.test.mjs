import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";

test("Supabase migration versions identify exactly one SQL file", async () => {
  const files = (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const versions = new Map();
  for (const file of files) {
    const match = /^(\d{14})_.+\.sql$/.exec(file);
    assert.ok(match, `Invalid migration filename: ${file}`);
    const version = match[1];
    assert.ok(
      !versions.has(version),
      `Duplicate migration version ${version}: ${versions.get(version)} and ${file}`,
    );
    versions.set(version, file);
  }
  assert.ok(files.length > 0, "The migration directory must not be empty");
});
