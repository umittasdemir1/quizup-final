# QuizUp+

QuizUp+ is a React 18 quiz and assessment app for retail training workflows. The frontend runs on Vite and uses Supabase for auth, database, storage, and Edge Function backed admin operations.

## Features

- Admin question bank with images, timers, categories, and difficulty levels
- Manager quiz session creation with QR links
- Quiz taking flow with timing, location capture, quit handling, and results
- Dashboard metrics for questions, sessions, and scores
- Branding upload and configurable placeholder text
- PDF result export
- Supabase tenant-aware data access

## Development

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Build and preview production output:

```bash
npm run build
npm run preview
```

The app reads Supabase configuration from Vite environment variables. Do not edit or commit `.env`.

## Project Structure

```text
components/                 Legacy JSX component sources compiled by scripts/build-legacy.mjs
utils/                      Legacy browser helpers compiled into public/legacy/
src/                        Vite bootstrap, Supabase client, auth bridge, db facade, app shell
supabase/functions/         Supabase Edge Functions
scripts/build-legacy.mjs    Compiles legacy JSX/JS into public/legacy/
styles/main.css             Main shared CSS
assets/                     Static images and icons
migration/                  Local migration workspace and retained credential output
```

## Supabase

The browser client is initialized in `src/supabaseClient.js`. Shared data access for legacy components is exposed through `src/db.js` as `window.db` while the app is being migrated away from globals.

Admin user create/delete calls go through `supabase/functions/admin-users`; service-role keys must never be used in frontend code.

## Verification

Before handoff, run:

```bash
npm run build
```

Manual checks should cover login/logout, admin question CRUD, manager QR session creation, quiz submit/quit, result PDF export, branding upload, dashboard metrics, user management, and tenant isolation.

## Security

- Do not commit `.env`, service-role keys, service account files, or generated credential exports.
- Keep tenant checks enforced by Supabase RLS and Edge Functions.
- Do not reintroduce browser-side admin secrets.
- Document any RLS, storage, auth, CORS, or deployment changes in pull requests.
