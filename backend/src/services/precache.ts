/**
 * Pre-caching Service for Popular SFU Courses
 * 
 * Generates and caches outlines for popular courses to improve
 * initial load times. Can be triggered manually or via scheduled worker.
 */

import type { Env } from '../types';

// Popular SFU courses that are frequently accessed
// These are high-enrollment courses that benefit most from pre-caching
export const POPULAR_COURSES = [
  // Computer Science
  { code: 'CMPT 120', name: 'Introduction to Computing Science and Programming I' },
  { code: 'CMPT 125', name: 'Introduction to Computing Science and Programming II' },
  { code: 'CMPT 225', name: 'Data Structures and Programming' },
  { code: 'CMPT 276', name: 'Introduction to Software Engineering' },
  { code: 'CMPT 295', name: 'Introduction to Computer Systems' },
  { code: 'CMPT 354', name: 'Database Systems I' },
  { code: 'CMPT 300', name: 'Operating Systems I' },
  
  // Mathematics
  { code: 'MATH 150', name: 'Calculus I with Review' },
  { code: 'MATH 151', name: 'Calculus I' },
  { code: 'MATH 152', name: 'Calculus II' },
  { code: 'MATH 232', name: 'Applied Linear Algebra' },
  { code: 'STAT 270', name: 'Introduction to Probability and Statistics' },
  
  // Business
  { code: 'BUS 251', name: 'Financial Accounting I' },
  { code: 'BUS 252', name: 'Managerial Accounting' },
  { code: 'BUS 312', name: 'Introduction to Finance' },
  
  // Economics
  { code: 'ECON 103', name: 'Principles of Microeconomics' },
  { code: 'ECON 105', name: 'Principles of Macroeconomics' },
  
  // Psychology
  { code: 'PSYC 100', name: 'Introduction to Psychology I' },
  { code: 'PSYC 102', name: 'Introduction to Psychology II' },
  
  // English
  { code: 'ENGL 199', name: 'Introduction to University Writing' },
];

// KV cache keys for pre-cached outlines
const PRECACHE_KEYS = {
  outline: (code: string) => `precache:outline:${code.replace(/\s+/g, '-').toLowerCase()}`,
  experts: (code: string) => `precache:experts:${code.replace(/\s+/g, '-').toLowerCase()}`,
  lastRun: 'precache:last-run',
};

const PRECACHE_TTL = 60 * 60 * 24 * 7; // 7 days

interface PrecachedOutline {
  id: string;
  topic: string;
  sections: Array<{
    id: string;
    number: string;
    title: string;
    description?: string;
    duration?: string;
    children?: Array<{
      id: string;
      number: string;
      title: string;
      description?: string;
      duration?: string;
    }>;
  }>;
  learningObjectives: string[];
  estimatedDuration: string;
  difficulty: string;
  cachedAt: string;
}

interface PrecachedExperts {
  experts: Array<{
    id: string;
    name: string;
    title: string;
    era: string;
    description: string;
    teachingStyle: string;
  }>;
  cachedAt: string;
}

/**
 * Get a pre-cached outline for a course
 */
export async function getPrecachedOutline(
  env: Env,
  courseCode: string
): Promise<PrecachedOutline | null> {
  try {
    const cached = await env.KV.get(PRECACHE_KEYS.outline(courseCode), 'json');
    return cached as PrecachedOutline | null;
  } catch {
    return null;
  }
}

/**
 * Get pre-cached experts for a course
 */
export async function getPrecachedExperts(
  env: Env,
  courseCode: string
): Promise<PrecachedExperts | null> {
  try {
    const cached = await env.KV.get(PRECACHE_KEYS.experts(courseCode), 'json');
    return cached as PrecachedExperts | null;
  } catch {
    return null;
  }
}

/**
 * Generate and cache an outline for a course
 */
async function generateAndCacheOutline(
  env: Env,
  courseCode: string,
  courseName: string
): Promise<boolean> {
  try {
    const topic = `${courseCode}: ${courseName}`;
    
    const prompt = `Create a comprehensive course outline for: "${topic}"

Difficulty level: intermediate

Generate a structured course outline with 5-7 main sections. Each section should have 2-4 subsections.

Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "sections": [
    {
      "id": "1",
      "number": "1",
      "title": "Section Title",
      "description": "Brief description of what this section covers",
      "duration": "15 min",
      "children": [
        {
          "id": "1.1",
          "number": "1.1",
          "title": "Subsection Title",
          "description": "What this covers",
          "duration": "5 min"
        }
      ]
    }
  ],
  "learningObjectives": [
    "By the end of this course, you will be able to...",
    "Understand the core concepts of...",
    "Apply knowledge to..."
  ],
  "estimatedDuration": "2 hours",
  "difficulty": "intermediate"
}

Make the outline logical, progressive, and practical.`;

    // @ts-expect-error - Model name is valid but not in local type definitions
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert curriculum designer. Always respond with ONLY valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    }) as { response?: string };

    const content = response?.response;
    if (!content) return false;

    // Parse JSON
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7);
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3);
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3);
    cleanedContent = cleanedContent.trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedContent = jsonMatch[0];

    const parsed = JSON.parse(cleanedContent);
    
    const outlineId = `precache-${courseCode.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    
    const precachedOutline: PrecachedOutline = {
      id: outlineId,
      topic,
      sections: parsed.sections || [],
      learningObjectives: parsed.learningObjectives || [],
      estimatedDuration: parsed.estimatedDuration || '2 hours',
      difficulty: parsed.difficulty || 'intermediate',
      cachedAt: new Date().toISOString(),
    };

    // Cache in KV
    await env.KV.put(
      PRECACHE_KEYS.outline(courseCode),
      JSON.stringify(precachedOutline),
      { expirationTtl: PRECACHE_TTL }
    );

    return true;
  } catch (error) {
    console.error(`Failed to pre-cache outline for ${courseCode}:`, error);
    return false;
  }
}

/**
 * Generate and cache experts for a course
 */
async function generateAndCacheExperts(
  env: Env,
  courseCode: string,
  courseName: string
): Promise<boolean> {
  try {
    const topic = `${courseCode}: ${courseName}`;
    
    const prompt = `Find 6 experts who would be ideal teachers for: "${topic}"

Return ONLY valid JSON (no markdown) with this structure:
{
  "experts": [
    {
      "id": "unique-id",
      "name": "Full Name",
      "title": "Their title or role",
      "era": "Time period or 'Contemporary'",
      "description": "Brief bio (1-2 sentences)",
      "teachingStyle": "How they would teach this topic (1 sentence)"
    }
  ]
}

Include a mix of historical figures and contemporary experts relevant to the topic.`;

    // @ts-expect-error - Model name is valid but not in local type definitions
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert at finding educators. Always respond with ONLY valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }) as { response?: string };

    const content = response?.response;
    if (!content) return false;

    // Parse JSON
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7);
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3);
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3);
    cleanedContent = cleanedContent.trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedContent = jsonMatch[0];

    const parsed = JSON.parse(cleanedContent);
    
    const precachedExperts: PrecachedExperts = {
      experts: parsed.experts || [],
      cachedAt: new Date().toISOString(),
    };

    // Cache in KV
    await env.KV.put(
      PRECACHE_KEYS.experts(courseCode),
      JSON.stringify(precachedExperts),
      { expirationTtl: PRECACHE_TTL }
    );

    return true;
  } catch (error) {
    console.error(`Failed to pre-cache experts for ${courseCode}:`, error);
    return false;
  }
}

/**
 * Run pre-caching for all popular courses
 * This should be called by a scheduled worker or manual trigger
 */
export async function runPrecaching(
  env: Env,
  options: { maxCourses?: number; skipExperts?: boolean } = {}
): Promise<{
  success: boolean;
  outlinesGenerated: number;
  expertsGenerated: number;
  errors: string[];
}> {
  const { maxCourses = POPULAR_COURSES.length, skipExperts = false } = options;
  
  const errors: string[] = [];
  let outlinesGenerated = 0;
  let expertsGenerated = 0;

  const coursesToProcess = POPULAR_COURSES.slice(0, maxCourses);

  for (const course of coursesToProcess) {
    // Check if already cached (skip if fresh)
    const existingOutline = await getPrecachedOutline(env, course.code);
    if (existingOutline) {
      const cachedAt = new Date(existingOutline.cachedAt);
      const hoursSinceCached = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);
      
      // Skip if cached less than 24 hours ago
      if (hoursSinceCached < 24) {
        console.log(`Skipping ${course.code} - cached ${hoursSinceCached.toFixed(1)} hours ago`);
        continue;
      }
    }

    // Generate outline
    const outlineSuccess = await generateAndCacheOutline(env, course.code, course.name);
    if (outlineSuccess) {
      outlinesGenerated++;
      console.log(`Pre-cached outline for ${course.code}`);
    } else {
      errors.push(`Failed to generate outline for ${course.code}`);
    }

    // Generate experts (unless skipped)
    if (!skipExperts) {
      const expertsSuccess = await generateAndCacheExperts(env, course.code, course.name);
      if (expertsSuccess) {
        expertsGenerated++;
        console.log(`Pre-cached experts for ${course.code}`);
      } else {
        errors.push(`Failed to generate experts for ${course.code}`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Update last run timestamp
  await env.KV.put(PRECACHE_KEYS.lastRun, new Date().toISOString());

  return {
    success: errors.length === 0,
    outlinesGenerated,
    expertsGenerated,
    errors,
  };
}

/**
 * Get pre-cache status
 */
export async function getPrecacheStatus(env: Env): Promise<{
  lastRun: string | null;
  cachedCourses: Array<{ code: string; hasOutline: boolean; hasExperts: boolean }>;
}> {
  const lastRun = await env.KV.get(PRECACHE_KEYS.lastRun);
  
  const cachedCourses = await Promise.all(
    POPULAR_COURSES.map(async (course) => {
      const outline = await getPrecachedOutline(env, course.code);
      const experts = await getPrecachedExperts(env, course.code);
      return {
        code: course.code,
        hasOutline: !!outline,
        hasExperts: !!experts,
      };
    })
  );

  return { lastRun, cachedCourses };
}
