export const USER_FILE_LIMIT = 50;
export const USER_STORAGE_LIMIT = 100 * 1024 * 1024;

export async function reserveStorage(env: Env, userId: string, bytes: number) {
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    INSERT INTO user_storage_usage (user_id, file_count, total_bytes, updated_at)
    VALUES (?1, 1, ?2, ?3)
    ON CONFLICT(user_id) DO UPDATE SET
      file_count = user_storage_usage.file_count + 1,
      total_bytes = user_storage_usage.total_bytes + excluded.total_bytes,
      updated_at = excluded.updated_at
    WHERE user_storage_usage.file_count < ?4
      AND user_storage_usage.total_bytes + excluded.total_bytes <= ?5
    RETURNING file_count, total_bytes
  `).bind(userId, bytes, now, USER_FILE_LIMIT, USER_STORAGE_LIMIT)
    .first<{ file_count: number; total_bytes: number }>();

  if (result) return { reserved: true as const, usage: result };

  const current = await env.DB.prepare(`
    SELECT file_count, total_bytes FROM user_storage_usage WHERE user_id = ?1 LIMIT 1
  `).bind(userId).first<{ file_count: number; total_bytes: number }>();

  return {
    reserved: false as const,
    reason: Number(current?.file_count || 0) >= USER_FILE_LIMIT ? 'files' as const : 'bytes' as const,
    usage: current || { file_count: 0, total_bytes: 0 },
  };
}

export async function releaseStorage(env: Env, userId: string, bytes: number, fileCount = 1) {
  await env.DB.prepare(`
    UPDATE user_storage_usage
    SET file_count = MAX(0, file_count - ?2),
        total_bytes = MAX(0, total_bytes - ?3),
        updated_at = ?4
    WHERE user_id = ?1
  `).bind(userId, fileCount, bytes, new Date().toISOString()).run();
}
