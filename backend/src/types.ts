/**
 * SFU AI Teacher - Types
 */

// Cloudflare Bindings
export interface Env {
  AI: Ai;
  DB: D1Database;
  KV: KVNamespace;
  VECTORIZE: VectorizeIndex;
  VOICE_SESSION: DurableObjectNamespace;
}

// Voice states
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted' | 'error';

// Client -> Server messages
export type ClientMessage =
  | { type: 'start_session'; courseCode: string; userId?: string }
  | { type: 'audio'; audio: string }
  | { type: 'text'; text: string }
  | { type: 'interrupt' }
  | { type: 'clear_history' };

// Server -> Client messages  
export type ServerMessage =
  | { type: 'ready'; sessionId: string }
  | { type: 'session_started'; sessionId: string }
  | { type: 'state_change'; state: VoiceState }
  | { type: 'transcript'; text: string; isPartial: boolean; isUser: boolean }
  | { type: 'audio'; audio: string; format: string; sampleRate: number }
  | { type: 'interrupted' }
  | { type: 'cleared' }
  | { type: 'error'; message: string };

// LLM Response
export interface LLMResponse {
  response?: string;
}
