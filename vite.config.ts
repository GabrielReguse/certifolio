import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      // O desenvolvimento usa D1 local e não exige workers.dev.
      remoteBindings: false,
    }),
  ],
  server: {
    port: 5173,
  },
});
