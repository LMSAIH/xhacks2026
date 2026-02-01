import { vi, beforeEach, afterEach } from 'vitest';

// Set up WebSocketPair mock on globalThis
(globalThis as Record<string, unknown>).WebSocketPair = class WebSocketPair {
  0: WebSocket = {} as WebSocket;
  1: WebSocket = {} as WebSocket;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock('cloudflare:workers', () => ({
  DurableObject: class DurableObject {
    ctx: unknown;
    env: unknown;
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx;
      this.env = env;
    }
    fetch(_request: Request) {
      return Promise.resolve(new Response('Not implemented', { status: 501 }));
    }
    webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer) {}
    webSocketClose() {}
  },
}));
