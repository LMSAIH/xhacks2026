import { DurableObject } from 'cloudflare:workers';
import type { Env, VoiceState, ClientMessage, ServerMessage, LLMResponse } from '../types';

const SYSTEM_PROMPT = `You are an expert AI tutor for SFU courses. Be conversational, helpful, and concise (2-4 sentences for voice).`;

export class VoiceTeacherSession extends DurableObject<Env> {
  private voiceState: VoiceState = 'idle';
  private courseCode: string | null = null;
  private history: { role: string; content: string }[] = [];

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
      
      switch (data.type) {
        case 'start_session':
          this.courseCode = data.courseCode;
          this.history = [{ role: 'system', content: SYSTEM_PROMPT + '\nCourse: ' + data.courseCode }];
          this.send(ws, { type: 'session_started', sessionId: this.ctx.id.toString() });
          break;

        case 'text':
          await this.handleText(ws, data.text);
          break;

        case 'audio':
          // TODO: Your team implements STT pipeline
          await this.handleAudio(ws, data.audio);
          break;

        case 'interrupt':
          this.voiceState = 'idle';
          this.send(ws, { type: 'interrupted' });
          break;

        case 'clear_history':
          this.history = this.history.slice(0, 1);
          this.send(ws, { type: 'cleared' });
          break;
      }
    } catch (e) {
      console.error('WS error:', e);
      this.send(ws, { type: 'error', message: 'Processing failed' });
    }
  }

  private async handleText(ws: WebSocket, text: string) {
    this.voiceState = 'processing';
    this.send(ws, { type: 'state_change', state: 'processing' });
    this.send(ws, { type: 'transcript', text, isPartial: false, isUser: true });

    this.history.push({ role: 'user', content: text });

    const llm = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: this.history.slice(-10),
      max_tokens: 200,
    }) as LLMResponse;

    const response = llm.response || "Sorry, I didn't understand.";
    this.history.push({ role: 'assistant', content: response });

    this.send(ws, { type: 'transcript', text: response, isPartial: false, isUser: false });
    
    // TODO: TTS pipeline - @cf/deepgram/aura-1
    this.voiceState = 'idle';
    this.send(ws, { type: 'state_change', state: 'idle' });
  }

  private async handleAudio(ws: WebSocket, audioBase64: string) {
    // TODO: STT with @cf/deepgram/nova-3
    this.send(ws, { type: 'error', message: 'Audio not implemented yet' });
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
  }

  async webSocketClose(ws: WebSocket) {
    console.log('Session closed:', this.ctx.id.toString());
  }
}
