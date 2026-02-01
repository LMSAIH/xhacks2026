/**
 * SFU AI Teacher - Types (Streaming Optimized + Multi-Voice)
 */

// Cloudflare Bindings
export interface Env {
  AI: Ai;
  DB: D1Database;
  KV: KVNamespace;
  VECTORIZE: VectorizeIndex;
  VOICE_SESSION: DurableObjectNamespace;
  OPENAI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  MCP_SERVER_ID?: string;
  SFU_API_BASE_URL?: string;
}

// Voice states
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted' | 'error';

// Client -> Server messages
export type ClientMessage =
  | { type: 'start_session'; courseCode: string; userId?: string; voice?: string; ragContext?: string; customInstructions?: string }
  | { type: 'audio'; audio: string | ArrayBuffer; sequence?: number }
  | { type: 'text'; text: string }
  | { type: 'interrupt' }
  | { type: 'clear_history' }
  | { type: 'set_voice'; voice: string };

// Server -> Client messages (streaming + voice support)
export type ServerMessage =
  | { type: 'ready'; sessionId: string; voices?: string[] }
  | { type: 'session_started'; sessionId: string; voice?: string }
  | { type: 'state_change'; state: VoiceState }
  | { type: 'transcript_partial'; text: string }
  | { type: 'transcript'; text: string; isUser: boolean }
  | { type: 'audio'; audio: string; format: string; sampleRate: number }
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

// ============================================
// Course & Outline Types
// ============================================

export interface SFUCourse {
  dept: string;
  number: string;
  title: string;
  description: string;
  units: string;
  designation?: string;
  degreeLevel?: string;
  deliveryMethod?: string;
  prerequisites?: string;
  corequisites?: string;
  notes?: string;
  offerings?: Array<{
    term: string;
    instructors?: string[];
  }>;
}

export interface Instructor {
  id?: string;
  sfuId: string;
  name: string;
  department?: string;
  rating?: number;
  reviewCount?: number;
  wouldTakeAgain?: number;
  difficulty?: number;
  rawData?: string;
}

export interface CourseOutline {
  topics: string[];
  learningObjectives: string[];
  courseTopics: string[];
  summary: string;
}

export interface CourseWithInstructor {
  course: {
    code: string;
    title: string;
    description: string;
    prerequisites?: string;
    units?: string;
  };
  instructor: Instructor | null;
}

// ============================================
// Session Types
// ============================================

export interface VoiceConfig {
  voiceId: string;
  speed?: number;
  settings?: Record<string, unknown>;
}

export interface PersonalityConfig {
  traits: string[];
  systemPrompt: string;
}

export interface SessionCreate {
  courseCode: string;
  instructor: {
    sfuId: string;
    name: string;
    rating?: number;
  };
  voiceConfig: VoiceConfig;
  personalityConfig: PersonalityConfig;
  outline?: CourseOutline;
}

export interface Session {
  id: string;
  courseCode: string;
  instructorId?: string;
  voiceConfig: VoiceConfig;
  personalityConfig: PersonalityConfig;
  outlineVersion?: string;
  vectorizeRef?: string;
  ragChunkCount: number;
  personalityPrompt: string;
  createdAt: string;
}

export interface SessionResponse {
  sessionId: string;
  ragChunkCount: number;
  personalityPrompt: string;
}

// ============================================
// RAG Types
// ============================================

export interface TextChunk {
  text: string;
  metadata: {
    source: string;
    topic?: string;
    chunkIndex: number;
  };
}

export interface RagContext {
  chunks: TextChunk[];
  chunkCount: number;
  vectorizeRef: string;
}

// ============================================
// KV Cache Keys
// ============================================

export const KV_KEYS = {
  course: (code: string) => `course:${code}`,
  outline: (code: string) => `outline:${code}`,
  outlineEdited: (sessionId: string) => `outline:edited:${sessionId}`,
  instructor: (sfuId: string) => `instructor:${sfuId}`,
} as const;

export const KV_TTL = {
  COURSE: 60 * 60 * 24, // 24 hours
  OUTLINE: 60 * 60 * 24, // 24 hours
  INSTRUCTOR: 60 * 60 * 24, // 24 hours
} as const;
