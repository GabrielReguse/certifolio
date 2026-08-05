PRAGMA foreign_keys = ON;

-- Cada curso mantém a URL informada pelo próprio usuário. Instituições continuam
-- compartilhando apenas nome/identidade; URLs comunitárias não vazam entre contas.
ALTER TABLE courses ADD COLUMN institution_website TEXT NOT NULL DEFAULT '';

UPDATE courses
SET institution_website = COALESCE((
  SELECT CASE
    WHEN institutions.status = 'official' OR institutions.created_by = courses.user_id
      THEN institutions.website
    ELSE ''
  END
  FROM institutions
  WHERE institutions.id = courses.institution_id
), '')
WHERE institution_website = '';

-- Outbox durável: a intenção de exclusão é gravada antes de o Better Auth apagar
-- a conta. Os dados só são removidos depois que a linha do usuário deixou de existir.
CREATE TABLE IF NOT EXISTS account_deletion_queue (
  user_id TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_queue_due
  ON account_deletion_queue(next_attempt_at, attempts);
