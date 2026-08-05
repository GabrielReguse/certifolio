type EmailInput = {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}

function maskEmail(value: string) {
  const [local, domain] = value.split('@');
  if (!local || !domain) return 'endereço oculto';
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function sendTransactionalEmail(env: Env, input: EmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email desativado] ${input.subject} -> ${maskEmail(input.to)}`);
    if (env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      throw new Error('RESEND_API_KEY é obrigatório quando a verificação de e-mail está ativa.');
    }
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Certifólio <onboarding@resend.dev>',
      to: [input.to],
      subject: input.subject,
      html: `
        <div style="background:#f5f4ef;padding:40px 16px;font-family:Inter,Arial,sans-serif;color:#1f2923">
          <div style="max-width:560px;margin:auto;background:white;border:1px solid #e4e2da;border-radius:24px;padding:36px">
            <div style="font-size:14px;font-weight:800;color:#315c46;margin-bottom:28px">CERTIFÓLIO</div>
            <h1 style="font-size:28px;line-height:1.15;margin:0 0 14px">${escapeHtml(input.heading)}</h1>
            <p style="font-size:16px;line-height:1.65;color:#657068;margin:0 0 26px">${escapeHtml(input.message)}</p>
            <a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#315c46;color:white;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:14px">${escapeHtml(input.actionLabel)}</a>
            <p style="font-size:12px;line-height:1.5;color:#90978f;margin:28px 0 0">Caso você não tenha solicitado esta ação, ignore esta mensagem.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error(`Falha ao enviar e-mail pelo Resend (${response.status}).`, details.slice(0, 500));
    throw new Error(`Falha ao enviar e-mail (${response.status}).`);
  }
}
