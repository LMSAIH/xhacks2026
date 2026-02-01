import { Hono } from 'hono';
import type { Env } from '../types';
import { updateCoursesFromAPI, getCourses, getCourseByCode, getCourse } from '../services/courses';

const courseRoutes = new Hono<{ Bindings: Env }>();

// Update courses from SFU API - filters by term, defaults to "Fall 2025"
courseRoutes.get('/update/', async (c) => {
  const term = c.req.query('term') || 'Fall 2025';
  const result = await updateCoursesFromAPI(c.env, term);
  return c.json(result);
});

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

// Get specific course by name
courseRoutes.get('/:name', async (c) => {
  const name = c.req.param('name');
  const course = await getCourseByCode(c.env, name);
  return c.json({ course });
});

export { courseRoutes };
