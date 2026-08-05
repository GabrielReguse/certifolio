export type CloudinaryResourceType = 'image' | 'raw';
export type CloudinaryDeliveryType = 'authenticated';

export type StoredCloudinaryAsset = {
  publicId: string;
  resourceType: CloudinaryResourceType;
  deliveryType: CloudinaryDeliveryType;
  format: string;
  version: number;
  bytes: number;
};

type CloudinaryUploadResponse = {
  public_id?: string;
  resource_type?: string;
  type?: string;
  format?: string;
  version?: number;
  bytes?: number;
  signature?: string;
  error?: { message?: string };
};

const DELIVERY_TYPE: CloudinaryDeliveryType = 'authenticated';

export function isCloudinaryConfigured(env: Env) {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function requireCloudinary(env: Env) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary não configurado. Preencha CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.');
  }
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

function serializeSignatureParams(params: Record<string, string | number | boolean | undefined | null>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
}

async function sha1Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha1Base64Url(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-1', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeCloudinaryPublicId(publicId: string) {
  return publicId.split('/').map((part) => encodeURIComponent(part)).join('/');
}

async function signParams(params: Record<string, string | number | boolean | undefined | null>, apiSecret: string) {
  return sha1Hex(`${serializeSignatureParams(params)}${apiSecret}`);
}

function fallbackFormat(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{2,8}$/.test(extension)) return extension;
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'bin';
}

export function resourceTypeForMime(mimeType: string): CloudinaryResourceType {
  return mimeType === 'application/pdf' ? 'raw' : 'image';
}

export async function uploadAuthenticatedAsset(
  env: Env,
  file: File,
  publicId: string,
): Promise<StoredCloudinaryAsset> {
  const { cloudName, apiKey, apiSecret } = requireCloudinary(env);
  const resourceType = resourceTypeForMime(file.type);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    filename_override: file.name.slice(0, 255),
    overwrite: 'false',
    public_id: publicId,
    timestamp,
    type: DELIVERY_TYPE,
  };
  const signature = await signParams(params, apiSecret);
  const form = new FormData();
  form.set('file', file);
  form.set('api_key', apiKey);
  form.set('signature', signature);
  for (const [key, value] of Object.entries(params)) form.set(key, String(value));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => ({})) as CloudinaryUploadResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `O Cloudinary recusou o arquivo (${response.status}).`);
  }
  if (!payload.public_id || !payload.resource_type || !payload.type || !payload.version) {
    throw new Error('O Cloudinary retornou uma resposta incompleta para o upload.');
  }
  if (payload.public_id !== publicId || payload.type !== DELIVERY_TYPE || payload.resource_type !== resourceType) {
    throw new Error('O Cloudinary retornou identificadores diferentes dos esperados.');
  }

  if (payload.signature) {
    const expected = await sha1Hex(`public_id=${payload.public_id}&version=${payload.version}${apiSecret}`);
    if (expected !== payload.signature) throw new Error('A assinatura da resposta do Cloudinary é inválida.');
  }

  return {
    publicId: payload.public_id,
    resourceType,
    deliveryType: DELIVERY_TYPE,
    format: payload.format || fallbackFormat(file),
    version: Number(payload.version),
    bytes: Number(payload.bytes ?? file.size),
  };
}

export async function destroyAuthenticatedAsset(
  env: Env,
  asset: Pick<StoredCloudinaryAsset, 'publicId' | 'resourceType' | 'deliveryType'>,
) {
  const { cloudName, apiKey, apiSecret } = requireCloudinary(env);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    invalidate: 'true',
    public_id: asset.publicId,
    timestamp,
    type: asset.deliveryType,
  };
  const signature = await signParams(params, apiSecret);
  const form = new FormData();
  form.set('api_key', apiKey);
  form.set('signature', signature);
  for (const [key, value] of Object.entries(params)) form.set(key, String(value));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${asset.resourceType}/destroy`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(payload.error?.message || `Não foi possível remover o arquivo do Cloudinary (${response.status}).`);
  }
}

export async function createAuthenticatedDeliveryUrl(
  env: Env,
  asset: Pick<StoredCloudinaryAsset, 'publicId' | 'resourceType' | 'deliveryType' | 'format'>,
) {
  const { cloudName, apiSecret } = requireCloudinary(env);
  const extension = asset.resourceType === 'raw' ? '' : `.${asset.format}`;
  const deliveryPath = `${asset.publicId}${extension}`;
  const digest = await sha1Base64Url(`${deliveryPath}${apiSecret}`);
  const signature = digest.slice(0, 8);
  const encodedId = encodeCloudinaryPublicId(asset.publicId);
  const encodedPath = asset.resourceType === 'raw'
    ? encodedId
    : `${encodedId}.${encodeURIComponent(asset.format)}`;

  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${asset.resourceType}/${asset.deliveryType}/s--${signature}--/${encodedPath}`;
}

export async function createAuthenticatedDownloadUrl(
  env: Env,
  asset: Pick<StoredCloudinaryAsset, 'publicId' | 'resourceType' | 'deliveryType' | 'format'>,
  expiresInSeconds = 300,
) {
  const { cloudName, apiKey, apiSecret } = requireCloudinary(env);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    expires_at: timestamp + Math.max(60, Math.min(expiresInSeconds, 3600)),
    format: asset.format,
    public_id: asset.publicId,
    timestamp,
    type: asset.deliveryType,
  };
  const signature = await signParams(params, apiSecret);
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
    api_key: apiKey,
    signature,
  });
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${asset.resourceType}/download?${query.toString()}`;
}
