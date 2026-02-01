import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, SessionCreate } from './types';
import { updateCoursesFromAPI, getCourses, getCourseByCode, getCourse, getCourseWithInstructor, searchCourses } from './services/courses';
import { getCourseOutline, storeEditedOutline, getOutline } from './services/outline';
import { createSession, getSession } from './services/sessions';
import { queryRagContext } from './services/rag';
import { VOICES } from './voices';

// Export Durable Object (use v2 for optimized voice)
export { VoiceTeacherSession } from './durable-objects/voice-session';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check - basic
app.get('/', (c) => c.json({ status: 'ok', service: 'SFU AI Teacher', version: '2.0' }));

// Health check - comprehensive with database validation
app.get('/health', async (c) => {
  const checks: Record<string, { status: string; latency?: number; error?: string; details?: unknown }> = {};
  let overallHealthy = true;

  // Check D1 Database
  const dbStart = Date.now();
  try {
    const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM sfu_courses').first<{ count: number }>();
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
      details: { courseCount: result?.count ?? 0 },
    };
  } catch (error) {
    overallHealthy = false;
    checks.database = {
      status: 'unhealthy',
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check KV Namespace
  const kvStart = Date.now();
  try {
    await c.env.KV.get('health-check-probe');
    checks.kv = {
      status: 'healthy',
      latency: Date.now() - kvStart,
    };
  } catch (error) {
    overallHealthy = false;
    checks.kv = {
      status: 'unhealthy',
      latency: Date.now() - kvStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check Vectorize (remote binding)
  const vectorizeStart = Date.now();
  try {
    // Query with empty vector to test connectivity
    await c.env.VECTORIZE.query([0], { topK: 1 });
    checks.vectorize = {
      status: 'healthy',
      latency: Date.now() - vectorizeStart,
    };
  } catch (error) {
    // Vectorize may fail in local dev without remote, don't mark as critical
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const isLocalDevError = errorMsg.includes('not supported') || errorMsg.includes('local');
    if (!isLocalDevError) {
      overallHealthy = false;
    }
    checks.vectorize = {
      status: isLocalDevError ? 'unavailable' : 'unhealthy',
      latency: Date.now() - vectorizeStart,
      error: errorMsg,
    };
  }

  // Check Workers AI
  checks.ai = {
    status: c.env.AI ? 'available' : 'unavailable',
  };

  // Check Durable Objects
  checks.durableObjects = {
    status: c.env.VOICE_SESSION ? 'available' : 'unavailable',
  };

  return c.json({
    status: overallHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, overallHealthy ? 200 : 503);
});

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

// Search courses with query (must be before :name route)
app.get('/api/courses/search', async (c) => {
  const query = c.req.query('q') || '';
  if (!query) {
    return c.json({ success: false, error: 'Query parameter q is required' }, 400);
  }
  const courses = await searchCourses(c.env, query);
  return c.json({ success: true, data: { courses } });
});

// Get specific course by id (must be before :name route)
app.get('/api/courses/id/:id', async (c) => {
  const id = c.req.param('id');
  const course = await getCourse(c.env, { id });
  return c.json({ course });
});

// Get specific course by name
app.get('/api/courses/:name', async (c) => {
  const name = c.req.param('name');
  const course = await getCourseByCode(c.env, name);
  return c.json({ course });
});

// Get course with instructor (from SFU API with RateMyProf data)
app.get('/api/courses/:code/details', async (c) => {
  const code = c.req.param('code');
  const result = await getCourseWithInstructor(c.env, code);
  if (!result) {
    return c.json({ success: false, error: 'Course not found' }, 404);
  }
  return c.json({ success: true, data: result });
});

// === OUTLINE ENDPOINTS ===

// Get course outline
app.get('/api/courses/:code/outline', async (c) => {
  const code = c.req.param('code');
  const sessionId = c.req.query('sessionId');

  let outline;
  if (sessionId) {
    // Get outline (edited if exists, else original)
    outline = await getOutline(c.env, sessionId, code);
  } else {
    // Get original outline
    outline = await getCourseOutline(c.env, code);
  }

  if (!outline) {
    return c.json({ success: false, error: 'Outline not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      courseCode: code,
      outline,
      modified: sessionId ? true : false,
    },
  });
});

// Store edited outline (session-scoped)
app.put('/api/courses/:code/outline', async (c) => {
  const code = c.req.param('code');

  try {
    const body = await c.req.json<{
      sessionId: string;
      outline: {
        topics: string[];
        learningObjectives: string[];
        courseTopics: string[];
        summary: string;
      };
    }>();

    if (!body.sessionId) {
      return c.json({ success: false, error: 'sessionId is required' }, 400);
    }

    if (!body.outline) {
      return c.json({ success: false, error: 'outline is required' }, 400);
    }

    await storeEditedOutline(c.env, body.sessionId, code, body.outline);

    return c.json({
      success: true,
      message: 'Outline updated for session',
      data: {
        sessionId: body.sessionId,
        outline: body.outline,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: errorMessage }, 400);
  }
});

// === SESSION ENDPOINTS ===

// Create session with all user choices
app.post('/api/sessions', async (c) => {
  try {
    const body = await c.req.json<SessionCreate>();

    // Validate required fields
    if (!body.courseCode) {
      return c.json({ success: false, error: 'courseCode is required' }, 400);
    }

    if (!body.instructor || !body.instructor.sfuId || !body.instructor.name) {
      return c.json({ success: false, error: 'instructor with sfuId and name is required' }, 400);
    }

    if (!body.voiceConfig || !body.voiceConfig.voiceId) {
      return c.json({ success: false, error: 'voiceConfig with voiceId is required' }, 400);
    }

    if (!body.personalityConfig || !body.personalityConfig.systemPrompt) {
      return c.json({ success: false, error: 'personalityConfig with systemPrompt is required' }, 400);
    }

    const result = await createSession(c.env, body);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Get session by ID
app.get('/api/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  const session = await getSession(c.env, sessionId);

  if (!session) {
    return c.json({ success: false, error: 'Session not found' }, 404);
  }

  return c.json({ success: true, data: session });
});

// Get RAG context for a session (query during conversation)
app.get('/api/sessions/:id/rag', async (c) => {
  const sessionId = c.req.param('id');
  const query = c.req.query('q');

  if (!query) {
    return c.json({ success: false, error: 'Query parameter q is required' }, 400);
  }

  const topK = parseInt(c.req.query('topK') || '5', 10);
  const chunks = await queryRagContext(c.env, sessionId, query, topK);

  return c.json({
    success: true,
    data: {
      sessionId,
      query,
      chunks,
      chunkCount: chunks.length,
    },
  });
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
