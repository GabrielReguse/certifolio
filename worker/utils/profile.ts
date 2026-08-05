import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { profiles } from '../db/schema';
import type { AuthUser } from '../middleware/session';
import { cleanUsername, slugify } from './text';

async function usernameExists(db: Database, username: string): Promise<boolean> {
  const result = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, username)).limit(1);
  return result.length > 0;
}

export async function createAvailableUsername(db: Database, seed: string): Promise<string> {
  const base = cleanUsername(slugify(seed).replace(/-/g, '.')).slice(0, 24) || 'usuario';
  if (!(await usernameExists(db, base))) return base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${base.slice(0, 25)}${suffix}`;
    if (!(await usernameExists(db, candidate))) return candidate;
  }

  return `${base.slice(0, 18)}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export async function ensureProfile(db: Database, user: AuthUser) {
  const existing = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (existing[0]) return existing[0];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const username = await createAvailableUsername(db, user.email.split('@')[0] || user.name);
    const now = new Date().toISOString();
    const profile = {
      id: crypto.randomUUID(),
      userId: user.id,
      username,
      displayName: user.name || username,
      bio: '',
      roleTitle: '',
      location: '',
      website: '',
      avatarKey: null,
      avatarFormat: null,
      bannerKey: null,
      bannerFormat: null,
      profileVisibility: 'private' as const,
      profileLayout: 'grid' as const,
      publicTheme: 'system' as const,
      accentColor: '#315c46',
      showRating: true,
      showTotalHours: true,
      showInstitutions: true,
      allowIndexing: false,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.insert(profiles).values(profile);
      return profile;
    } catch {
      const concurrent = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
      if (concurrent[0]) return concurrent[0];
    }
  }

  throw new Error('Não foi possível criar o perfil após várias tentativas.');
}
