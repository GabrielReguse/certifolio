import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../db/client';
import { profiles } from '../db/schema';
import type { AppVariables } from '../middleware/session';
import { auditSecret, writeAudit } from '../utils/audit';
import { ensureProfile } from '../utils/profile';
import { profileInputSchema } from '../utils/schemas';
import { cleanUsername } from '../utils/text';

export const meRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

meRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const db = createDb(c.env);
  const profile = await ensureProfile(db, user);
  return c.json({ user, profile });
});

meRoutes.patch('/profile', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => null);
  const parsed = profileInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'Revise os campos do perfil.', issues: parsed.error.flatten() }, 400);
  }

  const db = createDb(c.env);
  const current = await ensureProfile(db, user);
  const username = cleanUsername(parsed.data.username);
  if (username.length < 3) {
    return c.json({ error: 'INVALID_USERNAME', message: 'O nome de usuário precisa ter ao menos 3 caracteres.' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM profiles WHERE username = ?1 AND id <> ?2 LIMIT 1')
    .bind(username, current.id)
    .first<{ id: string }>();
  if (existing) {
    return c.json({ error: 'USERNAME_TAKEN', message: 'Esse nome de usuário já está em uso.' }, 409);
  }

  const updatedAt = new Date().toISOString();
  try {
    await db.update(profiles).set({
      username,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || '',
      roleTitle: parsed.data.roleTitle || '',
      location: parsed.data.location || '',
      website: parsed.data.website || '',
      profileVisibility: parsed.data.profileVisibility,
      profileLayout: parsed.data.profileLayout,
      publicTheme: parsed.data.publicTheme,
      accentColor: parsed.data.accentColor,
      showRating: parsed.data.showRating,
      showTotalHours: parsed.data.showTotalHours,
      showInstitutions: parsed.data.showInstitutions,
      allowIndexing: parsed.data.allowIndexing,
      onboardingCompleted: parsed.data.onboardingCompleted ?? current.onboardingCompleted,
      updatedAt,
    }).where(eq(profiles.id, current.id));
  } catch (error) {
    const conflict = await c.env.DB.prepare('SELECT id FROM profiles WHERE username = ?1 AND id <> ?2 LIMIT 1')
      .bind(username, current.id)
      .first<{ id: string }>();
    if (conflict) return c.json({ error: 'USERNAME_TAKEN', message: 'Esse nome de usuário acabou de ser escolhido por outra pessoa.' }, 409);
    throw error;
  }

  await writeAudit(db, {
    userId: user.id,
    action: 'profile.updated',
    entityType: 'profile',
    entityId: current.id,
    request: c.req.raw,
    hashSecret: auditSecret(c.env),
  });

  const profile = await db.select().from(profiles).where(eq(profiles.id, current.id)).limit(1);
  return c.json({ profile: profile[0] });
});

meRoutes.get('/username-available', async (c) => {
  const user = c.get('user')!;
  const username = cleanUsername(c.req.query('username') || '');
  if (username.length < 3) return c.json({ available: false });

  const profile = await c.env.DB.prepare('SELECT id FROM profiles WHERE user_id = ?1 LIMIT 1').bind(user.id).first<{ id: string }>();
  const existing = await c.env.DB.prepare('SELECT id FROM profiles WHERE username = ?1 AND id <> ?2 LIMIT 1')
    .bind(username, profile?.id || '')
    .first<{ id: string }>();
  return c.json({ available: !existing, username });
});
