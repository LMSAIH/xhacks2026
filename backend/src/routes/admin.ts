import { Hono } from 'hono';
import type { Env } from '../types';

const adminRoutes = new Hono<{ Bindings: Env }>();

// Admin ingestion - TODO: Implement
adminRoutes.post('/ingest', async (c) => {
  return c.json({ success: true, message: 'Ingestion endpoint ready' });
});

export { adminRoutes };
