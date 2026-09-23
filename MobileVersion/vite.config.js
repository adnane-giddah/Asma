import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const serveApk = {
  name: 'serve-apk',
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = decodeURIComponent((req.url ?? '').split('?')[0]);
      if (!url.endsWith('.apk')) return next();
      const file = path.join(server.config.build.outDir, path.basename(url));
      if (!fs.existsSync(file)) return next();
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fs.statSync(file).size,
        'Content-Disposition': `attachment; filename="${path.basename(file)}"`,
      });
      fs.createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  base: './',
  plugins: [react(), serveApk],
  server: { port: 5174 },
  preview: { port: 4174 },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
