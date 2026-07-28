import type {
  AssignmentOption,
  AssignmentSet,
  BannedCombination,
  Game,
  GameDraft,
  GroupSnapshot
} from "../src/shared/models";
import type { AssignmentOptionColor } from "../src/shared/option-colors";

interface GroupRow {
  id: string;
  name: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

interface GameRow {
  id: string;
  name: string;
  revision: number;
  deleted_at: string | null;
}

interface SetRow {
  id: string;
  game_id: string;
  name: string;
}

interface OptionRow {
  id: string;
  assignment_set_id: string;
  name: string;
  description: string;
  color: AssignmentOptionColor | null;
  quantity: number;
}

interface BanRow {
  id: string;
  game_id: string;
  option_a_id: string;
  option_b_id: string;
}

export async function findGroupByHash(db: D1Database, hash: string): Promise<GroupRow | null> {
  return db
    .prepare(
      "SELECT id, name, revision, created_at, updated_at FROM groups WHERE capability_hash = ?"
    )
    .bind(hash)
    .first<GroupRow>();
}

export async function createGroupRecord(
  db: D1Database,
  capabilityHash: string,
  name: string
): Promise<GroupRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO groups (id, capability_hash, name, revision, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)"
    )
    .bind(id, capabilityHash, name, now, now)
    .run();
  return { id, name, revision: 1, created_at: now, updated_at: now };
}

export async function renameGroup(
  db: D1Database,
  groupId: string,
  name: string,
  revision: number
): Promise<"ok" | "conflict"> {
  const result = await db
    .prepare(
      "UPDATE groups SET name = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?"
    )
    .bind(name, new Date().toISOString(), groupId, revision)
    .run();
  return result.meta.changes === 1 ? "ok" : "conflict";
}

export async function loadSnapshot(db: D1Database, group: GroupRow): Promise<GroupSnapshot> {
  const gamesResult = await db
    .prepare(
      "SELECT id, name, revision, deleted_at FROM games WHERE group_id = ? ORDER BY position, created_at"
    )
    .bind(group.id)
    .all<GameRow>();
  const gameRows = gamesResult.results;
  if (gameRows.length === 0) return snapshot(group, []);

  const placeholders = gameRows.map(() => "?").join(",");
  const gameIds = gameRows.map((game) => game.id);
  const sets = (
    await db
      .prepare(
        `SELECT id, game_id, name FROM assignment_sets WHERE game_id IN (${placeholders}) ORDER BY position`
      )
      .bind(...gameIds)
      .all<SetRow>()
  ).results;
  const setIds = sets.map((set) => set.id);
  const options =
    setIds.length === 0
      ? []
      : (
          await db
            .prepare(
              `SELECT id, assignment_set_id, name, description, color, quantity FROM assignment_options WHERE assignment_set_id IN (${setIds.map(() => "?").join(",")}) ORDER BY position`
            )
            .bind(...setIds)
            .all<OptionRow>()
        ).results;
  const bans = (
    await db
      .prepare(
        `SELECT id, game_id, option_a_id, option_b_id FROM banned_combinations WHERE game_id IN (${placeholders})`
      )
      .bind(...gameIds)
      .all<BanRow>()
  ).results;

  const optionsBySet = new Map<string, AssignmentOption[]>();
  for (const option of options) {
    const collection = optionsBySet.get(option.assignment_set_id) ?? [];
    collection.push({
      id: option.id,
      name: option.name,
      description: option.description,
      color: option.color ?? undefined,
      quantity: option.quantity
    });
    optionsBySet.set(option.assignment_set_id, collection);
  }
  const setsByGame = new Map<string, AssignmentSet[]>();
  for (const set of sets) {
    const collection = setsByGame.get(set.game_id) ?? [];
    collection.push({ id: set.id, name: set.name, options: optionsBySet.get(set.id) ?? [] });
    setsByGame.set(set.game_id, collection);
  }
  const bansByGame = new Map<string, BannedCombination[]>();
  for (const ban of bans) {
    const collection = bansByGame.get(ban.game_id) ?? [];
    collection.push({ id: ban.id, optionAId: ban.option_a_id, optionBId: ban.option_b_id });
    bansByGame.set(ban.game_id, collection);
  }
  const games: Game[] = gameRows.map((game) => ({
    id: game.id,
    name: game.name,
    revision: game.revision,
    deletedAt: game.deleted_at,
    assignmentSets: setsByGame.get(game.id) ?? [],
    bannedCombinations: bansByGame.get(game.id) ?? []
  }));
  return snapshot(group, games);
}

export async function saveGameAggregate(
  db: D1Database,
  groupId: string,
  draft: GameDraft,
  gameId?: string
): Promise<"created" | "updated" | "conflict"> {
  const id = gameId ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];

  if (gameId) {
    const current = await db
      .prepare("SELECT revision FROM games WHERE id = ? AND group_id = ? AND deleted_at IS NULL")
      .bind(id, groupId)
      .first<{ revision: number }>();
    if (!current || current.revision !== draft.revision) return "conflict";
    statements.push(
      db
        .prepare("UPDATE games SET name = ?, revision = revision + 1, updated_at = ? WHERE id = ?")
        .bind(draft.name, now, id),
      db.prepare("DELETE FROM assignment_sets WHERE game_id = ?").bind(id)
    );
  } else {
    const position =
      (
        await db
          .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM games WHERE group_id = ?")
          .bind(groupId)
          .first<{ position: number }>()
      )?.position ?? 0;
    statements.push(
      db
        .prepare(
          "INSERT INTO games (id, group_id, name, revision, position, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)"
        )
        .bind(id, groupId, draft.name, position, now, now)
    );
  }

  draft.assignmentSets.forEach((set, setPosition) => {
    statements.push(
      db
        .prepare("INSERT INTO assignment_sets (id, game_id, name, position) VALUES (?, ?, ?, ?)")
        .bind(set.id, id, set.name, setPosition)
    );
    set.options.forEach((option, optionPosition) => {
      statements.push(
        db
          .prepare(
            "INSERT INTO assignment_options (id, assignment_set_id, name, description, color, quantity, position) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            option.id,
            set.id,
            option.name,
            option.description ?? "",
            option.color ?? null,
            option.quantity,
            optionPosition
          )
      );
    });
  });
  draft.bannedCombinations.forEach((ban) => {
    const [optionA, optionB] = [ban.optionAId, ban.optionBId].sort();
    statements.push(
      db
        .prepare(
          "INSERT INTO banned_combinations (id, game_id, option_a_id, option_b_id) VALUES (?, ?, ?, ?)"
        )
        .bind(ban.id, id, optionA, optionB)
    );
  });
  await db.batch(statements);
  return gameId ? "updated" : "created";
}

export async function setGameDeleted(
  db: D1Database,
  groupId: string,
  gameId: string,
  revision: number,
  restore: boolean
): Promise<"ok" | "conflict"> {
  const current = await db
    .prepare("SELECT revision, deleted_at FROM games WHERE id = ? AND group_id = ?")
    .bind(gameId, groupId)
    .first<{ revision: number; deleted_at: string | null }>();
  if (!current || current.revision !== revision) return "conflict";
  const deletedAt = restore ? null : new Date().toISOString();
  await db
    .prepare("UPDATE games SET deleted_at = ?, revision = revision + 1, updated_at = ? WHERE id = ?")
    .bind(deletedAt, new Date().toISOString(), gameId)
    .run();
  return "ok";
}

function snapshot(group: GroupRow, games: Game[]): GroupSnapshot {
  return {
    id: group.id,
    name: group.name,
    revision: group.revision,
    games,
    fetchedAt: new Date().toISOString()
  };
}
