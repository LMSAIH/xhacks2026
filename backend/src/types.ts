// Cloudflare Workers AI Types
export interface Env {
  AI: Ai;
}

export interface Ai {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Messages from client to server
export type ClientMessage =
  | { type: 'audio'; audio: string } // base64 encoded audio
  | { type: 'transcription_complete' }
  | { type: 'text'; text: string }
  | { type: 'clear' };

// Messages from server to client
export type ServerMessage =
  | { type: 'ready' }
  | { type: 'thinking' }
  | { type: 'speaking' }
  | { type: 'transcript'; text: string; isPartial: boolean; isUser: boolean }
  | { type: 'audio'; audio: string; format: string; sampleRate: number }
  | { type: 'audio_complete' }
  | { type: 'cleared' }
  | { type: 'error'; message: string };

// Nova-3 STT Response
export interface Nova3Response {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }>;
    }>;
  };
}

// LLM Response
export interface LLMResponse {
  response?: string;
}
