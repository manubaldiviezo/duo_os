const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

export async function callGemini(opts: GeminiOptions): Promise<any> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return opts.expectJSON
      ? { error: 'missing_api_key' }
      : 'Falta configurar VITE_GEMINI_API_KEY para usar la IA.';
  }

  const contents: GeminiHistoryItem[] = [
    { role: 'user', parts: [{ text: opts.systemPrompt }] },
    { role: 'model', parts: [{ text: 'Entendido. Estoy listo.' }] },
    ...(opts.conversationHistory ?? []),
    { role: 'user', parts: [{ text: opts.userMessage }] },
  ];

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: 1500,
          ...(opts.expectJSON && { responseMimeType: 'application/json' }),
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    const data = await response.json();

    // Si Google devolvió un error, mostrarlo en vez de esconderlo.
    if (!response.ok || data.error) {
      const msg = data?.error?.message ?? `HTTP ${response.status}`;
      // eslint-disable-next-line no-console
      console.error('Gemini API error:', data);
      return opts.expectJSON ? { error: 'api_error', message: msg } : `⚠️ Gemini: ${msg}`;
    }

    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Respuesta sin texto (p. ej. bloqueada o cortada): avisar el motivo.
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? 'sin contenido';
      return opts.expectJSON
        ? { error: 'empty', reason }
        : `⚠️ La IA no devolvió texto (motivo: ${reason}).`;
    }

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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Gemini request failed:', err);
    return opts.expectJSON
      ? { error: 'request_failed' }
      : 'Hubo un problema al contactar a la IA. Intenta de nuevo.';
  }
}
