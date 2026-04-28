# Repository Guidelines

## Project Structure & Module Organization

This React 18 app runs through Vite. `index.html` loads `src/main.jsx`, which bootstraps Supabase, compatibility helpers, and compiled legacy scripts from `public/legacy/`. Legacy UI source remains in `components/`; browser utilities are in `utils/`; styles are in `src/styles.css` and `styles/main.css`; assets are in `assets/`. Supabase Edge Functions live in `supabase/functions/`.

## Build, Test, and Development Commands

Use the root Vite workflow:

```bash
npm install              # install dependencies
npm run dev              # compile legacy scripts and start Vite on port 5173
npm run build            # compile legacy scripts and build dist/
npm run preview          # preview the production build
```

Open `http://localhost:5173`. Deploy Edge Functions with the Supabase CLI after configuring project secrets.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, JS, JSX, and TypeScript. Component files use existing casing, for example `dashboard.jsx`, `CompanyManagement.jsx`, and `AdminForm.jsx`; new components should prefer PascalCase. Keep utility modules lowercase in `utils/`. Reuse Tailwind classes and existing CSS before adding new styling. Prefer Supabase helpers in `src/db.js` over direct table calls from legacy components.

## Testing Guidelines

No automated frontend test framework is configured. Always run `npm run build` before handoff. Manually verify login, dashboard navigation, quiz creation, QR rendering, quiz taking, quit handling, results/PDF export, branding upload, user management, and role permissions. For Edge Functions, verify auth, tenant isolation, CORS, and error responses before deployment.

## Commit & Pull Request Guidelines

Recent history uses short descriptive commits, often with emoji prefixes such as `✨ Demo hesap sistemi eklendi` or `🔧 Company name display improvements across the app`. Keep commits scoped. PRs should include a summary, manual test notes, linked issue when available, screenshots for UI changes, and Supabase schema, RLS, Edge Function, or deployment impact.

## Security & Configuration Tips

Do not edit or commit `.env`, service-role keys, service account files, or generated migration credential files. Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code; admin user operations must go through Edge Functions. When changing auth, tenant access, RLS, Storage, or CORS, document production and localhost behavior.
