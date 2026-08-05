import { Hono } from 'hono';
import type { AppVariables } from '../middleware/session';

export const exportRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

exportRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const [profile, courses, institutions, skills, files, goals] = await Promise.all([
    c.env.DB.prepare(`
      SELECT id, user_id, username, display_name, bio, role_title, location, website,
        profile_visibility, profile_layout, public_theme, accent_color,
        show_rating, show_total_hours, show_institutions, allow_indexing,
        onboarding_completed, created_at, updated_at,
        CASE WHEN avatar_key IS NOT NULL THEN 1 ELSE 0 END AS has_avatar,
        CASE WHEN banner_key IS NOT NULL THEN 1 ELSE 0 END AS has_banner
      FROM profiles WHERE user_id = ?1 LIMIT 1
    `).bind(user.id).first(),
    c.env.DB.prepare('SELECT * FROM courses WHERE user_id = ?1 ORDER BY created_at ASC').bind(user.id).all(),
    c.env.DB.prepare(`
      SELECT DISTINCT i.id, i.name, i.slug,
        COALESCE(
          (SELECT NULLIF(c2.institution_website, '')
           FROM courses c2
           WHERE c2.institution_id = i.id AND c2.user_id = ?1 AND c2.deleted_at IS NULL
           ORDER BY c2.updated_at DESC LIMIT 1),
          CASE WHEN i.status = 'official' THEN i.website ELSE '' END,
          ''
        ) AS website,
        i.status, i.created_at, i.updated_at
      FROM institutions i
      JOIN courses c ON c.institution_id = i.id
      WHERE c.user_id = ?1
    `).bind(user.id).all(),
    c.env.DB.prepare(`
      SELECT s.id, s.name, s.slug, s.created_at, cs.course_id
      FROM skills s
      JOIN course_skills cs ON cs.skill_id = s.id
      JOIN courses c ON c.id = cs.course_id
      WHERE c.user_id = ?1
    `).bind(user.id).all(),
    c.env.DB.prepare(`
      SELECT id, course_id, original_filename, mime_type, size_bytes, file_kind, visibility, checksum, created_at, deleted_at
      FROM course_files WHERE user_id = ?1
    `).bind(user.id).all(),
    c.env.DB.prepare('SELECT * FROM learning_goals WHERE user_id = ?1 ORDER BY created_at ASC').bind(user.id).all(),
  ]);

  const payload = {
    format: 'certifolio-export-v1',
    exportedAt: new Date().toISOString(),
    account: { id: user.id, name: user.name, email: user.email },
    profile,
    courses: courses.results,
    institutions: institutions.results,
    skills: skills.results,
    files: files.results,
    goals: goals.results,
    note: 'Os arquivos binários e identificadores internos do Cloudinary não estão incluídos. Baixe os comprovantes individualmente pelo aplicativo.',
  };
  const filename = `certifolio-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
