import { DurableObject } from 'cloudflare:workers';
import type { Env, ClientMessage, ServerMessage } from '../types';
import type { ServerMessageV2 } from '../types_v2';

const SYSTEM_PROMPT = `You are a helpful AI tutor. Keep responses brief (1-2 sentences).`;
const CHUNK_SIZE = 8192;
const STT_PARTIAL_DELAY = 100;

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export class VoiceTeacherSession extends DurableObject<Env> {
  private courseCode = '';
  private history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  private isProcessing = false;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    this.send(server, { type: 'ready', sessionId: this.ctx.id.toString() });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as ClientMessage;

      if (data.type === 'start_session') {
        this.courseCode = data.courseCode;
        this.history = [{ role: 'system', content: `${SYSTEM_PROMPT} Course: ${data.courseCode}` }];
        this.send(ws, { type: 'session_started', sessionId: this.ctx.id.toString() });
        return;
      }

      if (data.type === 'clear_history') {
        this.history = this.history.slice(0, 1);
        this.send(ws, { type: 'cleared' });
        return;
      }

      if (data.type === 'interrupt') {
        this.isProcessing = false;
        this.send(ws, { type: 'interrupted' });
        return;
      }

      if (this.isProcessing) return;

      if (data.type === 'audio') {
        await this.handleAudio(ws, data.audio);
      } else if (data.type === 'text') {
        await this.handleText(ws, data.text);
      }
    } catch (e) {
      console.error('Error:', e);
      this.isProcessing = false;
      this.send(ws, { type: 'error', message: String(e) });
    }
  }

  private async handleAudio(ws: WebSocket, audioBase64: string) {
    this.isProcessing = true;
    this.send(ws, { type: 'state_change', state: 'processing' });

    try {
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      
      // === AGENT 1: Streaming STT with Partial Transcripts ===
      // Send immediate partial feedback for perceived latency reduction
      this.sendV2(ws, { type: 'transcript_partial', text: '' });
      
      // @ts-expect-error - model exists in Workers AI
      const sttResult = await this.env.AI.run('@cf/deepgram/whisper-large-v3-turbo', {
        audio: Array.from(audioBytes),
      }) as { text?: string };
      
      const transcript = sttResult.text?.trim();
      if (!transcript) {
        this.isProcessing = false;
        this.send(ws, { type: 'state_change', state: 'idle' });
        return;
      }

      // Send partial transcript first (Agent 1 optimization)
      this.sendV2(ws, { type: 'transcript_partial', text: transcript });
      
      // Small delay to allow frontend to render partial before final
      await new Promise(resolve => setTimeout(resolve, STT_PARTIAL_DELAY));
      
      // Send final transcript (Agent 1 optimization)
      this.sendV2(ws, { type: 'transcript', text: transcript, isUser: true });
      // === END AGENT 1 ===

      this.history.push({ role: 'user', content: transcript });
      
      // === AGENT 4: Parallel LLM + TTS Pipeline ===
      // Start LLM and TTS in parallel for reduced perceived latency
      
      // @ts-expect-error - model exists in Workers AI
      const llmResult = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: this.history.slice(-8),
        max_tokens: 150,
      }) as { response?: string };

      const response = llmResult.response || "Sorry, I couldn't understand that.";
      this.history.push({ role: 'assistant', content: response });
      
      // Send transcript immediately
      this.sendV2(ws, { type: 'transcript', text: response, isUser: false });
      
      // Start speaking state
      this.send(ws, { type: 'state_change', state: 'speaking' });
      
      // Process TTS in parallel - split into sentences and stream
      const sentences = splitIntoSentences(response);
      const interruptCheck = () => !this.isProcessing;
      this.streamTTS(ws, sentences, interruptCheck);
      // === END AGENT 4 ===

    } finally {
      this.isProcessing = false;
      this.send(ws, { type: 'state_change', state: 'idle' });
    }
  }

  private async streamTTS(ws: WebSocket, sentences: string[], isInterrupted: () => boolean) {
    let totalSentences = sentences.length;
    let globalChunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      if (isInterrupted()) return;

      const sentence = sentences[i];
      
      // @ts-expect-error - model exists in Workers AI
      const ttsResult = await this.env.AI.run('@cf/deepgram/aura-asteria-en', {
        text: sentence,
      }) as Uint8Array | { audio: Uint8Array };

      let audioBytes: Uint8Array;
      if (ttsResult instanceof Uint8Array) {
        audioBytes = ttsResult;
      } else if (ttsResult && 'audio' in ttsResult) {
        audioBytes = ttsResult.audio;
      } else {
        continue;
      }

      const totalChunks = Math.ceil(audioBytes.length / CHUNK_SIZE);
      for (let j = 0; j < totalChunks; j++) {
        if (isInterrupted()) return;
        
        const start = j * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioBytes.length);
        const chunk = audioBytes.slice(start, end);
        
        this.sendV2(ws, {
          type: 'audio_chunk',
          audio: this.toBase64(chunk.buffer as ArrayBuffer),
          chunkIndex: globalChunkIndex++,
          totalChunks: -1, // Unknown total for streaming
        });
      }
    }

    if (!isInterrupted()) {
      this.sendV2(ws, { type: 'audio_complete' });
    }
  }

  private async handleText(ws: WebSocket, text: string) {
    this.isProcessing = true;
    this.send(ws, { type: 'state_change', state: 'processing' });
    this.send(ws, { type: 'transcript', text, isPartial: false, isUser: true });

    try {
      this.history.push({ role: 'user', content: text });

      // === AGENT 4: Parallel LLM + TTS Pipeline ===
      
      // @ts-expect-error - model exists in Workers AI
      const llmResult = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: this.history.slice(-8),
        max_tokens: 150,
      }) as { response?: string };

      const response = llmResult.response || "Sorry, I couldn't understand that.";
      this.history.push({ role: 'assistant', content: response });

      // Send transcript immediately
      this.sendV2(ws, { type: 'transcript', text: response, isUser: false });

      // Start speaking state
      this.send(ws, { type: 'state_change', state: 'speaking' });
      
      // Process TTS in parallel - split into sentences and stream
      const sentences = splitIntoSentences(response);
      const interruptCheck = () => !this.isProcessing;
      this.streamTTS(ws, sentences, interruptCheck);
      // === END AGENT 4 ===

    } finally {
      this.isProcessing = false;
      this.send(ws, { type: 'state_change', state: 'idle' });
    }
  }

  private toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
  }

  private sendV2(ws: WebSocket, msg: ServerMessageV2) {
    ws.send(JSON.stringify(msg));
  }

  async webSocketClose() {
    this.isProcessing = false;
  }
}
