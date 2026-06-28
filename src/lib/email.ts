import { supabase } from './supabase';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  /** Correo al que se responde (ej. el de la agencia) cuando el destinatario contesta. */
  replyTo?: string;
  /** Nombre visible del remitente (ej. nombre de la agencia). Ayuda a caer en "Principal". */
  fromName?: string;
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

/**
 * Cuerpo estándar para notificar/recordar una tarea a su responsable.
 * Pide responder al correo (para confirmar/reprogramar) y, al terminar,
 * responder con la palabra LISTO — base para luego marcarla hecha automáticamente.
 */
export function taskEmailBody(opts: {
  taskTitle: string;
  when?: string | null;
  description?: string | null;
  kind?: 'new' | 'reminder' | 'rescheduled' | 'update';
}): string {
  const intro =
    opts.kind === 'reminder'
      ? 'Recordatorio: esta tarea vence pronto.'
      : opts.kind === 'rescheduled'
        ? 'Tu tarea fue reprogramada. Esta es la nueva fecha/hora.'
        : opts.kind === 'update'
          ? 'Se actualizó una tarea asignada a ti.'
          : 'Se te asignó esta tarea.';
  return `${intro}<br/><br/><b>${opts.taskTitle}</b><br/>${
    opts.when ? `Para: ${opts.when}<br/>` : ''
  }${opts.description ? `${opts.description}<br/>` : ''}<br/><b>Responde a este correo</b> para confirmar que la recibiste o pedir reprogramación.<br/>Cuando la termines, responde con la palabra <b>LISTO</b> y la daremos por completada.`;
}

/**
 * Plantilla sobria y "personal" para los correos.
 * Evita banners de color, imágenes y lenguaje de boletín: eso hace que Gmail
 * lo clasifique como correo 1:1 (pestaña Principal) y no en "Actualizaciones".
 */
export function emailTemplate(opts: { title: string; body: string; footer?: string }): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#1c1c1e;font-size:15px;line-height:1.55">
    <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1c1c1e">${opts.title}</p>
    <div style="color:#1c1c1e">${opts.body}</div>
    <p style="margin:22px 0 4px;font-size:13px;color:#6b6b70">${opts.footer ?? 'DUO Community'}</p>
    <p style="margin:0;font-size:12px;color:#9a9a9e">Puedes responder directamente a este correo.</p>
  </div>`;
}
