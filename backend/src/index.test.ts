import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './index';
import { VOICES } from './voices';
import type { Env } from './types';

// Mock the Durable Object export
vi.mock('./durable-objects/voice-session', () => ({
  VoiceTeacherSession: class VoiceTeacherSession {
    fetch() {
      return Promise.resolve(new Response('WebSocket mock'));
    }
  },
}));

function createMockEnv(): Env {
  const mockDOInstance = {
    fetch: vi.fn().mockImplementation((request: Request) => {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return Promise.resolve(new Response('WebSocket required', { status: 426 }));
      }
      // Simulate WebSocket upgrade - use 200 for test since Node doesn't support 101
      return Promise.resolve(new Response(null, { status: 200 }));
    }),
  };

  return {
    AI: { run: vi.fn() } as any,
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({}),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
      exec: vi.fn(),
      batch: vi.fn(),
      dump: vi.fn(),
    } as any,
    KV: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      getWithMetadata: vi.fn(),
    } as any,
    VECTORIZE: {
      query: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    } as any,
    VOICE_SESSION: {
      idFromName: vi.fn().mockReturnValue({ toString: () => 'test-id' }),
      idFromString: vi.fn().mockReturnValue({ toString: () => 'test-id' }),
      get: vi.fn().mockReturnValue(mockDOInstance),
    } as any,
  };
}

describe('SFU AI Teacher API', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('Health Endpoints', () => {
    it('GET / should return service status', async () => {
      const req = new Request('http://localhost/');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        status: 'ok',
        service: 'SFU AI Teacher',
        version: '2.0',
      });
    });

    it('GET /health should return comprehensive health status', async () => {
      // Setup mock for successful DB query
      const mockPrepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 5 }),
      });
      env.DB.prepare = mockPrepare;

      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { status: string; timestamp: string; checks: Record<string, unknown> };
      expect(json.status).toBe('healthy');
      expect(json.timestamp).toBeDefined();
      expect(json.checks).toBeDefined();
      expect(json.checks.database).toBeDefined();
      expect(json.checks.kv).toBeDefined();
      expect(json.checks.ai).toBeDefined();
      expect(json.checks.durableObjects).toBeDefined();
    });

    it('GET /health should return degraded status when DB fails', async () => {
      // Setup mock for failing DB query
      env.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      });

      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(503);
      const json = await res.json() as { status: string; checks: { database: { status: string; error: string } } };
      expect(json.status).toBe('degraded');
      expect(json.checks.database.status).toBe('unhealthy');
      expect(json.checks.database.error).toBe('DB connection failed');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers on responses', async () => {
      const req = new Request('http://localhost/', {
        headers: { Origin: 'http://example.com' },
      });
      const res = await app.fetch(req, env);
      
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const req = new Request('http://localhost/api/voices', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('GET /api/voices', () => {
    it('should return list of all voices', async () => {
      const req = new Request('http://localhost/api/voices');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { voices: any[] };
      expect(json.voices).toBeDefined();
      expect(Array.isArray(json.voices)).toBe(true);
    });

    it('should return correct number of voices', async () => {
      const req = new Request('http://localhost/api/voices');
      const res = await app.fetch(req, env);
      
      const json = await res.json() as { voices: any[] };
      expect(json.voices.length).toBe(Object.keys(VOICES).length);
    });

    it('should return voice objects with correct structure', async () => {
      const req = new Request('http://localhost/api/voices');
      const res = await app.fetch(req, env);
      
      const json = await res.json() as { voices: any[] };
      const firstVoice = json.voices[0];
      
      expect(firstVoice).toHaveProperty('id');
      expect(firstVoice).toHaveProperty('name');
      expect(firstVoice).toHaveProperty('gender');
      expect(firstVoice).toHaveProperty('style');
      expect(firstVoice).toHaveProperty('bestFor');
    });

    it('should include asteria voice', async () => {
      const req = new Request('http://localhost/api/voices');
      const res = await app.fetch(req, env);
      
      const json = await res.json() as { voices: any[] };
      const asteria = json.voices.find((v: any) => v.id === 'aura-asteria-en');
      
      expect(asteria).toBeDefined();
      expect(asteria.name).toBe('Asteria');
      expect(asteria.gender).toBe('female');
    });

    it('should include orion voice', async () => {
      const req = new Request('http://localhost/api/voices');
      const res = await app.fetch(req, env);
      
      const json = await res.json() as { voices: any[] };
      const orion = json.voices.find((v: any) => v.id === 'aura-orion-en');
      
      expect(orion).toBeDefined();
      expect(orion.name).toBe('Orion');
      expect(orion.gender).toBe('male');
    });
  });

  describe('GET /api/voices/:voiceId/preview', () => {
    it('should return 400 for invalid voice ID', async () => {
      const req = new Request('http://localhost/api/voices/invalid-voice/preview');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid voice ID');
    });

    it('should return cached audio if available', async () => {
      const mockAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // RIFF header
      env.KV.get = vi.fn().mockResolvedValue(mockAudio.buffer);

      const req = new Request('http://localhost/api/voices/aura-asteria-en/preview');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
      expect(env.KV.get).toHaveBeenCalledWith('voice-preview:aura-asteria-en', 'arrayBuffer');
    });

    it('should generate and cache audio if not cached', async () => {
      env.KV.get = vi.fn().mockResolvedValue(null);
      env.KV.put = vi.fn().mockResolvedValue(undefined);
      
      const mockAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
      env.AI.run = vi.fn().mockResolvedValue(mockAudio);

      const req = new Request('http://localhost/api/voices/aura-orion-en/preview');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
      expect(env.AI.run).toHaveBeenCalled();
      expect(env.KV.put).toHaveBeenCalled();
    });

    it('should handle TTS API errors gracefully', async () => {
      env.KV.get = vi.fn().mockResolvedValue(null);
      env.AI.run = vi.fn().mockRejectedValue(new Error('TTS service unavailable'));

      const req = new Request('http://localhost/api/voices/aura-luna-en/preview');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(500);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.success).toBe(false);
    });
  });

  describe('GET /api/config', () => {
    it('should return config with voices and defaultVoice', async () => {
      const req = new Request('http://localhost/api/config');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { voices: any[]; defaultVoice: string };
      
      expect(json.voices).toBeDefined();
      expect(json.defaultVoice).toBeDefined();
    });

    it('should have asteria as default voice', async () => {
      const req = new Request('http://localhost/api/config');
      const res = await app.fetch(req, env);
      
      const json = await res.json() as { defaultVoice: string };
      expect(json.defaultVoice).toBe('aura-asteria-en');
    });

    it('should return same voices as /api/voices endpoint', async () => {
      const configReq = new Request('http://localhost/api/config');
      const voicesReq = new Request('http://localhost/api/voices');
      
      const [configRes, voicesRes] = await Promise.all([
        app.fetch(configReq, env),
        app.fetch(voicesReq, env),
      ]);
      
      const configJson = await configRes.json() as { voices: any[] };
      const voicesJson = await voicesRes.json() as { voices: any[] };
      
      expect(configJson.voices).toEqual(voicesJson.voices);
    });
  });

  describe('GET /api/courses', () => {
    it('should return courses array from database', async () => {
      const req = new Request('http://localhost/api/courses');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { courses: any[] };
      expect(Array.isArray(json.courses)).toBe(true);
    });

    it('should support name filter query param', async () => {
      const req = new Request('http://localhost/api/courses?name=CMPT');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { courses: any[] };
      expect(Array.isArray(json.courses)).toBe(true);
    });
  });

  describe('GET /api/courses/:name', () => {
    it('should return course object for given name', async () => {
      const req = new Request('http://localhost/api/courses/CMPT120');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { course: any };
      expect(json).toHaveProperty('course');
    });

    it('should handle various course names', async () => {
      const names = ['MATH151', 'ENGL100', 'BUS237', 'STAT270'];
      
      for (const name of names) {
        const req = new Request(`http://localhost/api/courses/${name}`);
        const res = await app.fetch(req, env);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /api/courses/id/:id', () => {
    it('should return course by id', async () => {
      const req = new Request('http://localhost/api/courses/id/123');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { course: any };
      expect(json).toHaveProperty('course');
    });
  });

  describe('GET /api/courses/update/', () => {
    it('should trigger course update from SFU API', async () => {
      // Mock fetch for SFU API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const req = new Request('http://localhost/api/courses/update/');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; message: string; coursesAdded: number };
      expect(json).toHaveProperty('success');
      expect(json).toHaveProperty('coursesAdded');
    });

    it('should accept term query parameter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const req = new Request('http://localhost/api/courses/update/?term=Spring%202026');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/progress/:userId', () => {
    it('should return empty progress array (placeholder)', async () => {
      const req = new Request('http://localhost/api/progress/user123');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { progress: any[] };
      expect(json.progress).toEqual([]);
    });
  });

  describe('POST /api/admin/ingest', () => {
    it('should return success message (placeholder)', async () => {
      const req = new Request('http://localhost/api/admin/ingest', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; message: string };
      expect(json.success).toBe(true);
      expect(json.message).toBe('Ingestion endpoint ready');
    });
  });

  describe('GET /api/voice/:courseCode (WebSocket)', () => {
    it('should return 426 without WebSocket upgrade header', async () => {
      const req = new Request('http://localhost/api/voice/CMPT120');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(426);
      const text = await res.text();
      expect(text).toBe('Expected WebSocket');
    });

    it('should get Durable Object with correct session key', async () => {
      const req = new Request('http://localhost/api/voice/CMPT120', {
        headers: { Upgrade: 'websocket' },
      });
      
      await app.fetch(req, env);
      
      expect(env.VOICE_SESSION.idFromName).toHaveBeenCalled();
      const callArg = (env.VOICE_SESSION.idFromName as any).mock.calls[0][0];
      expect(callArg).toMatch(/^CMPT120-\d+$/);
    });

    it('should call Durable Object fetch', async () => {
      const req = new Request('http://localhost/api/voice/MATH151', {
        headers: { Upgrade: 'websocket' },
      });
      
      await app.fetch(req, env);
      
      expect(env.VOICE_SESSION.get).toHaveBeenCalled();
      const doInstance = (env.VOICE_SESSION.get as any).mock.results[0].value;
      expect(doInstance.fetch).toHaveBeenCalled();
    });

    it('should support various course codes', async () => {
      const codes = ['CMPT120', 'MATH151', 'ENGL100', 'BUS237'];
      
      for (const code of codes) {
        vi.clearAllMocks();
        const req = new Request(`http://localhost/api/voice/${code}`, {
          headers: { Upgrade: 'websocket' },
        });
        
        await app.fetch(req, env);
        
        const callArg = (env.VOICE_SESSION.idFromName as any).mock.calls[0][0];
        expect(callArg).toContain(code);
      }
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const req = new Request('http://localhost/api/unknown');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent endpoints', async () => {
      const req = new Request('http://localhost/random/path');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(404);
    });
  });

  describe('Method Handling', () => {
    it('should not allow POST on GET endpoints', async () => {
      const req = new Request('http://localhost/api/voices', {
        method: 'POST',
      });
      const res = await app.fetch(req, env);
      
      // Hono returns 404 for wrong method
      expect(res.status).toBe(404);
    });

    it('should not allow GET on POST endpoints', async () => {
      const req = new Request('http://localhost/api/admin/ingest', {
        method: 'GET',
      });
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(404);
    });
  });
});

describe('Voice Data Integrity', () => {
  it('all voices should have required fields', () => {
    Object.values(VOICES).forEach(voice => {
      expect(voice.id).toBeDefined();
      expect(voice.name).toBeDefined();
      expect(voice.gender).toMatch(/^(male|female)$/);
      expect(voice.style).toBeDefined();
      expect(Array.isArray(voice.bestFor)).toBe(true);
    });
  });

  it('should have 11 voices total', () => {
    expect(Object.keys(VOICES).length).toBe(11);
  });

  it('voice IDs should match keys', () => {
    Object.entries(VOICES).forEach(([key, voice]) => {
      expect(voice.id).toBe(key);
    });
  });

  it('all voice IDs should follow deepgram naming', () => {
    Object.values(VOICES).forEach(voice => {
      expect(voice.id).toMatch(/^aura-[a-z]+-en$/);
    });
  });
});

// ============================================
// NEW ENDPOINT TESTS
// ============================================

describe('Course Search and Details Endpoints', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('GET /api/courses/search', () => {
    it('should require query parameter q', async () => {
      const req = new Request('http://localhost/api/courses/search');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.success).toBe(false);
      expect(json.error).toContain('required');
    });

    it('should return search results with valid query', async () => {
      // Mock fetch for SFU API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { dept: 'CMPT', number: '120', title: 'Intro to CS', description: 'Basic programming' },
          { dept: 'CMPT', number: '225', title: 'Data Structures', description: 'Advanced programming' },
        ]),
      });

      // Mock KV cache miss
      env.KV.get = vi.fn().mockResolvedValue(null);

      const req = new Request('http://localhost/api/courses/search?q=CMPT');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { courses: any[] } };
      expect(json.success).toBe(true);
      expect(json.data.courses).toBeDefined();
    });

    it('should use KV cache when available', async () => {
      const cachedCourses = [
        { dept: 'MATH', number: '151', title: 'Calculus I', description: 'Limits and derivatives' },
      ];
      env.KV.get = vi.fn().mockResolvedValue(cachedCourses);

      const req = new Request('http://localhost/api/courses/search?q=MATH');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      expect(env.KV.get).toHaveBeenCalled();
    });
  });

  describe('GET /api/courses/:code/details', () => {
    it('should return 404 for non-existent course', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
      env.KV.get = vi.fn().mockResolvedValue(null);

      const req = new Request('http://localhost/api/courses/FAKE%20999/details');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(404);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.success).toBe(false);
    });

    it('should return course with instructor from SFU API', async () => {
      const mockCourses = [
        {
          dept: 'CMPT',
          number: '120',
          title: 'Introduction to Computing',
          description: 'Learn programming basics',
          units: '3',
          prerequisites: 'None',
          offerings: [{ term: 'Fall 2025', instructors: ['John Smith'] }],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCourses),
      });
      env.KV.get = vi.fn().mockResolvedValue(null);

      const req = new Request('http://localhost/api/courses/CMPT%20120/details');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { course: any; instructor: any } };
      expect(json.success).toBe(true);
      expect(json.data.course.code).toBe('CMPT 120');
      expect(json.data.instructor).toBeDefined();
      expect(json.data.instructor.name).toBe('John Smith');
    });

    it('should cache results in KV', async () => {
      const mockCourses = [
        {
          dept: 'CMPT',
          number: '225',
          title: 'Data Structures',
          description: 'Learn data structures',
          units: '3',
          offerings: [],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCourses),
      });
      env.KV.get = vi.fn().mockResolvedValue(null);
      env.KV.put = vi.fn().mockResolvedValue(undefined);

      const req = new Request('http://localhost/api/courses/CMPT%20225/details');
      await app.fetch(req, env);

      expect(env.KV.put).toHaveBeenCalled();
    });
  });
});

describe('Outline Endpoints', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('GET /api/courses/:code/outline', () => {
    it('should return outline from SFU API', async () => {
      const mockCourses = [
        {
          dept: 'CMPT',
          number: '120',
          title: 'Introduction to Computing',
          description: 'Introduction to programming. Basic concepts. Variables and loops. Functions and recursion.',
          units: '3',
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCourses),
      });
      env.KV.get = vi.fn().mockResolvedValue(null);

      const req = new Request('http://localhost/api/courses/CMPT%20120/outline');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { courseCode: string; outline: any } };
      expect(json.success).toBe(true);
      expect(json.data.courseCode).toBe('CMPT 120');
      expect(json.data.outline).toBeDefined();
      expect(json.data.outline.topics).toBeDefined();
      expect(json.data.outline.learningObjectives).toBeDefined();
      expect(json.data.outline.summary).toBeDefined();
    });

    it('should return 404 for non-existent course', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
      env.KV.get = vi.fn().mockResolvedValue(null);

      const req = new Request('http://localhost/api/courses/FAKE%20999/outline');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(404);
    });

    it('should return edited outline when sessionId provided', async () => {
      const editedOutline = {
        topics: ['Custom Topic 1', 'Custom Topic 2'],
        learningObjectives: ['Custom Objective'],
        courseTopics: ['Custom Course Topic'],
        summary: 'Custom summary',
      };

      env.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ outline_json: JSON.stringify(editedOutline) }),
      });

      const req = new Request('http://localhost/api/courses/CMPT%20120/outline?sessionId=test-session-123');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { outline: any; modified: boolean } };
      expect(json.success).toBe(true);
      expect(json.data.modified).toBe(true);
      expect(json.data.outline.topics).toEqual(['Custom Topic 1', 'Custom Topic 2']);
    });
  });

  describe('PUT /api/courses/:code/outline', () => {
    it('should require sessionId', async () => {
      const req = new Request('http://localhost/api/courses/CMPT%20120/outline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline: {
            topics: ['Topic 1'],
            learningObjectives: ['Objective 1'],
            courseTopics: ['Course Topic 1'],
            summary: 'Summary',
          },
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.success).toBe(false);
      expect(json.error).toContain('sessionId');
    });

    it('should require outline', async () => {
      const req = new Request('http://localhost/api/courses/CMPT%20120/outline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session-123',
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.success).toBe(false);
      expect(json.error).toContain('outline');
    });

    it('should store edited outline successfully', async () => {
      env.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
      });

      const req = new Request('http://localhost/api/courses/CMPT%20120/outline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session-123',
          outline: {
            topics: ['Topic 1', 'Topic 2'],
            learningObjectives: ['Learn X', 'Learn Y'],
            courseTopics: ['Course Topic'],
            summary: 'Course summary here',
          },
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; message: string; data: any };
      expect(json.success).toBe(true);
      expect(json.message).toContain('updated');
      expect(json.data.sessionId).toBe('test-session-123');
    });
  });
});

describe('Session Endpoints', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();

    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-12345',
    });
  });

  describe('POST /api/sessions', () => {
    it('should require courseCode', async () => {
      const req = new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructor: { sfuId: 'john-smith', name: 'John Smith' },
          voiceConfig: { voiceId: 'aura-asteria-en' },
          personalityConfig: { traits: [], systemPrompt: 'You are a tutor' },
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.error).toContain('courseCode');
    });

    it('should require instructor with sfuId and name', async () => {
      const req = new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: 'CMPT 120',
          instructor: { name: 'John Smith' }, // missing sfuId
          voiceConfig: { voiceId: 'aura-asteria-en' },
          personalityConfig: { traits: [], systemPrompt: 'You are a tutor' },
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.error).toContain('instructor');
    });

    it('should require voiceConfig with voiceId', async () => {
      const req = new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: 'CMPT 120',
          instructor: { sfuId: 'john-smith', name: 'John Smith' },
          voiceConfig: {}, // missing voiceId
          personalityConfig: { traits: [], systemPrompt: 'You are a tutor' },
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.error).toContain('voiceConfig');
    });

    it('should require personalityConfig with systemPrompt', async () => {
      const req = new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: 'CMPT 120',
          instructor: { sfuId: 'john-smith', name: 'John Smith' },
          voiceConfig: { voiceId: 'aura-asteria-en' },
          personalityConfig: { traits: [] }, // missing systemPrompt
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.error).toContain('personalityConfig');
    });

    it('should create session successfully with all required fields', async () => {
      // Mock SFU API for outline
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          {
            dept: 'CMPT',
            number: '120',
            title: 'Intro to CS',
            description: 'Basic programming concepts',
            units: '3',
          },
        ]),
      });

      // Mock KV
      env.KV.get = vi.fn().mockResolvedValue(null);
      env.KV.put = vi.fn().mockResolvedValue(undefined);

      // Mock DB operations
      env.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
      });

      // Mock AI for embeddings
      env.AI.run = vi.fn().mockResolvedValue({
        shape: [1, 768],
        data: [[...Array(768).fill(0.1)]],
      });

      // Mock Vectorize
      env.VECTORIZE.insert = vi.fn().mockResolvedValue({ count: 1 });

      const req = new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: 'CMPT 120',
          instructor: { sfuId: 'john-smith', name: 'John Smith', rating: 4.5 },
          voiceConfig: { voiceId: 'aura-asteria-en', speed: 1.0 },
          personalityConfig: {
            traits: ['Clear', 'Patient', 'Engaging'],
            systemPrompt: 'You are a helpful tutor.',
          },
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { sessionId: string; ragChunkCount: number; personalityPrompt: string } };
      expect(json.success).toBe(true);
      expect(json.data.sessionId).toBeDefined();
      expect(json.data.ragChunkCount).toBeGreaterThan(0);
      expect(json.data.personalityPrompt).toBeDefined();
      expect(json.data.personalityPrompt).toContain('CMPT 120');
    });

    it('should use provided outline instead of fetching', async () => {
      // Mock DB operations
      env.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
      });

      // Mock AI for embeddings
      env.AI.run = vi.fn().mockResolvedValue({
        shape: [4, 768],
        data: Array(4).fill([...Array(768).fill(0.1)]),
      });

      // Mock Vectorize
      env.VECTORIZE.insert = vi.fn().mockResolvedValue({ count: 4 });

      const customOutline = {
        topics: ['Custom Topic 1', 'Custom Topic 2'],
        learningObjectives: ['Custom Objective'],
        courseTopics: ['Custom Course Topic'],
        summary: 'Custom summary for testing',
      };

      const req = new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: 'CMPT 120',
          instructor: { sfuId: 'john-smith', name: 'John Smith' },
          voiceConfig: { voiceId: 'aura-asteria-en' },
          personalityConfig: { traits: [], systemPrompt: 'You are a tutor' },
          outline: customOutline,
        }),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      // Verify DB was called to store edited outline
      expect(env.DB.prepare).toHaveBeenCalled();
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return 404 for non-existent session', async () => {
      env.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      });

      const req = new Request('http://localhost/api/sessions/non-existent-id');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(404);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.success).toBe(false);
    });

    it('should return session data', async () => {
      const mockSession = {
        id: 'test-session-123',
        course_code: 'CMPT 120',
        instructor_id: 'instructor-1',
        voice_config: JSON.stringify({ voiceId: 'aura-asteria-en' }),
        personality_config: JSON.stringify({ traits: ['Clear'], systemPrompt: 'You are a tutor' }),
        outline_version: null,
        vectorize_ref: 'session:test-session-123',
        rag_chunk_count: 5,
        personality_prompt: 'You are a CMPT 120 tutor',
        created_at: '2025-01-31T00:00:00Z',
      };

      env.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockSession),
      });

      const req = new Request('http://localhost/api/sessions/test-session-123');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: any };
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('test-session-123');
      expect(json.data.courseCode).toBe('CMPT 120');
      expect(json.data.voiceConfig.voiceId).toBe('aura-asteria-en');
    });
  });

  describe('GET /api/sessions/:id/rag', () => {
    it('should require query parameter q', async () => {
      const req = new Request('http://localhost/api/sessions/test-session-123/rag');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const json = await res.json() as { success: boolean; error: string };
      expect(json.error).toContain('required');
    });

    it('should return RAG chunks for query', async () => {
      // Mock AI for query embedding
      env.AI.run = vi.fn().mockResolvedValue({
        shape: [1, 768],
        data: [[...Array(768).fill(0.1)]],
      });

      // Mock Vectorize query
      env.VECTORIZE.query = vi.fn().mockResolvedValue({
        matches: [
          { id: 'chunk-1', score: 0.95, metadata: { text: 'This is chunk 1 about programming' } },
          { id: 'chunk-2', score: 0.90, metadata: { text: 'This is chunk 2 about variables' } },
        ],
      });

      const req = new Request('http://localhost/api/sessions/test-session-123/rag?q=programming%20basics');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { chunks: string[]; chunkCount: number } };
      expect(json.success).toBe(true);
      expect(json.data.chunks.length).toBe(2);
      expect(json.data.chunkCount).toBe(2);
    });

    it('should support topK parameter', async () => {
      env.AI.run = vi.fn().mockResolvedValue({
        shape: [1, 768],
        data: [[...Array(768).fill(0.1)]],
      });

      env.VECTORIZE.query = vi.fn().mockResolvedValue({
        matches: [
          { id: 'chunk-1', score: 0.95, metadata: { text: 'Chunk 1' } },
        ],
      });

      const req = new Request('http://localhost/api/sessions/test-session-123/rag?q=test&topK=10');
      await app.fetch(req, env);

      expect(env.VECTORIZE.query).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ topK: 10 })
      );
    });
  });
});
