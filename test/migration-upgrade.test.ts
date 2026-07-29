// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Miniflare } from "miniflare";

let runtime: Miniflare;
let database: D1Database;

function d1ExecScript(sql: string): string {
  return sql
    .split(";")
    .map((statement) => statement.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((statement) => `${statement};`)
    .join("\n");
}

async function applyMigration(name: string) {
  const sql = await readFile(resolve("migrations", name), "utf8");
  await database.exec(d1ExecScript(sql));
}

beforeAll(async () => {
  runtime = new Miniflare({
    compatibilityDate: "2025-08-23",
    modules: true,
    script: "export default { fetch() { return new Response('test'); } }",
    d1Databases: { DB: "bg-assistant-upgrade-test" }
  });
  database = await runtime.getD1Database("DB");
});

afterAll(async () => runtime.dispose());

describe("D1 migration history", () => {
  it("upgrades a populated initial schema without losing legacy option data", async () => {
    await applyMigration("0001_initial.sql");
    await database
      .prepare(
        "INSERT INTO groups (id, capability_hash, name, revision, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)"
      )
      .bind("group", "hash", "Friday Games", "2026-07-28", "2026-07-28")
      .run();
    await database
      .prepare(
        "INSERT INTO games (id, group_id, name, revision, position, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?)"
      )
      .bind("game", "group", "Scythe", "2026-07-28", "2026-07-28")
      .run();
    await database
      .prepare("INSERT INTO assignment_sets (id, game_id, name, position) VALUES (?, ?, ?, 0)")
      .bind("set", "game", "Factions")
      .run();
    await database
      .prepare(
        "INSERT INTO assignment_options (id, assignment_set_id, name, quantity, position) VALUES (?, ?, ?, 1, 0)"
      )
      .bind("option", "set", "Rusviet")
      .run();

    await applyMigration("0002_option_descriptions.sql");
    await applyMigration("0003_option_colors.sql");

    const option = await database
      .prepare("SELECT name, description, color FROM assignment_options WHERE id = ?")
      .bind("option")
      .first<{ name: string; description: string; color: string | null }>();
    expect(option).toEqual({
      name: "Rusviet",
      description: "",
      color: null
    });

    const columns = await database
      .prepare("PRAGMA table_info(assignment_options)")
      .all<{ name: string; notnull: number }>();
    expect(columns.results.map((column) => column.name)).toEqual([
      "id",
      "assignment_set_id",
      "name",
      "quantity",
      "position",
      "description",
      "color"
    ]);
    expect(columns.results.find((column) => column.name === "description")?.notnull).toBe(1);
  });
});
