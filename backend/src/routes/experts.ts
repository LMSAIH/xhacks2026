import { Hono } from 'hono';
import type { Env } from '../types';

// Character interface matching frontend expectations
export interface Character {
  id: string;
  name: string;
  title: string;
  era: string;
  image: string;
  description: string;
  teachingStyle: string;
}

interface AIResponse {
  response?: string;
}

const expertsRoutes = new Hono<{ Bindings: Env }>();

/**
 * Find experts on a topic using Cloudflare Workers AI (Llama 3.3 70B)
 * GET /api/experts?topic=data+structures&count=6
 */
expertsRoutes.get('/', async (c) => {
  const topic = c.req.query('topic');
  const countParam = c.req.query('count');
  const count = countParam ? Math.min(Math.max(parseInt(countParam, 10) || 6, 1), 12) : 6;

  if (!topic) {
    return c.json({
      success: false,
      error: 'Topic query parameter is required',
    }, 400);
  }

  try {
    // Check cache first
    const cacheKey = `experts:${topic}:${count}`;
    const cachedResult = await c.env.KV.get(cacheKey, 'json') as any;
    if (cachedResult) {
      return c.json(cachedResult);
    }

    const prompt = `You are an expert researcher. Find exactly ${count} real historical or contemporary experts, scientists, or notable figures who are renowned for their contributions to "${topic}".

For each expert, you MUST provide all these fields:
- id: A unique lowercase slug (e.g., "donald-knuth")
- name: Their full name
- title: Their professional title or main role
- era: The years they lived/live (e.g., "1879-1955" or "1938-present")
- image: A Wikipedia/Wikimedia Commons portrait URL (must be direct link ending in .jpg or .png, like "https://upload.wikimedia.org/wikipedia/commons/thumb/.../440px-Name.jpg")
- description: A 1-2 sentence description of their key contributions
- teachingStyle: How they explain and communicate complex concepts based on their known methods

Return ONLY a valid JSON array with NO markdown formatting, NO code blocks, NO explanation text:
[{"id":"...","name":"...","title":"...","era":"...","image":"...","description":"...","teachingStyle":"..."}]

Focus on finding real, verifiable experts with well-documented contributions. Include diverse perspectives. For images, use real Wikipedia/Wikimedia URLs you're confident exist.`;

    // Use Llama 3.3 70B - best large model for knowledge and reasoning
    const response = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable research assistant that finds real experts and notable figures. Always respond with ONLY valid JSON arrays, no markdown, no code blocks, no extra text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }) as AIResponse;

    const content = response?.response;

    if (!content) {
      return c.json({
        success: false,
        error: 'No response from AI model',
      }, 500);
    }

    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Parse the JSON response
    let experts: Character[];
    try {
      // Clean response - remove markdown code blocks if present
      let cleanedContent = contentStr.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      // Find the JSON array in the response
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }

      experts = JSON.parse(cleanedContent);

      // Validate and sanitize each expert
      experts = experts.map((expert, index) => ({
        id: expert.id || `expert-${index}-${Date.now()}`,
        name: expert.name || 'Unknown Expert',
        title: expert.title || 'Expert',
        era: expert.era || 'Unknown',
        image: expert.image || '',
        description: expert.description || '',
        teachingStyle: expert.teachingStyle || 'Shares knowledge through clear explanations',
      }));
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return c.json({
        success: false,
        error: 'Failed to parse expert data',
        raw: content,
      }, 500);
    }

    const result = {
      success: true,
      topic,
      count: experts.length,
      experts,
    };

    // Cache the result for 24 hours
    await c.env.KV.put(cacheKey, JSON.stringify(result), {
      expirationTtl: 86400,
    });

    return c.json(result);
  } catch (error) {
    console.error('Error finding experts:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
});

/**
 * Generate portrait images for experts concurrently using FLUX Schnell (fastest model)
 * POST /api/experts/images
 * Body: { experts: [{ id, name, title, era }] }
 * Returns: { images: [{ id, image }] }
 */
expertsRoutes.post('/images', async (c) => {
  try {
    const body = await c.req.json() as { experts: Array<{ id: string; name: string; title?: string; era?: string }> };
    
    if (!body.experts || !Array.isArray(body.experts) || body.experts.length === 0) {
      return c.json({
        success: false,
        error: 'experts array is required in request body',
      }, 400);
    }

    // Limit to 12 concurrent image generations
    const expertsToProcess = body.experts.slice(0, 12);

    // Generate images concurrently using Promise.allSettled for fault tolerance
    const imagePromises = expertsToProcess.map(async (expert) => {
      try {
        const prompt = `Professional portrait painting of ${expert.name}, ${expert.title || 'scholar'} from ${expert.era || 'history'}. Academic style, dignified pose, neutral background, high quality, detailed face, renaissance portrait style, oil painting aesthetic.`;

        // Use FLUX Schnell - fastest image model (12B params, optimized for speed)
        const response = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
          prompt: prompt,
          num_steps: 4, // Fewer steps = faster generation
        });

        // Handle response - could be base64 string or binary
        let imageData = '';
        if (response && typeof response === 'object' && 'image' in response) {
          const img = (response as { image: string }).image;
          if (typeof img === 'string') {
            imageData = `data:image/png;base64,${img}`;
          }
        } else if (response instanceof ArrayBuffer) {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(response)));
          imageData = `data:image/png;base64,${base64}`;
        }

        return {
          id: expert.id,
          name: expert.name,
          image: imageData,
          success: true,
        };
      } catch (err) {
        console.error(`Failed to generate image for ${expert.name}:`, err);
        return {
          id: expert.id,
          name: expert.name,
          image: '',
          success: false,
          error: 'Image generation failed',
        };
      }
    });

    const results = await Promise.allSettled(imagePromises);
    
    const images = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        id: 'unknown',
        name: 'unknown',
        image: '',
        success: false,
        error: 'Promise rejected',
      };
    });

    const successCount = images.filter(img => img.success).length;

    return c.json({
      success: true,
      total: expertsToProcess.length,
      generated: successCount,
      images,
    });
  } catch (error) {
    console.error('Error generating expert images:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
});

/**
 * Find experts AND generate their images in one call
 * GET /api/experts/with-images?topic=algorithms&count=6
 */
expertsRoutes.get('/with-images', async (c) => {
  const topic = c.req.query('topic');
  const countParam = c.req.query('count');
  const count = countParam ? Math.min(Math.max(parseInt(countParam, 10) || 6, 1), 12) : 6;

  if (!topic) {
    return c.json({
      success: false,
      error: 'Topic query parameter is required',
    }, 400);
  }

  try {
    // Check cache first
    const cacheKey = `experts:with-images:${topic}:${count}`;
    const cachedResult = await c.env.KV.get(cacheKey, 'json') as any;
    if (cachedResult) {
      return c.json(cachedResult);
    }

    // Step 1: Find experts using LLM
    const prompt = `You are an expert researcher. Find exactly ${count} real historical or contemporary experts, scientists, or notable figures who are renowned for their contributions to "${topic}".

For each expert, you MUST provide all these fields:
- id: A unique lowercase slug (e.g., "donald-knuth")
- name: Their full name
- title: Their professional title or main role
- era: The years they lived/live (e.g., "1879-1955" or "1938-present")
- description: A 1-2 sentence description of their key contributions
- teachingStyle: How they explain and communicate complex concepts

Return ONLY a valid JSON array with NO markdown formatting, NO code blocks:
[{"id":"...","name":"...","title":"...","era":"...","description":"...","teachingStyle":"..."}]`;

    const llmResponse = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable research assistant. Always respond with ONLY valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }) as AIResponse;

    const content = llmResponse?.response;
    if (!content) {
      return c.json({ success: false, error: 'No response from AI model' }, 500);
    }

    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Parse experts
    let experts: Character[];
    let cleanedContent = contentStr.trim();
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7);
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3);
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3);
    cleanedContent = cleanedContent.trim();
    
    const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) cleanedContent = jsonMatch[0];
    
    experts = JSON.parse(cleanedContent);

    // Step 2: Generate images concurrently
    const imagePromises = experts.map(async (expert) => {
      try {
        const imgPrompt = `Professional portrait painting of ${expert.name}, ${expert.title || 'scholar'}. Academic style, dignified pose, neutral background, renaissance portrait style, oil painting.`;

        const response = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
          prompt: imgPrompt,
          num_steps: 4,
        });

        let imageData = '';
        if (response && typeof response === 'object' && 'image' in response) {
          const img = (response as { image: string }).image;
          if (typeof img === 'string') {
            imageData = `data:image/png;base64,${img}`;
          }
        } else if (response instanceof ArrayBuffer) {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(response)));
          imageData = `data:image/png;base64,${base64}`;
        }

        return { ...expert, image: imageData };
      } catch {
        return { ...expert, image: '' };
      }
    });

    const expertsWithImages = await Promise.all(imagePromises);

    // Sanitize output
    const finalExperts = expertsWithImages.map((expert, index) => ({
      id: expert.id || `expert-${index}`,
      name: expert.name || 'Unknown Expert',
      title: expert.title || 'Expert',
      era: expert.era || 'Unknown',
      image: expert.image || '',
      description: expert.description || '',
      teachingStyle: expert.teachingStyle || 'Clear explanations',
    }));

    const result = {
      success: true,
      topic,
      count: finalExperts.length,
      experts: finalExperts,
    };

    // Cache the result for 24 hours
    await c.env.KV.put(cacheKey, JSON.stringify(result), {
      expirationTtl: 86400,
    });

    return c.json(result);
  } catch (error) {
    console.error('Error finding experts with images:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
});

/**
 * Generate a custom character based on user description
 * POST /api/experts/generate-custom
 * Body: { description: string }
 * 
 * This allows users to create ANY character - real, fictional, animated, etc.
 */
expertsRoutes.post('/generate-custom', async (c) => {
  try {
    const body = await c.req.json();
    const description = body.description?.trim();

    if (!description) {
      return c.json({
        success: false,
        error: 'Character description is required',
      }, 400);
    }

    // Step 1: Generate character details using LLM
    const prompt = `Based on this description: "${description}"

Generate a character profile for a tutor/teacher personality. This can be ANY type of character - real historical figures, fictional characters, animated characters, celebrities, or completely made-up personalities.

Return ONLY a valid JSON object (no markdown, no code blocks) with these fields:
{
  "id": "unique-slug-id",
  "name": "Character's name or title",
  "title": "Their role or occupation",
  "era": "Time period, show/origin, or 'Custom Character'",
  "description": "A brief description of who they are (1-2 sentences)",
  "teachingStyle": "How they would teach and explain concepts based on their personality"
}

Examples:
- "SpongeBob" → Enthusiastic underwater character who makes learning fun with silly examples
- "Gordon Ramsay" → Intense but effective teacher who expects excellence
- "A wise wizard" → Patient and mystical, using magical analogies
- "My grandma" → Warm and nurturing, using everyday examples`;

    const llmResponse = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        {
          role: 'system',
          content: 'You are a creative character designer. Create engaging tutor personalities based on user descriptions. Always respond with ONLY valid JSON, no markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }) as AIResponse;

    const content = llmResponse?.response;
    if (!content) {
      return c.json({ success: false, error: 'No response from AI model' }, 500);
    }

    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Parse character details
    let character: Character;
    let cleanedContent = contentStr.trim();
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7);
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3);
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3);
    cleanedContent = cleanedContent.trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedContent = jsonMatch[0];

    character = JSON.parse(cleanedContent);

    // Step 2: Generate an image for the character
    const imgPrompt = `Portrait illustration of ${character.name}, ${character.title || 'character'}. ${character.description || ''}. High quality, expressive, character portrait, artistic style, vibrant colors, detailed.`;

    let imageData = '';
    try {
      const response = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
        prompt: imgPrompt,
        num_steps: 4,
      });

      if (response && typeof response === 'object' && 'image' in response) {
        const img = (response as { image: string }).image;
        if (typeof img === 'string') {
          imageData = `data:image/png;base64,${img}`;
        }
      } else if (response instanceof ArrayBuffer) {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(response)));
        imageData = `data:image/png;base64,${base64}`;
      }
    } catch (imgError) {
      console.error('Failed to generate image for custom character:', imgError);
      // Continue without image
    }

    // Sanitize and return the character
    const finalCharacter = {
      id: character.id || `custom-${Date.now()}`,
      name: character.name || description.slice(0, 30),
      title: character.title || 'Custom Tutor',
      era: character.era || 'Custom Character',
      image: imageData,
      description: character.description || `A custom tutor based on: ${description}`,
      teachingStyle: character.teachingStyle || 'Personalized teaching style',
      isCustom: true,
    };

    return c.json({
      success: true,
      character: finalCharacter,
    });
  } catch (error) {
    console.error('Error generating custom character:', error);
    return c.json({
      success: false,
      error: 'Failed to generate custom character',
    }, 500);
  }
});

export { expertsRoutes };
