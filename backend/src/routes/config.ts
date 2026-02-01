import { Hono } from 'hono';
import type { Env } from '../types';
import { VOICES } from '../voices';

const configRoutes = new Hono<{ Bindings: Env }>();

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
