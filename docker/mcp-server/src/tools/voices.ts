export const VOICES = [
  { id: 'asteria', name: 'Asteria', gender: 'feminine', style: 'Warm, professional', bestFor: 'General tutoring' },
  { id: 'orion', name: 'Orion', gender: 'masculine', style: 'Deep, professional', bestFor: 'Technical topics' },
  { id: 'athena', name: 'Athena', gender: 'feminine', style: 'Confident, clear', bestFor: 'Business, leadership' },
  { id: 'angus', name: 'Angus', gender: 'masculine', style: 'British, refined', bestFor: 'Literature, arts' },
  { id: 'zeus', name: 'Zeus', gender: 'masculine', style: 'Powerful, commanding', bestFor: 'Motivation' },
  { id: 'luna', name: 'Luna', gender: 'feminine', style: 'Soft, gentle', bestFor: 'Introductory topics' },
  { id: 'mars', name: 'Mars', gender: 'masculine', style: 'Energetic, assertive', bestFor: 'Active learning' },
  { id: 'venus', name: 'Venus', gender: 'feminine', style: 'Graceful, articulate', bestFor: 'Creative subjects' },
  { id: 'mercury', name: 'Mercury', gender: 'masculine', style: 'Quick, witty', bestFor: 'Quick explanations' },
  { id: 'juno', name: 'Juno', gender: 'feminine', style: 'Nurturing, wise', bestFor: 'Supportive guidance' },
  { id: 'neo', name: 'Neo', gender: 'masculine', style: 'Modern, calm', bestFor: 'Technology, coding' },
] as const;

export type VoiceId = typeof VOICES[number]['id'];

export function listVoices() {
  return VOICES.map(v => ({
    id: v.id,
    name: v.name,
    gender: v.gender,
    style: v.style,
    best_for: v.bestFor,
  }));
}

export function getVoice(id: VoiceId) {
  return VOICES.find(v => v.id === id) || VOICES[0];
}

export function getRecommendedVoice(courseCode: string): VoiceId {
  const code = courseCode.toUpperCase();
  
  if (code.startsWith('CS') || code.startsWith('CMPT')) {
    return 'neo';
  }
  if (code.startsWith('BUS') || code.startsWith('BUSN')) {
    return 'athena';
  }
  if (code.startsWith('PHIL') || code.startsWith('ENGL') || code.startsWith('ART')) {
    return 'angus';
  }
  if (code.startsWith('PHYS') || code.startsWith('CHEM') || code.startsWith('BIO')) {
    return 'orion';
  }
  
  return 'asteria';
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
      style: voice.style,
      best_for: voice.bestFor,
    },
  };
}

export const ListVoicesSchema = {
  name: 'list_voices',
  description: 'List all available TTS voices with their characteristics',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

export const GetVoiceForCourseSchema = {
  name: 'get_voice_for_course',
  description: 'Get recommended voice for a specific course',
  inputSchema: {
    type: 'object' as const,
    properties: {
      courseCode: {
        type: 'string' as const,
        description: 'The course code (e.g., CS 1100)',
      },
    },
    required: ['courseCode'],
  },
};

// Plain interfaces (no params needed for list, courseCode for voice recommendation)
export interface ListVoicesParams {
  // No params required
}

export interface GetVoiceForCourseParams {
  courseCode: string;
}
