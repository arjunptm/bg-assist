PRAGMA foreign_keys = ON;

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  capability_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX games_group_idx ON games(group_id, deleted_at, position);

CREATE TABLE assignment_sets (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX assignment_sets_game_idx ON assignment_sets(game_id, position);

CREATE TABLE assignment_options (
  id TEXT PRIMARY KEY,
  assignment_set_id TEXT NOT NULL REFERENCES assignment_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity BETWEEN 1 AND 99),
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX assignment_options_set_idx ON assignment_options(assignment_set_id, position);

CREATE TABLE banned_combinations (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  option_a_id TEXT NOT NULL REFERENCES assignment_options(id) ON DELETE CASCADE,
  option_b_id TEXT NOT NULL REFERENCES assignment_options(id) ON DELETE CASCADE,
  CHECK(option_a_id < option_b_id),
  UNIQUE(game_id, option_a_id, option_b_id)
);

CREATE INDEX banned_combinations_game_idx ON banned_combinations(game_id);

