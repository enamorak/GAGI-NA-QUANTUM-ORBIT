import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveApiTarget() {
  if (process.env.VITE_API_PROXY) {
    return process.env.VITE_API_PROXY;
  }
  try {
    const portFile = path.resolve(__dirname, '../backend/runtime-port.json');
    if (fs.existsSync(portFile)) {
      const { url, port } = JSON.parse(fs.readFileSync(portFile, 'utf8'));
      if (url) return url;
      if (port) return `http://localhost:${port}`;
    }
  } catch {
    /* fallback */
  }
  return 'http://localhost:3001';
}

const apiTarget = resolveApiTarget();
console.log(`[vite] API proxy -> ${apiTarget}`);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
