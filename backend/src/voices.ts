/**
 * Voice Configuration & Persona System
 * Supports Deepgram Aura-1 voices on Cloudflare Workers AI
 * 
 * Voice data sourced from official Deepgram Aura documentation:
 * https://developers.deepgram.com/docs/tts-models
 */

// Deepgram Aura-1 speakers available on Cloudflare Workers AI (@cf/deepgram/aura-1)
export type DeepgramSpeaker = 
  | 'asteria'   // feminine, Adult, American - "Clear, Confident, Knowledgeable, Energetic"
  | 'luna'      // feminine, Young Adult, American - "Friendly, Natural, Engaging"
  | 'stella'    // feminine, Adult, American - "Clear, Professional, Engaging"
  | 'athena'    // feminine, Mature, British - "Calm, Smooth, Professional"
  | 'hera'      // feminine, Adult, American - "Smooth, Warm, Professional"
  | 'orion'     // masculine, Adult, American - "Approachable, Comfortable, Calm, Polite"
  | 'arcas'     // masculine, Adult, American - "Natural, Smooth, Clear, Comfortable"
  | 'perseus'   // masculine, Adult, American - "Confident, Professional, Clear"
  | 'angus'     // masculine, Adult, Irish - "Warm, Friendly, Natural"
  | 'orpheus'   // masculine, Adult, American - "Professional, Clear, Confident, Trustworthy"
  | 'helios'    // masculine, Adult, British - "Professional, Clear, Confident"
  | 'zeus';     // masculine, Adult, American - "Deep, Trustworthy, Smooth"

// Voice ID format used in our API (backwards compatible)
export type DeepgramVoice = 
  | 'aura-asteria-en'
  | 'aura-luna-en'
  | 'aura-stella-en'
  | 'aura-athena-en'
  | 'aura-hera-en'
  | 'aura-orion-en'
  | 'aura-arcas-en'
  | 'aura-perseus-en'
  | 'aura-angus-en'
  | 'aura-orpheus-en'
  | 'aura-helios-en'
  | 'aura-zeus-en';

export interface VoiceConfig {
  id: DeepgramVoice;
  speaker: DeepgramSpeaker;
  name: string;
  gender: 'masculine' | 'feminine';
  age: 'Young Adult' | 'Adult' | 'Mature';
  accent: 'American' | 'British' | 'Irish';
  style: string;           // Official Deepgram description
  originalUseCase: string; // What Deepgram designed it for
  bestFor: string[];       // Our tutoring-specific recommendations
}

// Voice catalog with accurate Deepgram Aura-1 characteristics
export const VOICES: Record<DeepgramVoice, VoiceConfig> = {
  'aura-asteria-en': {
    id: 'aura-asteria-en',
    speaker: 'asteria',
    name: 'Asteria',
    gender: 'feminine',
    age: 'Adult',
    accent: 'American',
    style: 'Clear, Confident, Knowledgeable, Energetic',
    originalUseCase: 'Advertising',
    bestFor: ['math tutoring', 'science explanations', 'energetic lessons', 'quick reviews'],
  },
  'aura-luna-en': {
    id: 'aura-luna-en',
    speaker: 'luna',
    name: 'Luna',
    gender: 'feminine',
    age: 'Young Adult',
    accent: 'American',
    style: 'Friendly, Natural, Engaging',
    originalUseCase: 'IVR',
    bestFor: ['intro courses', 'first-year students', 'approachable tutoring', 'casual learning'],
  },
  'aura-stella-en': {
    id: 'aura-stella-en',
    speaker: 'stella',
    name: 'Stella',
    gender: 'feminine',
    age: 'Adult',
    accent: 'American',
    style: 'Clear, Professional, Engaging',
    originalUseCase: 'Customer service',
    bestFor: ['step-by-step tutorials', 'office hours', 'assignment help', 'general tutoring'],
  },
  'aura-athena-en': {
    id: 'aura-athena-en',
    speaker: 'athena',
    name: 'Athena',
    gender: 'feminine',
    age: 'Mature',
    accent: 'British',
    style: 'Calm, Smooth, Professional',
    originalUseCase: 'Storytelling',
    bestFor: ['literature', 'philosophy', 'essay feedback', 'thoughtful discussions'],
  },
  'aura-hera-en': {
    id: 'aura-hera-en',
    speaker: 'hera',
    name: 'Hera',
    gender: 'feminine',
    age: 'Adult',
    accent: 'American',
    style: 'Smooth, Warm, Professional',
    originalUseCase: 'Informative',
    bestFor: ['lectures', 'history', 'social sciences', 'detailed explanations'],
  },
  'aura-orion-en': {
    id: 'aura-orion-en',
    speaker: 'orion',
    name: 'Orion',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Approachable, Comfortable, Calm, Polite',
    originalUseCase: 'Informative',
    bestFor: ['technical concepts', 'engineering', 'patient explanations', 'complex topics'],
  },
  'aura-arcas-en': {
    id: 'aura-arcas-en',
    speaker: 'arcas',
    name: 'Arcas',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Natural, Smooth, Clear, Comfortable',
    originalUseCase: 'Customer service',
    bestFor: ['homework help', 'study sessions', 'casual tutoring', 'practice problems'],
  },
  'aura-perseus-en': {
    id: 'aura-perseus-en',
    speaker: 'perseus',
    name: 'Perseus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Confident, Professional, Clear',
    originalUseCase: 'Customer service',
    bestFor: ['business courses', 'presentations', 'professional development', 'career prep'],
  },
  'aura-angus-en': {
    id: 'aura-angus-en',
    speaker: 'angus',
    name: 'Angus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'Irish',
    style: 'Warm, Friendly, Natural',
    originalUseCase: 'Storytelling',
    bestFor: ['humanities', 'creative writing', 'storytelling', 'engaging narratives'],
  },
  'aura-orpheus-en': {
    id: 'aura-orpheus-en',
    speaker: 'orpheus',
    name: 'Orpheus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Professional, Clear, Confident, Trustworthy',
    originalUseCase: 'Customer service, storytelling',
    bestFor: ['audiobook style', 'long explanations', 'reading materials aloud', 'study guides'],
  },
  'aura-helios-en': {
    id: 'aura-helios-en',
    speaker: 'helios',
    name: 'Helios',
    gender: 'masculine',
    age: 'Adult',
    accent: 'British',
    style: 'Professional, Clear, Confident',
    originalUseCase: 'Customer service',
    bestFor: ['formal topics', 'academic lectures', 'research discussions', 'scholarly content'],
  },
  'aura-zeus-en': {
    id: 'aura-zeus-en',
    speaker: 'zeus',
    name: 'Zeus',
    gender: 'masculine',
    age: 'Adult',
    accent: 'American',
    style: 'Deep, Trustworthy, Smooth',
    originalUseCase: 'IVR',
    bestFor: ['motivational content', 'exam prep pep talks', 'important concepts', 'summaries'],
  },
};

// Deepgram Aura-1 model ID (single model, different speakers)
export const DEEPGRAM_TTS_MODEL = '@cf/deepgram/aura-1';

// Map voice IDs to speaker names for Aura-1 API
export const VOICE_TO_SPEAKER: Record<DeepgramVoice, DeepgramSpeaker> = {
  'aura-asteria-en': 'asteria',
  'aura-luna-en': 'luna',
  'aura-stella-en': 'stella',
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

// Get voice model ID for Workers AI
export function getVoiceModelId(_voice: DeepgramVoice): string {
  return DEEPGRAM_TTS_MODEL;
}

// Get all available voices
export function getAllVoices(): VoiceConfig[] {
  return Object.values(VOICES);
}

// Get voice by ID
export function getVoice(voiceId: DeepgramVoice): VoiceConfig | undefined {
  return VOICES[voiceId];
}

// Get default voice for a course/subject
export function getDefaultVoiceForCourse(courseCode: string): DeepgramVoice {
  const code = courseCode.toUpperCase();
  
  // Computer Science / Engineering - calm, patient technical explanations
  if (code.startsWith('CMPT') || code.startsWith('ENSC') || code.startsWith('MSE')) {
    return 'aura-orion-en';
  }
  
  // Math / Stats - energetic, clear explanations
  if (code.startsWith('MATH') || code.startsWith('STAT') || code.startsWith('MACM')) {
    return 'aura-asteria-en';
  }
  
  // Business / Economics - professional, confident
  if (code.startsWith('BUS') || code.startsWith('ECON') || code.startsWith('FIN')) {
    return 'aura-perseus-en';
  }
  
  // Philosophy / History - thoughtful, calm British accent
  if (code.startsWith('PHIL') || code.startsWith('HIST') || code.startsWith('POL')) {
    return 'aura-athena-en';
  }
  
  // English / Literature / Creative Writing - warm Irish storyteller
  if (code.startsWith('ENGL') || code.startsWith('WL') || code.startsWith('CA')) {
    return 'aura-angus-en';
  }
  
  // Sciences - informative, professional
  if (code.startsWith('CHEM') || code.startsWith('PHYS') || code.startsWith('BISC')) {
    return 'aura-hera-en';
  }
  
  // First-year / Intro courses (100-level) - friendly, approachable
  const levelMatch = code.match(/\d{3}/);
  if (levelMatch && parseInt(levelMatch[0]) < 200) {
    return 'aura-luna-en';
  }
  
  // Default - professional, engaging
  return 'aura-stella-en';
}

// Build system prompt with voice-appropriate phrasing
export function buildSystemPrompt(options: {
  courseCode: string;
  ragContext?: string;
  customInstructions?: string;
  voiceId?: DeepgramVoice;
}): string {
  const { courseCode, ragContext, customInstructions, voiceId } = options;
  const voice = voiceId ? VOICES[voiceId] : undefined;
  
  let prompt = `You are a helpful, patient AI tutor for SFU students.\n\n`;
  prompt += `You are tutoring a student in ${courseCode}. Keep responses concise (2-3 sentences max for voice). `;
  prompt += `Be conversational and natural for spoken dialogue.\n\n`;
  
  // Add voice-specific guidance
  if (voice) {
    prompt += `Your speaking style should be ${voice.style.toLowerCase()}. `;
    if (voice.accent !== 'American') {
      prompt += `You have a ${voice.accent} accent. `;
    }
    prompt += `\n\n`;
  }
  
  if (ragContext) {
    prompt += `--- COURSE CONTEXT ---\n${ragContext}\n--- END CONTEXT ---\n\n`;
  }
  
  if (customInstructions) {
    prompt += `Additional instructions: ${customInstructions}\n\n`;
  }
  
  prompt += `Remember: You're speaking out loud, so avoid code blocks, bullet points, or formatting that doesn't work in speech.`;
  
  return prompt;
}
