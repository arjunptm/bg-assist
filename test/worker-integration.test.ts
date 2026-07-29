// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Miniflare } from "miniflare";
import app from "../worker/index";
import type { GroupSnapshot } from "../src/shared/models";

let runtime: Miniflare;
let database: D1Database;

async function request(path: string, init?: RequestInit) {
  return app.request(`http://local.test${path}`, init, { DB: database });
}

async function json<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
function d1ExecScript(sql: string): string {
  return sql
    .split(";")
    .map((statement) => statement.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((statement) => `${statement};`)
    .join("\n");
}
beforeAll(async () => {
  runtime = new Miniflare({
    compatibilityDate: "2025-08-23",
    modules: true,
    script: "export default { fetch() { return new Response('test'); } }",
    d1Databases: { DB: "bg-assistant-test" }
  });
  database = await runtime.getD1Database("DB");
  for (const migration of [
    "0001_initial.sql",
    "0002_option_descriptions.sql",
    "0003_option_colors.sql",
    "0004_hex_option_colors.sql"
  ]) {
    const sql = await readFile(resolve("migrations", migration), "utf8");
    await database.exec(d1ExecScript(sql));
  }
});

afterAll(async () => runtime.dispose());

describe("Worker and D1 integration", () => {
  it("enforces capability, privacy, revision, delete, and restore boundaries", async () => {
    const createResponse = await request("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Friday Game Night" })
    });
    expect(createResponse.status).toBe(201);
    const created = await json<GroupSnapshot & { capability: string }>(createResponse);
    const capability = created.capability as string;
    expect(capability).toHaveLength(43);

    const storedGroup = await database
      .prepare("SELECT capability_hash FROM groups WHERE id = ?")
      .bind(created.id)
      .first<{ capability_hash: string }>();
    expect(storedGroup?.capability_hash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(storedGroup?.capability_hash).not.toBe(capability);

    const unknownResponse = await request(`/api/groups/${"z".repeat(43)}`);
    expect(unknownResponse.status).toBe(404);

    const privacySetId = crypto.randomUUID();
    const privacyOptionId = crypto.randomUUID();
    const rejectedPlayerPayload = await request(`/api/groups/${capability}/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Unsafe game",
        assignmentSets: [
          {
            id: privacySetId,
            name: "Roles",
            options: [
              { id: privacyOptionId, name: "Investigator", quantity: 1 }
            ]
          }
        ],
        bannedCombinations: [],
        players: ["Arjun"]
      })
    });
    expect(rejectedPlayerPayload.status).toBe(422);

    const factionId = crypto.randomUUID();
    const matId = crypto.randomUUID();
    const gameDraft = {
      name: "Scythe",
      assignmentSets: [
        {
          id: crypto.randomUUID(),
          name: "Factions",
          options: [{ id: factionId, name: "Rusviet", description: "Riverwalk", color: "#C63D4F", quantity: 1 }]
        },
        {
          id: crypto.randomUUID(),
          name: "Player Mats",
          options: [{ id: matId, name: "Industrial", quantity: 1 }]
        }
      ],
      bannedCombinations: [
        { id: crypto.randomUUID(), optionAId: factionId, optionBId: matId }
      ]
    };

    const gameResponse = await request(`/api/groups/${capability}/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(gameDraft)
    });
    expect(gameResponse.status).toBe(201);
    const withGame = await json<GroupSnapshot>(gameResponse);
    const game = withGame.games[0];
    expect(game.assignmentSets[0].options[0]).toMatchObject({
      name: "Rusviet",
      description: "Riverwalk",
      color: "#C63D4F"
    });

    const staleResponse = await request(`/api/groups/${capability}/games/${game.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...gameDraft, id: game.id, revision: 99 })
    });
    expect(staleResponse.status).toBe(409);
    expect((await json<{ error: { code: string } }>(staleResponse)).error.code).toBe("REVISION_CONFLICT");

    const updateResponse = await request(`/api/groups/${capability}/games/${game.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...gameDraft, id: game.id, name: "Scythe Night", revision: 1 })
    });
    expect(updateResponse.status).toBe(200);
    const updated = (await json<GroupSnapshot>(updateResponse)).games[0];
    expect(updated).toMatchObject({ name: "Scythe Night", revision: 2 });

    const deleteResponse = await request(`/api/groups/${capability}/games/${game.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision: 2 })
    });
    expect(deleteResponse.status).toBe(200);
    const deleted = (await json<GroupSnapshot>(deleteResponse)).games[0];
    expect(deleted.deletedAt).toEqual(expect.any(String));
    expect(deleted.revision).toBe(3);

    const restoreResponse = await request(`/api/groups/${capability}/games/${game.id}/restore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision: 3 })
    });
    expect(restoreResponse.status).toBe(200);
    const restored = (await json<GroupSnapshot>(restoreResponse)).games[0];
    expect(restored.deletedAt).toBeNull();
    expect(restored.revision).toBe(4);

    const schemaRows = await database
      .prepare("SELECT sql FROM sqlite_schema WHERE type = 'table'")
      .all<{ sql: string }>();
    expect(JSON.stringify(schemaRows.results)).not.toMatch(/player|assignment_result/i);
  });
});
