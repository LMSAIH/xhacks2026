import { Hono } from 'hono';
import type { Env } from '../types';
import {
  updateCoursesFromAPI,
  getCourses,
  getCourseByCode,
  getCourse,
  advancedSearchCourses,
  getCoursesRequiring,
  getCoursesByInstructor,
  normalizeCourseCode,
} from '../services/courses';

const courseRoutes = new Hono<{ Bindings: Env }>();

// Update courses from SFU API - filters by term, defaults to "Fall 2025"
courseRoutes.get('/update/', async (c) => {
  const term = c.req.query('term') || 'Fall 2025';
  const result = await updateCoursesFromAPI(c.env, term);
  return c.json(result);
});

// ============================================================================
// ADVANCED SEARCH ENDPOINT - For MCP and rich querying
// ============================================================================
// GET /api/courses/search?q=machine+learning&dept=CMPT&level=300&instructor=Smith
// POST /api/courses/search with JSON body for complex queries
courseRoutes.get('/search', async (c) => {
  const query = c.req.query('q') || c.req.query('query');
  const courseCode = c.req.query('code') || c.req.query('courseCode');
  const department = c.req.query('dept') || c.req.query('department');
  const level = c.req.query('level');
  const instructor = c.req.query('instructor');
  const prerequisites = c.req.query('prereq') || c.req.query('prerequisites');
  const corequisites = c.req.query('coreq') || c.req.query('corequisites');
  const hasPrerequisites = c.req.query('hasPrereqs');
  const limitStr = c.req.query('limit');

  const result = await advancedSearchCourses(c.env, {
    query: query || undefined,
    courseCode: courseCode || undefined,
    department: department || undefined,
    level: level || undefined,
    instructor: instructor || undefined,
    prerequisites: prerequisites || undefined,
    corequisites: corequisites || undefined,
    hasPrerequisites: hasPrerequisites === 'true' ? true : hasPrerequisites === 'false' ? false : undefined,
    limit: limitStr ? parseInt(limitStr, 10) : undefined,
  });

  return c.json(result);
});

// POST version for complex queries (from MCP)
courseRoutes.post('/search', async (c) => {
  const body = await c.req.json();
  const result = await advancedSearchCourses(c.env, body);
  return c.json(result);
});

// Get courses that require a specific course as prerequisite
// GET /api/courses/requiring/CMPT225 or /api/courses/requiring/CMPT%20225
courseRoutes.get('/requiring/:courseCode', async (c) => {
  const courseCode = c.req.param('courseCode');
  const limitStr = c.req.query('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 20;
  
  const courses = await getCoursesRequiring(c.env, courseCode, limit);
  const normalized = normalizeCourseCode(courseCode);
  
  return c.json({
    prerequisite: normalized,
    courses,
    total: courses.length,
  });
});

// Get courses by instructor
// GET /api/courses/instructor/John%20Smith
courseRoutes.get('/instructor/:name', async (c) => {
  const instructorName = c.req.param('name');
  const limitStr = c.req.query('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 20;
  
  const courses = await getCoursesByInstructor(c.env, instructorName, limit);
  
  return c.json({
    instructor: instructorName,
    courses,
    total: courses.length,
  });
});

// Utility endpoint to normalize course codes
// GET /api/courses/normalize/CMPT225 -> { normalized: "CMPT 225" }
courseRoutes.get('/normalize/:code', async (c) => {
  const code = c.req.param('code');
  const normalized = normalizeCourseCode(code);
  return c.json({ input: code, normalized });
});

// ============================================================================
// EXISTING ENDPOINTS
// ============================================================================

// Courses API - Get all courses with optional filters
courseRoutes.get('/', async (c) => {
  const name = c.req.query('name');
  
  const courses = await getCourses(c.env, {
    name: name || undefined,
  });
  
  return c.json({ courses });
});

// Get specific course by id
courseRoutes.get('/id/:id', async (c) => {
  const id = c.req.param('id');
  const course = await getCourse(c.env, { id });
  return c.json({ course });
});

// Get specific course by name (must be last due to :name param)
courseRoutes.get('/:name', async (c) => {
  const name = c.req.param('name');
  const course = await getCourseByCode(c.env, name);
  return c.json({ course });
});

export { courseRoutes };
