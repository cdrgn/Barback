import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server + a proxy so /api requests during development go to the
// Express backend on :3001 without CORS setup. In production you'll serve the
// built frontend from behind whatever host you deploy to.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});