PRAGMA defer_foreign_keys = ON;

CREATE TABLE assignment_options_hex (
  id TEXT PRIMARY KEY,
  assignment_set_id TEXT NOT NULL REFERENCES assignment_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity BETWEEN 1 AND 99),
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  color TEXT CHECK(color IS NULL OR color GLOB '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]')
);

INSERT INTO assignment_options_hex (
  id, assignment_set_id, name, quantity, position, description, color
)
SELECT
  id,
  assignment_set_id,
  name,
  quantity,
  position,
  description,
  CASE color
    WHEN 'red' THEN '#C63D4F'
    WHEN 'orange' THEN '#D86D24'
    WHEN 'yellow' THEN '#D1A51B'
    WHEN 'green' THEN '#39845B'
    WHEN 'blue' THEN '#3677B3'
    WHEN 'purple' THEN '#7C55A5'
    WHEN 'pink' THEN '#C34F87'
    WHEN 'gray' THEN '#6F7A76'
    ELSE color
  END
FROM assignment_options;

CREATE TABLE banned_combinations_hex (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  option_a_id TEXT NOT NULL REFERENCES assignment_options_hex(id) ON DELETE CASCADE,
  option_b_id TEXT NOT NULL REFERENCES assignment_options_hex(id) ON DELETE CASCADE,
  CHECK(option_a_id < option_b_id),
  UNIQUE(game_id, option_a_id, option_b_id)
);

INSERT INTO banned_combinations_hex (id, game_id, option_a_id, option_b_id)
SELECT id, game_id, option_a_id, option_b_id FROM banned_combinations;

DROP TABLE banned_combinations;
DROP TABLE assignment_options;

ALTER TABLE assignment_options_hex RENAME TO assignment_options;
ALTER TABLE banned_combinations_hex RENAME TO banned_combinations;

CREATE INDEX assignment_options_set_idx
ON assignment_options(assignment_set_id, position);

CREATE INDEX banned_combinations_game_idx
ON banned_combinations(game_id);
