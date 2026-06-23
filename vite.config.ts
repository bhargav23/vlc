// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection.
//
// For Netlify, disable Lovable's Cloudflare build adapter and add Netlify's
// TanStack Start Vite plugin. Netlify builds SSR, routes, server functions,
// and middleware into Netlify serverless functions.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  // Required when deploying outside Cloudflare/Lovable Cloud.
  cloudflare: false,

  // Redirect TanStack Start's bundled server entry to src/server.ts
  // so the existing SSR error wrapper is used in production.
  tanstackStart: {
    server: { entry: "server" },
  },

  vite: {
    plugins: [netlify()],
  },
});
