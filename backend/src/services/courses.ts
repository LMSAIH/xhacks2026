import type { Env } from '../types';

interface SFUCourse {
  dept: string;
  number: string;
  title: string;
  description: string;
  units: string;
  designation?: string;
  degreeLevel?: string;
  deliveryMethod?: string;
  prerequisites?: string;
  corequisites?: string;
  notes?: string;
  offerings?: Array<{
    term: string;
    instructors?: string[];
  }>;
}

export async function updateCoursesFromAPI(env: Env, term: string): Promise<{
  success: boolean;
  message: string;
  coursesAdded: number;
  error?: string;
}> {
  try {
    // Clear all existing courses before syncing new ones
    await env.DB.prepare('DELETE FROM sfu_courses').run();

    // Fetch courses from SFU API
    const response = await fetch('https://api.sfucourses.com/v1/rest/outlines');
    
    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to fetch from SFU API',
        coursesAdded: 0,
        error: `HTTP ${response.status}`,
      };
    }

    const courses: SFUCourse[] = await response.json();

    let coursesAdded = 0;

    // Process and store each course that has offerings for the specified term
    for (const course of courses) {
      // Check if course has offerings for the specified term
      const hasTermOffering = course.offerings?.some(offering => offering.term === term);
      if (!hasTermOffering) {
        continue; // Skip courses without this term's offerings
      }

      const courseCode = `${course.dept} ${course.number}`;
      
      try {
        // Insert the course (no unique constraint issues since we cleared the DB)
        await env.DB.prepare(`
          INSERT INTO sfu_courses (
            name,
            description
          ) VALUES (?, ?)
        `).bind(
          courseCode,
          course.description
        ).run();

        coursesAdded++;
      } catch (insertError) {
        console.error(`Error inserting course ${courseCode}:`, insertError);
      }
    }

    return {
      success: true,
      message: `Successfully synced courses from SFU API for ${term}`,
      coursesAdded,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Error updating courses',
      coursesAdded: 0,
      error: errorMessage,
    };
  }
}

export async function getCourses(env: Env, filters?: {
  name?: string;
}): Promise<any[]> {
  let query = 'SELECT * FROM sfu_courses WHERE 1=1';
  const params: string[] = [];

  if (filters?.name) {
    query += ' AND name LIKE ?';
    params.push(`%${filters.name}%`);
  }

  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results || [];
}

export async function getCourseByCode(env: Env, courseCode: string): Promise<any | null> {
  const result = await env.DB.prepare(
    'SELECT * FROM sfu_courses WHERE name = ? LIMIT 1'
  ).bind(courseCode).first();

  return result || null;
}

export async function getCourse(env: Env, options: { id?: string; name?: string }): Promise<any | null> {
  if (options.id) {
    const result = await env.DB.prepare(
      'SELECT * FROM sfu_courses WHERE id = ? LIMIT 1'
    ).bind(options.id).first();
    return result || null;
  }

  if (options.name) {
    const result = await env.DB.prepare(
      'SELECT * FROM sfu_courses WHERE name = ? LIMIT 1'
    ).bind(options.name).first();
    return result || null;
  }

  return null;
}
