const SCOPES = ['https://www.googleapis.com/auth/calendar.events'].join(' ');

export function initiateGoogleAuth(): void {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    // eslint-disable-next-line no-console
    console.warn('[DUO OS] Faltan VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_REDIRECT_URI');
    return;
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
