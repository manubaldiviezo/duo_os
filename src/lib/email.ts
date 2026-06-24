import { supabase } from './supabase';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Envía un correo a través de la Edge Function `send-email` (server-side / Resend).
 * Nunca expone la API key en el frontend.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('send-email', { body: params });
  if (error) {
    // Cuando la función responde con un status de error, el cuerpo real viene en error.context.
    let detail = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) detail = String(body.error);
      }
    } catch {
      /* sin cuerpo legible */
    }
    return { success: false, error: detail };
  }
  if (data?.error) return { success: false, error: String(data.error) };
  return { success: true };
}

/** Plantilla simple y consistente para los correos de DUO OS. */
export function emailTemplate(opts: { title: string; body: string; footer?: string }): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1c1e">
    <div style="background:#7F77DD;color:#fff;border-radius:14px;padding:18px 20px;font-size:20px;font-weight:700">DUO OS</div>
    <h2 style="margin:20px 0 8px;font-size:18px">${opts.title}</h2>
    <div style="font-size:15px;line-height:1.5;color:#3c3c43">${opts.body}</div>
    <p style="margin-top:24px;font-size:12px;color:#8e8e93">${opts.footer ?? 'Enviado automáticamente por DUO OS'}</p>
  </div>`;
}
