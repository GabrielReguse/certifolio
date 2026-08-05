import { assetDeletionStatements, processAssetDeletionQueue, type DeletableAsset } from './asset-deletion';

type AccountDeletionRow = {
  user_id: string;
  attempts: number;
};

async function removeUserData(env: Env, userId: string) {
  const [objects, profile] = await Promise.all([
    env.DB.prepare(`
      SELECT object_key, resource_type, delivery_type
      FROM course_files WHERE user_id = ?1
    `).bind(userId).all<{
      object_key: string;
      resource_type: 'image' | 'raw';
      delivery_type: 'authenticated';
    }>(),
    env.DB.prepare('SELECT avatar_key, banner_key FROM profiles WHERE user_id = ?1 LIMIT 1')
      .bind(userId)
      .first<{ avatar_key: string | null; banner_key: string | null }>(),
  ]);

  const assets: DeletableAsset[] = [
    ...objects.results.map((item: { object_key: string; resource_type: 'image' | 'raw'; delivery_type: 'authenticated' }) => ({
      publicId: item.object_key,
      resourceType: item.resource_type,
      deliveryType: item.delivery_type,
    })),
    ...(profile?.avatar_key ? [{ publicId: profile.avatar_key, resourceType: 'image' as const, deliveryType: 'authenticated' as const }] : []),
    ...(profile?.banner_key ? [{ publicId: profile.banner_key, resourceType: 'image' as const, deliveryType: 'authenticated' as const }] : []),
  ];

  await env.DB.batch([
    ...assetDeletionStatements(env, assets, { userId, reason: 'account.deleted' }),
    env.DB.prepare('DELETE FROM learning_goals WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM course_skills WHERE course_id IN (SELECT id FROM courses WHERE user_id = ?1)').bind(userId),
    env.DB.prepare('DELETE FROM course_files WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM courses WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM profile_links WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = ?1)').bind(userId),
    env.DB.prepare('DELETE FROM profiles WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM audit_logs WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM user_storage_usage WHERE user_id = ?1').bind(userId),
    env.DB.prepare(`
      UPDATE institutions
      SET created_by = NULL,
          website = CASE WHEN status = 'official' THEN website ELSE '' END,
          updated_at = ?2
      WHERE created_by = ?1
    `).bind(userId, new Date().toISOString()),
    env.DB.prepare('DELETE FROM skills WHERE NOT EXISTS (SELECT 1 FROM course_skills cs WHERE cs.skill_id = skills.id)'),
    env.DB.prepare('DELETE FROM account_deletion_queue WHERE user_id = ?1').bind(userId),
  ]);
}

export async function enqueueAccountDeletion(env: Env, userId: string) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO account_deletion_queue (user_id, attempts, next_attempt_at, last_error, created_at)
    VALUES (?1, 0, ?2, NULL, ?2)
    ON CONFLICT(user_id) DO UPDATE SET
      attempts = 0,
      next_attempt_at = excluded.next_attempt_at,
      last_error = NULL
  `).bind(userId, now).run();
}

export async function processAccountDeletionQueue(
  env: Env,
  options: { userId?: string; limit?: number } = {},
) {
  const now = new Date().toISOString();
  const limit = Math.max(1, Math.min(options.limit ?? 10, 25));
  let rows: AccountDeletionRow[] = [];

  try {
    const result = await env.DB.prepare(`
      SELECT q.user_id, q.attempts
      FROM account_deletion_queue q
      LEFT JOIN "user" u ON u.id = q.user_id
      WHERE u.id IS NULL
        AND q.next_attempt_at <= ?1
        AND q.attempts < 10
        AND (?2 IS NULL OR q.user_id = ?2)
      ORDER BY q.created_at ASC
      LIMIT ?3
    `).bind(now, options.userId || null, limit).all<AccountDeletionRow>();
    rows = result.results;
  } catch (error) {
    // Durante a instalação inicial, a tabela interna do Better Auth ainda pode não existir.
    console.error('Não foi possível consultar a fila de exclusão de contas.', error);
    return;
  }

  await Promise.allSettled(rows.map(async (item: AccountDeletionRow) => {
    try {
      await removeUserData(env, item.user_id);
      await processAssetDeletionQueue(env, 50);
    } catch (error) {
      const attempts = Number(item.attempts || 0) + 1;
      const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
      const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
      const message = error instanceof Error ? error.message : String(error);
      await env.DB.prepare(`
        UPDATE account_deletion_queue
        SET attempts = ?2, next_attempt_at = ?3, last_error = ?4
        WHERE user_id = ?1
      `).bind(item.user_id, attempts, nextAttemptAt, message.slice(0, 500)).run();
    }
  }));
}
