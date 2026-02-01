import * as db from '../db/sqlite.js';
import { searchCourseContent, getCourseOutline } from '../rag/cloudflare.js';

export const SearchCoursesSchema = {
  name: 'search_courses',
  description: 'Search for SFU courses by keyword, code, or description',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'Search query (e.g., "machine learning", "CS 1100", "data structures")',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results (default: 10)',
        default: 10,
      },
    },
    required: ['query'],
  },
};

export const GetCourseOutlineSchema = {
  name: 'get_course_outline',
  description: 'Get detailed course outline and content from RAG knowledge base',
  inputSchema: {
    type: 'object' as const,
    properties: {
      courseCode: {
        type: 'string' as const,
        description: 'Course code (e.g., "CS 1100")',
      },
    },
    required: ['courseCode'],
  },
};

// Plain interfaces instead of z.infer (JSON Schema is used for MCP, not Zod)
export interface SearchCoursesParams {
  query: string;
  limit?: number;
}

export interface GetCourseOutlineParams {
  courseCode: string;
}

export async function searchCourses(params: SearchCoursesParams) {
  const { query, limit = 10 } = params;
  
  try {
    const localResults = db.searchCourses(query, limit);
    
    if (localResults.length >= limit) {
      return {
        courses: localResults.map(c => ({
          course_code: c.course_code,
          title: c.title,
          description: c.description,
          credits: c.credits,
          department: c.department,
          instructor: c.instructor_name,
        })),
        source: 'local',
      };
    }
    
    const ragResults = await searchCourseContent(query, { limit: limit - localResults.length });
    
    const combined = [
      ...localResults.map(c => ({
        course_code: c.course_code,
        title: c.title,
        description: c.description,
        credits: c.credits,
        department: c.department,
        instructor: c.instructor_name,
        relevance: 1,
      })),
      ...ragResults.map(r => ({
        course_code: r.document.course_code,
        title: r.document.title,
        description: r.document.content.substring(0, 200),
        credits: null,
        department: null,
        instructor: null,
        relevance: r.score,
      })),
    ];
    
    return {
      courses: combined.slice(0, limit),
      source: 'hybrid',
    };
  } catch (error) {
    return {
      courses: db.searchCourses(query, limit).map(c => ({
        course_code: c.course_code,
        title: c.title,
        description: c.description,
        credits: c.credits,
        department: c.department,
        instructor: c.instructor_name,
      })),
      source: 'local',
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

export async function getCourseOutlineTool(params: GetCourseOutlineParams) {
  const { courseCode } = params;
  
  try {
    const outline = await getCourseOutline(courseCode);
    
    if (!outline) {
      return {
        found: false,
        course_code: courseCode,
        message: 'Course not found in RAG knowledge base',
      };
    }
    
    const localCourse = db.getCourseByCode(courseCode);
    
    return {
      found: true,
      course_code: outline.course_code,
      title: outline.title,
      description: localCourse?.description || '',
      credits: localCourse?.credits || 0,
      department: localCourse?.department || '',
      instructor: localCourse?.instructor_name,
      instructor_rating: localCourse?.instructor_rating,
      outline: outline.outline,
    };
  } catch (error) {
    return {
      found: false,
      course_code: courseCode,
      error: error instanceof Error ? error.message : 'Failed to fetch outline',
    };
  }
}
