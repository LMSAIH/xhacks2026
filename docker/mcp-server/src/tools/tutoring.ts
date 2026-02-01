import * as db from '../db/sqlite.js';
import { searchCourseContent } from '../rag/cloudflare.js';
import { generateTutorResponse } from '../llm/openai.js';
import { getPersona, type PersonaId } from './personas.js';
import { getRecommendedVoice } from './voices.js';

export const StartSessionSchema = {
  name: 'start_tutoring_session',
  description: 'Start a new tutoring session for a course',
  inputSchema: {
    type: 'object' as const,
    properties: {
      courseCode: {
        type: 'string' as const,
        description: 'Course code (e.g., "CS 1100")',
      },
      persona: {
        type: 'string' as const,
        description: 'Tutor persona ID (socratic, professor, mentor, tutor)',
        default: 'tutor',
      },
      voiceId: {
        type: 'string' as const,
        description: 'Voice ID (optional, will auto-select if not provided)',
      },
      metadata: {
        type: 'object' as const,
        description: 'Optional session metadata',
      },
    },
    required: ['courseCode'],
  },
};

export const AskQuestionSchema = {
  name: 'ask_question',
  description: 'Ask a question to the tutor within an active session',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: {
        type: 'string' as const,
        description: 'The session ID from start_tutoring_session',
      },
      question: {
        type: 'string' as const,
        description: 'Your question for the tutor',
      },
    },
    required: ['sessionId', 'question'],
  },
};

export const EndSessionSchema = {
  name: 'end_session',
  description: 'End a tutoring session and clean up resources',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: {
        type: 'string' as const,
        description: 'The session ID to end',
      },
    },
    required: ['sessionId'],
  },
};

export const GetSessionInfoSchema = {
  name: 'get_session_info',
  description: 'Get information about an active tutoring session',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: {
        type: 'string' as const,
        description: 'The session ID',
      },
    },
    required: ['sessionId'],
  },
};

// Plain interfaces instead of z.infer (JSON Schema is used for MCP, not Zod)
export interface StartSessionParams {
  courseCode: string;
  persona?: string;
  voiceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AskQuestionParams {
  sessionId: string;
  question: string;
}

export interface EndSessionParams {
  sessionId: string;
}

export interface GetSessionInfoParams {
  sessionId: string;
}

export async function startSession(params: StartSessionParams) {
  const { courseCode, persona = 'tutor', voiceId, metadata = {} } = params;
  
  const selectedVoice = voiceId || getRecommendedVoice(courseCode);
  const session = db.createSession(courseCode, persona, selectedVoice, metadata);
  
  const course = db.getCourseByCode(courseCode);
  const personaInfo = getPersona(persona as PersonaId);
  
  db.addMessage(
    session.id,
    'system',
    `Tutoring session started for ${courseCode}. Persona: ${personaInfo.name}. Voice: ${selectedVoice}.`
  );
  
  return {
    session_id: session.id,
    course_code: courseCode,
    persona: personaInfo,
    voice_id: selectedVoice,
    created_at: session.created_at,
    welcome_message: `Welcome to your ${courseCode} tutoring session with ${personaInfo.name}! ${course?.title ? `Today we'll be covering ${course.title}.` : ''} What would you like to learn about?`,
  };
}

export async function askQuestion(params: AskQuestionParams) {
  const { sessionId, question } = params;
  
  const session = db.getSession(sessionId);
  
  if (!session) {
    return {
      error: 'Session not found',
      session_id: sessionId,
      suggestion: 'Start a new session with start_tutoring_session',
    };
  }
  
  db.addMessage(sessionId, 'user', question);
  
  const messages = db.getMessages(sessionId);
  const conversationHistory = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  
  let courseContext = '';
  try {
    const searchResults = await searchCourseContent(question, {
      limit: 5,
      courseCode: session.course_code,
    });
    
    if (searchResults.length > 0) {
      courseContext = searchResults
        .map(r => `[Relevance: ${r.score.toFixed(2)}] ${r.document.content}`)
        .join('\n\n---\n\n');
    } else {
      const course = db.getCourseByCode(session.course_code);
      courseContext = course?.outline || '';
    }
  } catch {
    const course = db.getCourseByCode(session.course_code);
    courseContext = course?.outline || '';
  }
  
  const persona = getPersona(session.persona as PersonaId);
  
  try {
    const response = await generateTutorResponse(
      conversationHistory,
      persona.systemPrompt,
      courseContext
    );
    
    db.addMessage(sessionId, 'assistant', response.content);
    
    return {
      session_id: sessionId,
      response: response.content,
      usage: response.usage,
    };
  } catch (error) {
    return {
      session_id: sessionId,
      error: error instanceof Error ? error.message : 'Failed to generate response',
      suggestion: 'Try rephrasing your question',
    };
  }
}

export async function endSession(params: EndSessionParams) {
  const { sessionId } = params;
  
  const session = db.getSession(sessionId);
  
  if (!session) {
    return {
      success: false,
      session_id: sessionId,
      message: 'Session not found or already ended',
    };
  }
  
  const messages = db.getMessages(sessionId);
  
  db.endSession(sessionId);
  
  return {
    success: true,
    session_id: sessionId,
    course_code: session.course_code,
    message_count: messages.length,
    duration_minutes: Math.round(
      (new Date(session.updated_at).getTime() - new Date(session.created_at).getTime()) / 60000
    ),
  };
}

export async function getSessionInfo(params: GetSessionInfoParams) {
  const { sessionId } = params;
  
  const session = db.getSession(sessionId);
  
  if (!session) {
    return {
      found: false,
      session_id: sessionId,
    };
  }
  
  const messages = db.getMessages(sessionId);
  const course = db.getCourseByCode(session.course_code);
  const persona = getPersona(session.persona as PersonaId);
  
  return {
    found: true,
    session_id: session.id,
    course_code: session.course_code,
    course_title: course?.title,
    persona: {
      id: persona.id,
      name: persona.name,
    },
    voice_id: session.voice_id,
    message_count: messages.length,
    created_at: session.created_at,
    updated_at: session.updated_at,
    recent_messages: messages.slice(-5).map(m => ({
      role: m.role,
      content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
    })),
  };
}
