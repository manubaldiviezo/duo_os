// Helper para enviar correos vía Resend desde Edge Functions (Deno, server-side).
export async function sendEmailServer(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY no configurada' };
  const from = Deno.env.get('RESEND_FROM') ?? 'DUO OS <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

export function emailTemplate(opts: { title: string; body: string; footer?: string }): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1c1e">
    <div style="background:#F2741B;color:#fff;border-radius:14px;padding:18px 20px;font-size:20px;font-weight:700">DUO Community</div>
    <h2 style="margin:20px 0 8px;font-size:18px">${opts.title}</h2>
    <div style="font-size:15px;line-height:1.5;color:#3c3c43">${opts.body}</div>
    <p style="margin-top:24px;font-size:12px;color:#8e8e93">${opts.footer ?? 'Enviado automáticamente por DUO Community'}</p>
  </div>`;
}
