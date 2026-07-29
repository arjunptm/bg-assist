import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  cacheSnapshot,
  findKnownGroupByCapability,
  getCachedSnapshot,
  getRoster,
  listKnownGroups,
  rememberGroup,
  setRoster
} from "../src/lib/storage";
import type { GroupSnapshot } from "../src/shared/models";

const uniqueId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

describe("device-local IndexedDB storage", () => {
  it("isolates rosters by group and clears only the requested group", async () => {
    const firstGroup = uniqueId("group");
    const secondGroup = uniqueId("group");

    await setRoster(firstGroup, ["Arjun", "Mia"]);
    await setRoster(secondGroup, ["Ben"]);

    expect(await getRoster(firstGroup)).toEqual(["Arjun", "Mia"]);
    expect(await getRoster(secondGroup)).toEqual(["Ben"]);

    await setRoster(firstGroup, []);

    expect(await getRoster(firstGroup)).toEqual([]);
    expect(await getRoster(secondGroup)).toEqual(["Ben"]);
  });

  it("stores capability links and cached configuration without player state", async () => {
    const groupId = uniqueId("group");
    const capability = "a".repeat(43);
    const snapshot: GroupSnapshot = {
      id: groupId,
      name: "Friday Game Night",
      revision: 1,
      fetchedAt: "2026-07-28T00:00:00.000Z",
      games: [
        {
          id: crypto.randomUUID(),
          name: "Scythe",
          revision: 1,
          assignmentSets: [
            {
              id: crypto.randomUUID(),
              name: "Factions",
              options: [
                {
                  id: crypto.randomUUID(),
                  name: "Rusviet",
                  color: "#C63D4F",
                  quantity: 1
                }
              ]
            }
          ],
          bannedCombinations: []
        }
      ]
    };

    await rememberGroup({
      capability,
      groupId,
      name: snapshot.name,
      lastOpenedAt: "2026-07-28T00:00:00.000Z"
    });
    await cacheSnapshot(snapshot);

    expect(await findKnownGroupByCapability(capability)).toMatchObject({ groupId, capability });
    expect(await getCachedSnapshot(groupId)).toEqual(snapshot);
    expect(JSON.stringify(await getCachedSnapshot(groupId))).not.toMatch(/player|assignmentResult/i);
  });

  it("lists the most recently opened remembered group first", async () => {
    const olderId = uniqueId("older");
    const newerId = uniqueId("newer");
    await rememberGroup({ capability: "b".repeat(43), groupId: olderId, name: "Older", lastOpenedAt: "2026-07-27T00:00:00.000Z" });
    await rememberGroup({ capability: "c".repeat(43), groupId: newerId, name: "Newer", lastOpenedAt: "2026-07-28T00:00:00.000Z" });

    const known = await listKnownGroups();
    expect(known.findIndex((group) => group.groupId === newerId)).toBeLessThan(
      known.findIndex((group) => group.groupId === olderId)
    );
  });
});
