PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_course_files_user_active
  ON course_files(user_id, deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_files_user_checksum_active
  ON course_files(user_id, checksum)
  WHERE deleted_at IS NULL AND checksum IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_institutions_created_by
  ON institutions(created_by, status);

CREATE TABLE IF NOT EXISTS user_storage_usage (
  user_id TEXT PRIMARY KEY NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0 CHECK (file_count >= 0),
  total_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_bytes >= 0),
  updated_at TEXT NOT NULL
);

INSERT INTO user_storage_usage (user_id, file_count, total_bytes, updated_at)
SELECT user_id, COUNT(*), COALESCE(SUM(size_bytes), 0), CURRENT_TIMESTAMP
FROM course_files
WHERE deleted_at IS NULL
GROUP BY user_id
ON CONFLICT(user_id) DO UPDATE SET
  file_count = excluded.file_count,
  total_bytes = excluded.total_bytes,
  updated_at = excluded.updated_at;

CREATE TABLE IF NOT EXISTS asset_deletion_queue (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  public_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('image', 'raw')),
  delivery_type TEXT NOT NULL DEFAULT 'authenticated' CHECK (delivery_type = 'authenticated'),
  reason TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(public_id, resource_type, delivery_type)
);

CREATE INDEX IF NOT EXISTS idx_asset_deletion_queue_due
  ON asset_deletion_queue(next_attempt_at, attempts);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset
  ON rate_limits(reset_at);
