import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { adminMiddleware } from '../../middleware/admin.middleware.js';

import { adminStatsRoutes } from './stats.routes.js';
import { adminTherapistsRoutes } from './therapists.routes.js';
import { adminSessionsRoutes, adminRegistrationsRoutes } from './sessions.routes.js';
import { adminArticlesRoutes } from './articles.routes.js';
import { adminQuotesRoutes } from './quotes.routes.js';
import { adminFaqsRoutes } from './faqs.routes.js';
import { adminMeditationsRoutes } from './meditations.routes.js';
import { adminNutritionRoutes } from './nutrition.routes.js';
import { adminPaymentsRoutes } from './payments.routes.js';

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', authMiddleware, adminMiddleware);

adminRoutes.route('/stats', adminStatsRoutes);
adminRoutes.route('/therapists', adminTherapistsRoutes);
adminRoutes.route('/sessions', adminSessionsRoutes);
adminRoutes.route('/registrations', adminRegistrationsRoutes);
adminRoutes.route('/articles', adminArticlesRoutes);
adminRoutes.route('/quotes', adminQuotesRoutes);
adminRoutes.route('/faqs', adminFaqsRoutes);
adminRoutes.route('/meditations', adminMeditationsRoutes);
adminRoutes.route('/nutrition', adminNutritionRoutes);
adminRoutes.route('/payments', adminPaymentsRoutes);
