/**
 * Background Critique Hook
 * 
 * Provides debounced background critique of notes as the user types.
 * Sends content to AI every 30 seconds of inactivity for subtle feedback.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

// How long to wait after last edit before triggering critique (ms)
const DEBOUNCE_DELAY = 30000; // 30 seconds

// Minimum content length to trigger critique
const MIN_CONTENT_LENGTH = 100;

// How long to show the feedback before hiding it (ms)
const FEEDBACK_DISPLAY_TIME = 10000; // 10 seconds

export interface BackgroundCritiqueState {
  feedback: string | null;
  isLoading: boolean;
  lastCritiqueTime: number | null;
  isVisible: boolean;
}

interface UseBackgroundCritiqueOptions {
  enabled?: boolean;
  debounceDelay?: number;
  minContentLength?: number;
  courseCode?: string;
}

interface UseBackgroundCritiqueReturn extends BackgroundCritiqueState {
  triggerCritique: () => void;
  dismissFeedback: () => void;
  onContentChange: (content: string) => void;
}

export function useBackgroundCritique(
  options: UseBackgroundCritiqueOptions = {}
): UseBackgroundCritiqueReturn {
  const {
    enabled = true,
    debounceDelay = DEBOUNCE_DELAY,
    minContentLength = MIN_CONTENT_LENGTH,
    courseCode,
  } = options;

  const [state, setState] = useState<BackgroundCritiqueState>({
    feedback: null,
    isLoading: false,
    lastCritiqueTime: null,
    isVisible: false,
  });

  // Refs for tracking content and debounce
  const contentRef = useRef<string>('');
  const previousContentRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get the most recent paragraphs (last ~500 chars or last 2-3 paragraphs)
  const getRecentContent = useCallback((content: string): string => {
    const paragraphs = content.split(/\n\n+/);
    const lastParagraphs = paragraphs.slice(-3).join('\n\n');
    return lastParagraphs.slice(-500);
  }, []);

  // Perform the critique request
  const performCritique = useCallback(async (content: string) => {
    if (!enabled || content.length < minContentLength) return;
    
    // Don't critique if content hasn't changed significantly
    if (content === previousContentRef.current) return;
    
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const recentContent = getRecentContent(content);
      
      const response = await fetch(`${BACKEND_URL}/api/mcp/quick-critique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: content,
          recentContent,
          courseCode,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.response) {
        // Store previous content to avoid duplicate critiques
        previousContentRef.current = content;
        
        setState({
          feedback: data.response,
          isLoading: false,
          lastCritiqueTime: Date.now(),
          isVisible: true,
        });
        
        // Auto-hide feedback after display time
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, isVisible: false }));
        }, FEEDBACK_DISPLAY_TIME);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Background critique error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [enabled, minContentLength, courseCode, getRecentContent]);

  // Handle content changes with debouncing
  const onContentChange = useCallback((content: string) => {
    contentRef.current = content;
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new debounce timer
    if (enabled && content.length >= minContentLength) {
      debounceTimerRef.current = setTimeout(() => {
        performCritique(content);
      }, debounceDelay);
    }
  }, [enabled, minContentLength, debounceDelay, performCritique]);

  // Manual trigger for critique
  const triggerCritique = useCallback(() => {
    if (contentRef.current) {
      performCritique(contentRef.current);
    }
  }, [performCritique]);

  // Dismiss feedback
  const dismissFeedback = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    triggerCritique,
    dismissFeedback,
    onContentChange,
  };
}
