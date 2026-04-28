# CLAUDE.md

This repository is now a Vite + React 18 app backed by Supabase. Older static CDN/Babel runtime architecture has been removed from the active app path.

## Architecture

- `index.html` loads `src/main.jsx`.
- `src/main.jsx` sets temporary compatibility globals, loads compiled legacy scripts from `public/legacy/`, and renders `src/App.jsx`.
- `scripts/build-legacy.mjs` compiles source files from `components/` and `utils/` into `public/legacy/`.
- `src/supabaseClient.js` initializes the browser Supabase client.
- `src/authBridge.js` synchronizes Supabase auth state into the temporary legacy auth globals.
- `src/db.js` is the data facade used by legacy components during migration.
- `supabase/functions/` contains Supabase Edge Functions.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

Use `npm run build` before handing off changes.

## Current Compatibility Layer

The app still exposes some `window.*` globals for legacy components, including `window.db`, `window.toast`, auth helpers, icons, and component constructors. Do not add new globals unless required for an existing legacy script. Prefer moving new logic into `src/` modules.

The old bootstrap is not part of the active runtime.

## Supabase Rules

- Use `src/db.js` for data access from legacy components.
- Use Supabase Edge Functions for privileged operations.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Keep tenant isolation in RLS and server-side function checks.
- Do not edit `.env`.

## Pending Migration Themes

- Replace legacy globals with ES module imports.
- Move auth/role checks into React context and token-backed state.
- Finish demo account Edge Function and cleanup cron.
- Add database-level demo limit triggers.
- Complete manual RLS and tenant isolation tests.
