import { Hono } from 'hono';
import type { Env } from '../types';

const voiceRoutes = new Hono<{ Bindings: Env }>();

// WebSocket upgrade for voice sessions
// Supports: /api/voice/CMPT120 or /api/voice/CMPT120?voice=aura-orion-en&persona=linus-torvalds
voiceRoutes.get('/:courseCode', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket', 426);
  }

  const courseCode = c.req.param('courseCode');
  // Use unique session ID per user (or course for shared sessions)
  const sessionKey = `${courseCode}-${Date.now()}`;
  const id = c.env.VOICE_SESSION.idFromName(sessionKey);
  const stub = c.env.VOICE_SESSION.get(id);
  
  return stub.fetch(c.req.raw);
});

export { voiceRoutes };
