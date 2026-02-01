// Backend API Service

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

// === COURSE TYPES ===

export interface Course {
  id: number;
  name: string;
  title: string;
  description: string;
  units: string;
  prerequisites: string;
  corequisites: string;
  notes: string;
  designation: string;
  delivery_method: string;
  degree_level: string;
  term: string;
  instructors: string;
}

export interface SearchParams {
  name?: string;
  limit?: number;
  offset?: number;
}

// === VOICE TYPES ===

export interface BackendVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string;
  bestFor: string[];
}

export interface BackendConfig {
  voices: BackendVoice[];
  defaultVoice: string;
}

// === API FUNCTIONS ===

/**
 * Fetch available voices from the backend
 */
export async function fetchVoices(): Promise<BackendVoice[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/voices`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Failed to fetch voices:', error);
    return [];
  }
}

/**
 * Fetch config (voices + default voice) from the backend
 */
export async function fetchConfig(): Promise<BackendConfig | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/config`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return null;
  }
}

/**
 * Search courses from the backend
 */
export async function searchCourses(params: SearchParams = {}): Promise<Course[]> {
  const searchParams = new URLSearchParams();
  
  if (params.name) searchParams.set('name', params.name);
  
  const url = `${BACKEND_URL}/api/courses?${searchParams.toString()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.courses || [];
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return [];
  }
}

/**
 * Get a specific course by name (e.g., "CMPT120")
 */
export async function getCourseByName(name: string): Promise<Course | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/courses/${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.course || null;
  } catch (error) {
    console.error('Failed to fetch course:', error);
    return null;
  }
}

/**
 * Get a specific course by ID
 */
export async function getCourseById(id: number): Promise<Course | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/courses/id/${id}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.course || null;
  } catch (error) {
    console.error('Failed to fetch course:', error);
    return null;
  }
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// === STATIC DATA ===

export async function getPopularDepartments(): Promise<string[]> {
  // Popular SFU departments for quick selection
  return [
    'CMPT', // Computing Science
    'MATH', // Mathematics
    'STAT', // Statistics
    'PHYS', // Physics
    'CHEM', // Chemistry
    'BISC', // Biological Sciences
    'ECON', // Economics
    'BUS',  // Business
    'PSYC', // Psychology
    'ENGL', // English
    'PHIL', // Philosophy
    'HIST', // History
  ];
}

export const DEPARTMENT_NAMES: Record<string, string> = {
  CMPT: 'Computing Science',
  MATH: 'Mathematics',
  STAT: 'Statistics',
  PHYS: 'Physics',
  CHEM: 'Chemistry',
  BISC: 'Biological Sciences',
  ECON: 'Economics',
  BUS: 'Business',
  PSYC: 'Psychology',
  ENGL: 'English',
  PHIL: 'Philosophy',
  HIST: 'History',
  SEE: 'Sustainable Energy Engineering',
  SPAN: 'Spanish',
  URB: 'Urban Studies',
  WL: 'World Literature',
};
