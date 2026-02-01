/**
 * MCP Routes - AI Tools for slash commands
 * 
 * Uses Workers AI (Llama 3.1) for fast responses at the edge
 * Falls back to MCP server for advanced features (diagrams, etc.)
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import {
  askQuestion,
  explainConcept,
  critiqueNotes,
  critiqueNotesWithDiff,
  getFormulas,
} from '../services/ai-tools';

const mcpRoutes = new Hono<{ Bindings: Env }>();

// Health check
mcpRoutes.get('/health', async (c) => {
  return c.json({ status: 'ok', backend: 'workers-ai' });
});

// List available tools
mcpRoutes.get('/tools', async (c) => {
  return c.json({
    tools: [
      { name: 'ask', description: 'Ask AI a question' },
      { name: 'explain', description: 'Explain a concept' },
      { name: 'critique', description: 'Critique notes' },
      { name: 'formulas', description: 'Get formulas for a topic' },
    ],
  });
});

// ======================
// AI Tool Endpoints
// ======================

// Ask AI a question
mcpRoutes.post('/ask', async (c) => {
  try {
    const body = await c.req.json();
    const { question, courseCode, context, sessionId } = body as {
      question: string;
      courseCode?: string;
      context?: string;
      sessionId?: string;
    };

    if (!question) {
      return c.json({ error: 'question required' }, 400);
    }

    const response = await askQuestion(c.env, question, {
      courseCode,
      context,
      sessionId,
    });
    
    return c.json({ response });
  } catch (e) {
    console.error('Ask error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Explain a concept
mcpRoutes.post('/explain', async (c) => {
  try {
    const body = await c.req.json();
    const { concept, courseCode, difficulty, sessionId } = body as {
      concept: string;
      courseCode?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      sessionId?: string;
    };

    if (!concept) {
      return c.json({ error: 'concept required' }, 400);
    }

    const response = await explainConcept(c.env, concept, {
      courseCode,
      difficulty,
      sessionId,
    });
    
    return c.json({ response });
  } catch (e) {
    console.error('Explain error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Critique notes
mcpRoutes.post('/critique', async (c) => {
  try {
    const body = await c.req.json();
    const { notes, courseCode, context, sessionId } = body as {
      notes: string;
      courseCode?: string;
      context?: string;
      sessionId?: string;
    };

    if (!notes) {
      return c.json({ error: 'notes required' }, 400);
    }

    const response = await critiqueNotes(c.env, notes, {
      courseCode,
      context,
      sessionId,
    });
    
    return c.json({ response });
  } catch (e) {
    console.error('Critique error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Get formulas for a topic
mcpRoutes.post('/formulas', async (c) => {
  try {
    const body = await c.req.json();
    const { topic, courseCode, sessionId } = body as {
      topic: string;
      courseCode?: string;
      sessionId?: string;
    };

    if (!topic) {
      return c.json({ error: 'topic required' }, 400);
    }

    const response = await getFormulas(c.env, topic, {
      courseCode,
      sessionId,
    });
    
    return c.json({ response });
  } catch (e) {
    console.error('Formulas error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Critique notes with structured diff suggestions
mcpRoutes.post('/critique-diff', async (c) => {
  try {
    const body = await c.req.json();
    const { notes, courseCode, context, sessionId } = body as {
      notes: string;
      courseCode?: string;
      context?: string;
      sessionId?: string;
    };

    if (!notes) {
      return c.json({ error: 'notes required' }, 400);
    }

    const result = await critiqueNotesWithDiff(c.env, notes, {
      courseCode,
      context,
      sessionId,
    });
    
    return c.json(result);
  } catch (e) {
    console.error('Critique-diff error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

export { mcpRoutes };
