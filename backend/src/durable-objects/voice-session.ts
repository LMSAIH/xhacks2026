import { DurableObject } from 'cloudflare:workers';
import type { Env, ClientMessage, ServerMessage } from '../types';

const SYSTEM_PROMPT = `You are a helpful AI tutor. Keep responses brief (1-2 sentences).`;

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
      // STT - Deepgram Nova-3
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
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

      this.send(ws, { type: 'transcript', text: transcript, isPartial: false, isUser: true });

      // LLM - Llama 3 8B
      this.history.push({ role: 'user', content: transcript });
      
      // @ts-expect-error - model exists in Workers AI
      const llmResult = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: this.history.slice(-8),
        max_tokens: 150,
      }) as { response?: string };

      const response = llmResult.response || "Sorry, I couldn't understand that.";
      this.history.push({ role: 'assistant', content: response });
      
      this.send(ws, { type: 'transcript', text: response, isPartial: false, isUser: false });

      // TTS - Deepgram Aura
      this.send(ws, { type: 'state_change', state: 'speaking' });
      
      // @ts-expect-error - model exists in Workers AI
      const ttsResult = await this.env.AI.run('@cf/deepgram/aura-asteria-en', {
        text: response,
      }) as Uint8Array | { audio: Uint8Array };

      let audioBuffer: ArrayBuffer;
      if (ttsResult instanceof Uint8Array) {
        audioBuffer = ttsResult.buffer as ArrayBuffer;
      } else if (ttsResult && 'audio' in ttsResult) {
        audioBuffer = ttsResult.audio.buffer as ArrayBuffer;
      } else {
        throw new Error('No audio from TTS');
      }

      this.send(ws, {
        type: 'audio',
        audio: this.toBase64(audioBuffer),
        format: 'wav',
        sampleRate: 24000,
      });

    } finally {
      this.isProcessing = false;
      this.send(ws, { type: 'state_change', state: 'idle' });
    }
  }

  private async handleText(ws: WebSocket, text: string) {
    this.isProcessing = true;
    this.send(ws, { type: 'state_change', state: 'processing' });
    this.send(ws, { type: 'transcript', text, isPartial: false, isUser: true });

    try {
      this.history.push({ role: 'user', content: text });

      // @ts-expect-error - model exists in Workers AI
      const llmResult = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: this.history.slice(-8),
        max_tokens: 150,
      }) as { response?: string };

      const response = llmResult.response || "Sorry, I couldn't understand that.";
      this.history.push({ role: 'assistant', content: response });

      this.send(ws, { type: 'transcript', text: response, isPartial: false, isUser: false });

      this.send(ws, { type: 'state_change', state: 'speaking' });
      
      // @ts-expect-error - model exists in Workers AI
      const ttsResult = await this.env.AI.run('@cf/deepgram/aura-asteria-en', {
        text: response,
      }) as Uint8Array | { audio: Uint8Array };

      let audioBuffer: ArrayBuffer;
      if (ttsResult instanceof Uint8Array) {
        audioBuffer = ttsResult.buffer as ArrayBuffer;
      } else if (ttsResult && 'audio' in ttsResult) {
        audioBuffer = ttsResult.audio.buffer as ArrayBuffer;
      } else {
        throw new Error('No audio from TTS');
      }

      this.send(ws, {
        type: 'audio',
        audio: this.toBase64(audioBuffer),
        format: 'wav',
        sampleRate: 24000,
      });

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

  async webSocketClose() {
    this.isProcessing = false;
  }
}
