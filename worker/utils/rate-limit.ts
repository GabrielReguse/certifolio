async function hashKey(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function consumeRateLimit(
  env: Env,
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + windowSeconds;
  const secret = env.AUDIT_HASH_SECRET || env.BETTER_AUTH_SECRET;
  const hashedIdentifier = await hashKey(secret, `${scope}:${identifier}`);
  const key = `${scope}:${hashedIdentifier.slice(0, 40)}`;

  const row = await env.DB.prepare(`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (?1, 1, ?2)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at <= ?3 THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= ?3 THEN ?2 ELSE rate_limits.reset_at END
    RETURNING count, reset_at
  `).bind(key, resetAt, now).first<{ count: number; reset_at: number }>();

  const count = Number(row?.count || 1);
  const effectiveReset = Number(row?.reset_at || resetAt);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: effectiveReset,
    retryAfter: Math.max(1, effectiveReset - now),
  };
}
