import 'dotenv/config';
import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerTools, TOOL_LIST } from './tools/index.js';

// Import tool functions directly for REST API (bypasses MCP session overhead)
import { searchCourses, getCourseOutlineTool } from './tools/courses.js';
import { getInstructorInfo } from './tools/instructors.js';
import { listPersonas } from './tools/personas.js';
import { listVoices, getVoiceForCourse } from './tools/voices.js';
import { startSession, askQuestion, endSession } from './tools/tutoring.js';
import {
  critiqueNotes,
  explainConcept,
  generateDiagram,
  getFormulas,
  chatMessage,
  suggestImprovements,
} from './tools/notes.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(express.json());

// CORS middleware for REST API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Store active transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'learnlm-mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    activeSessions: Object.keys(transports).length,
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'LearnLM MCP Server',
    version: '1.0.0',
    description: 'MCP server for SFU AI Tutor - Learn LM',
    endpoints: {
      health: '/health',
      mcp: '/mcp (POST, GET, DELETE)',
      rest: '/api/* (direct REST endpoints - faster, no session required)',
    },
    documentation: 'https://github.com/LMSAIH/xhacks2026',
  });
});

// =============================================================================
// DIRECT REST API ENDPOINTS (bypass MCP session - much faster!)
// =============================================================================

// List available tools
app.get('/api/tools', (_req: Request, res: Response) => {
  res.json({ tools: TOOL_LIST });
});

// --- Notes & Learning Tools ---

// Ask AI / Chat message (stateless)
app.post('/api/ask', async (req: Request, res: Response) => {
  try {
    const { message, question, course_code, section_title, persona_id, voice_mode } = req.body;
    const result = await chatMessage({
      message: message || question || '',
      course_code,
      section_title,
      persona_id,
      voice_mode: voice_mode ?? true,
    });
    res.json({ response: result.response });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Explain a concept
app.post('/api/explain', async (req: Request, res: Response) => {
  try {
    const { concept, course_code, difficulty } = req.body;
    if (!concept) {
      return res.status(400).json({ error: 'concept required' });
    }
    const result = await explainConcept({ concept, course_code, difficulty });
    res.json({ response: result.explanation });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Critique notes
app.post('/api/critique', async (req: Request, res: Response) => {
  try {
    const { notes, course_code, topic } = req.body;
    if (!notes) {
      return res.status(400).json({ error: 'notes required' });
    }
    const result = await critiqueNotes({ notes, course_code, topic });
    res.json({ response: result.critique });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get formulas
app.post('/api/formulas', async (req: Request, res: Response) => {
  try {
    const { topic, course_code } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'topic required' });
    }
    const result = await getFormulas({ topic, course_code });
    res.json({ response: result.formulas });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Generate diagram
app.post('/api/diagram', async (req: Request, res: Response) => {
  try {
    const { concept, style } = req.body;
    if (!concept) {
      return res.status(400).json({ error: 'concept required' });
    }
    const result = await generateDiagram({ concept, style });
    res.json({
      imageUrl: result.image_url,
      description: result.description,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Suggest improvements
app.post('/api/suggest', async (req: Request, res: Response) => {
  try {
    const { notes, course_code, topic } = req.body;
    if (!notes) {
      return res.status(400).json({ error: 'notes required' });
    }
    const result = await suggestImprovements({ notes, course_code, topic });
    res.json({ response: result.suggestions });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// --- Course Tools ---

// Search courses
app.get('/api/courses/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5;
    if (!query) {
      return res.status(400).json({ error: 'query (q) required' });
    }
    const result = await searchCourses({ query, limit });
    res.json({ results: result.results });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get course outline
app.get('/api/courses/:courseCode/outline', async (req: Request, res: Response) => {
  try {
    const course_code = req.params.courseCode;
    const result = await getCourseOutlineTool({ course_code });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get instructor info
app.get('/api/instructors/:name', async (req: Request, res: Response) => {
  try {
    const instructor_name = req.params.name;
    const result = await getInstructorInfo({ instructor_name });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// --- Voice & Personas ---

// List personas
app.get('/api/personas', (_req: Request, res: Response) => {
  res.json({ personas: listPersonas() });
});

// List voices
app.get('/api/voices', (_req: Request, res: Response) => {
  res.json({ voices: listVoices() });
});

// Get voice for course
app.get('/api/voices/:courseCode', (req: Request, res: Response) => {
  const courseCode = req.params.courseCode;
  res.json(getVoiceForCourse(courseCode));
});

// --- Tutoring Sessions (these still have state) ---

// Start tutoring session
app.post('/api/session/start', async (req: Request, res: Response) => {
  try {
    const { course_code, topic, persona_id, custom_instructions } = req.body;
    const result = await startSession({ course_code, topic, persona_id, custom_instructions });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Ask question in session
app.post('/api/session/:sessionId/ask', async (req: Request, res: Response) => {
  try {
    const session_id = req.params.sessionId;
    const { question, include_context } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'question required' });
    }
    const result = await askQuestion({ session_id, question, include_context });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// End session
app.post('/api/session/:sessionId/end', async (req: Request, res: Response) => {
  try {
    const session_id = req.params.sessionId;
    const result = await endSession({ session_id });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// =============================================================================
// MCP PROTOCOL ENDPOINTS (for MCP clients like OpenCode)
// =============================================================================

// Create a new MCP server instance with tools registered
function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'learnlm-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  registerTools(server);
  return server;
}

// MCP endpoint - handles POST requests (main communication)
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing session
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session initialization
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports[id] = transport;
        console.log(`[MCP] Session initialized: ${id}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
        console.log(`[MCP] Session closed: ${transport.sessionId}`);
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid session or missing initialization' },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// MCP endpoint - handles GET requests (SSE streaming)
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];
  
  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid session' },
      id: null,
    });
  }
});

// MCP endpoint - handles DELETE requests (session cleanup)
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];
  
  if (transport) {
    await transport.handleRequest(req, res);
    delete transports[sessionId];
    console.log(`[MCP] Session deleted: ${sessionId}`);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid session' },
      id: null,
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: unknown) => {
  console.error('[MCP] Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`LearnLM MCP HTTP Server running on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[MCP] Shutting down gracefully...');
  // Close all active sessions
  for (const [sessionId, transport] of Object.entries(transports)) {
    transport.close?.();
    console.log(`[MCP] Closed session: ${sessionId}`);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[MCP] Received SIGTERM, shutting down...');
  for (const [sessionId, transport] of Object.entries(transports)) {
    transport.close?.();
  }
  process.exit(0);
});
