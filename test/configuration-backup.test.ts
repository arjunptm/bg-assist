import { describe, expect, it } from "vitest";
import {
  CONFIGURATION_BACKUP_FORMAT,
  ConfigurationBackupError,
  createConfigurationBackup,
  createImportedDrafts,
  parseConfigurationBackup,
  serializeConfigurationBackup
} from "../src/lib/configuration-backup";
import type { Game } from "../src/shared/models";

const game: Game = {
  id: "10000000-0000-4000-8000-000000000000",
  name: "Scythe",
  revision: 4,
  assignmentSets: [
    {
      id: "20000000-0000-4000-8000-000000000000",
      name: "Factions",
      options: [
        {
          id: "30000000-0000-4000-8000-000000000000",
          name: "Rusviet",
          description: "Northern faction",
          color: "#C63D4F",
          quantity: 1
        }
      ]
    },
    {
      id: "40000000-0000-4000-8000-000000000000",
      name: "Player mats",
      options: [
        {
          id: "50000000-0000-4000-8000-000000000000",
          name: "Industrial",
          quantity: 1
        }
      ]
    }
  ],
  bannedCombinations: [
    {
      id: "60000000-0000-4000-8000-000000000000",
      optionAId: "30000000-0000-4000-8000-000000000000",
      optionBId: "50000000-0000-4000-8000-000000000000"
    }
  ]
};

describe("portable configuration backups", () => {
  it("round trips configuration, remaps every identifier, and preserves relationships", () => {
    const backup = createConfigurationBackup(
      [game],
      new Date("2026-07-28T12:00:00.000Z")
    );
    const text = JSON.stringify(backup);

    expect(backup.format).toBe(CONFIGURATION_BACKUP_FORMAT);
    expect(text).not.toContain(game.id);
    expect(text).not.toContain("revision");
    expect(text).not.toContain("capability");
    expect(text).not.toContain("player");

    const [draft] = createImportedDrafts(parseConfigurationBackup(text), []);
    expect(draft?.name).toBe("Scythe");
    expect(draft?.assignmentSets[0]?.options[0]).toMatchObject({
      name: "Rusviet",
      description: "Northern faction",
      color: "#C63D4F",
      quantity: 1
    });
    expect(draft?.assignmentSets[0]?.id).not.toBe(game.assignmentSets[0]?.id);
    expect(draft?.assignmentSets[0]?.options[0]?.id).not.toBe(
      game.assignmentSets[0]?.options[0]?.id
    );
    expect(draft?.bannedCombinations[0]).toMatchObject({
      optionAId: draft?.assignmentSets[0]?.options[0]?.id,
      optionBId: draft?.assignmentSets[1]?.options[0]?.id
    });
  });

  it("accepts version-one files without later optional description and color fields", () => {
    const value = createConfigurationBackup([game]);
    const option = value.games[0]!.assignmentSets[0]!.options[0]!;
    delete option.description;
    delete option.color;

    const parsed = parseConfigurationBackup(JSON.stringify(value));
    const [draft] = createImportedDrafts(parsed, []);
    expect(draft?.assignmentSets[0]?.options[0]?.description).toBe("");
    expect(draft?.assignmentSets[0]?.options[0]?.color).toBeUndefined();
  });

  it("creates copies and resolves duplicate names without overwriting", () => {
    const backup = createConfigurationBackup([game, game]);
    const drafts = createImportedDrafts(backup, ["SCYTHE", "Scythe (imported)"]);

    expect(drafts.map((draft) => draft.name)).toEqual([
      "Scythe (imported 2)",
      "Scythe (imported 3)"
    ]);
    expect(drafts.every((draft) => draft.id === undefined)).toBe(true);
  });

  it("rejects malformed, unsupported, relationship-invalid, and private-data-bearing files", () => {
    expect(() => parseConfigurationBackup("{")).toThrow("not valid JSON");
    expect(() =>
      parseConfigurationBackup(JSON.stringify({
        ...createConfigurationBackup([game]),
        version: 2
      }))
    ).toThrow("version is not supported");
    expect(() =>
      parseConfigurationBackup(JSON.stringify({
        ...createConfigurationBackup([game]),
        players: ["Alice"]
      }))
    ).toThrow("contains player, session, group-link, or cache data");

    const invalid = createConfigurationBackup([game]);
    invalid.games[0]!.bannedCombinations[0]!.optionB = [0, 0];
    expect(() => parseConfigurationBackup(JSON.stringify(invalid))).toThrow(
      "does not match the supported"
    );
  });

  it("enforces game-count and byte limits", () => {
    expect(() => createConfigurationBackup([])).toThrow(ConfigurationBackupError);
    expect(parseConfigurationBackup(serializeConfigurationBackup([game])).games).toHaveLength(1);
    const oversized = JSON.stringify(createConfigurationBackup([game])) +
      " ".repeat(5 * 1024 * 1024);
    expect(() => parseConfigurationBackup(oversized)).toThrow("larger than the 5 MB");
  });
});
