import { Hono } from 'hono';
import type { Env } from '../types';
import { 
  type DeepgramVoice, 
  VOICES,
  getSpeakerName,
} from '../voices';

const editorChatRoutes = new Hono<{ Bindings: Env }>();

// In-memory session store (in production, use KV or D1)
interface ChatSession {
  history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  config: {
    voice: DeepgramVoice;
    professorName: string;
    professorPersonality: string;
    topic: string;
    sectionTitle: string;
  };
}

const sessions = new Map<string, ChatSession>();

function buildSystemPrompt(config: ChatSession['config']): string {
  const { professorName, professorPersonality, topic, sectionTitle } = config;

  let prompt = `You are ${professorName}, an AI tutor who is ${professorPersonality}.\n\n`;
  prompt += `You are helping a student learn about "${topic}".\n`;
  prompt += `Currently, you are teaching the section: "${sectionTitle}".\n\n`;
  prompt += `Guidelines:\n`;
  prompt += `- Keep responses concise (2-4 sentences) for spoken dialogue\n`;
  prompt += `- Be conversational and natural\n`;
  prompt += `- Relate answers to the current section when relevant\n`;
  prompt += `- Use natural speech patterns\n`;
  prompt += `- Avoid code blocks or formatting that doesn't work in speech\n`;

  return prompt;
}

// Create or get session
editorChatRoutes.post('/session', async (c) => {
  const body = await c.req.json();
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  const voice = (body.voice && VOICES[body.voice as DeepgramVoice]) 
    ? body.voice as DeepgramVoice 
    : 'aura-asteria-en';

  const config = {
    voice,
    professorName: body.professorName || 'AI Tutor',
    professorPersonality: body.professorPersonality || 'helpful and patient',
    topic: body.topic || 'General Learning',
    sectionTitle: body.sectionTitle || 'Introduction',
  };

  console.log(`Session created: ${sessionId}, voice: ${voice}, professor: ${config.professorName}`);

  const systemPrompt = buildSystemPrompt(config);
  
  sessions.set(sessionId, {
    history: [{ role: 'system', content: systemPrompt }],
    config,
  });

  return c.json({ sessionId, voice, ready: true });
});

// Update section context
editorChatRoutes.post('/session/:sessionId/section', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const body = await c.req.json();
  session.config.sectionTitle = body.sectionTitle || session.config.sectionTitle;
  
  // Update system prompt
  const newSystemPrompt = buildSystemPrompt(session.config);
  if (session.history.length > 0 && session.history[0].role === 'system') {
    session.history[0].content = newSystemPrompt;
  }

  return c.json({ success: true });
});

// Send text message and get response
editorChatRoutes.post('/session/:sessionId/chat', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const body = await c.req.json();
  const userMessage = body.message?.trim();
  
  if (!userMessage) {
    return c.json({ error: 'Message required' }, 400);
  }

  // Add user message to history
  session.history.push({ role: 'user', content: userMessage });

  // Keep history manageable
  const recentHistory = session.history.length > 12
    ? [session.history[0], ...session.history.slice(-10)]
    : session.history;

  // Generate LLM response
  // @ts-expect-error - model exists in Workers AI
  const llmResult = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: recentHistory,
    max_tokens: 150,
    temperature: 0.7,
  }) as { response?: string };

  const response = llmResult.response?.trim() || "I didn't catch that. Could you try again?";
  
  // Add assistant response to history
  session.history.push({ role: 'assistant', content: response });

  return c.json({ 
    response,
    sessionId,
  });
});

// Send audio and get text + audio response
editorChatRoutes.post('/session/:sessionId/voice', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File | null;
  
  if (!audioFile) {
    return c.json({ error: 'Audio required' }, 400);
  }

  try {
    // Get raw audio bytes
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    console.log(`Received ${audioBytes.length} bytes of audio`);

    // Speech-to-text - pass raw bytes directly
    const sttResult = await c.env.AI.run('@cf/openai/whisper', {
      audio: [...audioBytes],
    }) as { text?: string };

    const transcript = sttResult.text?.trim();
    if (!transcript) {
      return c.json({ error: 'Could not transcribe audio' }, 400);
    }

    // Add user message to history
    session.history.push({ role: 'user', content: transcript });

    // Keep history manageable
    const recentHistory = session.history.length > 12
      ? [session.history[0], ...session.history.slice(-10)]
      : session.history;

    // Generate LLM response
    // @ts-expect-error - model exists in Workers AI
    const llmResult = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: recentHistory,
      max_tokens: 150,
      temperature: 0.7,
    }) as { response?: string };

    const response = llmResult.response?.trim() || "I didn't catch that. Could you try again?";
    
    // Add assistant response to history
    session.history.push({ role: 'assistant', content: response });

    // Generate TTS
    let responseAudioBase64: string | null = null;
    try {
      const speaker = getSpeakerName(session.config.voice);
      console.log(`TTS: Using speaker "${speaker}" for voice "${session.config.voice}"`);
      
      // Use returnRawResponse to get Response object with audio
      const ttsResponse = await c.env.AI.run('@cf/deepgram/aura-1' as Parameters<typeof c.env.AI.run>[0], {
        text: response,
        speaker,
        encoding: 'mp3',
      }, { returnRawResponse: true }) as Response;
      
      const audioBuffer = await ttsResponse.arrayBuffer();
      const bytes = new Uint8Array(audioBuffer);
      
      if (bytes.length > 0) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        responseAudioBase64 = btoa(binary);
        console.log(`TTS: Generated ${bytes.length} bytes of audio`);
      } else {
        console.error('TTS: Empty audio response');
      }
    } catch (ttsError) {
      console.error('TTS error (continuing without audio):', ttsError);
      // Continue without audio - don't fail the whole request
    }

    return c.json({
      transcript,
      response,
      audio: responseAudioBase64,
      audioFormat: 'mp3',
    });

  } catch (e) {
    console.error('Voice processing error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Clear history
editorChatRoutes.post('/session/:sessionId/clear', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Keep only system prompt
  session.history = session.history.slice(0, 1);
  
  return c.json({ success: true });
});

// Delete session
editorChatRoutes.delete('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  sessions.delete(sessionId);
  return c.json({ success: true });
});

export { editorChatRoutes };
