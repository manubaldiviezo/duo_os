// Helper para enviar correos vía Resend desde Edge Functions (Deno, server-side).
export async function sendEmailServer(
  to: string | string[],
  subject: string,
  html: string,
  replyTo?: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY no configurada' };
  const from = Deno.env.get('RESEND_FROM') ?? 'DUO Community <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

/**
 * Cuerpo estándar para notificar/recordar una tarea (igual al de la app).
 * Pide responder al correo y, al terminar, responder con la palabra LISTO.
 */
export function taskEmailBody(opts: {
  taskTitle: string;
  when?: string | null;
  description?: string | null;
  kind?: 'new' | 'reminder';
}): string {
  const intro =
    opts.kind === 'reminder'
      ? 'Recordatorio: esta tarea vence pronto.'
      : 'Se te asignó esta tarea.';
  return `${intro}<br/><br/><b>${opts.taskTitle}</b><br/>${
    opts.when ? `Para: ${opts.when}<br/>` : ''
  }${opts.description ? `${opts.description}<br/>` : ''}<br/><b>Responde a este correo</b> para confirmar que la recibiste o pedir reprogramación.<br/>Cuando la termines, responde con la palabra <b>LISTO</b> y la daremos por completada.`;
}

// Plantilla sobria y "personal" (sin banner) para aterrizar en Principal de Gmail.
export function emailTemplate(opts: { title: string; body: string; footer?: string }): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#1c1c1e;font-size:15px;line-height:1.55">
    <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1c1c1e">${opts.title}</p>
    <div style="color:#1c1c1e">${opts.body}</div>
    <p style="margin:22px 0 4px;font-size:13px;color:#6b6b70">${opts.footer ?? 'DUO Community'}</p>
    <p style="margin:0;font-size:12px;color:#9a9a9e">Puedes responder directamente a este correo.</p>
  </div>`;
}
