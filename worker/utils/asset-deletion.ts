import { destroyAuthenticatedAsset, type CloudinaryDeliveryType, type CloudinaryResourceType } from './cloudinary';

export type DeletableAsset = {
  publicId: string;
  resourceType: CloudinaryResourceType;
  deliveryType: CloudinaryDeliveryType;
};

export function assetDeletionStatements(
  env: Env,
  assets: DeletableAsset[],
  input: { userId?: string | null; reason: string },
) {
  const now = new Date().toISOString();
  return assets.map((asset) => env.DB.prepare(`
    INSERT INTO asset_deletion_queue (
      id, user_id, public_id, resource_type, delivery_type, reason,
      attempts, next_attempt_at, last_error, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, NULL, ?7)
    ON CONFLICT(public_id, resource_type, delivery_type) DO NOTHING
  `).bind(
    crypto.randomUUID(),
    input.userId || null,
    asset.publicId,
    asset.resourceType,
    asset.deliveryType,
    input.reason,
    now,
  ));
}

export async function processAssetDeletionQueue(env: Env, limit = 20) {
  const due = await env.DB.prepare(`
    SELECT id, public_id, resource_type, delivery_type, attempts
    FROM asset_deletion_queue
    WHERE next_attempt_at <= ?1 AND attempts < 10
    ORDER BY created_at ASC
    LIMIT ?2
  `).bind(new Date().toISOString(), Math.max(1, Math.min(limit, 50))).all<{
    id: string;
    public_id: string;
    resource_type: CloudinaryResourceType;
    delivery_type: CloudinaryDeliveryType;
    attempts: number;
  }>();

  await Promise.allSettled(due.results.map(async (item: { id: string; public_id: string; resource_type: CloudinaryResourceType; delivery_type: CloudinaryDeliveryType; attempts: number }) => {
    try {
      await destroyAuthenticatedAsset(env, {
        publicId: item.public_id,
        resourceType: item.resource_type,
        deliveryType: item.delivery_type,
      });
      await env.DB.prepare('DELETE FROM asset_deletion_queue WHERE id = ?1').bind(item.id).run();
    } catch (error) {
      const attempts = Number(item.attempts || 0) + 1;
      const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
      const nextAttempt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
      const message = error instanceof Error ? error.message : String(error);
      await env.DB.prepare(`
        UPDATE asset_deletion_queue
        SET attempts = ?2, next_attempt_at = ?3, last_error = ?4
        WHERE id = ?1
      `).bind(item.id, attempts, nextAttempt, message.slice(0, 500)).run();
    }
  }));
}
