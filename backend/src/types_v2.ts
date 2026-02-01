/**
 * SFU AI Teacher - Types v2 (Streaming Optimized + Multi-Voice)
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

// Client -> Server messages (v2)
export type ClientMessageV2 =
  | { type: 'start_session'; courseCode: string; userId?: string; voice?: string; ragContext?: string; customInstructions?: string }
  | { type: 'audio'; audio: string | ArrayBuffer; sequence?: number }
  | { type: 'text'; text: string }
  | { type: 'interrupt' }
  | { type: 'clear_history' }
  | { type: 'set_voice'; voice: string };

// Server -> Client messages (v2) - supports streaming + voice
export type ServerMessageV2 =
  | { type: 'ready'; sessionId: string; voices?: string[] }
  | { type: 'session_started'; sessionId: string; voice?: string }
  | { type: 'state_change'; state: VoiceState }
  | { type: 'transcript_partial'; text: string }
  | { type: 'transcript'; text: string; isUser: boolean }
  | { type: 'audio_chunk'; audio: string; chunkIndex: number; totalChunks: number }
  | { type: 'audio_complete' }
  | { type: 'interrupted' }
  | { type: 'cleared' }
  | { type: 'interrupt_detected' }
  | { type: 'voice_changed'; voice: string }
  | { type: 'error'; message: string };

// LLM Response
export interface LLMResponse {
  response?: string;
}
