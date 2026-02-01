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

    it('GET /health should return healthy status', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: 'healthy' });
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
