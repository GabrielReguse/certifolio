import { betterAuth } from 'better-auth';
import { enqueueAccountDeletion, processAccountDeletionQueue } from './utils/account-deletion';
import { sendTransactionalEmail } from './utils/email';

function validOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

export function createAuth(env: Env, executionContext?: { waitUntil(promise: Promise<unknown>): void }) {
  const emailVerificationEnabled = env.REQUIRE_EMAIL_VERIFICATION === 'true';
  const baseURL = validOrigin(env.BETTER_AUTH_URL) || validOrigin(env.APP_URL);
  if (!baseURL) throw new Error('APP_URL ou BETTER_AUTH_URL não possui uma origem válida.');

  const trustedOrigins = [validOrigin(env.APP_URL), validOrigin(env.BETTER_AUTH_URL)]
    .filter((value): value is string => Boolean(value));
  const schedule = (promise: Promise<unknown>) => {
    if (executionContext) executionContext.waitUntil(promise);
    else void promise.catch((error) => console.error('Tarefa assíncrona do Better Auth falhou.', error));
  };

  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: emailVerificationEnabled,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendTransactionalEmail(env, {
          to: user.email,
          subject: 'Redefina sua senha do Certifólio',
          heading: 'Redefinição de senha',
          message: 'Recebemos uma solicitação para criar uma nova senha para sua conta.',
          actionLabel: 'Criar nova senha',
          actionUrl: url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: emailVerificationEnabled,
      sendOnSignIn: emailVerificationEnabled,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendTransactionalEmail(env, {
          to: user.email,
          subject: 'Confirme seu e-mail no Certifólio',
          heading: 'Confirme que este e-mail é seu',
          message: 'Falta apenas confirmar seu endereço para proteger sua conta e liberar todos os recursos.',
          actionLabel: 'Confirmar e-mail',
          actionUrl: url,
        });
      },
    },
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    } : undefined,
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    databaseHooks: {
      user: {
        delete: {
          before: async (user) => {
            await enqueueAccountDeletion(env, user.id);
          },
          after: async (user) => {
            schedule(processAccountDeletionQueue(env, { userId: user.id, limit: 1 }));
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      useSecureCookies: baseURL.startsWith('https://'),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
