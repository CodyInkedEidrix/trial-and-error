import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ──────────────────────────────────────────────────────────────────────
// Vite config.
//
// The `server.proxy` block forwards `/.netlify/functions/*` requests
// from the local dev server (localhost:5173) to the deployed production
// site (trialand-error.netlify.app). Why: in production those function
// endpoints are served from the same origin as the React app, so client
// code can do `fetch('/.netlify/functions/chat')` without thinking
// about CORS or absolute URLs. Locally Vite only serves React — the
// proxy makes that same relative path work in dev too.
//
// Trade-off: local dev hits the deployed Anthropic-backed function,
// which costs real API credits per request. Fine for development but
// worth knowing. The alternative is `netlify dev` which runs functions
// locally — switch to that workflow when you start MODIFYING functions.
// ──────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'https://trialand-error.netlify.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
