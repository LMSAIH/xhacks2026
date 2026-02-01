/**
 * Voice Configuration & Persona System
 * Supports multiple Deepgram Aura voices with personality matching
 */

// Available Deepgram Aura voices on Workers AI
export type DeepgramVoice = 
  | 'aura-asteria-en'    // Female, warm, professional
  | 'aura-luna-en'       // Female, soft, calm
  | 'aura-athena-en'     // Female, confident, clear
  | 'aura-hera-en'       // Female, mature, authoritative
  | 'aura-orion-en'      // Male, deep, professional
  | 'aura-arcas-en'      // Male, young, energetic
  | 'aura-perseus-en'    // Male, warm, friendly
  | 'aura-angus-en'      // Male, British, refined
  | 'aura-orpheus-en'    // Male, smooth, storyteller
  | 'aura-helios-en'     // Male, clear, news anchor
  | 'aura-zeus-en';      // Male, powerful, commanding

export interface VoiceConfig {
  id: DeepgramVoice;
  name: string;
  gender: 'male' | 'female';
  style: string;
  bestFor: string[];
}

// Voice catalog with descriptions
export const VOICES: Record<DeepgramVoice, VoiceConfig> = {
  'aura-asteria-en': {
    id: 'aura-asteria-en',
    name: 'Asteria',
    gender: 'female',
    style: 'Warm and professional',
    bestFor: ['general tutoring', 'math', 'science'],
  },
  'aura-luna-en': {
    id: 'aura-luna-en',
    name: 'Luna',
    gender: 'female',
    style: 'Soft and calm',
    bestFor: ['meditation', 'language learning', 'bedtime stories'],
  },
  'aura-athena-en': {
    id: 'aura-athena-en',
    name: 'Athena',
    gender: 'female',
    style: 'Confident and clear',
    bestFor: ['business', 'presentations', 'leadership'],
  },
  'aura-hera-en': {
    id: 'aura-hera-en',
    name: 'Hera',
    gender: 'female',
    style: 'Mature and authoritative',
    bestFor: ['history', 'philosophy', 'advanced topics'],
  },
  'aura-orion-en': {
    id: 'aura-orion-en',
    name: 'Orion',
    gender: 'male',
    style: 'Deep and professional',
    bestFor: ['engineering', 'technical topics', 'podcasts'],
  },
  'aura-arcas-en': {
    id: 'aura-arcas-en',
    name: 'Arcas',
    gender: 'male',
    style: 'Young and energetic',
    bestFor: ['gaming', 'sports', 'youth content'],
  },
  'aura-perseus-en': {
    id: 'aura-perseus-en',
    name: 'Perseus',
    gender: 'male',
    style: 'Warm and friendly',
    bestFor: ['customer service', 'tutorials', 'general'],
  },
  'aura-angus-en': {
    id: 'aura-angus-en',
    name: 'Angus',
    gender: 'male',
    style: 'British and refined',
    bestFor: ['literature', 'arts', 'sophisticated topics'],
  },
  'aura-orpheus-en': {
    id: 'aura-orpheus-en',
    name: 'Orpheus',
    gender: 'male',
    style: 'Smooth storyteller',
    bestFor: ['narratives', 'audiobooks', 'creative writing'],
  },
  'aura-helios-en': {
    id: 'aura-helios-en',
    name: 'Helios',
    gender: 'male',
    style: 'Clear news anchor',
    bestFor: ['news', 'announcements', 'formal content'],
  },
  'aura-zeus-en': {
    id: 'aura-zeus-en',
    name: 'Zeus',
    gender: 'male',
    style: 'Powerful and commanding',
    bestFor: ['motivation', 'leadership', 'epic content'],
  },
};

// Deepgram Aura-1 model ID (single model for all voices)
export const DEEPGRAM_TTS_MODEL = '@cf/deepgram/aura-1';

// Deepgram Aura speaker names (must match Cloudflare Workers AI types)
export type DeepgramSpeaker = 'asteria' | 'luna' | 'athena' | 'hera' | 'orion' | 'arcas' | 'perseus' | 'angus' | 'orpheus' | 'helios' | 'zeus' | 'stella';

// Map voice IDs to speaker names for Aura-1 API
export const VOICE_TO_SPEAKER: Record<DeepgramVoice, DeepgramSpeaker> = {
  'aura-asteria-en': 'asteria',
  'aura-luna-en': 'luna',
  'aura-athena-en': 'athena',
  'aura-hera-en': 'hera',
  'aura-orion-en': 'orion',
  'aura-arcas-en': 'arcas',
  'aura-perseus-en': 'perseus',
  'aura-angus-en': 'angus',
  'aura-orpheus-en': 'orpheus',
  'aura-helios-en': 'helios',
  'aura-zeus-en': 'zeus',
};

// Get speaker name for Aura-1 TTS API
export function getSpeakerName(voice: DeepgramVoice): DeepgramSpeaker {
  return VOICE_TO_SPEAKER[voice] || 'asteria';
}

// Get voice model ID for Workers AI (kept for backwards compatibility)
// NOTE: All voices use the same model '@cf/deepgram/aura-1' with different speaker param
export function getVoiceModelId(_voice: DeepgramVoice): string {
  return DEEPGRAM_TTS_MODEL;
}

// Get default voice for a course/subject
export function getDefaultVoiceForCourse(courseCode: string): DeepgramVoice {
  const code = courseCode.toUpperCase();
  
  if (code.startsWith('CMPT') || code.startsWith('ENSC')) {
    return 'aura-orion-en'; // Technical - deep professional male
  }
  if (code.startsWith('MATH') || code.startsWith('STAT')) {
    return 'aura-asteria-en'; // Math - warm professional female
  }
  if (code.startsWith('PHIL') || code.startsWith('HIST')) {
    return 'aura-hera-en'; // Humanities - mature authoritative
  }
  if (code.startsWith('BUS') || code.startsWith('ECON')) {
    return 'aura-athena-en'; // Business - confident clear
  }
  if (code.startsWith('ENGL') || code.startsWith('WL')) {
    return 'aura-angus-en'; // Literature - British refined
  }
  
  return 'aura-asteria-en'; // Default
}

// Build system prompt (simple version - persona injection handled by other team)
export function buildSystemPrompt(options: {
  courseCode: string;
  ragContext?: string;
  customInstructions?: string;
}): string {
  const { courseCode, ragContext, customInstructions } = options;
  
  let prompt = `You are a helpful, patient AI tutor for SFU students.\n\n`;
  prompt += `You are tutoring a student in ${courseCode}. Keep responses concise (2-3 sentences max for voice). `;
  prompt += `Be conversational and natural for spoken dialogue.\n\n`;
  
  if (ragContext) {
    prompt += `--- COURSE CONTEXT ---\n${ragContext}\n--- END CONTEXT ---\n\n`;
  }
  
  if (customInstructions) {
    prompt += `Additional instructions: ${customInstructions}\n\n`;
  }
  
  prompt += `Remember: You're speaking out loud, so avoid code blocks, bullet points, or formatting that doesn't work in speech.`;
  
  return prompt;
}
