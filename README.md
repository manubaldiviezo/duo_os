# DUO OS

Sistema operativo para agencias de marketing — React + TypeScript + Vite + Tailwind, Supabase, Gemini 2.0 Flash y Google Calendar. PWA instalable en iPhone.

## ✨ Funciones incluidas

- **Auth completo** (registro, login, onboarding de 3 pasos con carga de datos demo).
- **Dashboard** con tracker de MRR (actual vs objetivo), KPIs y alertas de IA.
- **Tareas** con filtros, swipe-to-delete, creación manual y **captura por voz** (la IA convierte tu dictado en tareas estructuradas).
- **Asistente IA** (chat con Gemini) con todo el contexto de tu agencia.
- **CRM de clientes** con detalle, tareas por cliente y edición.
- **Finanzas** del mes (cobrado / por cobrar / gastos / margen) y "marcar como cobrado".
- **Perfil** con objetivo de MRR, toggles de funciones IA y conexión con Google Calendar.
- **Edge Functions** (cron): briefing matutino, detector de churn, mensualidades recurrentes.

---

## 🚀 Puesta en marcha (paso a paso)

### 1. Requisitos
- Node.js 18+ y npm
- Cuenta en [Supabase](https://supabase.com), [Google AI Studio](https://aistudio.google.com/app/apikey) y [Vercel](https://vercel.com)

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Supabase
1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`.
3. (Opcional) Para cargar los 9 clientes reales: regístrate primero en la app, copia tu `user id` desde **Authentication → Users**, pégalo en `supabase/migrations/002_seed_emanuel.sql` y ejecútalo. *(También puedes simplemente elegir "Cargar datos demo" en el onboarding — hace lo mismo sin SQL.)*

### 4. Variables de entorno
Copia `.env.example` a `.env` y rellena:
```bash
cp .env.example .env
```
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → Supabase **Settings → API**
- `VITE_GEMINI_API_KEY` → Google AI Studio
- `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_REDIRECT_URI` → Google Cloud Console (opcional, solo para Calendar)

### 5. Correr en local
```bash
npm run dev
```
Abre http://localhost:5173

---

## ☁️ Desplegar en Vercel (desde GitHub)

1. Sube esta carpeta a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "DUO OS inicial"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/duo-os.git
   git push -u origin main
   ```
2. En Vercel: **Add New → Project → Import** tu repo.
3. Framework: **Vite** (se detecta solo). Build: `npm run build`. Output: `dist`.
4. En **Settings → Environment Variables** agrega las mismas variables `VITE_*` del `.env`.
5. **Deploy**. Cada `git push` a `main` redespliega automáticamente.

> Ya incluye `vercel.json` con el rewrite de SPA para que el routing funcione.

---

## 📅 Google Calendar (opcional)

1. En Google Cloud Console crea credenciales OAuth 2.0 (Web).
2. Authorized redirect URI: `https://TU-APP.vercel.app/auth/google/callback`.
3. El `CLIENT_SECRET` va en **Supabase → Edge Functions secrets** (nunca en el frontend).

---

## ⚙️ Edge Functions (cron jobs) — opcional

Requiere la [Supabase CLI](https://supabase.com/docs/guides/cli):
```bash
supabase functions deploy morning-briefing
supabase functions deploy churn-detector
supabase functions deploy recurring-transactions
supabase functions deploy google-oauth-exchange

# Secrets server-side
supabase secrets set GEMINI_API_KEY=AIza... GOOGLE_CLIENT_SECRET=... GOOGLE_CLIENT_ID=... GOOGLE_REDIRECT_URI=...
```
Los horarios de cron están en `supabase/config.toml`.

---

## ✉️ Motor de email (Resend) — Bloque 2

La app envía correos a través de la Edge Function `send-email` (server-side). La API key **nunca** va en el frontend.

**Pasos (una sola vez):**
1. Crea una cuenta en [Resend](https://resend.com) y genera una **API key**.
2. (Recomendado) Verifica tu dominio en Resend agregando los registros DNS (en Namecheap).
3. Guarda los secretos en Supabase:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set RESEND_FROM="DUO OS <noreply@tudominio.com>"
   supabase functions deploy send-email
   ```
   > Para pruebas sin dominio, Resend permite enviar desde `onboarding@resend.dev` hacia el correo de tu propia cuenta. Si no defines `RESEND_FROM`, se usa ese por defecto.
4. Prueba: en la app, **Perfil → Integraciones → Correo (Resend) → "Enviar prueba"**. Te debe llegar un correo a tu casilla.

## 📱 Instalar como app en iPhone
Abre la URL de Vercel en Safari → **Compartir → Añadir a pantalla de inicio**.

---

## 🗂 Stack
React 18 · TypeScript · Vite · Tailwind · Zustand · React Router · Framer Motion · Supabase · Gemini 2.0 Flash · vite-plugin-pwa.
