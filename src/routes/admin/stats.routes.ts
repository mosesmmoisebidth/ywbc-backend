import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { getStats } from '../../services/admin/stats.service.js';

export const adminStatsRoutes = new Hono<AppEnv>();
adminStatsRoutes.get('/', async (c) => c.json(ok(await getStats())));
