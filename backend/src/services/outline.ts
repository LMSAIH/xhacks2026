import type { Env, CourseOutline } from '../types';

// KV cache keys and TTL
const KV_KEYS = {
  outline: (code: string) => `outline:${code}`,
  outlineEdited: (sessionId: string) => `outline:edited:${sessionId}`,
};

const KV_TTL = {
  OUTLINE: 60 * 60 * 24, // 24 hours
};

interface SFUCourse {
  dept: string;
  number: string;
  title: string;
  description: string;
  units: string;
  designation?: string;
  prerequisites?: string;
  corequisites?: string;
  notes?: string;
  offerings?: Array<{
    term: string;
    instructors?: string[];
  }>;
}

/**
 * Fetch course outline from SFU API (cached in KV)
 * Extracts topics, learning objectives, course topics, and summary
 */
export async function getCourseOutline(
  env: Env,
  courseCode: string
): Promise<CourseOutline | null> {
  const cacheKey = KV_KEYS.outline(courseCode);

  // Check KV cache first
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) {
    return cached as CourseOutline;
  }

  // Fetch from SFU API
  try {
    const response = await fetch('https://api.sfucourses.com/v1/rest/outlines');
    if (!response.ok) {
      return null;
    }

    const courses: SFUCourse[] = await response.json();
    const [dept, number] = courseCode.split(' ');
    const course = courses.find(
      (c) => c.dept === dept && c.number === number
    );

    if (!course) {
      return null;
    }

    // Generate outline from course data
    // Extract topics from description (simplified - in production, use NLP or structured data)
    const outline = generateOutlineFromCourse(course);

    // Cache the result
    await env.KV.put(cacheKey, JSON.stringify(outline), {
      expirationTtl: KV_TTL.OUTLINE,
    });

    return outline;
  } catch (error) {
    console.error('Error fetching course outline:', error);
    return null;
  }
}

/**
 * Generate outline structure from SFU course data
 */
function generateOutlineFromCourse(course: SFUCourse): CourseOutline {
  const description = course.description || '';

  // Extract key phrases as topics (simplified extraction)
  const topics = extractTopics(description);

  // Generate learning objectives from description
  const learningObjectives = generateLearningObjectives(description, course.title);

  // Course topics are broader categories
  const courseTopics = [
    course.title,
    ...(course.designation ? [course.designation] : []),
  ];

  // Summary is the course description
  const summary = description;

  return {
    topics,
    learningObjectives,
    courseTopics,
    summary,
  };
}

/**
 * Extract topics from course description
 */
function extractTopics(description: string): string[] {
  // Split by common delimiters and extract meaningful phrases
  const parts = description
    .split(/[;,.]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 100);

  // Return unique topics (max 10)
  return [...new Set(parts)].slice(0, 10);
}

/**
 * Generate learning objectives from description
 */
function generateLearningObjectives(description: string, title: string): string[] {
  const objectives: string[] = [];

  // Add default objectives based on course title
  objectives.push(`Understand core concepts of ${title}`);
  objectives.push(`Apply theoretical knowledge to practical problems`);

  // Extract action-oriented phrases from description
  const actionPhrases = description.match(
    /(?:understand|learn|develop|analyze|evaluate|create|apply|demonstrate|implement|design|solve)\s[^,.;]+/gi
  );

  if (actionPhrases) {
    objectives.push(
      ...actionPhrases.slice(0, 5).map((phrase) => phrase.charAt(0).toUpperCase() + phrase.slice(1))
    );
  }

  return [...new Set(objectives)].slice(0, 8);
}

/**
 * Store edited outline for a session (session-scoped, not persistent)
 */
export async function storeEditedOutline(
  env: Env,
  sessionId: string,
  courseCode: string,
  outline: CourseOutline
): Promise<void> {
  // Store in D1 for persistence during session
  await env.DB.prepare(`
    INSERT INTO outlines_edited (session_id, course_code, outline_json)
    VALUES (?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      outline_json = excluded.outline_json,
      course_code = excluded.course_code
  `).bind(sessionId, courseCode, JSON.stringify(outline)).run();
}

/**
 * Get outline (edited if exists, else original)
 */
export async function getOutline(
  env: Env,
  sessionId: string,
  courseCode: string
): Promise<CourseOutline | null> {
  // Check for edited outline first
  const edited = await env.DB.prepare(`
    SELECT outline_json FROM outlines_edited
    WHERE session_id = ?
    LIMIT 1
  `).bind(sessionId).first<{ outline_json: string }>();

  if (edited) {
    return JSON.parse(edited.outline_json) as CourseOutline;
  }

  // Fall back to original outline
  return getCourseOutline(env, courseCode);
}

/**
 * Delete edited outline for a session
 */
export async function deleteEditedOutline(
  env: Env,
  sessionId: string
): Promise<void> {
  await env.DB.prepare(`
    DELETE FROM outlines_edited WHERE session_id = ?
  `).bind(sessionId).run();
}
