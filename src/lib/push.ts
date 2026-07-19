import { supabase } from './supabase';

/* Web Push del dispositivo: suscripción guardada en Supabase y envío
   server-side vía la Edge Function `send-push` (llaves VAPID en secretos). */

// Llave pública VAPID (no es secreta; la privada vive en Supabase Secrets).
export const VAPID_PUBLIC_KEY =
  'BEE5Uj3ua-w7SGMJ3ahKDcHBk9-DUoDeE95Tsy_qnBAfSoUDXUTCasiAoPN0SGh6AItYv_LQtYQfLnlLk4-jrHs';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** ¿Este dispositivo ya está suscrito? */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Pide permiso, suscribe el dispositivo y guarda la suscripción en Supabase. */
export async function enablePush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return {
      ok: false,
      error: 'Este navegador no soporta notificaciones. En iPhone, anclá la app al inicio primero.',
    };
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'Permiso de notificaciones denegado.' };

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    { onConflict: 'endpoint' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Desuscribe este dispositivo y borra el registro. */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Envía una notificación de prueba a los dispositivos del usuario actual. */
export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      title: 'DUO Community 🎙️',
      body: '¡Las notificaciones funcionan! Así te avisaremos de tareas y recordatorios.',
      url: '/',
    },
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: String(data.error) };
  return { ok: true };
}
