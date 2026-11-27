import http from 'node:http';
import { createApp } from './app';
import { config } from './config';
import { migrate } from './db';
import { seedAll } from './db/seed';
import { initRealtime, closeRealtime } from './lib/realtime';
import { db } from './db';

function bootstrap(): void {
  migrate();
  seedAll();

  const app = createApp();
  const server = http.createServer(app);
  initRealtime(server);

  server.listen(config.port, '0.0.0.0', () => {
    const users = (db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number }).total;
    console.log(`[ibsam] API ready on http://0.0.0.0:${config.port} (${config.env})`);
    console.log(`[ibsam] API reference: /api/docs · health: /api/health`);
    if (users === 0) {
      console.log('[ibsam] No administrator exists yet. Create one at /admin (bootstrap screen) or run `npm run seed:admin`.');
    }
  });

  const shutdown = (signal: string) => {
    console.log(`[ibsam] ${signal} received, shutting down`);
    void closeRealtime().finally(() => {
      server.close(() => {
        db.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 8000).unref();
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
