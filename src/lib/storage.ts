import { openDB, type DBSchema } from "idb";
import type { GroupSnapshot } from "../shared/models";

export interface KnownGroup {
  capability: string;
  groupId: string;
  name: string;
  lastOpenedAt: string;
}

interface BgAssistantDb extends DBSchema {
  groups: { key: string; value: KnownGroup };
  rosters: { key: string; value: { groupId: string; names: string[] } };
  snapshots: { key: string; value: { groupId: string; snapshot: GroupSnapshot } };
  preferences: { key: string; value: unknown };
}

const dbPromise = openDB<BgAssistantDb>("bg-assistant", 1, {
  upgrade(db) {
    db.createObjectStore("groups", { keyPath: "groupId" });
    db.createObjectStore("rosters", { keyPath: "groupId" });
    db.createObjectStore("snapshots", { keyPath: "groupId" });
    db.createObjectStore("preferences");
  }
});

export async function rememberGroup(group: KnownGroup): Promise<void> {
  const db = await dbPromise;
  await db.put("groups", group);
  await db.put("preferences", group.groupId, "lastGroupId");
}

export async function listKnownGroups(): Promise<KnownGroup[]> {
  const groups = await (await dbPromise).getAll("groups");
  return groups.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

export async function findKnownGroupByCapability(
  capability: string
): Promise<KnownGroup | undefined> {
  return (await listKnownGroups()).find((group) => group.capability === capability);
}

export async function getRoster(groupId: string): Promise<string[]> {
  return (await (await dbPromise).get("rosters", groupId))?.names ?? [];
}

export async function setRoster(groupId: string, names: string[]): Promise<void> {
  await (await dbPromise).put("rosters", { groupId, names });
}

export async function cacheSnapshot(snapshot: GroupSnapshot): Promise<void> {
  await (await dbPromise).put("snapshots", { groupId: snapshot.id, snapshot });
}

export async function getCachedSnapshot(groupId: string): Promise<GroupSnapshot | undefined> {
  return (await (await dbPromise).get("snapshots", groupId))?.snapshot;
}
