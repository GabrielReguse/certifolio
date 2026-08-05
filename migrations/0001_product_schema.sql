PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  role_title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  avatar_key TEXT,
  banner_key TEXT,
  profile_visibility TEXT NOT NULL DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private')),
  profile_layout TEXT NOT NULL DEFAULT 'grid' CHECK (profile_layout IN ('grid', 'timeline', 'resume')),
  public_theme TEXT NOT NULL DEFAULT 'system' CHECK (public_theme IN ('light', 'dark', 'system')),
  accent_color TEXT NOT NULL DEFAULT '#315c46',
  show_rating INTEGER NOT NULL DEFAULT 1,
  show_total_hours INTEGER NOT NULL DEFAULT 1,
  show_institutions INTEGER NOT NULL DEFAULT 1,
  allow_indexing INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  website TEXT NOT NULL DEFAULT '',
  logo_key TEXT,
  created_by TEXT,
  status TEXT NOT NULL DEFAULT 'community' CHECK (status IN ('official', 'community', 'pending', 'hidden')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  institution_id TEXT,
  platform_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Outros',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed', 'abandoned', 'expired')),
  hours_minutes INTEGER NOT NULL DEFAULT 0 CHECK (hours_minutes >= 0),
  start_date TEXT,
  end_date TEXT,
  issued_at TEXT,
  expires_at TEXT,
  rating INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 10),
  credential_id TEXT NOT NULL DEFAULT '',
  verification_url TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  certificate_visibility TEXT NOT NULL DEFAULT 'private' CHECK (certificate_visibility IN ('private', 'public', 'redacted')),
  is_featured INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_skills (
  course_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  PRIMARY KEY (course_id, skill_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_files (
  id TEXT PRIMARY KEY NOT NULL,
  course_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_kind TEXT NOT NULL DEFAULT 'certificate' CHECK (file_kind IN ('certificate', 'thumbnail', 'supporting_document', 'redacted_certificate')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'redacted')),
  checksum TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profile_links (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'link',
  position INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_courses_user_active ON courses(user_id, deleted_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_courses_institution ON courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_visibility ON courses(visibility, deleted_at);
CREATE INDEX IF NOT EXISTS idx_course_files_course ON course_files(course_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at);
