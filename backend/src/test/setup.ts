import { vi, beforeEach, afterEach } from 'vitest';

globalThis.WebSocketPair = class WebSocketPair {
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
    constructor(ctx, env) {
      this.ctx = ctx;
      this.env = env;
    }
    fetch(request) {
      return Promise.resolve(new Response('Not implemented', { status: 501 }));
    }
    webSocketMessage(ws, message) {}
    webSocketClose() {}
  },
}));

declare global {
  namespace NodeJS {
    interface Global {
      WebSocket: typeof WebSocket;
      WebSocketPair: new () => { [key: number]: WebSocket };
    }
  }
}
