import { createMiddleware } from 'hono/factory';
import type { Auth } from '../auth';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
};

export type AppVariables = {
  auth: Auth;
  user: AuthUser | null;
  session: Record<string, unknown> | null;
};

export const sessionMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const auth = c.get('auth');
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set('user', result?.user as AuthUser | null ?? null);
  c.set('session', result?.session as Record<string, unknown> | null ?? null);
  await next();
});

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  if (!c.get('user')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Entre na sua conta para continuar.' }, 401);
  }
  await next();
});
