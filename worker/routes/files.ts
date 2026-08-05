import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../db/client';
import { courseFiles, courses, profiles } from '../db/schema';
import type { AppVariables } from '../middleware/session';
import { assetDeletionStatements, processAssetDeletionQueue } from '../utils/asset-deletion';
import { auditSecret, writeAudit } from '../utils/audit';
import {
  createAuthenticatedDownloadUrl,
  isCloudinaryConfigured,
  resourceTypeForMime,
  uploadAuthenticatedAsset,
} from '../utils/cloudinary';
import { ensureProfile } from '../utils/profile';
import { consumeRateLimit } from '../utils/rate-limit';
import { releaseStorage, reserveStorage } from '../utils/storage';
import { safeFilename } from '../utils/text';

const COURSE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const COURSE_FILE_LIMIT = 20 * 1024 * 1024;
const PROFILE_IMAGE_LIMIT = 5 * 1024 * 1024;

function fileError(message: string, status: 400 | 413 | 415 = 400) {
  return { error: 'INVALID_FILE', message, status };
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 4)) === '%PDF';
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === 'image/png') return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

async function checksum(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function publicIdFor(file: File, path: string) {
  const clean = safeFilename(file.name).replace(/\.[^.]+$/, '').slice(0, 80) || 'arquivo';
  const base = `certifolio/${path}/${crypto.randomUUID()}-${clean}`;
  return resourceTypeForMime(file.type) === 'raw' ? `${base}.pdf` : base;
}

type StoredRow = {
  object_key: string;
  resource_type: 'image' | 'raw';
  delivery_type: 'authenticated';
  format: string;
};

function asAsset(row: StoredRow) {
  return {
    publicId: row.object_key,
    resourceType: row.resource_type,
    deliveryType: row.delivery_type,
    format: row.format,
  };
}

export const fileRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

fileRoutes.post('/courses/:courseId', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.json({ error: 'STORAGE_NOT_CONFIGURED', message: 'Configure o Cloudinary antes de enviar arquivos.' }, 503);
  const user = c.get('user')!;
  const rate = await consumeRateLimit(c.env, 'files.course-upload', user.id, 30, 60 * 60);
  if (!rate.allowed) {
    c.header('Retry-After', String(rate.retryAfter));
    return c.json({ error: 'RATE_LIMITED', message: 'Muitos uploads em pouco tempo. Aguarde e tente novamente.' }, 429);
  }

  const courseId = c.req.param('courseId');
  const db = createDb(c.env);
  const owned = await db.select({ id: courses.id }).from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.id), isNull(courses.deletedAt)))
    .limit(1);
  if (!owned[0]) return c.json({ error: 'NOT_FOUND', message: 'Curso não encontrado.' }, 404);

  const form = await c.req.formData().catch(() => null);
  const value = form?.get('file');
  if (!(value instanceof File)) return c.json(fileError('Selecione um arquivo.'), 400);
  if (!COURSE_TYPES.has(value.type)) return c.json(fileError('Use PDF, JPG, PNG ou WebP.', 415), 415);
  if (value.size <= 0) return c.json(fileError('O arquivo está vazio.'), 400);
  if (value.size > COURSE_FILE_LIMIT) return c.json(fileError('O arquivo pode ter no máximo 20 MB.', 413), 413);
  if (!(await hasValidSignature(value))) return c.json(fileError('O conteúdo do arquivo não corresponde ao formato informado.', 415), 415);

  const reservation = await reserveStorage(c.env, user.id, value.size);
  if (!reservation.reserved) {
    if (reservation.reason === 'files') return c.json({ error: 'FILE_LIMIT', message: 'Você atingiu o limite de 50 comprovantes.' }, 429);
    return c.json({ error: 'STORAGE_LIMIT', message: 'Você atingiu o limite de 100 MB de comprovantes.' }, 413);
  }

  const id = crypto.randomUUID();
  let asset: Awaited<ReturnType<typeof uploadAuthenticatedAsset>> | null = null;
  let plannedAsset: {
    publicId: string;
    resourceType: ReturnType<typeof resourceTypeForMime>;
    deliveryType: 'authenticated';
  } | null = null;
  try {
    const fileChecksum = await checksum(value);
    const duplicate = await c.env.DB.prepare(`
      SELECT id FROM course_files
      WHERE user_id = ?1 AND checksum = ?2 AND deleted_at IS NULL
      LIMIT 1
    `).bind(user.id, fileChecksum).first<{ id: string }>();
    if (duplicate) {
      await releaseStorage(c.env, user.id, value.size);
      return c.json({ error: 'DUPLICATE_FILE', message: 'Este mesmo arquivo já foi enviado anteriormente.' }, 409);
    }

    plannedAsset = {
      publicId: publicIdFor(value, `users/${user.id}/courses/${courseId}`),
      resourceType: resourceTypeForMime(value.type),
      deliveryType: 'authenticated',
    };
    asset = await uploadAuthenticatedAsset(c.env, value, plannedAsset.publicId);
    const record = {
      id,
      courseId,
      userId: user.id,
      objectKey: asset.publicId,
      resourceType: asset.resourceType,
      deliveryType: asset.deliveryType,
      format: asset.format,
      version: asset.version,
      originalFilename: value.name.slice(0, 255),
      mimeType: value.type,
      sizeBytes: value.size,
      fileKind: 'certificate' as const,
      visibility: 'private' as const,
      checksum: fileChecksum,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    await db.insert(courseFiles).values(record);
    await writeAudit(db, { userId: user.id, action: 'file.uploaded', entityType: 'course_file', entityId: id, request: c.req.raw, hashSecret: auditSecret(c.env) });
    return c.json({ file: { ...record, objectKey: undefined, downloadUrl: `/api/files/${id}` } }, 201);
  } catch (error) {
    const rollbackAsset = asset || plannedAsset;
    const cleanup = [releaseStorage(c.env, user.id, value.size)];
    if (rollbackAsset) {
      cleanup.push(c.env.DB.batch(assetDeletionStatements(c.env, [rollbackAsset], {
        userId: user.id,
        reason: 'upload.rollback',
      })));
    }

    const cleanupResults = await Promise.allSettled(cleanup);
    for (const result of cleanupResults) {
      if (result.status === 'rejected') console.error('Falha ao compensar upload de comprovante.', result.reason);
    }
    if (rollbackAsset) c.executionCtx.waitUntil(processAssetDeletionQueue(c.env));
    throw error;
  }
});

fileRoutes.get('/courses/:courseId/primary', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.json({ error: 'STORAGE_NOT_CONFIGURED', message: 'O armazenamento ainda não foi configurado.' }, 503);
  const user = c.get('user')!;
  const file = await c.env.DB.prepare(`
    SELECT f.object_key, f.resource_type, f.delivery_type, f.format FROM course_files f
    JOIN courses c ON c.id = f.course_id
    WHERE c.id = ?1 AND c.user_id = ?2 AND c.deleted_at IS NULL AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC LIMIT 1
  `).bind(c.req.param('courseId'), user.id).first<StoredRow>();
  if (!file) return c.json({ error: 'NOT_FOUND', message: 'Este curso ainda não possui comprovante.' }, 404);
  return c.redirect(await createAuthenticatedDownloadUrl(c.env, asAsset(file)), 302);
});

fileRoutes.get('/profile/:kind', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.body(null, 503);
  const user = c.get('user')!;
  const kind = c.req.param('kind');
  if (kind !== 'avatar' && kind !== 'banner') return c.body(null, 404);
  const keyColumn = kind === 'avatar' ? 'avatar_key' : 'banner_key';
  const formatColumn = kind === 'avatar' ? 'avatar_format' : 'banner_format';
  const result = await c.env.DB.prepare(`SELECT ${keyColumn} AS object_key, ${formatColumn} AS format FROM profiles WHERE user_id = ?1 LIMIT 1`)
    .bind(user.id)
    .first<{ object_key: string | null; format: string | null }>();
  if (!result?.object_key || !result.format) return c.body(null, 404);

  try {
    const url = await createAuthenticatedDownloadUrl(c.env, {
      publicId: result.object_key,
      resourceType: 'image',
      deliveryType: 'authenticated',
      format: result.format,
    }, 300);
    c.header('Cache-Control', 'private, max-age=60');
    return c.redirect(url, 302);
  } catch (error) {
    console.error(`Falha ao gerar URL da imagem de perfil (${kind}).`, error);
    return c.json({ error: 'IMAGE_DELIVERY_FAILED', message: 'A imagem foi encontrada, mas não pôde ser exibida.' }, 502);
  }
});

fileRoutes.post('/profile/:kind', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.json({ error: 'STORAGE_NOT_CONFIGURED', message: 'Configure o Cloudinary antes de enviar imagens.' }, 503);
  const user = c.get('user')!;
  const kind = c.req.param('kind');
  if (kind !== 'avatar' && kind !== 'banner') return c.json({ error: 'INVALID_KIND', message: 'Tipo de imagem inválido.' }, 400);

  const rate = await consumeRateLimit(c.env, 'files.profile-upload', user.id, 20, 60 * 60);
  if (!rate.allowed) {
    c.header('Retry-After', String(rate.retryAfter));
    return c.json({ error: 'RATE_LIMITED', message: 'Muitas alterações de imagem. Aguarde e tente novamente.' }, 429);
  }

  const form = await c.req.formData().catch(() => null);
  const value = form?.get('file');
  if (!(value instanceof File)) return c.json(fileError('Selecione uma imagem.'), 400);
  if (!IMAGE_TYPES.has(value.type)) return c.json(fileError('Use JPG, PNG ou WebP.', 415), 415);
  if (value.size <= 0) return c.json(fileError('A imagem está vazia.'), 400);
  if (value.size > PROFILE_IMAGE_LIMIT) return c.json(fileError('A imagem pode ter no máximo 5 MB.', 413), 413);
  if (!(await hasValidSignature(value))) return c.json(fileError('O conteúdo da imagem não corresponde ao formato informado.', 415), 415);

  const db = createDb(c.env);
  const profile = await ensureProfile(db, user);
  const previousKey = kind === 'avatar' ? profile.avatarKey : profile.bannerKey;
  const plannedAsset = {
    publicId: publicIdFor(value, `users/${user.id}/profile/${kind}`),
    resourceType: resourceTypeForMime(value.type),
    deliveryType: 'authenticated' as const,
  };
  let asset: Awaited<ReturnType<typeof uploadAuthenticatedAsset>>;
  try {
    asset = await uploadAuthenticatedAsset(c.env, value, plannedAsset.publicId);
  } catch (error) {
    try {
      await c.env.DB.batch(assetDeletionStatements(c.env, [plannedAsset], {
        userId: user.id,
        reason: 'profile-upload.uncertain',
      }));
      c.executionCtx.waitUntil(processAssetDeletionQueue(c.env));
    } catch (cleanupError) {
      console.error('Falha ao registrar compensação de upload de perfil.', cleanupError);
    }
    throw error;
  }

  try {
    await db.update(profiles)
      .set(kind === 'avatar'
        ? { avatarKey: asset.publicId, avatarFormat: asset.format, updatedAt: new Date().toISOString() }
        : { bannerKey: asset.publicId, bannerFormat: asset.format, updatedAt: new Date().toISOString() })
      .where(eq(profiles.id, profile.id));
  } catch (error) {
    await c.env.DB.batch(assetDeletionStatements(c.env, [{
      publicId: asset.publicId,
      resourceType: asset.resourceType,
      deliveryType: asset.deliveryType,
    }], { userId: user.id, reason: 'profile-upload.rollback' }));
    c.executionCtx.waitUntil(processAssetDeletionQueue(c.env));
    throw error;
  }

  if (previousKey) {
    await c.env.DB.batch(assetDeletionStatements(c.env, [{
      publicId: previousKey,
      resourceType: 'image',
      deliveryType: 'authenticated',
    }], { userId: user.id, reason: `profile.${kind}.replaced` }));
    c.executionCtx.waitUntil(processAssetDeletionQueue(c.env));
  }

  await writeAudit(db, { userId: user.id, action: `profile.${kind}.updated`, entityType: 'profile', entityId: profile.id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ url: `/api/files/profile/${kind}?v=${Date.now()}` });
});

fileRoutes.delete('/profile/:kind', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.json({ error: 'STORAGE_NOT_CONFIGURED', message: 'Configure o Cloudinary antes de remover imagens.' }, 503);
  const user = c.get('user')!;
  const kind = c.req.param('kind');
  if (kind !== 'avatar' && kind !== 'banner') return c.json({ error: 'INVALID_KIND', message: 'Tipo de imagem inválido.' }, 400);

  const db = createDb(c.env);
  const profile = await ensureProfile(db, user);
  const publicId = kind === 'avatar' ? profile.avatarKey : profile.bannerKey;
  if (!publicId) return c.json({ success: true });

  const now = new Date().toISOString();
  await c.env.DB.batch([
    ...assetDeletionStatements(c.env, [{ publicId, resourceType: 'image', deliveryType: 'authenticated' }], { userId: user.id, reason: `profile.${kind}.deleted` }),
    c.env.DB.prepare(kind === 'avatar'
      ? 'UPDATE profiles SET avatar_key = NULL, avatar_format = NULL, updated_at = ?2 WHERE id = ?1'
      : 'UPDATE profiles SET banner_key = NULL, banner_format = NULL, updated_at = ?2 WHERE id = ?1')
      .bind(profile.id, now),
  ]);
  c.executionCtx.waitUntil(processAssetDeletionQueue(c.env));
  await writeAudit(db, { userId: user.id, action: `profile.${kind}.deleted`, entityType: 'profile', entityId: profile.id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ success: true });
});

fileRoutes.get('/:id', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.json({ error: 'STORAGE_NOT_CONFIGURED', message: 'O armazenamento ainda não foi configurado.' }, 503);
  const user = c.get('user')!;
  const db = createDb(c.env);
  const rows = await db.select().from(courseFiles)
    .where(and(eq(courseFiles.id, c.req.param('id')), eq(courseFiles.userId, user.id), isNull(courseFiles.deletedAt)))
    .limit(1);
  const file = rows[0];
  if (!file) return c.json({ error: 'NOT_FOUND', message: 'Arquivo não encontrado.' }, 404);

  return c.redirect(await createAuthenticatedDownloadUrl(c.env, {
    publicId: file.objectKey,
    resourceType: file.resourceType,
    deliveryType: file.deliveryType,
    format: file.format,
  }), 302);
});

fileRoutes.delete('/:id', async (c) => {
  if (!isCloudinaryConfigured(c.env)) return c.json({ error: 'STORAGE_NOT_CONFIGURED', message: 'O armazenamento ainda não foi configurado.' }, 503);
  const user = c.get('user')!;
  const db = createDb(c.env);
  const rows = await db.select().from(courseFiles)
    .where(and(eq(courseFiles.id, c.req.param('id')), eq(courseFiles.userId, user.id), isNull(courseFiles.deletedAt)))
    .limit(1);
  const file = rows[0];
  if (!file) return c.json({ error: 'NOT_FOUND', message: 'Arquivo não encontrado.' }, 404);

  const now = new Date().toISOString();
  await c.env.DB.batch([
    ...assetDeletionStatements(c.env, [{
      publicId: file.objectKey,
      resourceType: file.resourceType,
      deliveryType: file.deliveryType,
    }], { userId: user.id, reason: 'course-file.deleted' }),
    c.env.DB.prepare('UPDATE course_files SET deleted_at = ?2 WHERE id = ?1 AND user_id = ?3 AND deleted_at IS NULL')
      .bind(file.id, now, user.id),
    c.env.DB.prepare(`
      UPDATE user_storage_usage
      SET file_count = MAX(0, file_count - 1),
          total_bytes = MAX(0, total_bytes - ?2),
          updated_at = ?3
      WHERE user_id = ?1
    `).bind(user.id, file.sizeBytes, now),
  ]);
  c.executionCtx.waitUntil(processAssetDeletionQueue(c.env));
  await writeAudit(db, { userId: user.id, action: 'file.deleted', entityType: 'course_file', entityId: file.id, request: c.req.raw, hashSecret: auditSecret(c.env) });
  return c.json({ success: true });
});
