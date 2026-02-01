import { Hono } from 'hono';
import type { Env } from '../types';

const progressRoutes = new Hono<{ Bindings: Env }>();

// Progress API - TODO: Implement
progressRoutes.get('/:userId', async (c) => {
  return c.json({ progress: [] });
});

export { progressRoutes };
