import { Hono } from 'hono';
import type { Env } from '../types';
import { VOICES, getSpeakerName, DEEPGRAM_TTS_MODEL, type DeepgramVoice } from '../voices';

const configRoutes = new Hono<{ Bindings: Env }>();

// Preview text for voice samples
const PREVIEW_TEXT = "Hello! I'm here to help you learn. How can I assist you today?";

// List available voices
configRoutes.get('/voices', (c) => {
  const voices = Object.values(VOICES).map(v => ({
    id: v.id,
    name: v.name,
    gender: v.gender,
    style: v.style,
    bestFor: v.bestFor,
  }));
  return c.json({ voices });
});

// Voice preview endpoint - generates TTS audio sample
configRoutes.get('/voices/:voiceId/preview', async (c) => {
  const voiceId = c.req.param('voiceId') as DeepgramVoice;
  
  // Validate voice ID
  if (!VOICES[voiceId]) {
    return c.json({ success: false, error: 'Invalid voice ID' }, 400);
  }
  
  // Check KV cache first
  const cacheKey = `voice-preview:${voiceId}`;
  try {
    const cached = await c.env.KV.get(cacheKey, 'arrayBuffer');
    if (cached) {
      return new Response(cached, {
        headers: { 
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=604800', // 7 days
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
    // Continue to generate if cache fails
  }
  
  // Generate TTS preview
  try {
    const speaker = getSpeakerName(voiceId);
    
    // Call Deepgram Aura via Workers AI
    const ttsResponse = await c.env.AI.run(DEEPGRAM_TTS_MODEL as Parameters<typeof c.env.AI.run>[0], {
      text: PREVIEW_TEXT,
      speaker: speaker,
    });
    
    // Get audio buffer from response
    let audioBuffer: ArrayBuffer;
    if (ttsResponse instanceof ReadableStream) {
      // Stream response - collect into buffer
      const reader = ttsResponse.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      audioBuffer = combined.buffer;
    } else if (ttsResponse instanceof ArrayBuffer) {
      audioBuffer = ttsResponse;
    } else if (typeof ttsResponse === 'object' && ttsResponse !== null) {
      // Response might have audio property
      const resp = ttsResponse as { audio?: ArrayBuffer | Uint8Array };
      if (resp.audio instanceof ArrayBuffer) {
        audioBuffer = resp.audio;
      } else if (resp.audio instanceof Uint8Array) {
        audioBuffer = resp.audio.buffer;
      } else {
        throw new Error('Unexpected TTS response format');
      }
    } else {
      throw new Error('Unexpected TTS response type');
    }
    
    // Cache the result (TTL: 7 days)
    try {
      await c.env.KV.put(cacheKey, audioBuffer, { expirationTtl: 604800 });
    } catch (e) {
      console.error('KV cache write error:', e);
      // Continue even if caching fails
    }
    
    return new Response(audioBuffer, {
      headers: { 
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=604800',
      },
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    return c.json({ 
      success: false, 
      error: 'Voice preview generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Combined config endpoint for frontend initialization
configRoutes.get('/config', (c) => {
  const voices = Object.values(VOICES).map(v => ({
    id: v.id,
    name: v.name,
    gender: v.gender,
    style: v.style,
    bestFor: v.bestFor,
  }));
  
  return c.json({
    voices,
    defaultVoice: 'aura-asteria-en',
  });
});

export { configRoutes };
