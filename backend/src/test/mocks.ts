import { vi } from 'vitest';

export interface MockWebSocketOptions {
  readyState?: number;
  sendMessages?: string[];
  closeOnSend?: boolean;
}

export function createMockWebSocket(options: MockWebSocketOptions = {}) {
  const {
    readyState = WebSocket.OPEN,
    sendMessages = [],
    closeOnSend = false,
  } = options;

  const sentMessages: string[] = [];
  let onmessage: ((event: { data: string }) => void) | null = null;
  let onopen: (() => void) | null = null;
  let onclose: (() => void) | null = null;
  let onerror: (() => void) | null = null;

  const ws = {
    readyState,
    sentMessages,
    
    send: vi.fn((data: string) => {
      if (closeOnSend) {
        ws.readyState = WebSocket.CLOSED;
        return;
      }
      sentMessages.push(data);
    }),
    
    close: vi.fn(() => {
      ws.readyState = WebSocket.CLOSED;
      onclose?.();
    }),
    
    get onmessage() { return onmessage; },
    set onmessage(cb: ((event: { data: string }) => void) | null) { onmessage = cb; },
    
    get onopen() { return onopen; },
    set onopen(cb: (() => void) | null) { onopen = cb; },
    
    get onclose() { return onclose; },
    set onclose(cb: (() => void) | null) { onclose = cb; },
    
    get onerror() { return onerror; },
    set onerror(cb: (() => void) | null) { onerror = cb; },
  };

  return ws;
}

export function createMockDurableObjectContext() {
  const id = { toString: () => 'test-session-id' };
  const acceptWebSocket = vi.fn();
  
  return {
    id,
    acceptWebSocket,
    getWebSockets: vi.fn().mockReturnValue([]),
  };
}

export interface MockAIResult {
  text?: string;
  response?: string;
  audio?: Uint8Array;
}

export function createMockAI() {
  return {
    run: vi.fn(),
  };
}

export function createMockEnv(aiResults: Map<string, MockAIResult> = new Map()) {
  const ai = createMockAI();
  
  ai.run.mockImplementation(async (model: string, input: Record<string, unknown>) => {
    const key = `${model}:${JSON.stringify(input)}`;
    return aiResults.get(key) || aiResults.get(model) || {};
  });
  
  return {
    AI: ai,
    DB: createMockD1Database(),
    KV: createMockKVNamespace(),
    VECTORIZE: createMockVectorizeIndex(),
    VOICE_SESSION: createMockDurableObjectNamespace(),
  };
}

function createMockD1Database() {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
    }),
    exec: vi.fn().mockResolvedValue({ success: true }),
    batch: vi.fn().mockResolvedValue([]),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  };
}

function createMockKVNamespace() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [] }),
    getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
  };
}

function createMockVectorizeIndex() {
  return {
    query: vi.fn().mockResolvedValue({ matches: [], count: 0 }),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDurableObjectNamespace() {
  const mockDOInstance = {
    ctx: createMockDurableObjectContext(),
    env: {},
    fetch: vi.fn().mockImplementation((request: Request) => {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return Promise.resolve(new Response('WebSocket required', { status: 426 }));
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      server.accept();
      server.send(JSON.stringify({ type: 'ready', sessionId: 'test-session-id' }));
      return Promise.resolve(new Response(null, { status: 101, webSocket: client }));
    }),
    webSocketMessage: vi.fn(),
    webSocketClose: vi.fn(),
  };

  return {
    idFromName: vi.fn().mockReturnValue({ toString: () => 'test-id' }),
    idFromString: vi.fn().mockReturnValue({ toString: () => 'test-id' }),
    get: vi.fn().mockReturnValue(mockDOInstance),
  };
}

export function simulateWebSocketMessage(ws: ReturnType<typeof createMockWebSocket>, message: string) {
  if (ws.onmessage) {
    ws.onmessage({ data: message });
  }
}

export function triggerWebSocketOpen(ws: ReturnType<typeof createMockWebSocket>) {
  if (ws.onopen) {
    ws.onopen();
  }
}

export function triggerWebSocketClose(ws: ReturnType<typeof createMockWebSocket>) {
  if (ws.onclose) {
    ws.onclose();
  }
}
