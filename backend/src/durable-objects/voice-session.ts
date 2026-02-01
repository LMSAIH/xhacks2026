import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';
import type { ServerMessage, ClientMessage } from '../types';
import { 
  type DeepgramVoice, 
  getVoiceModelId, 
  getDefaultVoiceForCourse,
  buildSystemPrompt,
  VOICES
} from '../voices';

// Latency-optimized constants
const CHUNK_SIZE = 4096; // Smaller chunks = faster first byte
const MAX_HISTORY = 6; // Fewer messages = faster LLM
const MAX_TOKENS = 100; // Shorter responses = faster TTS

interface SessionConfig {
  courseCode: string;
  voice: DeepgramVoice;
  userId?: string;
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class VoiceTeacherSession extends DurableObject<Env> {
  private config: SessionConfig | null = null;
  private history: ConversationMessage[] = [];
  private isProcessing = false;
  private abortController: AbortController | null = null;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    
    // Send ready with available voices
    this.send(server, { 
      type: 'ready', 
      sessionId: this.ctx.id.toString(),
      voices: Object.keys(VOICES),
    });
    
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as ClientMessage & {
        voice?: DeepgramVoice;
        ragContext?: string;
        customInstructions?: string;
      };

      switch (data.type) {
        case 'start_session':
          await this.startSession(ws, data);
          break;
        case 'clear_history':
          this.clearHistory(ws);
          break;
        case 'interrupt':
          this.interrupt(ws);
          break;
        case 'audio':
          if (!this.isProcessing && this.config) {
            await this.handleAudio(ws, data.audio as string);
          }
          break;
        case 'text':
          if (!this.isProcessing && this.config && data.text) {
            await this.handleText(ws, data.text);
          }
          break;
        case 'set_voice':
          this.setVoice(ws, data.voice);
          break;
      }
    } catch (e) {
      console.error('WebSocket error:', e);
      this.isProcessing = false;
      this.send(ws, { type: 'error', message: String(e) });
    }
  }

  private async startSession(ws: WebSocket, data: {
    courseCode?: string;
    voice?: DeepgramVoice;
    ragContext?: string;
    customInstructions?: string;
    userId?: string;
  }) {
    const courseCode = data.courseCode || 'GENERAL';
    const voice = data.voice || getDefaultVoiceForCourse(courseCode);
    
    this.config = {
      courseCode,
      voice,
      userId: data.userId,
    };

    // Build system prompt (persona injection handled elsewhere)
    const systemPrompt = buildSystemPrompt({
      courseCode,
      ragContext: data.ragContext,
      customInstructions: data.customInstructions,
    });

    this.history = [{ role: 'system', content: systemPrompt }];

    this.send(ws, { 
      type: 'session_started', 
      sessionId: this.ctx.id.toString(),
      voice: voice,
    });
  }

  private setVoice(ws: WebSocket, voice?: DeepgramVoice) {
    if (!this.config || !voice || !VOICES[voice]) return;
    this.config.voice = voice;
    this.send(ws, { type: 'voice_changed', voice });
  }

  private clearHistory(ws: WebSocket) {
    this.history = this.history.slice(0, 1); // Keep system prompt
    this.send(ws, { type: 'cleared' });
  }

  private interrupt(ws: WebSocket) {
    this.isProcessing = false;
    this.abortController?.abort();
    this.abortController = null;
    this.send(ws, { type: 'interrupted' });
    this.send(ws, { type: 'state_change', state: 'idle' });
  }

  private async handleAudio(ws: WebSocket, audioBase64: string) {
    if (!this.config) return;
    
    this.isProcessing = true;
    this.abortController = new AbortController();
    this.send(ws, { type: 'state_change', state: 'processing' });

    try {
      // === PHASE 1: STT with immediate feedback ===
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      
      // Immediate partial feedback (perceived latency reduction)
      this.send(ws, { type: 'transcript_partial', text: '...' });
      
      // @ts-expect-error - model exists in Workers AI
      const sttResult = await this.env.AI.run('@cf/deepgram/whisper-large-v3-turbo', {
        audio: Array.from(audioBytes),
      }) as { text?: string };
      
      const transcript = sttResult.text?.trim();
      if (!transcript || !this.isProcessing) {
        this.isProcessing = false;
        this.send(ws, { type: 'state_change', state: 'idle' });
        return;
      }

      // Send final user transcript
      this.send(ws, { type: 'transcript', text: transcript, isUser: true });
      this.history.push({ role: 'user', content: transcript });

      // === PHASE 2: LLM + Streaming TTS ===
      await this.generateAndStreamResponse(ws);

    } catch (e) {
      if (!String(e).includes('abort')) {
        console.error('Audio handling error:', e);
        this.send(ws, { type: 'error', message: String(e) });
      }
    } finally {
      this.isProcessing = false;
      this.abortController = null;
      this.send(ws, { type: 'state_change', state: 'idle' });
    }
  }

  private async handleText(ws: WebSocket, text: string) {
    if (!this.config) return;
    
    this.isProcessing = true;
    this.abortController = new AbortController();
    this.send(ws, { type: 'state_change', state: 'processing' });
    this.send(ws, { type: 'transcript', text, isUser: true });
    this.history.push({ role: 'user', content: text });

    try {
      await this.generateAndStreamResponse(ws);
    } catch (e) {
      if (!String(e).includes('abort')) {
        console.error('Text handling error:', e);
        this.send(ws, { type: 'error', message: String(e) });
      }
    } finally {
      this.isProcessing = false;
      this.abortController = null;
      this.send(ws, { type: 'state_change', state: 'idle' });
    }
  }

  private async generateAndStreamResponse(ws: WebSocket) {
    if (!this.config || !this.isProcessing) return;

    // Trim history for faster LLM response
    const recentHistory = this.history.slice(-MAX_HISTORY);
    if (this.history.length > 0 && this.history[0].role === 'system') {
      recentHistory.unshift(this.history[0]);
    }

    // @ts-expect-error - model exists in Workers AI
    const llmResult = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: recentHistory,
      max_tokens: MAX_TOKENS,
    }) as { response?: string };

    if (!this.isProcessing) return;

    const response = llmResult.response || "I didn't catch that. Could you repeat?";
    this.history.push({ role: 'assistant', content: response });
    
    // Send transcript immediately
    this.send(ws, { type: 'transcript', text: response, isUser: false });
    this.send(ws, { type: 'state_change', state: 'speaking' });

    // === PHASE 2: Streaming TTS with sentence pipelining ===
    await this.streamTTSOptimized(ws, response);
  }

  private async streamTTSOptimized(ws: WebSocket, text: string) {
    if (!this.config || !this.isProcessing) return;

    const voice = this.config.voice;
    const voiceModel = getVoiceModelId(voice);

    // Split into sentences for pipelined TTS
    const sentences = this.splitIntoSentences(text);
    let globalChunkIndex = 0;

    // Process sentences with overlap for smoother playback
    for (let i = 0; i < sentences.length && this.isProcessing; i++) {
      const sentence = sentences[i];
      if (!sentence.trim()) continue;

      try {
        // @ts-expect-error - model exists in Workers AI
        const ttsResult = await this.env.AI.run(voiceModel, {
          text: sentence,
        }) as Uint8Array | { audio: Uint8Array };

        if (!this.isProcessing) break;

        let audioBytes: Uint8Array;
        if (ttsResult instanceof Uint8Array) {
          audioBytes = ttsResult;
        } else if (ttsResult && 'audio' in ttsResult) {
          audioBytes = ttsResult.audio;
        } else {
          continue;
        }

        // Stream in smaller chunks for faster first byte
        const totalChunks = Math.ceil(audioBytes.length / CHUNK_SIZE);
        for (let j = 0; j < totalChunks && this.isProcessing; j++) {
          const start = j * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, audioBytes.length);
          const chunk = audioBytes.slice(start, end);

          this.send(ws, {
            type: 'audio_chunk',
            audio: this.toBase64(chunk.buffer as ArrayBuffer),
            chunkIndex: globalChunkIndex++,
            totalChunks: -1, // Unknown for streaming
          });

          // Tiny yield to prevent blocking
          if (j % 4 === 0) {
            await this.yieldExecution();
          }
        }
      } catch (e) {
        console.error('TTS error for sentence:', e);
      }
    }

    if (this.isProcessing) {
      this.send(ws, { type: 'audio_complete' });
    }
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving punctuation
    return text
      .replace(/([.!?])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private send(ws: WebSocket, msg: ServerMessage | Record<string, unknown>) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (e) {
      console.error('Send error:', e);
    }
  }

  private async yieldExecution(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  async webSocketClose() {
    this.isProcessing = false;
    this.abortController?.abort();
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('WebSocket error:', error);
    this.isProcessing = false;
  }
}
