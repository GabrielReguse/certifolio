import { Hono } from 'hono';
import { createDb } from '../db/client';
import type { AppVariables } from '../middleware/session';
import { auditSecret, writeAudit } from '../utils/audit';
import { goalInputSchema, goalPatchSchema } from '../utils/schemas';

type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  metric: 'hours' | 'courses';
  target_value: number;
  deadline: string | null;
  is_pinned: number;
  created_at: string;
  updated_at: string;
};

type LearningTotals = {
  total_courses: number;
  total_minutes: number;
};

function goalProgress(row: GoalRow, totals: LearningTotals) {
  const currentValue = row.metric === 'hours'
    ? Number(totals.total_minutes || 0) / 60
    : Number(totals.total_courses || 0);
  const targetValue = Number(row.target_value || 1);
  const percent = Math.min(100, Math.max(0, currentValue / targetValue * 100));

  return {
    id: row.id,
    title: row.title,
    metric: row.metric,
    targetValue,
    currentValue,
    remainingValue: Math.max(0, targetValue - currentValue),
    percent,
    deadline: row.deadline,
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getTotals(env: Env, userId: string) {
  return await env.DB.prepare(`
    SELECT COUNT(*) AS total_courses, COALESCE(SUM(hours_minutes), 0) AS total_minutes
    FROM courses
    WHERE user_id = ?1 AND deleted_at IS NULL
  `).bind(userId).first<LearningTotals>() || { total_courses: 0, total_minutes: 0 };
}

export const goalRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

goalRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const [result, totals] = await Promise.all([
    c.env.DB.prepare(`
      SELECT * FROM learning_goals
      WHERE user_id = ?1
      ORDER BY is_pinned DESC, updated_at DESC
    `).bind(user.id).all<GoalRow>(),
    getTotals(c.env, user.id),
  ]);

  return c.json({ goals: result.results.map((row: GoalRow) => goalProgress(row, totals)) });
});

goalRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const parsed = goalInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT', message: 'Revise os dados da meta.', issues: parsed.error.flatten() }, 400);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const deadline = parsed.data.deadline || null;

  const statements = [];
  if (parsed.data.isPinned) {
    statements.push(c.env.DB.prepare('UPDATE learning_goals SET is_pinned = 0, updated_at = ?1 WHERE user_id = ?2 AND is_pinned = 1').bind(now, user.id));
  }
  statements.push(c.env.DB.prepare(`
    INSERT INTO learning_goals (id, user_id, title, metric, target_value, deadline, is_pinned, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
  `).bind(id, user.id, parsed.data.title, parsed.data.metric, parsed.data.targetValue, deadline, parsed.data.isPinned ? 1 : 0, now));
  await c.env.DB.batch(statements);

  await writeAudit(createDb(c.env), {
    userId: user.id,
    action: 'goal.created',
    entityType: 'learning_goal',
    entityId: id,
    metadata: { metric: parsed.data.metric, targetValue: parsed.data.targetValue },
    request: c.req.raw,
    hashSecret: auditSecret(c.env),
  });

  const row = await c.env.DB.prepare('SELECT * FROM learning_goals WHERE id = ?1 AND user_id = ?2 LIMIT 1').bind(id, user.id).first<GoalRow>();
  const totals = await getTotals(c.env, user.id);
  return c.json({ goal: goalProgress(row!, totals) }, 201);
});

goalRoutes.patch('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM learning_goals WHERE id = ?1 AND user_id = ?2 LIMIT 1').bind(id, user.id).first<GoalRow>();
  if (!existing) return c.json({ error: 'NOT_FOUND', message: 'Meta não encontrada.' }, 404);

  const parsed = goalPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT', message: 'Revise os dados da meta.', issues: parsed.error.flatten() }, 400);

  const next = {
    title: parsed.data.title ?? existing.title,
    metric: parsed.data.metric ?? existing.metric,
    targetValue: parsed.data.targetValue ?? existing.target_value,
    deadline: parsed.data.deadline === undefined ? existing.deadline : (parsed.data.deadline || null),
    isPinned: parsed.data.isPinned === undefined ? Boolean(existing.is_pinned) : parsed.data.isPinned,
  };
  const now = new Date().toISOString();
  const statements = [];
  if (next.isPinned) {
    statements.push(c.env.DB.prepare('UPDATE learning_goals SET is_pinned = 0, updated_at = ?1 WHERE user_id = ?2 AND id <> ?3 AND is_pinned = 1').bind(now, user.id, id));
  }
  statements.push(c.env.DB.prepare(`
    UPDATE learning_goals
    SET title = ?1, metric = ?2, target_value = ?3, deadline = ?4, is_pinned = ?5, updated_at = ?6
    WHERE id = ?7 AND user_id = ?8
  `).bind(next.title, next.metric, next.targetValue, next.deadline, next.isPinned ? 1 : 0, now, id, user.id));
  await c.env.DB.batch(statements);

  await writeAudit(createDb(c.env), {
    userId: user.id,
    action: next.isPinned ? 'goal.pinned' : 'goal.updated',
    entityType: 'learning_goal',
    entityId: id,
    request: c.req.raw,
    hashSecret: auditSecret(c.env),
  });

  const row = await c.env.DB.prepare('SELECT * FROM learning_goals WHERE id = ?1 AND user_id = ?2 LIMIT 1').bind(id, user.id).first<GoalRow>();
  const totals = await getTotals(c.env, user.id);
  return c.json({ goal: goalProgress(row!, totals) });
});

goalRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const result = await c.env.DB.prepare('DELETE FROM learning_goals WHERE id = ?1 AND user_id = ?2').bind(id, user.id).run();
  if (!result.meta.changes) return c.json({ error: 'NOT_FOUND', message: 'Meta não encontrada.' }, 404);

  await writeAudit(createDb(c.env), {
    userId: user.id,
    action: 'goal.deleted',
    entityType: 'learning_goal',
    entityId: id,
    request: c.req.raw,
    hashSecret: auditSecret(c.env),
  });

  return c.body(null, 204);
});
