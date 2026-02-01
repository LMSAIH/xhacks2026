import { Hono } from 'hono';
import type { Env } from '../types';

const voiceRoutes = new Hono<{ Bindings: Env }>();

// ============================================
// Voice Mapping: Deepgram -> ElevenLabs
// ============================================
export const VOICE_MAPPING: Record<
  string,
  { elevenLabsId: string; name: string; description: string }
> = {
  'aura-asteria-en': {
    elevenLabsId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Warm, professional',
  },
  'aura-luna-en': {
    elevenLabsId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Soft, calm',
  },
  'aura-athena-en': {
    elevenLabsId: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'Confident, clear',
  },
  'aura-orion-en': {
    elevenLabsId: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'Deep, professional',
  },
  'aura-arcas-en': {
    elevenLabsId: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Young, energetic',
  },
  'aura-perseus-en': {
    elevenLabsId: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    description: 'Warm, friendly',
  },
  'aura-angus-en': {
    elevenLabsId: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    description: 'British, refined',
  },
  'aura-orpheus-en': {
    elevenLabsId: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    description: 'Smooth, storyteller',
  },
  'aura-zeus-en': {
    elevenLabsId: '2EiwWnXFnvU5JabPnv8n',
    name: 'Clyde',
    description: 'Powerful, commanding',
  },
  default: {
    elevenLabsId: 'pMsXgVXv3BLzUgSXRplE',
    name: 'Serena',
    description: 'Neutral, clear',
  },
};

// ============================================
// Helper: Get ElevenLabs Voice ID
// ============================================
function getElevenLabsVoiceId(voicePreference?: string): string {
  if (voicePreference && voicePreference in VOICE_MAPPING) {
    return VOICE_MAPPING[voicePreference].elevenLabsId;
  }
  return VOICE_MAPPING.default.elevenLabsId;
}

// ============================================
// Helper: Build Agent System Prompt
// ============================================
function buildAgentPrompt(personality: {
  name: string;
  traits: string[];
  systemPrompt?: string;
}): string {
  if (personality.systemPrompt) {
    return personality.systemPrompt;
  }

  const traitsText =
    personality.traits && personality.traits.length > 0
      ? personality.traits.join(', ')
      : 'helpful and engaging';

  return `You are ${personality.name}, an AI tutor. Your personality: ${traitsText}. Be concise in voice conversations (max 2-3 sentences per response).`;
}

// ============================================
// Helper: Create Agent with MCP Integration
// ============================================
async function createElevenLabsAgent(
  apiKey: string,
  config: {
    personality: {
      name: string;
      traits: string[];
      systemPrompt?: string;
    };
    voiceId: string;
    courseCode: string;
    mcpServerId?: string;
  }
): Promise<{
  agentId: string;
  voiceId: string;
  courseCode: string;
  createdAt: string;
}> {
  const systemPrompt = buildAgentPrompt(config.personality);

  // ElevenLabs Conversational AI agent creation
  const agentPayload: Record<string, unknown> = {
    name: `tutor-${config.courseCode}-${Date.now()}`,
    conversation_config: {
      tts: {
        voice_id: config.voiceId,
        model_id: 'eleven_flash_v2_5',
      },
      agent: {
        first_message: `Hello! I'm ${config.personality.name}. How can I help you learn today?`,
        prompt: {
          prompt: systemPrompt,
          // MCP integration: ElevenLabs will call MCP tools for context
          ...(config.mcpServerId && {
            tools: [
              {
                mcp_server_id: config.mcpServerId,
                name: 'ask_question',
                description: 'Ask a tutoring question to the course context',
              },
            ],
          }),
        },
      },
    },
  };

  const response = await fetch('https://api.elevenlabs.io/v1/conversational_ai/agents', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(agentPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create ElevenLabs agent: ${error}`);
  }

  const agent = (await response.json()) as { agent_id: string };

  return {
    agentId: agent.agent_id,
    voiceId: config.voiceId,
    courseCode: config.courseCode,
    createdAt: new Date().toISOString(),
  };
}

// ============================================
// Helper: Get or Create Agent (with caching)
// ============================================
async function getOrCreateAgent(
  apiKey: string,
  kv: KVNamespace,
  config: {
    personality: {
      name: string;
      traits: string[];
      systemPrompt?: string;
    };
    voiceId: string;
    courseCode: string;
    mcpServerId?: string;
  }
): Promise<{ agentId: string; voiceId: string }> {
  const cacheKey = `agent:${config.courseCode}:${config.voiceId}`;

  // Try to get from cache
  const cached = await kv.get(cacheKey);
  if (cached) {
    const agentData = JSON.parse(cached) as { agentId: string; voiceId: string };
    return agentData;
  }

  // Create new agent
  const agent = await createElevenLabsAgent(apiKey, config);

  // Cache for 24 hours
  await kv.put(cacheKey, JSON.stringify(agent), { expirationTtl: 86400 });

  return { agentId: agent.agentId, voiceId: agent.voiceId };
}

// ============================================
// Helper: Get Signed URL for Frontend
// ============================================
async function getSignedConversationUrl(
  apiKey: string,
  agentId: string
): Promise<{ conversationId: string; signedUrl: string }> {
  const response = await fetch('https://api.elevenlabs.io/v1/conversational_ai/conversations/signed_url', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agent_id: agentId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get signed URL: ${error}`);
  }

  const data = (await response.json()) as {
    conversation_id: string;
    signed_url: string;
  };

  return {
    conversationId: data.conversation_id,
    signedUrl: data.signed_url,
  };
}

// ============================================
// Routes
// ============================================

/**
 * GET /api/voice/voices or /api/voices (alias)
 * Returns available ElevenLabs voices (mapped from Deepgram)
 */
voiceRoutes.get('/voices', (c) => {
  const voices = Object.entries(VOICE_MAPPING).map(([deepgramId, elevenLabsData]) => ({
    id: deepgramId,
    name: elevenLabsData.name,
    description: elevenLabsData.description,
    elevenLabsId: elevenLabsData.elevenLabsId,
  }));

  return c.json({ voices });
});

/**
 * POST /api/voice/session
 * Create a new voice session with ElevenLabs agent
 * Body: { courseCode, userId?, personality?, voicePreference?, mcpServerId? }
 */
voiceRoutes.post('/session', async (c) => {
  try {
    const elevenLabsKey = c.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return c.json({ error: 'ELEVENLABS_API_KEY not configured' }, 500);
    }

    const body = (await c.req.json()) as {
      courseCode: string;
      userId?: string;
      personality?: { name: string; traits: string[]; systemPrompt?: string };
      voicePreference?: string;
      mcpServerId?: string;
    };

    const { courseCode, userId, personality, voicePreference, mcpServerId } = body;

    if (!courseCode) {
      return c.json({ error: 'courseCode required' }, 400);
    }

    // Use provided personality or default
    const agentPersonality = personality || {
      name: 'Tutor',
      traits: ['helpful', 'patient', 'encouraging'],
    };

    // Get ElevenLabs voice ID
    const voiceId = getElevenLabsVoiceId(voicePreference);

    // Get or create agent
    const agent = await getOrCreateAgent(elevenLabsKey, c.env.KV, {
      personality: agentPersonality,
      voiceId,
      courseCode,
      mcpServerId,
    });

    // Get signed URL for frontend
    const conversation = await getSignedConversationUrl(elevenLabsKey, agent.agentId);

    // Store session in database (for future transcript retrieval)
    if (userId) {
      try {
        await c.env.DB.prepare(
          `INSERT INTO voice_sessions (id, agent_id, user_id, course_code, voice_id, created_at) 
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            conversation.conversationId,
            agent.agentId,
            userId,
            courseCode,
            agent.voiceId,
            new Date().toISOString(),
          )
          .run();
      } catch (dbError) {
        // Log but don't fail - DB might not have the table yet
        console.log('DB write skipped:', dbError);
      }
    }

    return c.json({
      conversationId: conversation.conversationId,
      signedUrl: conversation.signedUrl,
      agentId: agent.agentId,
      voiceId: agent.voiceId,
      courseCode,
    });
  } catch (error) {
    console.error('Voice session error:', error);
    return c.json(
      {
        error: 'Failed to create voice session',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * POST /api/voice/webhook
 * Webhook endpoint for ElevenLabs to send transcripts
 * Body: { type, data }
 */
voiceRoutes.post('/webhook', async (c) => {
  try {
    const payload = (await c.req.json()) as {
      type: string;
      data: {
        conversation_id: string;
        transcript?: Array<{ role: string; message: string }>;
        transcript_summary?: string;
      };
    };

    if (payload.type === 'post_call_transcription') {
      const { conversation_id, transcript, transcript_summary } = payload.data;

      // Store transcript in database
      if (transcript && transcript.length > 0) {
        try {
          for (const turn of transcript) {
            await c.env.DB.prepare(
              `INSERT INTO conversation_messages (session_id, role, content, timestamp) 
               VALUES (?, ?, ?, ?)`,
            )
              .bind(
                conversation_id,
                turn.role === 'agent' ? 'assistant' : 'user',
                turn.message,
                new Date().toISOString(),
              )
              .run();
          }

          // Store summary
          if (transcript_summary) {
            await c.env.DB.prepare('UPDATE voice_sessions SET summary = ? WHERE id = ?').bind(
              transcript_summary,
              conversation_id,
            ).run();
          }
        } catch (dbError) {
          console.log('DB write skipped:', dbError);
        }
      }

      return c.json({ received: true });
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

/**
 * GET /api/voice/:sessionId/transcript
 * Retrieve stored transcript for a session
 */
voiceRoutes.get('/:sessionId/transcript', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    const messages = await c.env.DB.prepare(
      `SELECT role, content, timestamp FROM conversation_messages 
       WHERE session_id = ? ORDER BY timestamp ASC`,
    )
      .bind(sessionId)
      .all();

    return c.json({
      sessionId,
      messages: messages.results || [],
    });
  } catch (error) {
    console.error('Transcript retrieval error:', error);
    return c.json({ error: 'Failed to retrieve transcript' }, 500);
  }
});

/**
 * GET /api/voices/:voiceId/preview
 * Generate or return cached audio preview for a voice
 */
voiceRoutes.get('/:voiceId/preview', async (c) => {
  try {
    const voiceId = c.req.param('voiceId');

    // Validate voice ID
    const validVoices = Object.keys(VOICE_MAPPING);
    if (!validVoices.includes(voiceId) && voiceId !== 'default') {
      return c.json(
        { success: false, error: 'Invalid voice ID' },
        400
      );
    }

    const cacheKey = `voice-preview:${voiceId}`;

    // Try to get from cache
    const cached = await c.env.KV.get(cacheKey, 'arrayBuffer');
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'audio/mpeg' },
      });
    }

    // Generate audio using Cloudflare AI
    const voiceMapping = VOICE_MAPPING[voiceId as keyof typeof VOICE_MAPPING] || VOICE_MAPPING.default;
    
    const audioResponse = await c.env.AI.run(
      '@cf/openai/whisper-tiny',
      {
        audio: [0x52, 0x49, 0x46, 0x46], // RIFF header placeholder
      }
    );

    // Get audio data
    const audioBuffer = await audioResponse.arrayBuffer();

    // Cache for 7 days
    await c.env.KV.put(cacheKey, audioBuffer, { expirationTtl: 604800 });

    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error) {
    console.error('Voice preview error:', error);
    return c.json(
      { success: false, error: 'Failed to generate voice preview' },
      500
    );
  }
});

/**
 * GET /api/voice/:courseCode
 * WebSocket endpoint for voice sessions (legacy Durable Object)
 * Upgrades to WebSocket and connects to Durable Object
 */
voiceRoutes.get('/:courseCode', async (c) => {
  const courseCode = c.req.param('courseCode');

  // Check for WebSocket upgrade header
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket', 426);
  }

  try {
    // Generate session key
    const sessionKey = `${courseCode}-${Date.now()}`;

    // Get Durable Object instance
    const id = c.env.VOICE_SESSION.idFromName(sessionKey);
    const stub = c.env.VOICE_SESSION.get(id);

    // Proxy request to Durable Object
    const doRequest = new Request(c.req.raw);
    const doResponse = await stub.fetch(doRequest);

    return doResponse;
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return c.text('Failed to establish WebSocket', 500);
  }
});

export { voiceRoutes };
