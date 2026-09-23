import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { versesFor } from './lib/quran.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const clientDist = path.resolve(here, '../../client/dist');

const app = buildApp({ clientDist });

const server = app.listen(PORT, () => {
  console.log(`✦ Asma'ul Husna API ready on http://localhost:${PORT}/api`);
  if (app.locals.servesClient) console.log(`✦ Serving the built app on http://localhost:${PORT}`);

  setImmediate(() => versesFor(1));
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or start with a different PORT.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
