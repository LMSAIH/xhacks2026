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
      
      // Get the term offering info
      const termOffering = course.offerings?.find(o => o.term === term);
      const instructors = termOffering?.instructors?.join(', ') || '';
      
      try {
        // Insert the course with all fields
        await env.DB.prepare(`
          INSERT INTO sfu_courses (
            name,
            title,
            description,
            units,
            prerequisites,
            corequisites,
            notes,
            designation,
            delivery_method,
            degree_level,
            term,
            instructors
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          courseCode,
          course.title || '',
          course.description || '',
          course.units || '',
          course.prerequisites || '',
          course.corequisites || '',
          course.notes || '',
          course.designation || '',
          course.deliveryMethod || '',
          course.degreeLevel || '',
          term,
          instructors
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

// Popular SFU courses as seed data when database is empty
const SEED_COURSES = [
  { name: 'CMPT 120', title: 'Introduction to Computing Science and Programming I', description: 'An introduction to computing science and computer programming, suitable for students with little or no programming background.', units: '3', prerequisites: '', designation: 'Quantitative' },
  { name: 'CMPT 125', title: 'Introduction to Computing Science and Programming II', description: 'A continuation of CMPT 120. Introduces more advanced programming concepts and basic data structures.', units: '3', prerequisites: 'CMPT 120', designation: 'Quantitative' },
  { name: 'CMPT 225', title: 'Data Structures and Programming', description: 'Introduction to a variety of practical and important data structures and their implementations: stacks, queues, hash tables, binary search trees, heaps.', units: '3', prerequisites: 'CMPT 125 or CMPT 129', designation: 'Quantitative' },
  { name: 'CMPT 276', title: 'Introduction to Software Engineering', description: 'An overview of various techniques used for software development and for the management of software development projects.', units: '3', prerequisites: 'CMPT 225', designation: '' },
  { name: 'CMPT 295', title: 'Introduction to Computer Systems', description: 'Introduction to the organization of modern digital computers: logic and data representation, computer arithmetic and architecture.', units: '3', prerequisites: 'CMPT 125 or CMPT 129', designation: '' },
  { name: 'CMPT 300', title: 'Operating Systems I', description: 'An introduction to operating systems. Topics include concurrent processes, inter-process communication, scheduling, memory management.', units: '3', prerequisites: 'CMPT 225 and (CMPT 295 or ENSC 254)', designation: '' },
  { name: 'CMPT 354', title: 'Database Systems I', description: 'Logical representations of data by relational, network, hierarchical models. Relational algebra. Introduction to SQL.', units: '3', prerequisites: 'CMPT 225', designation: '' },
  { name: 'MATH 150', title: 'Calculus I with Review', description: 'Designed for students specializing in mathematics, physics, chemistry, computing science and engineering. Differential calculus.', units: '4', prerequisites: 'Pre-Calculus 12 or equivalent', designation: 'Quantitative' },
  { name: 'MATH 151', title: 'Calculus I', description: 'Limits, derivatives, Mean Value Theorem, applications of derivatives, integrals, Fundamental Theorem of Calculus.', units: '3', prerequisites: 'Pre-Calculus 12 with grade A or BC Principles of Math 12', designation: 'Quantitative' },
  { name: 'MATH 152', title: 'Calculus II', description: 'Techniques of integration, applications of integration, infinite series, Taylor and Maclaurin series.', units: '3', prerequisites: 'MATH 150 or MATH 151', designation: 'Quantitative' },
  { name: 'MATH 232', title: 'Applied Linear Algebra', description: 'Linear equations, matrices, determinants. Introduction to vector spaces. Eigenvalues and eigenvectors.', units: '3', prerequisites: 'MATH 150 or MATH 151', designation: 'Quantitative' },
  { name: 'STAT 270', title: 'Introduction to Probability and Statistics', description: 'Basic laws of probability, sample distributions. Introduction to statistical inference.', units: '3', prerequisites: 'MATH 152', designation: 'Quantitative' },
  { name: 'PHYS 120', title: 'Modern Physics and Mechanics', description: 'Special relativity, kinematics, dynamics, momentum, energy, angular momentum, rotation.', units: '3', prerequisites: 'BC Physics 12 or equivalent', designation: 'Science' },
  { name: 'PHYS 121', title: 'Optics, Electricity and Magnetism', description: 'Waves and optics; electricity and magnetism; Maxwell equations and electromagnetic waves.', units: '3', prerequisites: 'PHYS 120', designation: 'Science' },
  { name: 'CHEM 121', title: 'General Chemistry I', description: 'Atomic and molecular structure; chemical bonding; thermochemistry; elements; gases; liquids, solids.', units: '4', prerequisites: 'Chemistry 12', designation: 'Science' },
  { name: 'BISC 101', title: 'General Biology', description: 'Introduction to the study of life focusing on the cell, molecular basis of life, genetics and evolution.', units: '3', prerequisites: 'None', designation: 'Science' },
  { name: 'ECON 103', title: 'Principles of Microeconomics', description: 'Analysis of individual decision-making and markets. Supply and demand, consumer theory, production.', units: '3', prerequisites: 'None', designation: 'Social Science' },
  { name: 'ECON 105', title: 'Principles of Macroeconomics', description: 'Analysis of national income, employment, inflation. Monetary and fiscal policy.', units: '3', prerequisites: 'None', designation: 'Social Science' },
  { name: 'BUS 237', title: 'Introduction to Business Technology Management', description: 'Introduction to current technologies and their business applications. E-commerce, networks, databases.', units: '3', prerequisites: 'None', designation: '' },
  { name: 'BUS 251', title: 'Financial Accounting I', description: 'Introduction to accounting: assets, liabilities, equity, revenue, expenses. Financial statements.', units: '3', prerequisites: 'None', designation: '' },
  { name: 'PSYC 100', title: 'Introduction to Psychology I', description: 'A survey of major topics in psychology including history, research methods, biological bases of behavior.', units: '3', prerequisites: 'None', designation: 'Social Science' },
  { name: 'ENGL 101', title: 'Introduction to Fiction', description: 'An introduction to reading prose fiction: the novel and short story.', units: '3', prerequisites: 'None', designation: 'Humanities' },
  { name: 'PHIL 100', title: 'Knowledge and Reality', description: 'Introduction to philosophy through study of selected problems concerning knowledge and reality.', units: '3', prerequisites: 'None', designation: 'Humanities' },
  { name: 'HIST 101', title: 'Canada to Confederation', description: 'Canadian history to 1867: colonization, colonial conflict, British North America.', units: '3', prerequisites: 'None', designation: 'Humanities' },
];

async function seedCoursesIfEmpty(env: Env): Promise<boolean> {
  try {
    // Check if database has any courses
    const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM sfu_courses').first<{ count: number }>();
    
    if (countResult && countResult.count > 0) {
      return false; // Already has data
    }

    console.log('Database empty, seeding with popular courses...');

    // Insert seed courses
    for (const course of SEED_COURSES) {
      try {
        await env.DB.prepare(`
          INSERT INTO sfu_courses (name, title, description, units, prerequisites, designation, term)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          course.name,
          course.title,
          course.description,
          course.units,
          course.prerequisites,
          course.designation,
          'Seed Data'
        ).run();
      } catch (e) {
        console.error(`Failed to insert seed course ${course.name}:`, e);
      }
    }

    console.log(`Seeded ${SEED_COURSES.length} courses`);
    return true;
  } catch (e) {
    console.error('Error checking/seeding courses:', e);
    return false;
  }
}

export async function getCourses(env: Env, filters?: {
  name?: string;
}): Promise<any[]> {
  // Seed database with popular courses if empty
  await seedCoursesIfEmpty(env);

  let query = 'SELECT * FROM sfu_courses WHERE 1=1';
  const params: string[] = [];

  if (filters?.name) {
    query += ' AND name LIKE ?';
    params.push(`%${filters.name}%`);
  }

  query += ' ORDER BY name ASC LIMIT 100';

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

// ============================================================================
// ADVANCED SEARCH - For MCP and rich querying
// ============================================================================

/**
 * Normalize course code to canonical format: "CMPT 225"
 * Handles: "CMPT225", "cmpt-225", "CMPT_225", "cmpt 225", etc.
 */
export function normalizeCourseCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[-_]/g, ' ').trim();
  // Match pattern: DEPT + optional space + NUMBER (with optional letter suffix)
  const match = cleaned.match(/^([A-Z]+)\s*(\d+\w*)$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return cleaned;
}

/**
 * Extract department and number from a course code
 */
export function parseCourseCode(code: string): { dept: string; number: string; level: string } | null {
  const normalized = normalizeCourseCode(code);
  const match = normalized.match(/^([A-Z]+)\s+(\d+\w*)$/);
  if (match) {
    const num = match[2];
    // Level is the first digit * 100 (e.g., "225" -> "200", "120" -> "100")
    const level = num.length > 0 ? `${num[0]}00` : '';
    return { dept: match[1], number: match[2], level };
  }
  return null;
}

export interface AdvancedSearchOptions {
  query?: string;           // General text search (title, description)
  courseCode?: string;      // Exact or partial course code
  department?: string;      // Filter by department (CMPT, MATH, etc.)
  level?: string;           // Filter by level: "100", "200", "300", "400", "500+"
  instructor?: string;      // Search by instructor name
  prerequisites?: string;   // Search courses that require this prereq
  corequisites?: string;    // Search courses with this corequisite
  hasPrerequisites?: boolean; // Filter: true = has prereqs, false = no prereqs
  limit?: number;           // Max results (default 20)
}

export interface SearchResultCourse {
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
  relevance: number;        // 0-1 relevance score
}

/**
 * Advanced course search with multiple filter options
 * Optimized for low latency with indexed queries
 */
export async function advancedSearchCourses(
  env: Env,
  options: AdvancedSearchOptions
): Promise<{ courses: SearchResultCourse[]; total: number; query: AdvancedSearchOptions }> {
  const limit = Math.min(options.limit || 20, 100);
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  
  // 1. Course code search (with normalization)
  if (options.courseCode) {
    const normalized = normalizeCourseCode(options.courseCode);
    const parsed = parseCourseCode(options.courseCode);
    
    if (parsed) {
      // Exact match or prefix match
      conditions.push('(name = ? OR name LIKE ?)');
      params.push(normalized, `${parsed.dept} ${parsed.number}%`);
    } else {
      // Fuzzy match on the normalized input
      conditions.push('name LIKE ?');
      params.push(`%${normalized}%`);
    }
  }
  
  // 2. Department filter
  if (options.department) {
    const dept = options.department.toUpperCase();
    conditions.push('name LIKE ?');
    params.push(`${dept} %`);
  }
  
  // 3. Level filter (100, 200, 300, 400, 500+)
  if (options.level) {
    const levelNum = parseInt(options.level, 10);
    if (levelNum >= 500) {
      // Graduate level: 500+
      conditions.push("CAST(SUBSTR(name, INSTR(name, ' ') + 1, 1) AS INTEGER) >= 5");
    } else if (levelNum >= 100 && levelNum <= 400) {
      // Undergrad levels: match first digit
      const levelDigit = Math.floor(levelNum / 100);
      conditions.push("SUBSTR(name, INSTR(name, ' ') + 1, 1) = ?");
      params.push(levelDigit.toString());
    }
  }
  
  // 4. Instructor search
  if (options.instructor) {
    conditions.push('LOWER(instructors) LIKE ?');
    params.push(`%${options.instructor.toLowerCase()}%`);
  }
  
  // 5. Prerequisites search (courses that require this as a prereq)
  if (options.prerequisites) {
    const prereq = normalizeCourseCode(options.prerequisites);
    conditions.push('LOWER(prerequisites) LIKE ?');
    params.push(`%${prereq.toLowerCase()}%`);
  }
  
  // 6. Corequisites search
  if (options.corequisites) {
    const coreq = normalizeCourseCode(options.corequisites);
    conditions.push('LOWER(corequisites) LIKE ?');
    params.push(`%${coreq.toLowerCase()}%`);
  }
  
  // 7. Has prerequisites filter
  if (options.hasPrerequisites !== undefined) {
    if (options.hasPrerequisites) {
      conditions.push("prerequisites IS NOT NULL AND prerequisites != ''");
    } else {
      conditions.push("(prerequisites IS NULL OR prerequisites = '')");
    }
  }
  
  // 8. General text search (title, description)
  if (options.query) {
    const searchTerm = `%${options.query.toLowerCase()}%`;
    conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
    params.push(searchTerm, searchTerm);
  }
  
  // Build the query
  let sql = 'SELECT * FROM sfu_courses';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY name ASC';
  sql += ` LIMIT ${limit}`;
  
  // Execute query
  const result = await env.DB.prepare(sql).bind(...params).all();
  const courses = (result.results || []) as any[];
  
  // Calculate relevance scores
  const scoredCourses: SearchResultCourse[] = courses.map(course => {
    let relevance = 0.5; // Base relevance
    
    // Boost for exact course code match
    if (options.courseCode) {
      const normalized = normalizeCourseCode(options.courseCode);
      if (course.name === normalized) {
        relevance = 1.0;
      } else if (course.name.startsWith(normalized.split(' ')[0])) {
        relevance = 0.8;
      }
    }
    
    // Boost for instructor match
    if (options.instructor && course.instructors?.toLowerCase().includes(options.instructor.toLowerCase())) {
      relevance = Math.min(1.0, relevance + 0.2);
    }
    
    // Boost for query match in title
    if (options.query && course.title?.toLowerCase().includes(options.query.toLowerCase())) {
      relevance = Math.min(1.0, relevance + 0.3);
    }
    
    return {
      name: course.name,
      title: course.title || '',
      description: course.description || '',
      units: course.units || '',
      prerequisites: course.prerequisites || '',
      corequisites: course.corequisites || '',
      instructors: course.instructors || '',
      degree_level: course.degree_level || '',
      delivery_method: course.delivery_method || '',
      term: course.term || '',
      relevance,
    };
  });
  
  // Sort by relevance
  scoredCourses.sort((a, b) => b.relevance - a.relevance);
  
  return {
    courses: scoredCourses,
    total: scoredCourses.length,
    query: options,
  };
}

/**
 * Get courses that have a specific course as a prerequisite
 * "What courses require CMPT 225?"
 */
export async function getCoursesRequiring(
  env: Env,
  courseCode: string,
  limit = 20
): Promise<SearchResultCourse[]> {
  const normalized = normalizeCourseCode(courseCode);
  
  const result = await env.DB.prepare(`
    SELECT * FROM sfu_courses
    WHERE LOWER(prerequisites) LIKE ?
    ORDER BY name ASC
    LIMIT ?
  `).bind(`%${normalized.toLowerCase()}%`, limit).all();
  
  return (result.results || []).map((course: any) => ({
    name: course.name,
    title: course.title || '',
    description: course.description || '',
    units: course.units || '',
    prerequisites: course.prerequisites || '',
    corequisites: course.corequisites || '',
    instructors: course.instructors || '',
    degree_level: course.degree_level || '',
    delivery_method: course.delivery_method || '',
    term: course.term || '',
    relevance: 1.0,
  }));
}

/**
 * Get all courses taught by an instructor
 */
export async function getCoursesByInstructor(
  env: Env,
  instructorName: string,
  limit = 20
): Promise<SearchResultCourse[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM sfu_courses
    WHERE LOWER(instructors) LIKE ?
    ORDER BY name ASC
    LIMIT ?
  `).bind(`%${instructorName.toLowerCase()}%`, limit).all();
  
  return (result.results || []).map((course: any) => ({
    name: course.name,
    title: course.title || '',
    description: course.description || '',
    units: course.units || '',
    prerequisites: course.prerequisites || '',
    corequisites: course.corequisites || '',
    instructors: course.instructors || '',
    degree_level: course.degree_level || '',
    delivery_method: course.delivery_method || '',
    term: course.term || '',
    relevance: 1.0,
  }));
}
