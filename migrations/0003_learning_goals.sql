PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS learning_goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metric TEXT NOT NULL DEFAULT 'hours' CHECK (metric IN ('hours', 'courses')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  deadline TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_goals_user_updated
  ON learning_goals(user_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_goals_one_pinned
  ON learning_goals(user_id)
  WHERE is_pinned = 1;
