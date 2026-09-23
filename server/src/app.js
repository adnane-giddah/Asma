import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import apiRoutes from './routes/api.js';

export function buildApp({ clientDist } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({

      contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } },
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '16kb' }));

  app.use('/api', apiRoutes);
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const indexHtml = clientDist && path.join(clientDist, 'index.html');
  app.locals.servesClient = Boolean(indexHtml && fs.existsSync(indexHtml));

  if (app.locals.servesClient) {
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders(res, filePath) {

          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );

    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.expose ? err.message : 'Bad request' });
  });

  return app;
}
