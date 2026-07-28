import { describe, expect, it } from "vitest";
import { saveGameAggregate } from "../worker/db";

interface RecordedStatement {
  sql: string;
  args: unknown[];
  first<T>(): Promise<T | null>;
}

function recordingDb(recorded: RecordedStatement[]): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            sql,
            args,
            async first<T>() {
              return (sql.includes("MAX(position)") ? { position: 0 } : null) as T | null;
            }
          };
        }
      };
    },
    async batch(statements: RecordedStatement[]) {
      recorded.push(...statements);
      return [];
    }
  } as unknown as D1Database;
}

describe("game aggregate persistence", () => {
  it("stores option descriptions and defaults missing descriptions to empty text", async () => {
    const recorded: RecordedStatement[] = [];
    const outcome = await saveGameAggregate(recordingDb(recorded), crypto.randomUUID(), {
      name: "The Thing",
      assignmentSets: [
        {
          id: crypto.randomUUID(),
          name: "Characters",
          options: [
            {
              id: crypto.randomUUID(),
              name: "Dr. Copper",
              description: "Look at another character's card.",
              color: "blue",
              quantity: 1
            },
            {
              id: crypto.randomUUID(),
              name: "Clark",
              quantity: 1
            }
          ]
        }
      ],
      bannedCombinations: []
    });

    const optionInserts = recorded.filter((statement) =>
      statement.sql.startsWith("INSERT INTO assignment_options")
    );
    expect(outcome).toBe("created");
    expect(optionInserts).toHaveLength(2);
    expect(optionInserts[0]!.args[3]).toBe("Look at another character's card.");
    expect(optionInserts[0]!.args[4]).toBe("blue");
    expect(optionInserts[1]!.args[3]).toBe("");
    expect(optionInserts[1]!.args[4]).toBeNull();
  });
});
