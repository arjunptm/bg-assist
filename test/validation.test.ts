import { describe, expect, it } from "vitest";
import { assignmentOptionSchema, createGroupSchema, gameDraftSchema } from "../src/shared/validation";
import type { GameDraft } from "../src/shared/models";

const optionA = crypto.randomUUID();
const optionB = crypto.randomUUID();
const validGame: GameDraft = {
  name: "Scythe",
  assignmentSets: [
    {
      id: crypto.randomUUID(),
      name: "Factions",
      options: [{ id: optionA, name: "Rusviet", description: "  Move between villages.  ", color: "#C63D4F", quantity: 1 }]
    },
    {
      id: crypto.randomUUID(),
      name: "Player Mats",
      options: [{ id: optionB, name: "Industrial", description: "", quantity: 1 }]
    }
  ],
  bannedCombinations: [
    { id: crypto.randomUUID(), optionAId: optionA, optionBId: optionB }
  ]
};

describe("shared API validation", () => {
  it("accepts a valid shared game aggregate", () => {
    const result = gameDraftSchema.safeParse(validGame);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignmentSets[0]!.options[0]!.description).toBe("Move between villages.");
      expect(result.data.assignmentSets[0]!.options[0]!.color).toBe("#C63D4F");
      expect(assignmentOptionSchema.parse({ id: optionB, name: "Industrial", quantity: 1 }).description).toBe("");
    }
  });

  it("allows only canonical uppercase hex option colors", () => {
    expect(assignmentOptionSchema.safeParse({ id: optionA, name: "Rusviet", color: "#3677B3", quantity: 1 }).success).toBe(true);
    expect(assignmentOptionSchema.safeParse({ id: optionA, name: "Rusviet", color: "#3677b3", quantity: 1 }).success).toBe(false);
    expect(assignmentOptionSchema.safeParse({ id: optionA, name: "Rusviet", color: "blue", quantity: 1 }).success).toBe(false);
    expect(assignmentOptionSchema.safeParse({ id: optionA, name: "Rusviet", color: "#000; background: url(x)", quantity: 1 }).success).toBe(false);
  });

  it("bounds option descriptions and rejects player-specific option fields", () => {
    const invalid = structuredClone(validGame);
    invalid.assignmentSets[0]!.options[0]!.description = "x".repeat(501);
    expect(gameDraftSchema.safeParse(invalid).success).toBe(false);
    expect(gameDraftSchema.safeParse({ ...validGame, assignmentSets: [{ ...validGame.assignmentSets[0], options: [{ ...validGame.assignmentSets[0]!.options[0], playerName: "Arjun" }] }, validGame.assignmentSets[1]] }).success).toBe(false);
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
      description: "",
      quantity: 1
    });
    invalid.bannedCombinations = [
      { id: crypto.randomUUID(), optionAId: optionA, optionBId: secondOption }
    ];
    expect(gameDraftSchema.safeParse(invalid).success).toBe(false);
  });
});

