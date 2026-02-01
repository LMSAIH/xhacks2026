import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTeacherInfo } from './teachers';
import type { Env } from '../types';

describe('Teachers Service', () => {
  let mockEnv: Partial<Env>;

  beforeEach(() => {
    mockEnv = {
      OPENAI_API_KEY: 'test-api-key',
      AI: {
        run: vi.fn(),
      } as any,
      DB: {
        prepare: vi.fn(),
      } as any,
      KV: {
        get: vi.fn(),
        put: vi.fn(),
      } as any,
    };
  });

  it('should return error if character name is empty', async () => {
    const result = await getTeacherInfo(mockEnv as Env, '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Character name is required');
  });

  it('should return error if character name is whitespace', async () => {
    const result = await getTeacherInfo(mockEnv as Env, '   ');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Character name is required');
  });

  it('should fetch teacher info for valid character', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: 'Albert Einstein',
                livedFrom: '1879',
                livedTo: '1955',
                description: 'Theoretical physicist known for theory of relativity',
                context: 'Einstein explains concepts with thought experiments and intuition',
              }),
            },
          },
        ],
      }),
      text: vi.fn().mockResolvedValue('error'),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await getTeacherInfo(mockEnv as Env, 'Albert Einstein');
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe('Albert Einstein');
  });

  it('should handle AI errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      text: vi.fn().mockResolvedValue('OpenAI API error'),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await getTeacherInfo(mockEnv as Env, 'Albert Einstein');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
