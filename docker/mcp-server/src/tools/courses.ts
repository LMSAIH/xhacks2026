import * as db from '../db/sqlite.js';
import { searchCourseContent, getCourseOutline } from '../rag/cloudflare.js';

// Backend API URL - uses production by default, can be overridden
const rawBackendUrl = process.env.BACKEND_API_URL || 'https://sfu-ai-teacher.email4leit.workers.dev';
// Ensure URL has protocol
const BACKEND_API_URL = rawBackendUrl.startsWith('http') ? rawBackendUrl : `https://${rawBackendUrl}`;

// ============================================================================
// COURSE CODE NORMALIZATION (matches backend logic)
// ============================================================================

/**
 * Normalize course code to canonical format: "CMPT 225"
 * Handles: "CMPT225", "cmpt-225", "CMPT_225", "cmpt 225", etc.
 */
function normalizeCourseCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[-_]/g, ' ').trim();
  const match = cleaned.match(/^([A-Z]+)\s*(\d+\w*)$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return cleaned;
}

// ============================================================================
// BACKEND API CLIENT
// ============================================================================

interface BackendSearchResult {
  courses: Array<{
    name: string;
    title: string;
    description: string;
    units: string;
    prerequisites: string;
    corequisites: string;
    instructors: string;
    degree_level: string;
    delivery_method: string;
    term: string;
    relevance: number;
  }>;
  total: number;
  query: Record<string, unknown>;
}

async function searchBackendAPI(params: {
  query?: string;
  courseCode?: string;
  department?: string;
  level?: string;
  instructor?: string;
  prerequisites?: string;
  limit?: number;
}): Promise<BackendSearchResult> {
  try {
    // Try the advanced search endpoint first (POST)
    const response = await fetch(`${BACKEND_API_URL}/api/courses/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      return await response.json() as BackendSearchResult;
    }

    // Fallback: If searching by courseCode, try the direct endpoint GET /api/courses/:name
    if (params.courseCode && response.status === 404) {
      const encoded = encodeURIComponent(normalizeCourseCode(params.courseCode));
      const fallbackResponse = await fetch(`${BACKEND_API_URL}/api/courses/${encoded}`);
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json() as { course: BackendSearchResult['courses'][0] | null };
        if (data.course) {
          return {
            courses: [{
              name: data.course.name,
              title: data.course.title,
              description: data.course.description,
              units: data.course.units,
              prerequisites: data.course.prerequisites,
              corequisites: data.course.corequisites,
              instructors: data.course.instructors,
              degree_level: data.course.degree_level,
              delivery_method: data.course.delivery_method,
              term: data.course.term,
              relevance: 1.0,
            }],
            total: 1,
            query: params,
          };
        }
      }
    }

    throw new Error(`Backend API error: ${response.status}`);
  } catch (error) {
    console.error('Backend API search failed:', error);
    throw error;
  }
}

async function getCoursesRequiringPrereq(courseCode: string, limit = 10): Promise<BackendSearchResult> {
  try {
    const normalized = normalizeCourseCode(courseCode);
    const encoded = encodeURIComponent(normalized);
    const response = await fetch(`${BACKEND_API_URL}/api/courses/requiring/${encoded}?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json() as { prerequisite: string; courses: BackendSearchResult['courses']; total: number };
    return {
      courses: data.courses,
      total: data.total,
      query: { prerequisites: courseCode },
    };
  } catch (error) {
    console.error('Backend API prereq search failed:', error);
    throw error;
  }
}

async function getCoursesByInstructor(instructorName: string, limit = 10): Promise<BackendSearchResult> {
  try {
    const encoded = encodeURIComponent(instructorName);
    const response = await fetch(`${BACKEND_API_URL}/api/courses/instructor/${encoded}?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json() as { instructor: string; courses: BackendSearchResult['courses']; total: number };
    return {
      courses: data.courses,
      total: data.total,
      query: { instructor: instructorName },
    };
  } catch (error) {
    console.error('Backend API instructor search failed:', error);
    throw error;
  }
}

// ============================================================================
// SEARCH COURSES TOOL - Enhanced with rich filtering
// ============================================================================

export const SearchCoursesSchema = {
  name: 'search_courses',
  description: `Search for SFU courses with rich filtering options. Supports:
- Text search in titles and descriptions
- Course code lookup with normalization (CMPT225, CMPT 225, cmpt-225 all work)
- Filter by department, level (100-400, 500+), instructor
- Find courses that require a specific prerequisite
Examples: "CMPT 225", "machine learning", "courses requiring CMPT 120", "300-level CMPT"`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'General text search (title, description). E.g., "machine learning", "data structures"',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Course code to lookup. Normalizes automatically: "CMPT225" -> "CMPT 225"',
      },
      department: {
        type: 'string' as const,
        description: 'Filter by department code. E.g., "CMPT", "MATH", "PHYS"',
      },
      level: {
        type: 'string' as const,
        enum: ['100', '200', '300', '400', '500'],
        description: 'Filter by course level. "500" includes all graduate courses (500+)',
      },
      instructor: {
        type: 'string' as const,
        description: 'Search by instructor name',
      },
      prerequisites: {
        type: 'string' as const,
        description: 'Find courses that require this course as a prerequisite. E.g., "CMPT 225"',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum results to return (default: 10, max: 50)',
        default: 10,
      },
    },
    required: [],  // All parameters are optional for flexible querying
  },
};

export interface SearchCoursesParams {
  query?: string;
  courseCode?: string;
  department?: string;
  level?: '100' | '200' | '300' | '400' | '500';
  instructor?: string;
  prerequisites?: string;
  limit?: number;
}

export async function searchCourses(params: SearchCoursesParams) {
  const limit = Math.min(params.limit || 10, 50);

  try {
    // If searching for courses requiring a prereq, use dedicated endpoint
    if (params.prerequisites && !params.query && !params.courseCode && !params.department && !params.level && !params.instructor) {
      const result = await getCoursesRequiringPrereq(params.prerequisites, limit);
      return {
        courses: result.courses.map(c => ({
          code: c.name,
          title: c.title,
          description: c.description?.substring(0, 300) || '',
          units: c.units,
          prerequisites: c.prerequisites,
          corequisites: c.corequisites,
          instructors: c.instructors,
          level: c.degree_level,
          relevance: c.relevance,
        })),
        total: result.total,
        source: 'backend_api',
        searchType: 'prerequisites',
      };
    }

    // If searching by instructor only, use dedicated endpoint
    if (params.instructor && !params.query && !params.courseCode && !params.department && !params.level && !params.prerequisites) {
      const result = await getCoursesByInstructor(params.instructor, limit);
      return {
        courses: result.courses.map(c => ({
          code: c.name,
          title: c.title,
          description: c.description?.substring(0, 300) || '',
          units: c.units,
          prerequisites: c.prerequisites,
          corequisites: c.corequisites,
          instructors: c.instructors,
          level: c.degree_level,
          relevance: c.relevance,
        })),
        total: result.total,
        source: 'backend_api',
        searchType: 'instructor',
      };
    }

    // General search - use the advanced search endpoint
    const result = await searchBackendAPI({
      query: params.query,
      courseCode: params.courseCode,
      department: params.department,
      level: params.level,
      instructor: params.instructor,
      prerequisites: params.prerequisites,
      limit,
    });

    return {
      courses: result.courses.map(c => ({
        code: c.name,
        title: c.title,
        description: c.description?.substring(0, 300) || '',
        units: c.units,
        prerequisites: c.prerequisites,
        corequisites: c.corequisites,
        instructors: c.instructors,
        level: c.degree_level,
        relevance: c.relevance,
      })),
      total: result.total,
      source: 'backend_api',
      searchType: 'advanced',
    };
  } catch (backendError) {
    // Fallback to local SQLite + RAG if backend is unavailable
    console.warn('Backend API unavailable, falling back to local search:', backendError);

    const searchQuery = params.query || params.courseCode || params.department || '';
    
    // Try local SQLite first
    const localResults = db.searchCourses(searchQuery, limit);

    if (localResults.length > 0) {
      return {
        courses: localResults.map(c => ({
          code: c.course_code,
          title: c.title,
          description: c.description || '',
          units: null,
          prerequisites: null,
          corequisites: null,
          instructors: c.instructor_name || '',
          level: null,
          relevance: 0.8,
        })),
        total: localResults.length,
        source: 'local_fallback',
        searchType: 'simple',
      };
    }

    // Try RAG as last resort
    try {
      const ragResults = await searchCourseContent(searchQuery, { limit });
      return {
        courses: ragResults.map(r => ({
          code: r.document.course_code,
          title: r.document.title,
          description: r.document.content?.substring(0, 300) || '',
          units: null,
          prerequisites: null,
          corequisites: null,
          instructors: null,
          level: null,
          relevance: r.score,
        })),
        total: ragResults.length,
        source: 'rag_fallback',
        searchType: 'semantic',
      };
    } catch {
      return {
        courses: [],
        total: 0,
        source: 'none',
        error: 'All search sources unavailable',
      };
    }
  }
}

// ============================================================================
// GET COURSE OUTLINE TOOL - Enhanced
// ============================================================================

export const GetCourseOutlineSchema = {
  name: 'get_course_outline',
  description: 'Get detailed course information including outline, prerequisites, and instructor. Course code is normalized automatically.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      courseCode: {
        type: 'string' as const,
        description: 'Course code (e.g., "CMPT 225", "CMPT225", "cmpt-225" all work)',
      },
    },
    required: ['courseCode'],
  },
};

export interface GetCourseOutlineParams {
  courseCode: string;
}

export async function getCourseOutlineTool(params: GetCourseOutlineParams) {
  const normalized = normalizeCourseCode(params.courseCode);

  try {
    // Try backend API first for rich metadata
    const searchResult = await searchBackendAPI({
      courseCode: normalized,
      limit: 1,
    });

    if (searchResult.courses.length > 0) {
      const course = searchResult.courses[0];

      // Also get RAG content for the outline
      let ragOutline = '';
      try {
        const outline = await getCourseOutline(normalized);
        if (outline) {
          ragOutline = outline.outline;
        }
      } catch {
        // Continue without RAG outline
      }

      return {
        found: true,
        code: course.name,
        title: course.title,
        description: course.description,
        units: course.units,
        prerequisites: course.prerequisites,
        corequisites: course.corequisites,
        instructors: course.instructors,
        level: course.degree_level,
        deliveryMethod: course.delivery_method,
        term: course.term,
        outline: ragOutline || 'Outline not available in knowledge base',
        source: 'backend_api',
      };
    }

    // Fallback to RAG only
    const outline = await getCourseOutline(normalized);
    if (outline) {
      const localCourse = db.getCourseByCode(normalized);
      return {
        found: true,
        code: outline.course_code,
        title: outline.title,
        description: localCourse?.description || '',
        units: null,
        prerequisites: null,
        corequisites: null,
        instructors: localCourse?.instructor_name || null,
        level: null,
        deliveryMethod: null,
        term: null,
        outline: outline.outline,
        source: 'rag',
      };
    }

    return {
      found: false,
      code: normalized,
      message: 'Course not found',
    };
  } catch (error) {
    return {
      found: false,
      code: normalized,
      error: error instanceof Error ? error.message : 'Failed to fetch course',
    };
  }
}

// ============================================================================
// FIND PREREQUISITES TOOL - New convenience tool
// ============================================================================

export const FindPrerequisitesSchema = {
  name: 'find_prerequisites',
  description: 'Find all courses that require a specific course as a prerequisite. E.g., "What courses require CMPT 225?"',
  inputSchema: {
    type: 'object' as const,
    properties: {
      courseCode: {
        type: 'string' as const,
        description: 'The prerequisite course code to search for',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum results (default: 15)',
        default: 15,
      },
    },
    required: ['courseCode'],
  },
};

export interface FindPrerequisitesParams {
  courseCode: string;
  limit?: number;
}

export async function findPrerequisites(params: FindPrerequisitesParams) {
  const normalized = normalizeCourseCode(params.courseCode);
  const limit = params.limit || 15;

  try {
    const result = await getCoursesRequiringPrereq(normalized, limit);

    return {
      prerequisite: normalized,
      coursesRequiring: result.courses.map(c => ({
        code: c.name,
        title: c.title,
        prerequisites: c.prerequisites,
        instructors: c.instructors,
      })),
      total: result.total,
      message: result.total > 0
        ? `Found ${result.total} courses that require ${normalized}`
        : `No courses found that require ${normalized} as a prerequisite`,
    };
  } catch (error) {
    return {
      prerequisite: normalized,
      coursesRequiring: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}
