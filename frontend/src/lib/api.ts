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

// === EXPERT/CHARACTER TYPES ===

export interface Expert {
  id: string;
  name: string;
  title: string;
  era: string;
  image: string;
  description: string;
  teachingStyle: string;
}

export interface ExpertsResponse {
  success: boolean;
  topic?: string;
  count?: number;
  experts?: Expert[];
  error?: string;
}

export interface ExpertImagesResponse {
  success: boolean;
  total?: number;
  generated?: number;
  images?: Array<{
    id: string;
    name: string;
    image: string;
    success: boolean;
  }>;
  error?: string;
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

// === EXPERT API FUNCTIONS ===

/**
 * Find experts for a topic (without images - faster)
 */
export async function findExperts(topic: string, count: number = 6): Promise<Expert[]> {
  try {
    const params = new URLSearchParams({
      topic,
      count: count.toString(),
    });
    const response = await fetch(`${BACKEND_URL}/api/experts?${params}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data: ExpertsResponse = await response.json();
    return data.experts || [];
  } catch (error) {
    console.error('Failed to find experts:', error);
    return [];
  }
}

/**
 * Find experts for a topic WITH AI-generated images (slower but complete)
 */
export async function findExpertsWithImages(topic: string, count: number = 6): Promise<Expert[]> {
  try {
    const params = new URLSearchParams({
      topic,
      count: count.toString(),
    });
    const response = await fetch(`${BACKEND_URL}/api/experts/with-images?${params}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data: ExpertsResponse = await response.json();
    return data.experts || [];
  } catch (error) {
    console.error('Failed to find experts with images:', error);
    return [];
  }
}

/**
 * Generate images for a list of experts
 */
export async function generateExpertImages(experts: Array<{ id: string; name: string; title?: string; era?: string }>): Promise<ExpertImagesResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/experts/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ experts }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to generate expert images:', error);
    return { success: false, error: 'Failed to generate images' };
  }
}

/**
 * Generate a custom character from a description
 * Supports any character type: real, fictional, animated, etc.
 */
export async function generateCustomCharacter(description: string): Promise<Expert | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/experts/generate-custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    if (data.success && data.character) {
      return data.character;
    }
    return null;
  } catch (error) {
    console.error('Failed to generate custom character:', error);
    return null;
  }
}

// === OUTLINE TYPES ===

export interface OutlineItem {
  id: string;
  number: string;
  title: string;
  description?: string;
  duration?: string;
  children?: OutlineItem[];
}

export interface GeneratedOutline {
  id: string;
  topic: string;
  character?: {
    id: string;
    name: string;
    teachingStyle?: string;
  };
  sections: OutlineItem[];
  learningObjectives: string[];
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: string;
  updatedAt: string;
}

export interface OutlineResponse {
  success: boolean;
  outline?: GeneratedOutline;
  error?: string;
}

// === OUTLINE API FUNCTIONS ===

/**
 * Generate a course outline using AI
 */
export async function generateOutline(
  topic: string,
  character?: { id: string; name: string; teachingStyle?: string },
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): Promise<GeneratedOutline | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/outlines/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, character, difficulty }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data: OutlineResponse = await response.json();
    return data.outline || null;
  } catch (error) {
    console.error('Failed to generate outline:', error);
    return null;
  }
}

/**
 * Get an outline by ID
 */
export async function getOutline(id: string): Promise<GeneratedOutline | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/outlines/${id}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data: OutlineResponse = await response.json();
    return data.outline || null;
  } catch (error) {
    console.error('Failed to fetch outline:', error);
    return null;
  }
}

/**
 * Update an outline
 */
export async function updateOutline(
  id: string,
  updates: {
    sections?: OutlineItem[];
    learningObjectives?: string[];
    estimatedDuration?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }
): Promise<GeneratedOutline | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/outlines/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data: OutlineResponse = await response.json();
    return data.outline || null;
  } catch (error) {
    console.error('Failed to update outline:', error);
    return null;
  }
}

/**
 * Update a specific section within an outline
 */
export async function updateOutlineSection(
  outlineId: string,
  sectionId: string,
  updates: {
    title?: string;
    description?: string;
    duration?: string;
    children?: OutlineItem[];
  }
): Promise<OutlineItem | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}/sections/${sectionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.section || null;
  } catch (error) {
    console.error('Failed to update section:', error);
    return null;
  }
}

/**
 * Regenerate a specific section using AI
 */
export async function regenerateSection(
  outlineId: string,
  sectionId: string,
  instructions?: string
): Promise<OutlineItem | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/outlines/${outlineId}/sections/${sectionId}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instructions }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.section || null;
  } catch (error) {
    console.error('Failed to regenerate section:', error);
    return null;
  }
}
