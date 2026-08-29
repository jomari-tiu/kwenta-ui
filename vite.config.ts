// defineConfig from vitest/config (not vite) so the `test` block typechecks.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Vite 8 resolves tsconfig `paths` natively; no vite-tsconfig-paths needed.
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    // Bound to all interfaces so the app is reachable from a phone on the LAN.
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
});
