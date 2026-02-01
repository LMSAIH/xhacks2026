import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { runPrecaching } from './services/precache';
import {
  configRoutes,
  courseRoutes,
  voiceRoutes,
  editorVoiceRoutes,
  editorChatRoutes,
  adminRoutes,
  progressRoutes,
  expertsRoutes,
  outlineRoutes,
  mcpRoutes,
  precacheRoutes,
} from './routes';

// Export Durable Objects
export { VoiceTeacherSession } from './durable-objects/voice-session';
export { EditorVoiceSession } from './durable-objects/editor-voice-session';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Rate limiting - applied after CORS
app.use('*', rateLimitMiddleware);

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'SFU AI Teacher', version: '2.0' }));
app.get('/health', (c) => c.json({ status: 'healthy' }));

// Mount routes
app.route('/api', configRoutes);
app.route('/api/courses', courseRoutes);
app.route('/api/voice', voiceRoutes);
app.route('/api/editor-voice', editorVoiceRoutes);
app.route('/api/editor-chat', editorChatRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/experts', expertsRoutes);
app.route('/api/outlines', outlineRoutes);
app.route('/api/mcp', mcpRoutes);
app.route('/api/precache', precacheRoutes);

// Scheduled event handler for pre-caching
const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  console.log('Scheduled pre-caching triggered at:', new Date().toISOString());
  
  ctx.waitUntil(
    runPrecaching(env, { maxCourses: 10 }).then((result) => {
      console.log('Pre-caching complete:', result);
    }).catch((error) => {
      console.error('Pre-caching failed:', error);
    })
  );
};

export default {
  fetch: app.fetch,
  scheduled,
};
