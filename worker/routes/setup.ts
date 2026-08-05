import { getMigrations } from 'better-auth/db/migration';
import { Hono } from 'hono';
import type { AppVariables } from '../middleware/session';
import { consumeRateLimit } from '../utils/rate-limit';

async function constantTimeEqual(first: string, second: string) {
  const encoder = new TextEncoder();
  const [firstHash, secondHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(first)),
    crypto.subtle.digest('SHA-256', encoder.encode(second)),
  ]);
  const a = new Uint8Array(firstHash);
  const b = new Uint8Array(secondHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export const setupRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

setupRoutes.post('/auth-migrate', async (c) => {
  if (c.env.ENABLE_SETUP !== 'true') {
    return c.json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' }, 404);
  }

  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const rate = await consumeRateLimit(c.env, 'setup', ip, 5, 15 * 60);
  if (!rate.allowed) {
    c.header('Retry-After', String(rate.retryAfter));
    return c.json({ error: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente mais tarde.' }, 429);
  }

  const provided = c.req.header('x-setup-key');
  if (!c.env.SETUP_KEY || !provided || !(await constantTimeEqual(provided, c.env.SETUP_KEY))) {
    return c.json({ error: 'FORBIDDEN', message: 'Chave de instalação inválida.' }, 403);
  }

  const auth = c.get('auth');
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  return c.json({
    success: true,
    message: 'Migrações do Better Auth aplicadas. Desative ENABLE_SETUP imediatamente.',
  });
});
