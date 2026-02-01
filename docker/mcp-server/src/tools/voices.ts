/**
 * Voice Tools for MCP Server
 * Provides voice selection and recommendation for AI tutoring
 * 
 * Uses Deepgram Aura-1 voices on Cloudflare Workers AI (@cf/deepgram/aura-1)
 * Voice data sourced from official Deepgram documentation
 */

// All 12 Deepgram Aura-1 speakers available on Workers AI
export const VOICES = [
  {
    id: 'asteria',
    name: 'Asteria',
    gender: 'feminine',
    age: 'Adult',
    accent: 'American',
    style: 'Clear, Confident, Knowledgeable, Energetic',
    originalUseCase: 'Advertising',
    bestFor: 'Math tutoring, science explanations, energetic lessons',
  },
  {
    id: 'luna',
    name: 'Luna',
    gender: 'feminine',
    age: 'Young Adult',
    accent: 'American',
    style: 'Friendly, Natural, Engaging',
    originalUseCase: 'IVR',
    bestFor: 'Intro courses, first-year students, casual learning',
  },
  {
    id: 'stella',
    name: 'Stella',
    gender: 'feminine',
    age: 'Adult',
    accent: 'American',
    style: 'Clear, Professional, Engaging',
    originalUseCase: 'Customer service',
    bestFor: 'Step-by-step tutorials, office hours, general tutoring',
  },
  {
    id: 'athena',
    name: 'Athena',
    gender: 'feminine',
    age: 'Mature',
    accent: 'British',
    style: 'Calm, Smooth, Professional',
    originalUseCase: 'Storytelling',
    bestFor: 'Literature, philosophy, essay feedback, thoughtful discussions',
  },
  {
    id: 'hera',
    name: 'Hera',
    gender: 'feminine',
    age: 'Adult',
    accent: 'American',
    style: 'Smooth, Warm, Professional',
    originalUseCase: 'Informative',
    bestFor: 'Lectures, history, social sciences, detailed explanations',
  },
  {
    id: 'orion',
    name: 'Orion',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Approachable, Comfortable, Calm, Polite',
    originalUseCase: 'Informative',
    bestFor: 'Technical concepts, engineering, patient explanations',
  },
  {
    id: 'arcas',
    name: 'Arcas',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Natural, Smooth, Clear, Comfortable',
    originalUseCase: 'Customer service',
    bestFor: 'Homework help, study sessions, practice problems',
  },
  {
    id: 'perseus',
    name: 'Perseus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Confident, Professional, Clear',
    originalUseCase: 'Customer service',
    bestFor: 'Business courses, presentations, professional development',
  },
  {
    id: 'angus',
    name: 'Angus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'Irish',
    style: 'Warm, Friendly, Natural',
    originalUseCase: 'Storytelling',
    bestFor: 'Humanities, creative writing, engaging narratives',
  },
  {
    id: 'orpheus',
    name: 'Orpheus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Professional, Clear, Confident, Trustworthy',
    originalUseCase: 'Customer service, storytelling',
    bestFor: 'Audiobook style, long explanations, study guides',
  },
  {
    id: 'helios',
    name: 'Helios',
    gender: 'masculine',
    age: 'Adult',
    accent: 'British',
    style: 'Professional, Clear, Confident',
    originalUseCase: 'Customer service',
    bestFor: 'Formal topics, academic lectures, scholarly content',
  },
  {
    id: 'zeus',
    name: 'Zeus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Deep, Trustworthy, Smooth',
    originalUseCase: 'IVR',
    bestFor: 'Motivational content, exam prep pep talks, summaries',
  },
] as const;

export type VoiceId = typeof VOICES[number]['id'];

export function listVoices() {
  return VOICES.map(v => ({
    id: v.id,
    name: v.name,
    gender: v.gender,
    age: v.age,
    accent: v.accent,
    style: v.style,
    best_for: v.bestFor,
  }));
}

export function getVoice(id: string) {
  return VOICES.find(v => v.id === id) || VOICES[0];
}

export function getRecommendedVoice(courseCode: string): VoiceId {
  const code = courseCode.toUpperCase();
  
  // Computer Science / Engineering - calm, patient technical explanations
  if (code.startsWith('CS') || code.startsWith('CMPT') || code.startsWith('ENSC') || code.startsWith('MSE')) {
    return 'orion';
  }
  
  // Math / Stats - energetic, clear explanations
  if (code.startsWith('MATH') || code.startsWith('STAT') || code.startsWith('MACM')) {
    return 'asteria';
  }
  
  // Business / Economics - professional, confident
  if (code.startsWith('BUS') || code.startsWith('BUSN') || code.startsWith('ECON') || code.startsWith('FIN')) {
    return 'perseus';
  }
  
  // Philosophy / History - thoughtful, calm British accent
  if (code.startsWith('PHIL') || code.startsWith('HIST') || code.startsWith('POL')) {
    return 'athena';
  }
  
  // English / Literature / Creative Writing - warm Irish storyteller
  if (code.startsWith('ENGL') || code.startsWith('WL') || code.startsWith('ART') || code.startsWith('CA')) {
    return 'angus';
  }
  
  // Sciences - informative, professional
  if (code.startsWith('CHEM') || code.startsWith('PHYS') || code.startsWith('BIO') || code.startsWith('BISC')) {
    return 'hera';
  }
  
  // First-year / Intro courses (100-level) - friendly, approachable
  const levelMatch = code.match(/\d{3}/);
  if (levelMatch && parseInt(levelMatch[0]) < 200) {
    return 'luna';
  }
  
  // Default - professional, engaging
  return 'stella';
}

// Function for tool handler - wraps getRecommendedVoice with voice details
export function getVoiceForCourse(courseCode: string) {
  const voiceId = getRecommendedVoice(courseCode);
  const voice = getVoice(voiceId);
  return {
    course_code: courseCode,
    recommended_voice: {
      id: voice.id,
      name: voice.name,
      gender: voice.gender,
      age: voice.age,
      accent: voice.accent,
      style: voice.style,
      best_for: voice.bestFor,
    },
    all_voices_count: VOICES.length,
    note: 'Use list_voices to see all available options',
  };
}

export const ListVoicesSchema = {
  name: 'list_voices',
  description: 'List all available Deepgram Aura TTS voices with their characteristics (gender, accent, style)',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export const GetVoiceForCourseSchema = {
  name: 'get_voice_for_course',
  description: 'Get recommended TTS voice for a specific course based on subject matter',
  inputSchema: {
    type: 'object' as const,
    properties: {
      courseCode: {
        type: 'string' as const,
        description: 'The course code (e.g., CMPT 225, MATH 151, ENGL 100)',
      },
    },
    required: ['courseCode'],
  },
};

// Parameter interfaces
export interface ListVoicesParams {
  // No params required
}

export interface GetVoiceForCourseParams {
  courseCode: string;
}
