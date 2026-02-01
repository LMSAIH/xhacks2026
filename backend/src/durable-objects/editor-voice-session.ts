import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';
import { 
  type DeepgramVoice, 
  VOICES,
  getSpeakerName,
} from '../voices';

// Constants
const MAX_HISTORY = 10;
const MAX_TOKENS = 150;

interface SessionConfig {
  voice: DeepgramVoice;
  professorName: string;
  professorPersonality: string;
  topic: string;
  sectionTitle: string;
  sectionContext: string;
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Client -> Server messages
type EditorClientMessage =
  | { 
      type: 'start_session'; 
      voice?: DeepgramVoice;
      professorName?: string;
      professorPersonality?: string;
      topic?: string;
      sectionTitle?: string;
      sectionContext?: string;
    }
  | { type: 'audio'; audio: string }
  | { type: 'text'; text: string }
  | { type: 'interrupt' }
  | { type: 'clear_history' }
  | { type: 'update_section'; sectionTitle: string; sectionContext?: string };

// Server -> Client messages
type EditorServerMessage =
  | { type: 'ready'; sessionId: string; voices: string[] }
  | { type: 'session_started'; sessionId: string; voice: string }
  | { type: 'state_change'; state: 'idle' | 'listening' | 'processing' | 'speaking' }
  | { type: 'transcript_partial'; text: string }
  | { type: 'transcript'; text: string; isUser: boolean }
  | { type: 'audio'; audio: string; format: string; sampleRate: number }
  | { type: 'audio_complete' }
  | { type: 'interrupted' }
  | { type: 'cleared' }
  | { type: 'section_updated'; sectionTitle: string }
  | { type: 'error'; message: string };

export class EditorVoiceSession extends DurableObject<Env> {
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
      const data = JSON.parse(message as string) as EditorClientMessage;

      switch (data.type) {
        case 'start_session':
          await this.startSession(ws, data);
          break;
        case 'audio':
          if (!this.isProcessing && this.config) {
            await this.handleAudio(ws, data.audio);
          }
          break;
        case 'text':
          if (!this.isProcessing && this.config && data.text) {
            await this.handleText(ws, data.text);
          }
          break;
        case 'interrupt':
          this.interrupt(ws);
          break;
        case 'clear_history':
          this.clearHistory(ws);
          break;
        case 'update_section':
          this.updateSection(ws, data.sectionTitle, data.sectionContext);
          break;
      }
    } catch (e) {
      console.error('EditorVoiceSession error:', e);
      this.isProcessing = false;
      this.send(ws, { type: 'error', message: String(e) });
    }
  }

  webSocketClose() {
    this.abortController?.abort();
    this.isProcessing = false;
  }

  private async startSession(ws: WebSocket, data: {
    voice?: DeepgramVoice;
    professorName?: string;
    professorPersonality?: string;
    topic?: string;
    sectionTitle?: string;
    sectionContext?: string;
  }) {
    const voice = data.voice && VOICES[data.voice] ? data.voice : 'aura-asteria-en';
    
    this.config = {
      voice,
      professorName: data.professorName || 'AI Tutor',
      professorPersonality: data.professorPersonality || 'helpful and patient',
      topic: data.topic || 'General Learning',
      sectionTitle: data.sectionTitle || 'Introduction',
      sectionContext: data.sectionContext || '',
    };

    // Build system prompt with all context
    const systemPrompt = this.buildSystemPrompt();
    this.history = [{ role: 'system', content: systemPrompt }];

    this.send(ws, {
      type: 'session_started',
      sessionId: this.ctx.id.toString(),
      voice,
    });
  }

  private buildSystemPrompt(): string {
    if (!this.config) return '';

    const { professorName, professorPersonality, topic, sectionTitle, sectionContext } = this.config;

    let prompt = `You are ${professorName}, an AI tutor who is ${professorPersonality}.\n\n`;
    prompt += `You are helping a student learn about "${topic}".\n`;
    prompt += `Currently, you are teaching the section: "${sectionTitle}".\n\n`;
    
    if (sectionContext) {
      prompt += `--- SECTION CONTEXT ---\n${sectionContext}\n--- END CONTEXT ---\n\n`;
    }

    prompt += `Guidelines for your responses:\n`;
    prompt += `- Keep responses concise (2-4 sentences max) since this is spoken dialogue\n`;
    prompt += `- Be conversational and natural, as if speaking in person\n`;
    prompt += `- Relate your answers to the current section when relevant\n`;
    prompt += `- If the student asks about something outside this section, gently guide them back or briefly address it\n`;
    prompt += `- Encourage questions and make the student feel comfortable\n`;
    prompt += `- Avoid code blocks, bullet points, or formatting that doesn't work in speech\n`;
    prompt += `- Use natural speech patterns like "Well," "You see," "That's a great question," etc.\n`;

    return prompt;
  }

  private updateSection(ws: WebSocket, sectionTitle: string, sectionContext?: string) {
    if (!this.config) return;

    this.config.sectionTitle = sectionTitle;
    if (sectionContext !== undefined) {
      this.config.sectionContext = sectionContext;
    }

    // Update system prompt in history
    const newSystemPrompt = this.buildSystemPrompt();
    if (this.history.length > 0 && this.history[0].role === 'system') {
      this.history[0].content = newSystemPrompt;
    } else {
      this.history.unshift({ role: 'system', content: newSystemPrompt });
    }

    this.send(ws, { type: 'section_updated', sectionTitle });
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
      // Phase 1: Speech-to-Text
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      
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

      this.send(ws, { type: 'transcript', text: transcript, isUser: true });
      this.history.push({ role: 'user', content: transcript });

      // Phase 2: Generate and stream response
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

    // Trim history to prevent context overflow
    const trimmedHistory = this.history.length > MAX_HISTORY + 1
      ? [this.history[0], ...this.history.slice(-MAX_HISTORY)]
      : this.history;

    // Generate LLM response
    // @ts-expect-error - model exists in Workers AI
    const llmResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: trimmedHistory,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    }) as { response?: string };

    const responseText = llmResponse.response?.trim();
    if (!responseText || !this.isProcessing) return;

    // Add to history
    this.history.push({ role: 'assistant', content: responseText });

    // Send transcript
    this.send(ws, { type: 'transcript', text: responseText, isUser: false });

    // Generate TTS
    this.send(ws, { type: 'state_change', state: 'speaking' });

    const speaker = getSpeakerName(this.config.voice);
    
    // Use mp3 encoding for browser compatibility
    const ttsResult = await this.env.AI.run('@cf/deepgram/aura-1', {
      text: responseText,
      speaker,
      encoding: 'mp3',
    }, { returnRawResponse: true }) as Response;

    if (!this.isProcessing) return;

    // Stream audio chunks
    const reader = ttsResult.body?.getReader();
    if (!reader) return;

    while (this.isProcessing) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const base64Chunk = btoa(String.fromCharCode(...value));
        this.send(ws, {
          type: 'audio',
          audio: base64Chunk,
          format: 'mp3',
          sampleRate: 24000,
        });
      }
    }

    this.send(ws, { type: 'audio_complete' });
  }

  private send(ws: WebSocket, message: EditorServerMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('WebSocket send error:', e);
    }
  }
}
