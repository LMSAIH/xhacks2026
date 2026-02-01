/**
 * MCP Server Client
 * HTTP client for calling the LearnLM MCP server tools via REST API
 * 
 * Uses /api/* endpoints which bypass MCP session requirements (faster, simpler)
 */

// MCP Server URL - can be overridden via env
const MCP_SERVER_URL = 'https://mcp.learn-lm.com';

// Response types
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Available MCP tools (for reference)
export const MCP_TOOLS = {
  // Tutoring tools
  ask_tutor: 'ask_tutor',
  get_study_tips: 'get_study_tips',
  explain_like_im_5: 'explain_like_im_5',
  generate_practice_questions: 'generate_practice_questions',
  
  // Course tools
  search_courses: 'search_courses',
  get_course_outline: 'get_course_outline',
  get_instructor_info: 'get_instructor_info',
  
  // Notes tools
  critique_notes: 'critique_notes',
  explain_concept: 'explain_concept',
  generate_diagram: 'generate_diagram',
  get_formulas: 'get_formulas',
  chat_message: 'chat_message',
  suggest_improvements: 'suggest_improvements',
  
  // Voice tools
  text_to_speech: 'text_to_speech',
  
  // Persona tools
  list_personas: 'list_personas',
  get_persona: 'get_persona',
} as const;

export type MCPToolName = keyof typeof MCP_TOOLS;

/**
 * Get MCP server health
 */
export async function getMCPHealth(): Promise<{ status: string }> {
  const response = await fetch(`${MCP_SERVER_URL}/health`);
  
  if (!response.ok) {
    throw new Error(`MCP health check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * List available MCP tools (via REST API)
 */
export async function listMCPTools(): Promise<MCPTool[]> {
  const response = await fetch(`${MCP_SERVER_URL}/api/tools`);

  if (!response.ok) {
    throw new Error(`Failed to list MCP tools: ${response.status}`);
  }

  const data = await response.json() as { tools: MCPTool[] };
  return data.tools || [];
}

/**
 * Generic tool call - routes to appropriate REST endpoint
 */
export async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  // Map tool names to REST endpoints
  const toolToEndpoint: Record<string, string> = {
    'ask_tutor': '/api/ask',
    'chat_message': '/api/ask',
    'explain_concept': '/api/explain',
    'critique_notes': '/api/critique',
    'get_formulas': '/api/formulas',
    'generate_diagram': '/api/diagram',
    'suggest_improvements': '/api/suggest',
  };

  const endpoint = toolToEndpoint[toolName];
  if (!endpoint) {
    throw new Error(`Unknown tool: ${toolName}. Use specific helper functions.`);
  }

  const response = await fetch(`${MCP_SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MCP REST call failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { response?: string; error?: string };
  
  if (data.error) {
    throw new Error(`MCP error: ${data.error}`);
  }

  // Convert REST response to MCP tool result format
  return {
    content: [{ type: 'text', text: data.response || JSON.stringify(data) }],
  };
}

// =============================================================================
// Convenience functions - call REST API directly (no session required!)
// =============================================================================

/**
 * Ask the AI a question (stateless chat)
 */
export async function askTutor(
  question: string,
  options?: {
    courseCode?: string;
    context?: string;
    personaId?: string;
  }
): Promise<string> {
  const response = await fetch(`${MCP_SERVER_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: question,
      course_code: options?.courseCode,
      section_title: options?.context,
      persona_id: options?.personaId,
      voice_mode: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ask failed: ${response.status} ${err}`);
  }

  const data = await response.json() as { response: string };
  return data.response || 'No response';
}

/**
 * Explain a concept with RAG context
 */
export async function explainConcept(
  concept: string,
  options?: {
    courseCode?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }
): Promise<string> {
  const response = await fetch(`${MCP_SERVER_URL}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concept,
      course_code: options?.courseCode,
      difficulty: options?.difficulty || 'intermediate',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Explain failed: ${response.status} ${err}`);
  }

  const data = await response.json() as { response: string };
  return data.response || 'No explanation available';
}

/**
 * Critique student notes
 */
export async function critiqueNotes(
  notes: string,
  options?: {
    courseCode?: string;
    topic?: string;
  }
): Promise<string> {
  const response = await fetch(`${MCP_SERVER_URL}/api/critique`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notes,
      course_code: options?.courseCode,
      topic: options?.topic,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Critique failed: ${response.status} ${err}`);
  }

  const data = await response.json() as { response: string };
  return data.response || 'No critique available';
}

/**
 * Get formulas for a topic
 */
export async function getFormulas(
  topic: string,
  options?: {
    courseCode?: string;
  }
): Promise<string> {
  const response = await fetch(`${MCP_SERVER_URL}/api/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      course_code: options?.courseCode,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Formulas failed: ${response.status} ${err}`);
  }

  const data = await response.json() as { response: string };
  return data.response || 'No formulas found';
}

/**
 * Generate a diagram for a concept
 */
export async function generateDiagram(
  concept: string,
  options?: {
    style?: 'diagram' | 'flowchart' | 'mindmap';
  }
): Promise<{ imageUrl?: string; description: string }> {
  const response = await fetch(`${MCP_SERVER_URL}/api/diagram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concept,
      style: options?.style || 'diagram',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Diagram failed: ${response.status} ${err}`);
  }

  const data = await response.json() as { imageUrl?: string; description?: string };
  return {
    imageUrl: data.imageUrl,
    description: data.description || 'Diagram generated',
  };
}

/**
 * Chat message (stateless, for voice mode)
 */
export async function chatMessage(
  message: string,
  options?: {
    courseCode?: string;
    sectionTitle?: string;
    personaId?: string;
    voiceMode?: boolean;
  }
): Promise<string> {
  const response = await fetch(`${MCP_SERVER_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      course_code: options?.courseCode,
      section_title: options?.sectionTitle,
      persona_id: options?.personaId,
      voice_mode: options?.voiceMode ?? true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Chat failed: ${response.status} ${err}`);
  }

  const data = await response.json() as { response: string };
  return data.response || 'No response';
}

/**
 * Search courses via RAG
 */
export async function searchCourses(
  query: string,
  limit?: number
): Promise<Array<{ courseCode: string; title: string; relevance: number }>> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit || 5),
  });

  const response = await fetch(`${MCP_SERVER_URL}/api/courses/search?${params}`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json() as { results: Array<{ courseCode: string; title: string; relevance: number }> };
  return data.results || [];
}

/**
 * Get personas list
 */
export async function listPersonas(): Promise<Array<{ id: string; name: string; description: string }>> {
  const response = await fetch(`${MCP_SERVER_URL}/api/personas`);

  if (!response.ok) {
    throw new Error(`List personas failed: ${response.status}`);
  }

  const data = await response.json() as { personas: Array<{ id: string; name: string; description: string }> };
  return data.personas || [];
}
