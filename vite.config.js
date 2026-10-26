import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { isPublicDocumentPath } from './shared/publicRoutes.js';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:4000',
      '^/[^?]+': {
        target: 'http://127.0.0.1:4000',
        bypass(request) {
          const pathname = new URL(request.url, 'http://127.0.0.1:5174').pathname;
          if (!request.headers.accept?.includes('text/html') || !isPublicDocumentPath(pathname))
            return request.url;
        },
      },
    },
  },
});
