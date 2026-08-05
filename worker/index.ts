import { Hono, type Context } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { createAuth } from './auth';
import { requireAuth, sessionMiddleware, type AppVariables } from './middleware/session';
import { courseRoutes } from './routes/courses';
import { exportRoutes } from './routes/export';
import { fileRoutes } from './routes/files';
import { goalRoutes } from './routes/goals';
import { institutionRoutes } from './routes/institutions';
import { meRoutes } from './routes/me';
import { publicRoutes } from './routes/public';
import { setupRoutes } from './routes/setup';
import { processAccountDeletionQueue } from './utils/account-deletion';
import { processAssetDeletionQueue } from './utils/asset-deletion';
import { consumeRateLimit } from './utils/rate-limit';
import { verifyTurnstile } from './utils/turnstile';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use('*', secureHeaders({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc: ["'self'", 'https://challenges.cloudflare.com'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    frameSrc: ['https://challenges.cloudflare.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    workerSrc: ["'self'", 'blob:'],
  },
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

app.use('*', async (c, next) => {
  c.set('auth', createAuth(c.env, c.executionCtx));
  await next();
});

app.use('/api/*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const origin = c.req.header('origin');
    if (origin) {
      const allowedOrigins = [c.env.APP_URL, c.env.BETTER_AUTH_URL].flatMap((value) => {
        try { return [new URL(value).origin]; } catch { return []; }
      });
      if (!allowedOrigins.includes(origin)) {
        return c.json({ error: 'UNTRUSTED_ORIGIN', message: 'Origem da solicitação não autorizada.' }, 403);
      }
    }
  }
  await next();
  if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
});

function clientIp(c: { req: { header(name: string): string | undefined } }) {
  return c.req.header('cf-connecting-ip') || 'unknown';
}

async function enforceRateLimit(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  const result = await consumeRateLimit(c.env, scope, clientIp(c), limit, windowSeconds);
  c.header('X-RateLimit-Remaining', String(result.remaining));
  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfter));
    return c.json({ error: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde e tente novamente.' }, 429);
  }
  return null;
}

app.get('/api/health', (c) => c.json({
  status: 'ok',
  service: 'certifolio',
  database: Boolean(c.env.DB),
  storage: Boolean(c.env.CLOUDINARY_CLOUD_NAME && c.env.CLOUDINARY_API_KEY && c.env.CLOUDINARY_API_SECRET),
  time: new Date().toISOString(),
}));

app.get('/api/config', (c) => c.json({
  googleAuth: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
  emailDelivery: Boolean(c.env.RESEND_API_KEY),
  emailVerification: c.env.REQUIRE_EMAIL_VERIFICATION === 'true' && Boolean(c.env.RESEND_API_KEY),
  turnstile: Boolean(c.env.TURNSTILE_SECRET_KEY && c.env.TURNSTILE_SITE_KEY),
  turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
  storage: Boolean(c.env.CLOUDINARY_CLOUD_NAME && c.env.CLOUDINARY_API_KEY && c.env.CLOUDINARY_API_SECRET),
}));

app.use('/api/auth/sign-up/email', async (c, next) => {
  const limited = await enforceRateLimit(c, 'auth.signup', 10, 60 * 60);
  if (limited) return limited;
  const token = c.req.header('x-turnstile-token') || null;
  const valid = await verifyTurnstile(c.env, token, c.req.header('cf-connecting-ip'));
  if (!valid) return c.json({ error: 'TURNSTILE_FAILED', message: 'Não foi possível validar que você é uma pessoa.' }, 400);
  await next();
});

app.use('/api/auth/sign-in/email', async (c, next) => {
  const limited = await enforceRateLimit(c, 'auth.signin', 20, 15 * 60);
  if (limited) return limited;
  await next();
});

app.use('/api/auth/request-password-reset', async (c, next) => {
  const limited = await enforceRateLimit(c, 'auth.password-reset', 5, 60 * 60);
  if (limited) return limited;
  await next();
});

app.on(['GET', 'POST'], '/api/auth/*', (c) => c.get('auth').handler(c.req.raw));
app.route('/api/setup', setupRoutes);
app.route('/api/public', publicRoutes);

const protectedPaths = [
  '/api/me', '/api/me/*',
  '/api/courses', '/api/courses/*',
  '/api/institutions', '/api/institutions/*',
  '/api/goals', '/api/goals/*',
  '/api/export', '/api/export/*',
  '/api/files', '/api/files/*',
];

for (const path of protectedPaths) {
  app.use(path, sessionMiddleware, requireAuth, async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method.toUpperCase())) {
      const user = c.get('user')!;
      const limited = await consumeRateLimit(c.env, 'api.mutation', user.id, 180, 15 * 60);
      if (!limited.allowed) {
        c.header('Retry-After', String(limited.retryAfter));
        return c.json({ error: 'RATE_LIMITED', message: 'Muitas alterações em pouco tempo. Aguarde e tente novamente.' }, 429);
      }
    }
    await next();
  });
}

app.route('/api/me', meRoutes);
app.route('/api/courses', courseRoutes);
app.route('/api/institutions', institutionRoutes);
app.route('/api/goals', goalRoutes);
app.route('/api/files', fileRoutes);
app.route('/api/export', exportRoutes);

app.notFound((c) => c.json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' }, 404));
app.onError((error, c) => {
  const requestId = c.req.header('cf-ray') || crypto.randomUUID();
  console.error(`[${requestId}]`, error instanceof Error ? error.stack || error.message : error);
  return c.json({ error: 'INTERNAL_ERROR', message: 'O servidor encontrou um erro inesperado.', requestId }, 500);
});

export default {
  fetch: app.fetch,
  scheduled(_controller: { scheduledTime: number; cron: string }, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(Promise.allSettled([
      processAccountDeletionQueue(env, { limit: 10 }),
      processAssetDeletionQueue(env, 50),
      env.DB.prepare('DELETE FROM rate_limits WHERE reset_at < ?1')
        .bind(Math.floor(Date.now() / 1000) - 86_400)
        .run(),
      env.DB.prepare('DELETE FROM audit_logs WHERE created_at < ?1')
        .bind(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .run(),
    ]).then(() => undefined));
  },
};
