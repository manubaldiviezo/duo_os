import { supabase } from './supabase';

export interface GeminiHistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiOptions {
  systemPrompt: string;
  userMessage: string;
  conversationHistory?: GeminiHistoryItem[];
  expectJSON?: boolean;
  temperature?: number;
}

/**
 * Llama a Gemini a través de la Edge Function `gemini-chat` (server-side).
 * La API key NO vive en el frontend: queda protegida en Supabase.
 */
export async function callGemini(opts: GeminiOptions): Promise<any> {
  const { data, error } = await supabase.functions.invoke('gemini-chat', {
    body: {
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      conversationHistory: opts.conversationHistory ?? [],
      expectJSON: Boolean(opts.expectJSON),
      temperature: opts.temperature ?? 0.7,
    },
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('gemini-chat invoke error:', error);
    return opts.expectJSON
      ? { error: 'request_failed' }
      : 'Hubo un problema al contactar a la IA. Intenta de nuevo.';
  }

  if (data?.error) {
    return opts.expectJSON ? { error: 'api_error', message: data.error } : `⚠️ Gemini: ${data.error}`;
  }

  const text: string = data?.text ?? '';

  if (opts.expectJSON) {
    try {
      const cleaned = text.replace(/^```json\n?|\n?```$/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // eslint-disable-next-line no-console
      console.error('Failed to parse Gemini JSON:', text);
      return { error: 'invalid_json', raw: text };
    }
  }

  return text;
}

/**
 * Igual que callGemini pero en STREAMING: invoca la Edge Function con fetch
 * (functions.invoke no soporta stream) y va entregando el texto acumulado en onDelta.
 * Devuelve el texto completo al final. Si algo falla, cae al modo normal.
 * Pensado para chat de texto (no usar con expectJSON).
 */
export async function callGeminiStream(
  opts: GeminiOptions,
  onDelta: (full: string) => void
): Promise<string> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!baseUrl || !anon) return callGemini(opts);

  let accessToken: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  } catch {
    /* sin sesión: se usa el anon key */
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/functions/v1/gemini-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${accessToken ?? anon}`,
      },
      body: JSON.stringify({
        systemPrompt: opts.systemPrompt,
        userMessage: opts.userMessage,
        conversationHistory: opts.conversationHistory ?? [],
        temperature: opts.temperature ?? 0.7,
        stream: true,
      }),
    });
  } catch {
    return callGemini(opts);
  }

  const contentType = res.headers.get('content-type') ?? '';
  // Errores antes de empezar a transmitir vienen como JSON.
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => ({} as any));
    if (data?.error) return `⚠️ Gemini: ${data.error}`;
    return data?.text ?? '';
  }

  if (!res.ok || !res.body) return callGemini(opts);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onDelta(full);
  }
  return full;
}
