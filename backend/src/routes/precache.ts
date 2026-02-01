/**
 * Pre-cache Routes - API endpoints for pre-caching popular courses
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import {
  runPrecaching,
  getPrecacheStatus,
  getPrecachedOutline,
  getPrecachedExperts,
  POPULAR_COURSES,
} from '../services/precache';

const precacheRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get pre-cache status
 * GET /api/precache/status
 */
precacheRoutes.get('/status', async (c) => {
  const status = await getPrecacheStatus(c.env);
  return c.json({
    success: true,
    lastRun: status.lastRun,
    totalCourses: POPULAR_COURSES.length,
    cachedCourses: status.cachedCourses,
    cachedCount: status.cachedCourses.filter(c => c.hasOutline).length,
  });
});

/**
 * Get list of popular courses
 * GET /api/precache/courses
 */
precacheRoutes.get('/courses', (c) => {
  return c.json({
    success: true,
    courses: POPULAR_COURSES,
  });
});

/**
 * Get pre-cached outline for a course
 * GET /api/precache/outline/:code
 */
precacheRoutes.get('/outline/:code', async (c) => {
  const code = c.req.param('code').replace(/-/g, ' ').toUpperCase();
  
  const outline = await getPrecachedOutline(c.env, code);
  
  if (!outline) {
    return c.json({ success: false, error: 'No cached outline found' }, 404);
  }
  
  return c.json({ success: true, outline });
});

/**
 * Get pre-cached experts for a course
 * GET /api/precache/experts/:code
 */
precacheRoutes.get('/experts/:code', async (c) => {
  const code = c.req.param('code').replace(/-/g, ' ').toUpperCase();
  
  const experts = await getPrecachedExperts(c.env, code);
  
  if (!experts) {
    return c.json({ success: false, error: 'No cached experts found' }, 404);
  }
  
  return c.json({ success: true, ...experts });
});

/**
 * Trigger pre-caching manually
 * POST /api/precache/run
 * Body: { maxCourses?: number, skipExperts?: boolean }
 * 
 * This endpoint should be protected in production (admin only)
 */
precacheRoutes.post('/run', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { maxCourses, skipExperts } = body;
    
    const result = await runPrecaching(c.env, { maxCourses, skipExperts });
    
    return c.json({
      ...result,
      message: `Pre-cached ${result.outlinesGenerated} outlines and ${result.expertsGenerated} experts`,
    });
  } catch (error) {
    console.error('Pre-caching error:', error);
    return c.json({
      success: false,
      error: 'Pre-caching failed',
    }, 500);
  }
});

/**
 * Pre-cache a single course
 * POST /api/precache/course/:code
 */
precacheRoutes.post('/course/:code', async (c) => {
  const code = c.req.param('code').replace(/-/g, ' ').toUpperCase();
  
  // Find the course in popular courses or use generic name
  const _course = POPULAR_COURSES.find(c => c.code === code);
  
  try {
    const result = await runPrecaching(c.env, { maxCourses: 1 });
    
    return c.json({
      ...result,
      course: code,
    });
  } catch {
    return c.json({
      success: false,
      error: `Failed to pre-cache ${code}`,
    }, 500);
  }
});

export { precacheRoutes };
