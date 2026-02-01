import { Hono } from 'hono';
import type { Env } from '../types';

const editorVoiceRoutes = new Hono<{ Bindings: Env }>();

/**
 * Editor Voice Session Endpoint
 * 
 * WebSocket upgrade for voice sessions in the notes editor
 * Supports context about the current section being studied
 * 
 * Query params:
 * - voice: DeepgramVoice ID (e.g., 'aura-orion-en')
 * - professorName: Name of the AI tutor persona
 * - professorPersonality: Description of teaching style
 * - sectionTitle: Current section being studied
 * - sectionContext: Additional context about the section
 * - topic: The overall course/topic name
 */
editorVoiceRoutes.get('/session', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket', 426);
  }

  // Generate unique session ID
  const sessionKey = `editor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const id = c.env.EDITOR_VOICE_SESSION.idFromName(sessionKey);
  const stub = c.env.EDITOR_VOICE_SESSION.get(id);
  
  return stub.fetch(c.req.raw);
});

export { editorVoiceRoutes };
