import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './env.js';
import { logger } from './lib/logger.js';

// Bind to 0.0.0.0 so devices on the same Wi-Fi (Android emulator / phone) can
// reach us via the host machine's LAN IP, not just from localhost.
serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' });
logger.info({ port: env.PORT, env: env.NODE_ENV }, 'YWBC backend listening on 0.0.0.0');
