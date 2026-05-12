import type { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { authRoutes, userRoutes } from './auth.routes.js';
import { psychologistsRoutes } from './psychologists.routes.js';
import { articlesRoutes } from './articles.routes.js';
import { quotesRoutes } from './quotes.routes.js';
import { faqsRoutes } from './faqs.routes.js';
import { meditationsRoutes } from './meditations.routes.js';
import { nutritionRoutes } from './nutrition.routes.js';
import { sessionsRoutes } from './sessions.routes.js';
import { bookingsRoutes } from './bookings.routes.js';
import { moodRoutes } from './mood.routes.js';
import { uploadsRoutes } from './uploads.routes.js';
import { adminRoutes } from './admin/index.js';

export function mountRoutes(app: Hono<AppEnv>): void {
  app.route('/api/auth', authRoutes);
  app.route('/api/users', userRoutes);
  app.route('/api/psychologists', psychologistsRoutes);
  app.route('/api/articles', articlesRoutes);
  app.route('/api/quotes', quotesRoutes);
  app.route('/api/faqs', faqsRoutes);
  app.route('/api/meditations', meditationsRoutes);
  app.route('/api/nutrition', nutritionRoutes);
  app.route('/api/sessions', sessionsRoutes);
  app.route('/api/bookings', bookingsRoutes);
  app.route('/api/mood', moodRoutes);
  app.route('/api/uploads', uploadsRoutes);
  app.route('/api/admin', adminRoutes);
}
