import { Hono } from 'hono';
import type { AppVariables } from '../middleware/session';

export const institutionRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

institutionRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const result = await c.env.DB.prepare(`
    SELECT i.id, i.name, i.slug,
      COALESCE(
        (SELECT NULLIF(c2.institution_website, '')
         FROM courses c2
         WHERE c2.institution_id = i.id AND c2.user_id = ?1 AND c2.deleted_at IS NULL
         ORDER BY c2.updated_at DESC LIMIT 1),
        CASE WHEN i.status = 'official' THEN i.website ELSE '' END,
        ''
      ) AS website,
      i.status,
      COUNT(c.id) AS course_count,
      COALESCE(SUM(c.hours_minutes), 0) AS total_minutes,
      MAX(c.updated_at) AS last_activity
    FROM institutions i
    JOIN courses c ON c.institution_id = i.id
    WHERE c.user_id = ?1 AND c.deleted_at IS NULL
    GROUP BY i.id
    ORDER BY course_count DESC, i.name ASC
  `).bind(user.id).all<Record<string, unknown>>();

  return c.json({
    institutions: result.results.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      website: row.website,
      status: row.status,
      courseCount: Number(row.course_count || 0),
      totalMinutes: Number(row.total_minutes || 0),
      lastActivity: row.last_activity,
    })),
  });
});

institutionRoutes.get('/search', async (c) => {
  const user = c.get('user')!;
  const query = (c.req.query('q') || '').trim().toLowerCase().slice(0, 120);
  if (query.length < 2) return c.json({ institutions: [] });
  const result = await c.env.DB.prepare(`
    SELECT i.id, i.name, i.slug,
      COALESCE(
        (SELECT NULLIF(c2.institution_website, '')
         FROM courses c2
         WHERE c2.institution_id = i.id AND c2.user_id = ?3 AND c2.deleted_at IS NULL
         ORDER BY c2.updated_at DESC LIMIT 1),
        CASE WHEN i.status = 'official' THEN i.website ELSE '' END,
        ''
      ) AS website,
      i.status
    FROM institutions i
    WHERE i.status <> 'hidden' AND LOWER(i.name) LIKE ?1
    ORDER BY CASE WHEN LOWER(i.name) = ?2 THEN 0 ELSE 1 END, i.name ASC
    LIMIT 10
  `).bind(`%${query}%`, query, user.id).all();
  return c.json({ institutions: result.results });
});
