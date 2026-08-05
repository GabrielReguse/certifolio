import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio').notNull().default(''),
  roleTitle: text('role_title').notNull().default(''),
  location: text('location').notNull().default(''),
  website: text('website').notNull().default(''),
  avatarKey: text('avatar_key'),
  avatarFormat: text('avatar_format'),
  bannerKey: text('banner_key'),
  bannerFormat: text('banner_format'),
  profileVisibility: text('profile_visibility', { enum: ['public', 'private'] }).notNull().default('private'),
  profileLayout: text('profile_layout', { enum: ['grid', 'timeline', 'resume'] }).notNull().default('grid'),
  publicTheme: text('public_theme', { enum: ['light', 'dark', 'system'] }).notNull().default('system'),
  accentColor: text('accent_color').notNull().default('#315c46'),
  showRating: integer('show_rating', { mode: 'boolean' }).notNull().default(true),
  showTotalHours: integer('show_total_hours', { mode: 'boolean' }).notNull().default(true),
  showInstitutions: integer('show_institutions', { mode: 'boolean' }).notNull().default(true),
  allowIndexing: integer('allow_indexing', { mode: 'boolean' }).notNull().default(false),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_profiles_username').on(table.username)]);


export const learningGoals = sqliteTable('learning_goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  metric: text('metric', { enum: ['hours', 'courses'] }).notNull().default('hours'),
  targetValue: integer('target_value').notNull(),
  deadline: text('deadline'),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const institutions = sqliteTable('institutions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  website: text('website').notNull().default(''),
  logoKey: text('logo_key'),
  createdBy: text('created_by'),
  status: text('status', { enum: ['official', 'community', 'pending', 'hidden'] }).notNull().default('community'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  institutionId: text('institution_id').references(() => institutions.id, { onDelete: 'set null' }),
  institutionWebsite: text('institution_website').notNull().default(''),
  platformName: text('platform_name').notNull().default(''),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('Outros'),
  status: text('status', { enum: ['planned', 'in_progress', 'completed', 'abandoned', 'expired'] }).notNull().default('completed'),
  hoursMinutes: integer('hours_minutes').notNull().default(0),
  startDate: text('start_date'),
  endDate: text('end_date'),
  issuedAt: text('issued_at'),
  expiresAt: text('expires_at'),
  rating: integer('rating').notNull().default(0),
  credentialId: text('credential_id').notNull().default(''),
  verificationUrl: text('verification_url').notNull().default(''),
  visibility: text('visibility', { enum: ['private', 'public', 'unlisted'] }).notNull().default('private'),
  certificateVisibility: text('certificate_visibility', { enum: ['private', 'public', 'redacted'] }).notNull().default('private'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

export const courseSkills = sqliteTable('course_skills', {
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.courseId, table.skillId] })]);

export const courseFiles = sqliteTable('course_files', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  objectKey: text('object_key').notNull().unique(),
  resourceType: text('resource_type', { enum: ['image', 'raw'] }).notNull().default('image'),
  deliveryType: text('delivery_type', { enum: ['authenticated'] }).notNull().default('authenticated'),
  format: text('format').notNull().default(''),
  version: integer('version').notNull().default(0),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  fileKind: text('file_kind', { enum: ['certificate', 'thumbnail', 'supporting_document', 'redacted_certificate'] }).notNull().default('certificate'),
  visibility: text('visibility', { enum: ['private', 'public', 'redacted'] }).notNull().default('private'),
  checksum: text('checksum'),
  createdAt: text('created_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const profileLinks = sqliteTable('profile_links', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  url: text('url').notNull(),
  icon: text('icon').notNull().default('link'),
  position: integer('position').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  metadataJson: text('metadata_json').notNull().default('{}'),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

export const userStorageUsage = sqliteTable('user_storage_usage', {
  userId: text('user_id').primaryKey(),
  fileCount: integer('file_count').notNull().default(0),
  totalBytes: integer('total_bytes').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const assetDeletionQueue = sqliteTable('asset_deletion_queue', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  publicId: text('public_id').notNull(),
  resourceType: text('resource_type', { enum: ['image', 'raw'] }).notNull(),
  deliveryType: text('delivery_type', { enum: ['authenticated'] }).notNull().default('authenticated'),
  reason: text('reason').notNull(),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: text('next_attempt_at').notNull(),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
});

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  resetAt: integer('reset_at').notNull(),
});

export const accountDeletionQueue = sqliteTable('account_deletion_queue', {
  userId: text('user_id').primaryKey(),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: text('next_attempt_at').notNull(),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
});
