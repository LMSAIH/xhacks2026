import type {
  Env,
  SessionCreate,
  Session,
  SessionResponse,
  CourseOutline,
} from '../types';
import { getCourseOutline, storeEditedOutline } from './outline';
import { generateRagContext } from './rag';

/**
 * Create a new session with all user choices
 * Pre-generates RAG context and stores session data
 */
export async function createSession(
  env: Env,
  data: SessionCreate
): Promise<SessionResponse> {
  // Generate session ID
  const sessionId = crypto.randomUUID();

  // Get or use provided outline
  let outline: CourseOutline;
  if (data.outline) {
    outline = data.outline;
    // Store the edited outline
    await storeEditedOutline(env, sessionId, data.courseCode, outline);
  } else {
    const fetchedOutline = await getCourseOutline(env, data.courseCode);
    if (!fetchedOutline) {
      throw new Error(`Course outline not found for ${data.courseCode}`);
    }
    outline = fetchedOutline;
  }

  // Upsert instructor if provided
  let instructorId: string | null = null;
  if (data.instructor) {
    instructorId = await upsertInstructor(env, data.instructor);
  }

  // Generate RAG context (pre-generate embeddings)
  const ragContext = await generateRagContext(
    env,
    data.courseCode,
    sessionId,
    outline
  );

  // Generate personality prompt from config
  const personalityPrompt = generatePersonalityPrompt(
    data.courseCode,
    data.instructor,
    data.personalityConfig,
    outline
  );

  // Store session in D1
  await env.DB.prepare(`
    INSERT INTO course_sessions (
      id,
      course_code,
      instructor_id,
      voice_config,
      personality_config,
      outline_version,
      vectorize_ref,
      rag_chunk_count,
      personality_prompt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    sessionId,
    data.courseCode,
    instructorId,
    JSON.stringify(data.voiceConfig),
    JSON.stringify(data.personalityConfig),
    data.outline ? sessionId : null, // outline_version points to edited outline ID
    ragContext.vectorizeRef,
    ragContext.chunkCount,
    personalityPrompt
  ).run();

  return {
    sessionId,
    ragChunkCount: ragContext.chunkCount,
    personalityPrompt,
  };
}

/**
 * Upsert instructor in database
 */
async function upsertInstructor(
  env: Env,
  instructor: SessionCreate['instructor']
): Promise<string> {
  // Check if instructor exists
  const existing = await env.DB.prepare(`
    SELECT id FROM instructors WHERE sfu_id = ?
  `).bind(instructor.sfuId).first<{ id: string }>();

  if (existing) {
    // Update rating if changed
    await env.DB.prepare(`
      UPDATE instructors SET rating = ?, updated_at = datetime('now')
      WHERE sfu_id = ?
    `).bind(instructor.rating ?? null, instructor.sfuId).run();
    return existing.id;
  }

  // Insert new instructor
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO instructors (id, sfu_id, name, rating)
    VALUES (?, ?, ?, ?)
  `).bind(id, instructor.sfuId, instructor.name, instructor.rating ?? null).run();

  return id;
}

/**
 * Generate personality prompt from configuration
 */
function generatePersonalityPrompt(
  courseCode: string,
  instructor: SessionCreate['instructor'],
  personalityConfig: SessionCreate['personalityConfig'],
  outline: CourseOutline
): string {
  const traits = personalityConfig.traits.join(', ');
  const topics = outline.topics.slice(0, 5).join(', ');
  const objectives = outline.learningObjectives.slice(0, 3).join('; ');

  // Build the personality prompt
  let prompt = personalityConfig.systemPrompt || '';

  // Add course context
  prompt += `\n\nYou are a tutor for ${courseCode}.`;

  // Add instructor context if available
  if (instructor) {
    prompt += ` You are teaching in the style of ${instructor.name}.`;
    if (instructor.rating && instructor.rating >= 4) {
      prompt += ` You are a highly-rated instructor (${instructor.rating}/5).`;
    }
  }

  // Add personality traits
  if (traits) {
    prompt += `\n\nYour teaching style is: ${traits}.`;
  }

  // Add course topics
  prompt += `\n\nKey topics to cover: ${topics}.`;

  // Add learning objectives
  prompt += `\n\nLearning objectives: ${objectives}.`;

  // Add summary context
  if (outline.summary) {
    prompt += `\n\nCourse summary: ${outline.summary}`;
  }

  return prompt.trim();
}

/**
 * Get session by ID
 */
export async function getSession(
  env: Env,
  sessionId: string
): Promise<Session | null> {
  const result = await env.DB.prepare(`
    SELECT
      id,
      course_code,
      instructor_id,
      voice_config,
      personality_config,
      outline_version,
      vectorize_ref,
      rag_chunk_count,
      personality_prompt,
      created_at
    FROM course_sessions
    WHERE id = ?
  `).bind(sessionId).first<{
    id: string;
    course_code: string;
    instructor_id: string | null;
    voice_config: string;
    personality_config: string;
    outline_version: string | null;
    vectorize_ref: string | null;
    rag_chunk_count: number;
    personality_prompt: string;
    created_at: string;
  }>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    courseCode: result.course_code,
    instructorId: result.instructor_id ?? undefined,
    voiceConfig: JSON.parse(result.voice_config),
    personalityConfig: JSON.parse(result.personality_config),
    outlineVersion: result.outline_version ?? undefined,
    vectorizeRef: result.vectorize_ref ?? undefined,
    ragChunkCount: result.rag_chunk_count,
    personalityPrompt: result.personality_prompt,
    createdAt: result.created_at,
  };
}

/**
 * Delete a session and its associated data
 */
export async function deleteSession(
  env: Env,
  sessionId: string
): Promise<void> {
  // Delete edited outline
  await env.DB.prepare(`
    DELETE FROM outlines_edited WHERE session_id = ?
  `).bind(sessionId).run();

  // Delete session
  await env.DB.prepare(`
    DELETE FROM course_sessions WHERE id = ?
  `).bind(sessionId).run();

  // TODO: Delete vectors from Vectorize
}
