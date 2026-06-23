# Deploy Velocity Kitchen Fresh to Netlify

This project is a TanStack Start SSR app, not a plain static Vite SPA. Use the TanStack Start Netlify adapter.

## 1. Install the new Netlify adapter locally

Use one package manager and commit the updated lockfile.

```bash
npm install
npm install -D @netlify/vite-plugin-tanstack-start
npm run build
```

If you prefer Bun, run this instead and commit the updated `bun.lock`:

```bash
bun install
bun add -d @netlify/vite-plugin-tanstack-start
bun run build
```

## 2. Push to GitHub

Commit these deploy files:

- `netlify.toml`
- `vite.config.ts`
- `.nvmrc`
- `.env.example`
- `package.json`
- your updated lockfile (`package-lock.json` or `bun.lock`)

Do not commit `.env`.

## 3. Create the Netlify site

In Netlify:

1. Add new project → Import an existing project.
2. Connect GitHub/GitLab and choose this repository.
3. Use these build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/client`
   - Node version: `22`
4. Deploy.

`netlify.toml` already contains these settings, so Netlify should detect them automatically.

## 4. Add Netlify environment variables

Project configuration → Environment variables → Add a variable.

Add these for Production and Deploy Previews:

```text
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_PROJECT_ID
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` is required for server functions that create orders/admin records. Get it from Supabase project settings → API keys. Keep it secret.

## 5. Configure Supabase auth redirects

In Supabase → Authentication → URL Configuration:

- Site URL: `https://YOUR-SITE.netlify.app`
- Redirect URL: `https://YOUR-SITE.netlify.app/auth/callback`

After you add a custom domain, add the same callback for that domain too.

## 6. Redeploy

After adding environment variables, trigger a fresh Netlify deploy. If a build fails after dependency changes, use Netlify's "clear cache and deploy" option.
