// SFU Courses API Service

const API_BASE = 'https://api.sfucourses.com/v1/rest';

export interface Course {
  dept: string;
  number: string;
  title: string;
  units: string;
  description: string;
  prerequisites: string;
  corequisites: string;
  notes: string;
  designation: string;
  deliveryMethod: string;
  degreeLevel: string;
  offerings: {
    instructors: string[];
    term: string;
  }[];
}

export interface SearchParams {
  dept?: string;
  number?: string;
  title?: string;
  limit?: number;
  offset?: number;
}

export async function searchCourses(params: SearchParams = {}): Promise<Course[]> {
  const searchParams = new URLSearchParams();
  
  if (params.dept) searchParams.set('dept', params.dept);
  if (params.number) searchParams.set('number', params.number);
  if (params.title) searchParams.set('title', params.title);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  
  const url = `${API_BASE}/outlines?${searchParams.toString()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return [];
  }
}

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
