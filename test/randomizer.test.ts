import { describe, expect, it } from "vitest";
import { assignSet, RandomizerError } from "../src/lib/randomizer";
import type { AssignmentOption, BannedCombination } from "../src/shared/models";

const players = ["Arjun", "Ashish", "Ben"];
const options: AssignmentOption[] = [
  { id: "red", name: "Red", quantity: 1 },
  { id: "blue", name: "Blue", quantity: 1 },
  { id: "green", name: "Green", quantity: 1 },
  { id: "yellow", name: "Yellow", quantity: 1 }
];

describe("local assignment randomizer", () => {
  it("assigns one distinct available slot to every player", () => {
    const result = assignSet({
      playerIds: players,
      options,
      enabledOptionIds: new Set(options.map((option) => option.id)),
      fixedAssignments: {},
      bannedCombinations: []
    });
    expect(Object.keys(result)).toHaveLength(players.length);
    expect(new Set(Object.values(result))).toHaveLength(players.length);
  });

  it("respects option quantities", () => {
    const result = assignSet({
      playerIds: players,
      options: [
        { id: "villager", name: "Villager", quantity: 2 },
        { id: "seer", name: "Seer", quantity: 1 }
      ],
      enabledOptionIds: new Set(["villager", "seer"]),
      fixedAssignments: {},
      bannedCombinations: []
    });
    expect(Object.values(result).filter((value) => value === "villager")).toHaveLength(2);
  });

  it("keeps fixed sets and avoids banned pairs", () => {
    const restrictions: BannedCombination[] = [
      { id: "ban", optionAId: "faction-r", optionBId: "mat-i" }
    ];
    const result = assignSet({
      playerIds: ["Arjun", "Ben"],
      options: [
        { id: "mat-i", name: "Industrial", quantity: 1 },
        { id: "mat-a", name: "Agricultural", quantity: 1 }
      ],
      enabledOptionIds: new Set(["mat-i", "mat-a"]),
      fixedAssignments: {
        factions: { Arjun: "faction-r", Ben: "faction-s" }
      },
      bannedCombinations: restrictions
    });
    expect(result.Arjun).toBe("mat-a");
    expect(result.Ben).toBe("mat-i");
  });

  it("reports an insufficient option pool", () => {
    expect(() =>
      assignSet({
        playerIds: players,
        options: [{ id: "one", name: "One", quantity: 2 }],
        enabledOptionIds: new Set(["one"]),
        fixedAssignments: {},
        bannedCombinations: []
      })
    ).toThrowError(expect.objectContaining<Partial<RandomizerError>>({ code: "INSUFFICIENT_OPTIONS" }));
  });

  it("reports an unsatisfiable constrained assignment", () => {
    expect(() =>
      assignSet({
        playerIds: ["Arjun"],
        options: [{ id: "mat-i", name: "Industrial", quantity: 1 }],
        enabledOptionIds: new Set(["mat-i"]),
        fixedAssignments: { factions: { Arjun: "faction-r" } },
        bannedCombinations: [{ id: "ban", optionAId: "faction-r", optionBId: "mat-i" }]
      })
    ).toThrowError(expect.objectContaining<Partial<RandomizerError>>({ code: "NO_VALID_ASSIGNMENT" }));
  });

  it("enforces the exact-solver player limit", () => {
    const thirteen = Array.from({ length: 13 }, (_, index) => `Player ${index}`);
    expect(() =>
      assignSet({
        playerIds: thirteen,
        options: [{ id: "many", name: "Many", quantity: 13 }],
        enabledOptionIds: new Set(["many"]),
        fixedAssignments: {},
        bannedCombinations: []
      })
    ).toThrowError(expect.objectContaining<Partial<RandomizerError>>({ code: "TOO_MANY_PLAYERS" }));
  });
});

