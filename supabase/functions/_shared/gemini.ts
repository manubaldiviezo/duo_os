// Helper compartido para llamar a Gemini desde Edge Functions (Deno, server-side).
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

export async function callGeminiServer(systemPrompt: string, userMessage: string): Promise<any> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return { error: 'missing_api_key' };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Entendido.' }] },
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1200, responseMimeType: 'application/json' },
    }),
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  try {
    return JSON.parse(text.replace(/^```json\n?|\n?```$/g, '').trim());
  } catch {
    return { error: 'invalid_json', raw: text };
  }
}
