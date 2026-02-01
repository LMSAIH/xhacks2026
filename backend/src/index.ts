import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { VOICES } from './voices';

// Export Durable Object (use v2 for optimized voice)
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

// === VOICE & PERSONA ENDPOINTS ===

// List available voices
app.get('/api/voices', (c) => {
  const voices = Object.values(VOICES).map(v => ({
    id: v.id,
    name: v.name,
    gender: v.gender,
    style: v.style,
    bestFor: v.bestFor,
  }));
  return c.json({ voices });
});

// Combined config endpoint for frontend initialization
app.get('/api/config', (c) => {
  const voices = Object.values(VOICES).map(v => ({
    id: v.id,
    name: v.name,
    gender: v.gender,
    style: v.style,
    bestFor: v.bestFor,
  }));
  
  return c.json({
    voices,
    defaultVoice: 'aura-asteria-en',
  });
});

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
// Supports: /api/voice/CMPT120 or /api/voice/CMPT120?voice=aura-orion-en&persona=linus-torvalds
app.get('/api/voice/:courseCode', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket', 426);
  }

  const courseCode = c.req.param('courseCode');
  // Use unique session ID per user (or course for shared sessions)
  const sessionKey = `${courseCode}-${Date.now()}`;
  const id = c.env.VOICE_SESSION.idFromName(sessionKey);
  const stub = c.env.VOICE_SESSION.get(id);
  
  return stub.fetch(c.req.raw);
});

export default app;
