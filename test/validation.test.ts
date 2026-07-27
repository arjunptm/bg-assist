import { describe, expect, it } from "vitest";
import { createGroupSchema, gameDraftSchema } from "../src/shared/validation";

const optionA = crypto.randomUUID();
const optionB = crypto.randomUUID();
const validGame = {
  name: "Scythe",
  assignmentSets: [
    {
      id: crypto.randomUUID(),
      name: "Factions",
      options: [{ id: optionA, name: "Rusviet", quantity: 1 }]
    },
    {
      id: crypto.randomUUID(),
      name: "Player Mats",
      options: [{ id: optionB, name: "Industrial", quantity: 1 }]
    }
  ],
  bannedCombinations: [
    { id: crypto.randomUUID(), optionAId: optionA, optionBId: optionB }
  ]
};

describe("shared API validation", () => {
  it("accepts a valid shared game aggregate", () => {
    expect(gameDraftSchema.safeParse(validGame).success).toBe(true);
  });

  it("rejects player data rather than allowing it into shared payloads", () => {
    expect(gameDraftSchema.safeParse({ ...validGame, players: ["Arjun"] }).success).toBe(false);
    expect(createGroupSchema.safeParse({ name: "Friday", playerNames: ["Arjun"] }).success).toBe(
      false
    );
  });

  it("rejects restrictions within a single assignment set", () => {
    const secondOption = crypto.randomUUID();
    const invalid = structuredClone(validGame);
    invalid.assignmentSets[0]!.options.push({
      id: secondOption,
      name: "Crimea",
      quantity: 1
    });
    invalid.bannedCombinations = [
      { id: crypto.randomUUID(), optionAId: optionA, optionBId: secondOption }
    ];
    expect(gameDraftSchema.safeParse(invalid).success).toBe(false);
  });
});

