import * as db from '../db/sqlite.js';
import { getInstructorInfo as getRagInstructorInfo } from '../rag/cloudflare.js';

export const GetInstructorInfoSchema = {
  name: 'get_instructor_info',
  description: 'Get information about a course instructor including ratings and courses taught',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string' as const,
        description: 'Instructor name (e.g., "John Smith")',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Optional course code to get instructor for specific course',
      },
    },
    required: ['name'],
  },
};

// Plain interface instead of z.infer (JSON Schema is used for MCP, not Zod)
export interface GetInstructorInfoParams {
  name: string;
  courseCode?: string;
}

export async function getInstructorInfo(params: GetInstructorInfoParams) {
  const { name, courseCode } = params;
  
  try {
    if (courseCode) {
      const course = db.getCourseByCode(courseCode);
      
      if (course && course.instructor_name) {
        return {
          name: course.instructor_name,
          rating: course.instructor_rating,
          course_code: courseCode,
          course_title: course.title,
          message: 'Instructor info from course catalog',
        };
      }
    }
    
    try {
      const ragInfo = await getRagInstructorInfo(name);
      
      if (ragInfo) {
        return {
          ...ragInfo,
          message: 'Instructor info from RAG knowledge base',
        };
      }
    } catch {
      // RAG failed, continue with local search
    }
    
    const courses = db.searchCourses(name, 5);
    const instructorCourses = courses.filter(
      c => c.instructor_name?.toLowerCase().includes(name.toLowerCase())
    );
    
    if (instructorCourses.length > 0) {
      return {
        name: instructorCourses[0].instructor_name,
        rating: instructorCourses[0].instructor_rating,
        courses_taught: instructorCourses.map(c => ({
          course_code: c.course_code,
          title: c.title,
        })),
        message: 'Instructor info from local database',
      };
    }
    
    return {
      name,
      message: 'Instructor not found in any knowledge base',
      suggestion: 'Try searching for courses they might teach',
    };
  } catch (error) {
    return {
      name,
      error: error instanceof Error ? error.message : 'Failed to fetch instructor info',
    };
  }
}
