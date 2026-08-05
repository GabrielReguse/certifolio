import type { Database } from '../db/client';
import { auditLogs } from '../db/schema';

async function hmacSha256Hex(secret: string, value: string) {
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

export async function writeAudit(
  db: Database,
  input: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
    request?: Request;
    hashSecret?: string;
  },
) {
  try {
    const ip = input.request?.headers.get('cf-connecting-ip') || '';
    const ipHash = ip && input.hashSecret
      ? (await hmacSha256Hex(input.hashSecret, ip)).slice(0, 32)
      : null;

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: input.userId || null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      metadataJson: JSON.stringify(input.metadata || {}),
      ipHash,
      userAgent: input.request?.headers.get('user-agent')?.slice(0, 500) || null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // Auditoria é importante, mas não pode transformar uma operação já concluída em erro 500.
    console.error(`Falha ao registrar auditoria (${input.action}/${input.entityType}).`, error);
  }
}

export function auditSecret(env: Env) {
  return env.AUDIT_HASH_SECRET || env.BETTER_AUTH_SECRET;
}
