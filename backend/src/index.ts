import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Export Durable Object
export { VoiceTeacherSession } from './durable-objects/voice-session';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'SFU AI Teacher' }));
app.get('/health', (c) => c.json({ status: 'healthy' }));

// Courses API - TODO: Implement
app.get('/api/courses', async (c) => {
  // Your backend engineer implements this
  return c.json({ courses: [] });
});

app.get('/api/courses/:code', async (c) => {
  const code = c.req.param('code');
  return c.json({ course: null, code });
});

// Progress API - TODO: Implement
app.get('/api/progress/:userId', async (c) => {
  return c.json({ progress: [] });
});

// Admin ingestion - TODO: Implement
app.post('/api/admin/ingest', async (c) => {
  return c.json({ success: true, message: 'Ingestion endpoint ready' });
});

// WebSocket upgrade for voice sessions
app.get('/api/voice/:courseCode', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket', 426);
  }

  const courseCode = c.req.param('courseCode');
  const id = c.env.VOICE_SESSION.idFromName(courseCode);
  const stub = c.env.VOICE_SESSION.get(id);
  
  return stub.fetch(c.req.raw);
});

export default app;
