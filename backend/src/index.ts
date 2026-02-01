import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import {
  configRoutes,
  courseRoutes,
  voiceRoutes,
  adminRoutes,
  progressRoutes,
  expertsRoutes,
  outlineRoutes,
} from './routes';

// Export Durable Objects
export { VoiceTeacherSession } from './durable-objects/voice-session';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'SFU AI Teacher', version: '2.0' }));
app.get('/health', (c) => c.json({ status: 'healthy' }));

// Mount routes
app.route('/api', configRoutes);
app.route('/api/courses', courseRoutes);
app.route('/api/voice', voiceRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/experts', expertsRoutes);
app.route('/api/outlines', outlineRoutes);

export default app;
