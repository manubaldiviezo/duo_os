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
