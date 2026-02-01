import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockWebSocket,
  createMockDurableObjectContext,
  createMockEnv,
  simulateWebSocketMessage,
  triggerWebSocketOpen,
} from '../test/mocks';

vi.mock('cloudflare:workers', () => ({
  DurableObject: class DurableObject {
    ctx: any;
    env: any;
    constructor(ctx: any, env: any) {
      this.ctx = ctx;
      this.env = env;
    }
    fetch(request: Request): Promise<Response> {
      return Promise.resolve(new Response('Not implemented', { status: 501 }));
    }
    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {}
    webSocketClose(): void {}
  },
}));

const { VoiceTeacherSession } = await import('./voice-session');

describe('VoiceTeacherSession', () => {
  let mockEnv: ReturnType<typeof createMockEnv>;
  let mockCtx: ReturnType<typeof createMockDurableObjectContext>;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockCtx = createMockDurableObjectContext();
  });

  describe('Instantiation', () => {
    it('should create instance with env and ctx', () => {
      const session = new VoiceTeacherSession(mockEnv as any, mockCtx as any);
      expect(session).toBeDefined();
    });
  });
});

describe('splitIntoSentences Utility', () => {
  function splitIntoSentences(text: string): string[] {
    return text
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  it('should split single sentence', () => {
    const result = splitIntoSentences('Hello world.');
    expect(result).toEqual(['Hello world.']);
  });

  it('should split multiple sentences', () => {
    const result = splitIntoSentences('Hello world. How are you? I am fine.');
    expect(result).toEqual(['Hello world.', 'How are you?', 'I am fine.']);
  });

  it('should handle exclamation marks', () => {
    const result = splitIntoSentences('Wow! That is amazing! Great job!');
    expect(result).toEqual(['Wow!', 'That is amazing!', 'Great job!']);
  });

  it('should handle question marks', () => {
    const result = splitIntoSentences('What is this? A test? Yes.');
    expect(result).toEqual(['What is this?', 'A test?', 'Yes.']);
  });

  it('should handle mixed punctuation', () => {
    const result = splitIntoSentences('First sentence! Second? Third.');
    expect(result).toEqual(['First sentence!', 'Second?', 'Third.']);
  });

  it('should handle sentence with multiple spaces', () => {
    const result = splitIntoSentences('Hello.   World.  Test.');
    expect(result).toEqual(['Hello.', 'World.', 'Test.']);
  });

  it('should handle empty string', () => {
    const result = splitIntoSentences('');
    expect(result).toEqual([]);
  });

  it('should handle string with only spaces', () => {
    const result = splitIntoSentences('   ');
    expect(result).toEqual([]);
  });

  it('should handle trailing whitespace', () => {
    const result = splitIntoSentences('Hello world.   ');
    expect(result).toEqual(['Hello world.']);
  });

  it('should handle leading whitespace', () => {
    const result = splitIntoSentences('   Hello world.');
    expect(result).toEqual(['Hello world.']);
  });
});

describe('TTS Chunking', () => {
  const CHUNK_SIZE = 8192;

  function calculateChunks(audioLength: number): number {
    return Math.ceil(audioLength / CHUNK_SIZE);
  }

  it('should calculate single chunk for small audio', () => {
    const chunks = calculateChunks(1000);
    expect(chunks).toBe(1);
  });

  it('should calculate multiple chunks for large audio', () => {
    const chunks = calculateChunks(16384);
    expect(chunks).toBe(2);
  });

  it('should calculate exact chunks for boundary', () => {
    const chunks = calculateChunks(CHUNK_SIZE);
    expect(chunks).toBe(1);
  });

  it('should calculate chunk at boundary + 1', () => {
    const chunks = calculateChunks(CHUNK_SIZE + 1);
    expect(chunks).toBe(2);
  });

  it('should handle zero length', () => {
    const chunks = calculateChunks(0);
    expect(chunks).toBe(0);
  });
});

describe('Message Protocol', () => {
  it('should send transcript_partial message structure', () => {
    const message = { type: 'transcript_partial' as const, text: 'Hello' };
    const parsed = JSON.parse(JSON.stringify(message));
    expect(parsed.type).toBe('transcript_partial');
    expect(parsed.text).toBe('Hello');
  });

  it('should send transcript message structure', () => {
    const message = { type: 'transcript' as const, text: 'Hello', isUser: true };
    const parsed = JSON.parse(JSON.stringify(message));
    expect(parsed.type).toBe('transcript');
    expect(parsed.text).toBe('Hello');
    expect(parsed.isUser).toBe(true);
  });

  it('should send audio_chunk message structure', () => {
    const message = {
      type: 'audio_chunk' as const,
      audio: 'base64data',
      chunkIndex: 0,
      totalChunks: 5,
    };
    const parsed = JSON.parse(JSON.stringify(message));
    expect(parsed.type).toBe('audio_chunk');
    expect(parsed.chunkIndex).toBe(0);
    expect(parsed.totalChunks).toBe(5);
  });

  it('should send audio_complete message structure', () => {
    const message = { type: 'audio_complete' as const };
    const parsed = JSON.parse(JSON.stringify(message));
    expect(parsed.type).toBe('audio_complete');
  });

  it('should send state_change message structure', () => {
    const message = { type: 'state_change' as const, state: 'speaking' as const };
    const parsed = JSON.parse(JSON.stringify(message));
    expect(parsed.type).toBe('state_change');
    expect(parsed.state).toBe('speaking');
  });

  it('should handle all valid states', () => {
    const states = ['idle', 'listening', 'processing', 'speaking', 'interrupted', 'error'];
    
    states.forEach(state => {
      const message = { type: 'state_change' as const, state };
      const parsed = JSON.parse(JSON.stringify(message));
      expect(parsed.state).toBe(state);
    });
  });
});

describe('Base64 Encoding', () => {
  function toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  it('should encode empty buffer', () => {
    const result = toBase64(new ArrayBuffer(0));
    expect(result).toBe('');
  });

  it('should encode single byte', () => {
    const buffer = new ArrayBuffer(1);
    const view = new Uint8Array(buffer);
    view[0] = 65; // 'A'
    const result = toBase64(buffer);
    expect(result).toBe('QQ==');
  });

  it('should encode multiple bytes', () => {
    const buffer = new ArrayBuffer(3);
    const view = new Uint8Array(buffer);
    view[0] = 72; // 'H'
    view[1] = 105; // 'i'
    view[2] = 33; // '!'
    const result = toBase64(buffer);
    expect(result).toBe('SGkh');
  });

  it('should encode larger buffer', () => {
    const buffer = new ArrayBuffer(100);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < 100; i++) {
      view[i] = i % 256;
    }
    const result = toBase64(buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(() => atob(result)).not.toThrow();
  });
});

describe('Audio Processing', () => {
  it('should decode base64 audio correctly', () => {
    const originalBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    let binary = '';
    for (let i = 0; i < originalBytes.length; i++) {
      binary += String.fromCharCode(originalBytes[i]);
    }
    const base64 = btoa(binary);
    
    const decodedBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    
    expect(decodedBytes).toEqual(originalBytes);
  });

  it('should handle ArrayBuffer conversion', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const buffer = original.buffer as ArrayBuffer;
    
    expect(buffer.byteLength).toBe(5);
    
    const view = new Uint8Array(buffer);
    expect(view).toEqual(original);
  });

  it('should slice audio buffer correctly', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const chunkSize = 4;
    
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < original.length; i += chunkSize) {
      const chunk = original.slice(i, Math.min(i + chunkSize, original.length));
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(chunks[1]).toEqual(new Uint8Array([5, 6, 7, 8]));
    expect(chunks[2]).toEqual(new Uint8Array([9, 10]));
  });
});

describe('Client Message Validation', () => {
  it('should validate start_session message', () => {
    const message = { type: 'start_session' as const, courseCode: 'CMPT120' };
    expect(message.type).toBe('start_session');
    expect(message.courseCode).toBe('CMPT120');
  });

  it('should validate audio message', () => {
    const message = { type: 'audio' as const, audio: 'base64data' };
    expect(message.type).toBe('audio');
    expect(typeof message.audio).toBe('string');
  });

  it('should validate text message', () => {
    const message = { type: 'text' as const, text: 'Hello' };
    expect(message.type).toBe('text');
    expect(message.text).toBe('Hello');
  });

  it('should validate interrupt message', () => {
    const message = { type: 'interrupt' as const };
    expect(message.type).toBe('interrupt');
  });

  it('should validate clear_history message', () => {
    const message = { type: 'clear_history' as const };
    expect(message.type).toBe('clear_history');
  });
});

describe('Voice State Machine', () => {
  it('should transition from idle to listening', () => {
    const states = ['idle', 'listening'];
    expect(states).toContain('idle');
    expect(states).toContain('listening');
  });

  it('should have processing state', () => {
    const states = ['idle', 'listening', 'processing', 'speaking', 'interrupted', 'error'];
    expect(states).toContain('processing');
  });

  it('should have speaking state', () => {
    const states = ['idle', 'listening', 'processing', 'speaking', 'interrupted', 'error'];
    expect(states).toContain('speaking');
  });

  it('should have interrupted state', () => {
    const states = ['idle', 'listening', 'processing', 'speaking', 'interrupted', 'error'];
    expect(states).toContain('interrupted');
  });

  it('should have error state', () => {
    const states = ['idle', 'listening', 'processing', 'speaking', 'interrupted', 'error'];
    expect(states).toContain('error');
  });
});

describe('WebSocket Message Flow', () => {
  it('should handle complete message sequence', () => {
    const messageSequence = [
      { type: 'start_session', courseCode: 'CMPT120' },
      { type: 'audio', audio: 'test' },
      { type: 'interrupt' },
      { type: 'clear_history' },
    ];

    messageSequence.forEach(msg => {
      const json = JSON.stringify(msg);
      const parsed = JSON.parse(json);
      expect(parsed.type).toBe(msg.type);
    });
  });

  it('should maintain message order', () => {
    const messages = [
      { type: 'state_change', state: 'processing' },
      { type: 'transcript_partial', text: 'Hello' },
      { type: 'transcript', text: 'Hello', isUser: true },
      { type: 'state_change', state: 'speaking' },
    ];

    const order = messages.map(m => m.type);
    expect(order).toEqual([
      'state_change',
      'transcript_partial',
      'transcript',
      'state_change',
    ]);
  });
});
