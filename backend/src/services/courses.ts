import type { Env, CourseWithInstructor, Instructor } from '../types';

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

// KV cache keys and TTL
const KV_KEYS = {
  course: (code: string) => `course:${code}`,
  courseWithInstructor: (code: string) => `course:instructor:${code}`,
  allCourses: 'courses:all',
};

const KV_TTL = {
  COURSE: 60 * 60 * 24, // 24 hours
};

/**
 * Get course with instructor from SFU API (with KV caching)
 */
export async function getCourseWithInstructor(
  env: Env,
  courseCode: string
): Promise<CourseWithInstructor | null> {
  const cacheKey = KV_KEYS.courseWithInstructor(courseCode);

  // Check KV cache first
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) {
    return cached as CourseWithInstructor;
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

    // Extract instructor from most recent offering
    let instructor: Instructor | null = null;
    if (course.offerings && course.offerings.length > 0) {
      const latestOffering = course.offerings[0];
      if (latestOffering.instructors && latestOffering.instructors.length > 0) {
        const instructorName = latestOffering.instructors[0];
        instructor = {
          sfuId: instructorName.toLowerCase().replace(/\s+/g, '-'),
          name: instructorName,
          department: course.dept,
        };
      }
    }

    const result: CourseWithInstructor = {
      course: {
        code: `${course.dept} ${course.number}`,
        title: course.title,
        description: course.description,
        prerequisites: course.prerequisites,
        units: course.units,
      },
      instructor,
    };

    // Cache the result
    await env.KV.put(cacheKey, JSON.stringify(result), {
      expirationTtl: KV_TTL.COURSE,
    });

    return result;
  } catch (error) {
    console.error('Error fetching course with instructor:', error);
    return null;
  }
}

/**
 * Search courses from KV cache or SFU API
 */
export async function searchCourses(
  env: Env,
  query: string
): Promise<SFUCourse[]> {
  // Check if we have all courses cached
  const cached = await env.KV.get(KV_KEYS.allCourses, 'json');
  let courses: SFUCourse[];

  if (cached) {
    courses = cached as SFUCourse[];
  } else {
    // Fetch from SFU API
    const response = await fetch('https://api.sfucourses.com/v1/rest/outlines');
    if (!response.ok) {
      return [];
    }
    courses = await response.json();

    // Cache all courses
    await env.KV.put(KV_KEYS.allCourses, JSON.stringify(courses), {
      expirationTtl: KV_TTL.COURSE,
    });
  }

  // Filter by query
  const lowerQuery = query.toLowerCase();
  return courses.filter(
    (c) =>
      `${c.dept} ${c.number}`.toLowerCase().includes(lowerQuery) ||
      c.title.toLowerCase().includes(lowerQuery) ||
      c.description?.toLowerCase().includes(lowerQuery)
  );
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
