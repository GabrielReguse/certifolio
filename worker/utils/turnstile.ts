type TurnstileResult = {
  success: boolean;
  'error-codes'?: string[];
};

export async function verifyTurnstile(env: Env, token: string | null, remoteIp?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;
    const result = await response.json() as TurnstileResult;
    return result.success;
  } catch (error) {
    console.error('Falha ao consultar o Turnstile.', error);
    return false;
  }
}
