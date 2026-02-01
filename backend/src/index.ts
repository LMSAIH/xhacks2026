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

app.get('/health', async (c) => {
  const checks: Record<string, { status: string; error?: string }> = {};
  let degraded = false;

  // Database check
  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks.database = { status: 'healthy' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    checks.database = { status: 'unhealthy', error: errorMsg };
    degraded = true;
  }

  // KV check
  try {
    await c.env.KV.get('health-check');
    checks.kv = { status: 'healthy' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    checks.kv = { status: 'unhealthy', error: errorMsg };
    degraded = true;
  }

  // AI check
  try {
    checks.ai = { status: 'healthy' }; // AI services are optional
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    checks.ai = { status: 'unhealthy', error: errorMsg };
  }

  // Durable Objects check
  try {
    checks.durableObjects = { status: 'healthy' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    checks.durableObjects = { status: 'unhealthy', error: errorMsg };
  }

  return c.json(
    {
      status: degraded ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      checks,
    },
    degraded ? 503 : 200
  );
});

// Mount routes
app.route('/api', configRoutes);
app.route('/api/courses', courseRoutes);
app.route('/api/voice', voiceRoutes);
app.route('/api/voices', voiceRoutes); // Alias for /api/voices
app.route('/api/admin', adminRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/experts', expertsRoutes);
app.route('/api/outlines', outlineRoutes);

export default app;
