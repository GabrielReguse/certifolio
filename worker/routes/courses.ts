import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb, type Database } from '../db/client';
import { courseFiles, courseSkills, courses, institutions, skills } from '../db/schema';
import type { AppVariables } from '../middleware/session';
import { assetDeletionStatements, processAssetDeletionQueue } from '../utils/asset-deletion';
import { auditSecret, writeAudit } from '../utils/audit';
import { serializeCourse, skillsJsonSelect, type CourseRow } from '../utils/course-serializer';
import { courseInputSchema, coursePatchSchema } from '../utils/schemas';
import { normalizeText, slugify } from '../utils/text';

function nullable(value: string | null | undefined) {
  return value || null;
}

function positiveInt(value: string | undefined, fallback: number, maximum: number) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function datesAreConsistent(input: {
  startDate?: string | null;
  endDate?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
}) {
  if (input.startDate && input.endDate && input.startDate > input.endDate) return false;
  if (input.issuedAt && input.expiresAt && input.issuedAt > input.expiresAt) return false;
  return true;
}

async function findOrCreateInstitution(
  db: Database,
  input: { name: string; userId: string },
) {
  const normalizedName = normalizeText(input.name);
  const existing = await db.select().from(institutions).where(eq(institutions.normalizedName, normalizedName)).limit(1);
  if (existing[0]) return existing[0];

  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    normalizedName,
    slug: `${slugify(input.name)}-${crypto.randomUUID().slice(0, 6)}`,
    website: '',
    logoKey: null,
    createdBy: input.userId,
    status: 'community' as const,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(institutions).values(record);
    return record;
  } catch {
    const concurrent = await db.select().from(institutions).where(eq(institutions.normalizedName, normalizedName)).limit(1);
    if (!concurrent[0]) throw new Error('Não foi possível criar a instituição.');
    return concurrent[0];
  }
}

async function syncSkills(db: Database, courseId: string, skillNames: string[]) {
  await db.delete(courseSkills).where(eq(courseSkills.courseId, courseId));
  const unique = [...new Map(skillNames.map((name) => [normalizeText(name), name.trim()])).entries()]
    .filter(([normalized]) => normalized)
    .slice(0, 30);

  for (const [normalizedName, name] of unique) {
    let skill = await db.select().from(skills).where(eq(skills.normalizedName, normalizedName)).limit(1).then((rows) => rows[0]);
    if (!skill) {
      const created = {
        id: crypto.randomUUID(),
        name,
        normalizedName,
        slug: `${slugify(name)}-${crypto.randomUUID().slice(0, 5)}`,
        createdAt: new Date().toISOString(),
      };
      try {
        await db.insert(skills).values(created);
        skill = created;
      } catch {
        skill = await db.select().from(skills).where(eq(skills.normalizedName, normalizedName)).limit(1).then((rows) => rows[0]);
      }
    }
    if (skill) await db.insert(courseSkills).values({ courseId, skillId: skill.id }).onConflictDoNothing();
  }
}

function courseSelect() {
  return `
    SELECT c.*, i.name AS institution_name,
      COALESCE(
        NULLIF(c.institution_website, ''),
        CASE WHEN i.status = 'official' THEN i.website ELSE '' END,
        ''
      ) AS institution_website_resolved,
      ${skillsJsonSelect},
      (SELECT COUNT(*) FROM course_files f WHERE f.course_id = c.id AND f.deleted_at IS NULL) AS file_count
    FROM courses c
    LEFT JOIN institutions i ON i.id = c.institution_id
  `;
}

async function hydrateCourse(env: Env, userId: string, courseId: string, includeDeleted = false) {
  const deletedClause = includeDeleted ? '' : 'AND c.deleted_at IS NULL';
  const row = await env.DB.prepare(`${courseSelect()}
    WHERE c.id = ?1 AND c.user_id = ?2 ${deletedClause}
    LIMIT 1
  `).bind(courseId, userId).first<CourseRow>();
  return row ? serializeCourse(row) : null;
}

export const courseRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

courseRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const search = (c.req.query('search') || '').trim().toLowerCase().slice(0, 160);
  const institution = (c.req.query('institution') || '').slice(0, 80);
  const category = (c.req.query('category') || '').slice(0, 80);
  const visibility = c.req.query('visibility') || '';
  const status = c.req.query('status') || '';
  const deleted = c.req.query('deleted') === 'true';
  const page = positiveInt(c.req.query('page'), 1, 100000);
  const limit = positiveInt(c.req.query('limit'), 24, 60);
  const offset = (page - 1) * limit;

  const allowedVisibility = new Set(['private', 'public', 'unlisted']);
  const allowedStatus = new Set(['planned', 'in_progress', 'completed', 'abandoned', 'expired']);
  if (visibility && !allowedVisibility.has(visibility)) return c.json({ error: 'VALIDATION_ERROR', message: 'Visibilidade inválida.' }, 400);
  if (status && !allowedStatus.has(status)) return c.json({ error: 'VALIDATION_ERROR', message: 'Status inválido.' }, 400);

  const conditions = ['c.user_id = ?'];
  const values: unknown[] = [user.id];
  conditions.push(deleted ? 'c.deleted_at IS NOT NULL' : 'c.deleted_at IS NULL');
  if (search) {
    conditions.push('(LOWER(c.title) LIKE ? OR LOWER(COALESCE(i.name, \'\')) LIKE ? OR LOWER(c.platform_name) LIKE ?)');
    const pattern = `%${search}%`;
    values.push(pattern, pattern, pattern);
  }
  if (institution) {
    conditions.push('c.institution_id = ?');
    values.push(institution);
  }
  if (category) {
    conditions.push('c.category = ?');
    values.push(category);
  }
  if (visibility) {
    conditions.push('c.visibility = ?');
    values.push(visibility);
  }
  if (status) {
    conditions.push('c.status = ?');
    values.push(status);
  }

  const where = conditions.join(' AND ');
  const [count, result] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) AS total FROM courses c
      LEFT JOIN institutions i ON i.id = c.institution_id
      WHERE ${where}
    `).bind(...values).first<{ total: number }>(),
    c.env.DB.prepare(`${courseSelect()}
      WHERE ${where}
      ORDER BY c.is_featured DESC, c.updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(...values, limit, offset).all<CourseRow>(),
  ]);

  const total = Number(count?.total || 0);
  return c.json({
    courses: result.results.map(serializeCourse),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

courseRoutes.get('/dashboard', async (c) => {
  const user = c.get('user')!;
  const [stats, institutionsCount, pinnedGoal, recent, topSkills] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) AS total_courses,
        COALESCE(SUM(hours_minutes), 0) AS total_minutes,
        COALESCE(AVG(CASE WHEN rating > 0 THEN rating END), 0) AS average_rating,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN visibility = 'public' THEN 1 ELSE 0 END) AS public_courses
      FROM courses WHERE user_id = ?1 AND deleted_at IS NULL
    `).bind(user.id).first<Record<string, number>>(),
    c.env.DB.prepare(`
      SELECT COUNT(DISTINCT institution_id) AS total
      FROM courses WHERE user_id = ?1 AND deleted_at IS NULL AND institution_id IS NOT NULL
    `).bind(user.id).first<{ total: number }>(),
    c.env.DB.prepare(`
      SELECT id, title, metric, target_value, deadline, is_pinned, created_at, updated_at
      FROM learning_goals WHERE user_id = ?1 AND is_pinned = 1 LIMIT 1
    `).bind(user.id).first<{
      id: string; title: string; metric: 'hours' | 'courses'; target_value: number;
      deadline: string | null; is_pinned: number; created_at: string; updated_at: string;
    }>(),
    c.env.DB.prepare(`${courseSelect()}
      WHERE c.user_id = ?1 AND c.deleted_at IS NULL
      ORDER BY c.updated_at DESC LIMIT 5
    `).bind(user.id).all<CourseRow>(),
    c.env.DB.prepare(`
      SELECT s.name, COUNT(*) AS count
      FROM course_skills cs
      JOIN skills s ON s.id = cs.skill_id
      JOIN courses c ON c.id = cs.course_id
      WHERE c.user_id = ?1 AND c.deleted_at IS NULL
      GROUP BY s.id ORDER BY count DESC, s.name ASC LIMIT 6
    `).bind(user.id).all<{ name: string; count: number }>(),
  ]);

  const totalCourses = Number(stats?.total_courses || 0);
  const totalMinutes = Number(stats?.total_minutes || 0);
  return c.json({
    stats: {
      totalCourses,
      totalMinutes,
      averageRating: Number(stats?.average_rating || 0),
      inProgress: Number(stats?.in_progress || 0),
      publicCourses: Number(stats?.public_courses || 0),
      institutions: Number(institutionsCount?.total || 0),
    },
    recent: recent.results.map(serializeCourse),
    topSkills: topSkills.results,
    pinnedGoal: pinnedGoal ? (() => {
      const currentValue = pinnedGoal.metric === 'hours' ? totalMinutes / 60 : totalCourses;
      const targetValue = Number(pinnedGoal.target_value || 1);
      return {
        id: pinnedGoal.id,
        title: pinnedGoal.title,
        metric: pinnedGoal.metric,
        targetValue,
        currentValue,
        remainingValue: Math.max(0, targetValue - currentValue),
        percent: Math.min(100, Math.max(0, currentValue / targetValue * 100)),
        deadline: pinnedGoal.deadline,
        isPinned: true,
        createdAt: pinnedGoal.created_at,
        updatedAt: pinnedGoal.updated_at,
      };
    })() : null,
  });
});

courseRoutes.get('/:id', async (c) => {
  const course = await hydrateCourse(c.env, c.get('user')!.id, c.req.param('id'), c.req.query('deleted') === 'true');
  if (!course) return c.json({ error: 'NOT_FOUND', message: 'Curso não encontrado.' }, 404);
  return c.json({ course });
});

courseRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const parsed = courseInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'VALIDATION_ERROR', message: 'Revise os dados do curso.', issues: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const institution = await findOrCreateInstitution(db, {
    name: parsed.data.institutionName,
    userId: user.id,
  });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(courses).values({
    id,
    userId: user.id,
    institutionId: institution.id,
    institutionWebsite: parsed.data.institutionWebsite || '',
    platformName: parsed.data.platformName,
    title: parsed.data.title,
    slug: `${slugify(parsed.data.title)}-${id.slice(0, 6)}`,
    description: parsed.data.description,
    category: parsed.data.category,
    status: parsed.data.status,
    hoursMinutes: parsed.data.hoursMinutes,
    startDate: nullable(parsed.data.startDate),
    endDate: nullable(parsed.data.endDate),
    issuedAt: nullable(parsed.data.issuedAt),
    expiresAt: nullable(parsed.data.expiresAt),
    rating: parsed.data.rating,
    credentialId: parsed.data.credentialId,
    verificationUrl: parsed.data.verificationUrl || '',
    visibility: parsed.data.visibility,
    certificateVisibility: parsed.data.certificateVisibility,
    isFeatured: parsed.data.isFeatured,
    notes: parsed.data.notes,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await syncSkills(db, id, parsed.data.skills);
  await writeAudit(db, { userId: user.id, action: 'course.created', entityType: 'course', entityId: id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ course: await hydrateCourse(c.env, user.id, id) }, 201);
});

courseRoutes.patch('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const db = createDb(c.env);
  const existing = await db.select().from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, user.id), isNull(courses.deletedAt)))
    .limit(1);
  if (!existing[0]) return c.json({ error: 'NOT_FOUND', message: 'Curso não encontrado.' }, 404);

  const parsed = coursePatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'VALIDATION_ERROR', message: 'Revise os dados do curso.', issues: parsed.error.flatten() }, 400);

  const mergedDates = {
    startDate: parsed.data.startDate === undefined ? existing[0].startDate : nullable(parsed.data.startDate),
    endDate: parsed.data.endDate === undefined ? existing[0].endDate : nullable(parsed.data.endDate),
    issuedAt: parsed.data.issuedAt === undefined ? existing[0].issuedAt : nullable(parsed.data.issuedAt),
    expiresAt: parsed.data.expiresAt === undefined ? existing[0].expiresAt : nullable(parsed.data.expiresAt),
  };
  if (!datesAreConsistent(mergedDates)) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'As datas informadas são inconsistentes.' }, 400);
  }

  let institutionId = existing[0].institutionId;
  if (parsed.data.institutionName !== undefined) {
    const institution = await findOrCreateInstitution(db, {
      name: parsed.data.institutionName,
      userId: user.id,
    });
    institutionId = institution.id;
  }

  const patch: Partial<typeof courses.$inferInsert> = { institutionId, updatedAt: new Date().toISOString() };
  const map: Record<string, string> = {
    title: 'title', institutionWebsite: 'institutionWebsite', platformName: 'platformName', description: 'description', category: 'category', status: 'status',
    hoursMinutes: 'hoursMinutes', rating: 'rating', credentialId: 'credentialId', verificationUrl: 'verificationUrl',
    visibility: 'visibility', certificateVisibility: 'certificateVisibility', isFeatured: 'isFeatured', notes: 'notes',
  };
  for (const [source, target] of Object.entries(map)) {
    if (source in parsed.data) (patch as Record<string, unknown>)[target] = (parsed.data as Record<string, unknown>)[source];
  }
  for (const field of ['startDate', 'endDate', 'issuedAt', 'expiresAt'] as const) {
    if (field in parsed.data) patch[field] = mergedDates[field];
  }
  if (parsed.data.title !== undefined) patch.slug = `${slugify(parsed.data.title)}-${id.slice(0, 6)}`;

  await db.update(courses).set(patch).where(and(eq(courses.id, id), eq(courses.userId, user.id)));
  if (parsed.data.skills !== undefined) await syncSkills(db, id, parsed.data.skills);
  await writeAudit(db, { userId: user.id, action: 'course.updated', entityType: 'course', entityId: id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ course: await hydrateCourse(c.env, user.id, id) });
});

courseRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const db = createDb(c.env);
  const now = new Date().toISOString();
  const result = await db.update(courses).set({ deletedAt: now, updatedAt: now })
    .where(and(eq(courses.id, id), eq(courses.userId, user.id), isNull(courses.deletedAt)))
    .returning({ id: courses.id });
  if (!result[0]) return c.json({ error: 'NOT_FOUND', message: 'Curso não encontrado.' }, 404);
  await writeAudit(db, { userId: user.id, action: 'course.deleted', entityType: 'course', entityId: id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ success: true });
});

courseRoutes.delete('/:id/permanent', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const db = createDb(c.env);
  const owned = await db.select({ id: courses.id, deletedAt: courses.deletedAt }).from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, user.id)))
    .limit(1);
  if (!owned[0]) return c.json({ error: 'NOT_FOUND', message: 'Curso não encontrado.' }, 404);
  if (!owned[0].deletedAt) return c.json({ error: 'NOT_IN_TRASH', message: 'Mova o curso para a lixeira antes da exclusão permanente.' }, 409);

  const files = await db.select({
    objectKey: courseFiles.objectKey,
    resourceType: courseFiles.resourceType,
    deliveryType: courseFiles.deliveryType,
    sizeBytes: courseFiles.sizeBytes,
    deletedAt: courseFiles.deletedAt,
  }).from(courseFiles).where(and(eq(courseFiles.courseId, id), eq(courseFiles.userId, user.id)));
  const activeFiles = files.filter((file) => !file.deletedAt);
  const activeBytes = activeFiles.reduce((sum, file) => sum + Number(file.sizeBytes || 0), 0);

  await c.env.DB.batch([
    ...assetDeletionStatements(c.env, files.map((file) => ({
      publicId: file.objectKey,
      resourceType: file.resourceType,
      deliveryType: file.deliveryType,
    })), { userId: user.id, reason: 'course.permanently_deleted' }),
    c.env.DB.prepare('DELETE FROM course_skills WHERE course_id = ?1').bind(id),
    c.env.DB.prepare('DELETE FROM course_files WHERE course_id = ?1 AND user_id = ?2').bind(id, user.id),
    c.env.DB.prepare('DELETE FROM courses WHERE id = ?1 AND user_id = ?2').bind(id, user.id),
    c.env.DB.prepare(`
      UPDATE user_storage_usage
      SET file_count = MAX(0, file_count - ?2),
          total_bytes = MAX(0, total_bytes - ?3),
          updated_at = ?4
      WHERE user_id = ?1
    `).bind(user.id, activeFiles.length, activeBytes, new Date().toISOString()),
    c.env.DB.prepare('DELETE FROM skills WHERE NOT EXISTS (SELECT 1 FROM course_skills cs WHERE cs.skill_id = skills.id)'),
  ]);
  c.executionCtx.waitUntil(processAssetDeletionQueue(c.env));
  await writeAudit(db, { userId: user.id, action: 'course.permanently_deleted', entityType: 'course', entityId: id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ success: true });
});

courseRoutes.post('/:id/restore', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const db = createDb(c.env);
  const result = await db.update(courses).set({ deletedAt: null, updatedAt: new Date().toISOString() })
    .where(and(eq(courses.id, id), eq(courses.userId, user.id), isNotNull(courses.deletedAt)))
    .returning({ id: courses.id });
  if (!result[0]) return c.json({ error: 'NOT_FOUND', message: 'Curso não encontrado na lixeira.' }, 404);
  await writeAudit(db, { userId: user.id, action: 'course.restored', entityType: 'course', entityId: id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ course: await hydrateCourse(c.env, user.id, id) });
});
