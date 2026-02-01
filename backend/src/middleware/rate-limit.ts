/**
 * Rate Limiting Middleware
 * 
 * Uses Cloudflare's native Rate Limiting binding for efficient,
 * low-latency rate limiting at the edge.
 * 
 * Three tiers:
 * - AI_GENERATION_LIMITER: 15/min - expensive AI operations (outlines, experts, images)
 * - VOICE_LIMITER: 30/min - voice/chat operations (TTS, STT)
 * - API_LIMITER: 120/min - general API calls
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

// Paths that use the AI generation rate limiter (expensive)
const AI_GENERATION_PATHS = [
  '/api/outlines/generate',
  '/api/outlines/regenerate',
  '/api/experts',
  '/api/experts/with-images',
  '/api/experts/images',
  '/api/experts/generate-custom',
  '/api/mcp/suggest',
];

// Paths that use the voice rate limiter (moderate)
const VOICE_PATHS = [
  '/api/voice',
  '/api/editor-voice',
  '/api/editor-chat',
  '/api/mcp/ask',
  '/api/mcp/explain',
  '/api/mcp/critique',
  '/api/mcp/critique-diff',
  '/api/mcp/formulas',
];

// Paths that are exempt from rate limiting
const EXEMPT_PATHS = [
  '/',
  '/health',
  '/api/config',
  '/api/voices',
];

/**
 * Get the appropriate rate limiter for a given path
 */
function getRateLimiterType(path: string): 'ai' | 'voice' | 'general' | 'exempt' {
  // Check exact matches first
  if (EXEMPT_PATHS.includes(path)) {
    return 'exempt';
  }
  
  // Check prefix matches for AI generation
  for (const aiPath of AI_GENERATION_PATHS) {
    if (path.startsWith(aiPath)) {
      return 'ai';
    }
  }
  
  // Check prefix matches for voice
  for (const voicePath of VOICE_PATHS) {
    if (path.startsWith(voicePath)) {
      return 'voice';
    }
  }
  
  return 'general';
}

/**
 * Get a stable key for rate limiting
 * Uses CF-Connecting-IP as fallback, but prefers user identifiers when available
 */
function getRateLimitKey(c: { req: { header: (name: string) => string | undefined; raw: Request } }): string {
  // Try to get a user identifier from headers (if auth is implemented)
  const userId = c.req.header('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  // CF-Connecting-IP is the real client IP behind Cloudflare
  const ip = c.req.header('cf-connecting-ip') || 
             c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware for Hono
 * 
 * Automatically applies the appropriate rate limit based on the request path.
 * Returns 429 Too Many Requests when limit is exceeded.
 */
export const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const path = new URL(c.req.url).pathname;
  const limiterType = getRateLimiterType(path);
  
  // Skip rate limiting for exempt paths
  if (limiterType === 'exempt') {
    return next();
  }
  
  // Get the appropriate rate limiter
  let limiter: { limit: (opts: { key: string }) => Promise<{ success: boolean }> } | undefined;
  let limitName: string;
  
  switch (limiterType) {
    case 'ai':
      limiter = c.env.AI_GENERATION_LIMITER;
      limitName = 'AI Generation';
      break;
    case 'voice':
      limiter = c.env.VOICE_LIMITER;
      limitName = 'Voice/Chat';
      break;
    case 'general':
    default:
      limiter = c.env.API_LIMITER;
      limitName = 'API';
      break;
  }
  
  // If no limiter is available (local dev without bindings), skip
  if (!limiter) {
    return next();
  }
  
  // Build the rate limit key
  const key = `${limiterType}:${getRateLimitKey(c)}`;
  
  try {
    const { success } = await limiter.limit({ key });
    
    if (!success) {
      console.log(`[RateLimit] ${limitName} limit exceeded for ${key}`);
      
      return c.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please slow down and try again in a moment.`,
          retryAfter: 60,
        },
        429,
        {
          'Retry-After': '60',
          'X-RateLimit-Limit-Type': limiterType,
        }
      );
    }
  } catch (error) {
    // If rate limiting fails, log and continue (fail open)
    console.error('[RateLimit] Error checking rate limit:', error);
  }
  
  return next();
});

/**
 * Stricter rate limit middleware for specific expensive endpoints
 * Can be used in addition to the global middleware
 */
export const strictRateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const limiter = c.env.AI_GENERATION_LIMITER;
  
  if (!limiter) {
    return next();
  }
  
  const key = `strict:${getRateLimitKey(c)}`;
  
  try {
    const { success } = await limiter.limit({ key });
    
    if (!success) {
      return c.json(
        {
          error: 'Too many requests',
          message: 'This is an expensive operation. Please wait before trying again.',
          retryAfter: 60,
        },
        429,
        { 'Retry-After': '60' }
      );
    }
  } catch (error) {
    console.error('[RateLimit] Error in strict rate limit:', error);
  }
  
  return next();
});
