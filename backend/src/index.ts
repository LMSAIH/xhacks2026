import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { updateCoursesFromAPI, getCourses, getCourseByCode, getCourse } from './services/courses';

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

// Update courses from SFU API - filters by term, defaults to "Fall 2025"
app.get('/api/courses/update/', async (c) => {
  const term = c.req.query('term') || 'Fall 2025';
  const result = await updateCoursesFromAPI(c.env, term);
  return c.json(result);
});

// Courses API - Get all courses with optional filters
app.get('/api/courses', async (c) => {
  const name = c.req.query('name');
  
  const courses = await getCourses(c.env, {
    name: name || undefined,
  });
  
  return c.json({ courses });
});

// Get specific course by name
app.get('/api/courses/:name', async (c) => {
  const name = c.req.param('name');
  const course = await getCourseByCode(c.env, name);
  return c.json({ course });
});

// Get specific course by id
app.get('/api/courses/id/:id', async (c) => {
  const id = c.req.param('id');
  const course = await getCourse(c.env, { id });
  return c.json({ course });
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
