import { Hono } from 'hono';
import type { AppVariables } from '../middleware/session';
import { createAuthenticatedDeliveryUrl, createAuthenticatedDownloadUrl, isCloudinaryConfigured } from '../utils/cloudinary';
import { serializePublicCourse, skillsJsonSelect, type CourseRow } from '../utils/course-serializer';

export const publicRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

publicRoutes.get('/profiles/:username', async (c) => {
  const username = (c.req.param('username') || '').toLowerCase();
  const profile = await c.env.DB.prepare(`
    SELECT id, user_id, username, display_name, bio, role_title, location, website,
      avatar_key, avatar_format, banner_key, banner_format, banner_position_x, banner_position_y, banner_zoom,
      profile_visibility, profile_layout, public_theme, accent_color,
      show_rating, show_total_hours, show_institutions, allow_indexing
    FROM profiles
    WHERE username = ?1 AND profile_visibility IN ('public', 'unlisted')
    LIMIT 1
  `).bind(username).first<Record<string, unknown>>();
  if (!profile) return c.json({ error: 'NOT_FOUND', message: 'Perfil não encontrado ou privado.' }, 404);

  const [courses, totals] = await Promise.all([
    c.env.DB.prepare(`
      SELECT c.*, i.name AS institution_name,
        (SELECT COUNT(*) FROM course_files f WHERE f.course_id = c.id AND f.deleted_at IS NULL) AS file_count,
        ${skillsJsonSelect}
      FROM courses c
      LEFT JOIN institutions i ON i.id = c.institution_id
      WHERE c.user_id = ?1 AND c.visibility = 'public' AND c.deleted_at IS NULL
      ORDER BY c.is_featured DESC, COALESCE(c.end_date, c.updated_at) DESC
    `).bind(profile.user_id).all<CourseRow>(),
    c.env.DB.prepare(`
      SELECT COUNT(*) AS total_courses, COALESCE(SUM(hours_minutes), 0) AS total_minutes,
        COALESCE(AVG(CASE WHEN rating > 0 THEN rating END), 0) AS average_rating,
        COUNT(DISTINCT institution_id) AS institutions
      FROM courses WHERE user_id = ?1 AND visibility = 'public' AND deleted_at IS NULL
    `).bind(profile.user_id).first<Record<string, number>>(),
  ]);

  const isListed = profile.profile_visibility === 'public';
  const allowIndexing = isListed && Boolean(profile.allow_indexing);
  c.header('X-Robots-Tag', allowIndexing ? 'index, follow' : 'noindex, nofollow');
  c.header('Cache-Control', isListed ? 'public, max-age=60, stale-while-revalidate=300' : 'private, no-store');

  return c.json({
    profile: {
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio,
      roleTitle: profile.role_title,
      location: profile.location,
      website: profile.website,
      visibility: profile.profile_visibility,
      layout: profile.profile_layout,
      theme: profile.public_theme,
      accentColor: profile.accent_color,
      bannerPositionX: Number(profile.banner_position_x ?? 50),
      bannerPositionY: Number(profile.banner_position_y ?? 50),
      bannerZoom: Number(profile.banner_zoom ?? 100),
      showRating: Boolean(profile.show_rating),
      showTotalHours: Boolean(profile.show_total_hours),
      showInstitutions: Boolean(profile.show_institutions),
      allowIndexing,
      avatarUrl: profile.avatar_key ? `/api/public/media/${profile.username}/avatar` : null,
      bannerUrl: profile.banner_key ? `/api/public/media/${profile.username}/banner` : null,
    },
    courses: courses.results.map(serializePublicCourse),
    stats: {
      totalCourses: Number(totals?.total_courses || 0),
      totalMinutes: Number(totals?.total_minutes || 0),
      averageRating: Number(totals?.average_rating || 0),
      institutions: Number(totals?.institutions || 0),
    },
  });
});

publicRoutes.get('/courses/:courseId', async (c) => {
  const record = await c.env.DB.prepare(`
    SELECT c.*, i.name AS institution_name,
      p.username, p.display_name, p.role_title, p.profile_visibility, p.public_theme, p.accent_color, p.avatar_key, p.allow_indexing,
      (SELECT COUNT(*) FROM course_files f WHERE f.course_id = c.id AND f.deleted_at IS NULL) AS file_count,
      ${skillsJsonSelect}
    FROM courses c
    JOIN profiles p ON p.user_id = c.user_id
    LEFT JOIN institutions i ON i.id = c.institution_id
    WHERE c.id = ?1
      AND c.deleted_at IS NULL
      AND ((c.visibility = 'public' AND p.profile_visibility = 'public') OR c.visibility = 'unlisted')
    LIMIT 1
  `).bind(c.req.param('courseId')).first<CourseRow>();
  if (!record) return c.json({ error: 'NOT_FOUND', message: 'Curso não encontrado ou privado.' }, 404);

  const profilePublic = record.profile_visibility === 'public';
  const allowIndexing = profilePublic && record.visibility === 'public' && Boolean(record.allow_indexing);
  c.header('X-Robots-Tag', allowIndexing ? 'index, follow' : 'noindex, nofollow');
  c.header('Cache-Control', record.visibility === 'unlisted' ? 'private, no-store' : 'public, max-age=60');

  return c.json({
    course: { ...serializePublicCourse(record), visibility: record.visibility },
    owner: {
      displayName: record.display_name,
      roleTitle: profilePublic ? record.role_title : '',
      username: profilePublic ? record.username : null,
      profilePublic,
      theme: record.public_theme,
      accentColor: record.accent_color,
      avatarUrl: profilePublic && record.avatar_key ? `/api/public/media/${record.username}/avatar` : null,
      allowIndexing,
    },
  });
});

publicRoutes.get('/media/:username/:kind', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.body(null, 503);
  const kind = c.req.param('kind');
  if (kind !== 'avatar' && kind !== 'banner') return c.body(null, 404);
  const keyColumn = kind === 'avatar' ? 'avatar_key' : 'banner_key';
  const formatColumn = kind === 'avatar' ? 'avatar_format' : 'banner_format';
  const result = await c.env.DB.prepare(`SELECT ${keyColumn} AS object_key, ${formatColumn} AS format, profile_visibility FROM profiles WHERE username = ?1 AND profile_visibility IN ('public', 'unlisted') LIMIT 1`)
    .bind(c.req.param('username').toLowerCase())
    .first<{ object_key: string | null; format: string | null; profile_visibility: string }>();
  if (!result?.object_key || !result.format) return c.body(null, 404);

  try {
    const url = await createAuthenticatedDeliveryUrl(c.env, {
      publicId: result.object_key,
      resourceType: 'image',
      deliveryType: 'authenticated',
      format: result.format,
    });
    c.header('Cache-Control', result.profile_visibility === 'public' ? 'public, max-age=300' : 'private, no-store');
    return c.redirect(url, 302);
  } catch (error) {
    console.error(`Falha ao gerar URL pública da imagem (${kind}).`, error);
    return c.body(null, 502);
  }
});

publicRoutes.get('/certificates/:courseId', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.json({ error: 'STORAGE_NOT_CONFIGURED', message: 'O armazenamento ainda não foi configurado.' }, 503);
  const record = await c.env.DB.prepare(`
    SELECT f.object_key, f.resource_type, f.delivery_type, f.format
    FROM courses c
    JOIN profiles p ON p.user_id = c.user_id
    JOIN course_files f ON f.course_id = c.id
    WHERE c.id = ?1
      AND c.certificate_visibility = 'public'
      AND c.deleted_at IS NULL
      AND ((c.visibility = 'public' AND p.profile_visibility = 'public') OR c.visibility = 'unlisted')
      AND f.deleted_at IS NULL
      AND f.file_kind IN ('certificate', 'redacted_certificate')
    ORDER BY CASE WHEN f.file_kind = 'certificate' THEN 0 ELSE 1 END, f.created_at DESC
    LIMIT 1
  `).bind(c.req.param('courseId')).first<{
    object_key: string;
    resource_type: 'image' | 'raw';
    delivery_type: 'authenticated';
    format: string;
  }>();
  if (!record) return c.json({ error: 'NOT_FOUND', message: 'Comprovante indisponível ou privado.' }, 404);
  c.header('Cache-Control', 'private, no-store');
  return c.redirect(await createAuthenticatedDownloadUrl(c.env, {
    publicId: record.object_key,
    resourceType: record.resource_type,
    deliveryType: record.delivery_type,
    format: record.format,
  }, 300), 302);
});
