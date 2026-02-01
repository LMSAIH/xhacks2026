/**
 * Teachers Service - Manage character/teacher information with AI context generation
 */

import type { Env } from '../types';

export interface TeacherInfo {
  id?: string;
  name: string;
  livedFrom: string;
  livedTo: string;
  description: string;
  context: string;
  img?: string;
}

export interface TeacherResponse {
  success: boolean;
  data?: TeacherInfo;
  error?: string;
}

export interface TeachersListResponse {
  success: boolean;
  data?: TeacherInfo[];
  error?: string;
}

/**
 * Validate if an image URL is accessible
 */
async function isImageUrlValid(url?: string): Promise<boolean> {
  if (!url || url.trim().length === 0) {
    return false;
  }

  try {
    // Try with GET first, then HEAD as fallback
    const response = await fetch(url, { method: 'GET' });
    return response.ok && response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Generate an image of the character using Leonardo AI (lucid-origin model)
 * Returns a data URL with the generated image
 */
async function searchCharacterImage(env: Env, name: string): Promise<string> {
  try {
    const prompt = `Minimalistic simplified portrait of ${name}, flat design, clean lines, black and white only, vector style, modern art. No text, no words, no letters in the image.`;

    const response = await env.AI.run('@cf/black-forest-labs/flux-2-klein-9b', {
      prompt: prompt,
    });

    // Log the response type for debugging
    console.log('Flux response type:', typeof response);
    console.log('Flux response keys:', Object.keys(response || {}));

    // Check if response has an image property (base64 string)
    if (response && typeof response === 'object' && 'image' in response) {
      const imageData = response.image;
      if (typeof imageData === 'string') {
        // It's a base64 string
        return `data:image/png;base64,${imageData}`;
      }
    }

    // If not a string, it might be raw binary data - try to convert
    if (response instanceof ArrayBuffer) {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(response)));
      return `data:image/png;base64,${base64}`;
    }

    return '';
  } catch (error) {
    console.error('Error generating image with Flux:', error);
    return '';
  }
}

/**
 * Fetch teacher/character information from OpenAI
 * @param env - Environment with OpenAI API key
 * @param characterName - Name of the character/teacher to fetch info for
 * @returns Teacher information with biographical details and context for AI persona
 */
export async function getTeacherInfo(env: Env, characterName: string): Promise<TeacherResponse> {
  try {
    if (!characterName || characterName.trim().length === 0) {
      return {
        success: false,
        error: 'Character name is required',
      };
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI API key is not configured',
      };
    }

    // Create a prompt to get structured information about the character
    const prompt = `You are a knowledge assistant. Provide detailed information about the historical or fictional character: "${characterName}"

Return ONLY valid JSON with exactly these fields (no markdown, no code blocks):
{
  "name": "Full name of the character",
  "livedFrom": "Birth year or 'Unknown' (just the year, e.g., '1849')",
  "livedTo": "Death year or 'Unknown' (just the year, e.g., '1936')",
  "description": "2-3 sentence biographical description",
  "context": "A detailed system prompt (200-300 words) that describes this character's personality, speaking style, knowledge areas, and how they should respond to questions. This will be used as a system prompt for an AI acting as this character.",
  "imgUrl": "Either a direct image URL that you are confident exists (like from Wikimedia), or just return an empty string if unsure"
}`;

    // Call OpenAI API for character info
    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledge assistant. Return ONLY valid JSON responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.text();
      console.error('OpenAI API error:', error);
      return {
        success: false,
        error: 'Failed to fetch character information from OpenAI',
      };
    }

    const data = await apiResponse.json() as { choices: Array<{ message: { content: string } }> };
    const responseText = data.choices?.[0]?.message?.content || '';
    const response = { response: responseText };

    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: 'Failed to fetch character information from AI',
      };
    }

    if (!responseText) {
      return {
        success: false,
        error: 'No response received from AI',
      };
    }

    // Parse the JSON response
    let parsedData: TeacherInfo;
    
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      parsedData = JSON.parse(cleanedText);
    } catch {
      return {
        success: false,
        error: 'Failed to parse character information from AI response',
      };
    }

    // Validate required fields
    if (!parsedData.name || !parsedData.description || !parsedData.context) {
      return {
        success: false,
        error: 'Invalid character data structure from AI',
      };
    }

    // Validate and search for image
    const imageUrl = parsedData.img || '';
    
    let finalImageUrl = '';
    
    try {
      // First, check if AI provided a valid image URL
      if (imageUrl && imageUrl.trim().length > 0) {
        const isValid = await isImageUrlValid(imageUrl);
        if (isValid) {
          finalImageUrl = imageUrl;
        }
      }
      
      // If AI URL is invalid or not provided, search for image URL via AI
      if (!finalImageUrl) {
        const searchedImage = await searchCharacterImage(env, parsedData.name);
        if (searchedImage) {
          finalImageUrl = searchedImage;
        }
      }
    } catch {
      // If image search fails, just continue without an image
      finalImageUrl = '';
    }

    return {
      success: true,
      data: {
        name: parsedData.name,
        livedFrom: parsedData.livedFrom || 'Unknown',
        livedTo: parsedData.livedTo || 'Unknown',
        description: parsedData.description,
        context: parsedData.context,
        img: finalImageUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching character info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Batch fetch multiple teachers
 * @param env - Cloudflare environment
 * @param characterNames - Array of character names
 * @returns Array of teacher info responses
 */
export async function getTeachersInfo(
  env: Env,
  characterNames: string[]
): Promise<TeacherResponse[]> {
  const results = await Promise.all(
    characterNames.map((name) => getTeacherInfo(env, name))
  );
  return results;
}

/**
 * Get all pre-saved teachers from database
 * @param env - Cloudflare environment
 * @returns Array of all teacher records
 */
export async function getAllTeachers(env: Env): Promise<{ success: boolean; teachers?: TeacherInfo[]; error?: string }> {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, livedFrom, livedTo, description, context, img FROM teachers ORDER BY name ASC'
    ).all() as { results: TeacherInfo[] };

    return {
      success: true,
      teachers: results || [],
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch teachers: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get a specific teacher from database or generate via AI if not found
 * Supports both exact names and descriptive prompts (e.g., "someone funny", "a pirate")
 * @param env - Cloudflare environment
 * @param nameOrPrompt - Teacher name or descriptive prompt
 * @returns Teacher record from database or AI-generated info
 */
export async function getTeacherFromDB(env: Env, nameOrPrompt: string): Promise<TeacherResponse> {
  try {
    if (!nameOrPrompt || nameOrPrompt.trim().length === 0) {
      return {
        success: false,
        error: 'Teacher name or prompt is required',
      };
    }

    // First, try to find an exact match in the database
    const record = await env.DB.prepare(
      'SELECT id, name, livedFrom, livedTo, description, context, img FROM teachers WHERE name = ? LIMIT 1'
    ).bind(nameOrPrompt).first() as TeacherInfo | undefined;

    if (record) {
      return {
        success: true,
        data: record,
      };
    }

    // If not found in database, treat it as a prompt and call AI
    // This allows queries like "someone funny", "a pirate", etc.
    const aiResponse = await getTeacherInfo(env, nameOrPrompt);
    return aiResponse;
  } catch (error) {
    return {
      success: false,
      error: `Error fetching teacher: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate 6 historical characters related to a given topic
 * @param env - Cloudflare environment
 * @param topic - Topic to generate characters for (e.g., "scientists", "artists", "philosophers")
 * @returns Array of 6 teacher/character records with AI-generated info
 */
export async function generateCharactersByTopic(env: Env, topic: string): Promise<TeachersListResponse> {
  try {
    if (!topic || topic.trim().length === 0) {
      return {
        success: false,
        error: 'Topic is required',
      };
    }

    const prompt = `You are a knowledge assistant. Generate information about 6 famous historical characters related to the topic: "${topic}"

Return ONLY valid JSON array with exactly 6 objects (no markdown, no code blocks). Each object must have these exact fields:
[
  {
    "name": "Full name of the character",
    "livedFrom": "Birth year or 'Unknown' (just the year, e.g., '1849')",
    "livedTo": "Death year or 'Unknown' (just the year, e.g., '1936')",
    "description": "2-3 sentence biographical description",
    "context": "A detailed system prompt (200-300 words) that describes this character's personality, speaking style, knowledge areas, and how they should respond to questions. This will be used as a system prompt for an AI acting as this character.",
    "imgUrl": "Either a direct image URL that you are confident exists (like from Wikimedia), or just return an empty string if unsure"
  },
  ...
]

Make sure the characters are diverse and well-known in the "${topic}" field.`;

    // Call Mistral AI to generate 6 characters
    const response = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.1', {
      prompt: prompt,
      max_tokens: 4096,
    });

    console.log('Mistral response type:', typeof response);
    
    const responseText = (response as { response?: string }).response || '';
    
    if (!responseText) {
      return {
        success: false,
        error: 'No response received from AI',
      };
    }

    // Parse the JSON response
    let characters: Array<any> = [];
    
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      characters = JSON.parse(cleanedText);
    } catch {
      return {
        success: false,
        error: 'Failed to parse characters from AI response',
      };
    }

    if (!Array.isArray(characters) || characters.length === 0) {
      return {
        success: false,
        error: 'Invalid character data structure from AI',
      };
    }

    // Process all characters sequentially
    const processedCharacters: TeacherInfo[] = [];

    for (const char of characters.slice(0, 6)) {
      // Validate required fields
      if (!char.name || !char.description || !char.context) {
        continue;
      }

      let finalImageUrl = '';

      try {
        // First, check if AI provided a valid image URL
        if (char.imgUrl && char.imgUrl.trim().length > 0) {
          const isValid = await isImageUrlValid(char.imgUrl);
          if (isValid) {
            finalImageUrl = char.imgUrl;
          }
        }

        // If AI URL is invalid or not provided, search for image via AI
        if (!finalImageUrl) {
          const searchedImage = await searchCharacterImage(env, char.name);
          if (searchedImage) {
            finalImageUrl = searchedImage;
          }
        }
      } catch {
        // If image search fails, continue without an image
        finalImageUrl = '';
      }

      processedCharacters.push({
        name: char.name,
        livedFrom: char.livedFrom || 'Unknown',
        livedTo: char.livedTo || 'Unknown',
        description: char.description,
        context: char.context,
        img: finalImageUrl,
      });
    }

    return {
      success: true,
      data: processedCharacters,
    };
  } catch (error) {
    console.error('Error generating characters by topic:', error);
    return {
      success: false,
      error: `Failed to generate characters: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}