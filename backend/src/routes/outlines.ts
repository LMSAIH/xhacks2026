import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Env } from '../types';
import { getPrecachedOutline } from '../services/precache';

// Outline item structure matching frontend expectations
export interface OutlineItem {
  id: string;
  number: string;
  title: string;
  description?: string;
  duration?: string;
  children?: OutlineItem[];
}

// Full course outline structure
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

interface AIResponse {
  response?: string;
}

const outlineRoutes = new Hono<{ Bindings: Env }>();

// Helper to run AI with timeout
async function runAIWithTimeout<T>(
  aiCall: () => Promise<T>,
  timeoutMs: number = 15000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
  });
  return Promise.race([aiCall(), timeoutPromise]);
}

// Generate fallback subsections based on section title
function generateFallbackChildren(sectionNumber: string, sectionTitle: string): OutlineItem[] {
  const topics = [
    { suffix: 'Introduction', desc: 'Getting started with the basics' },
    { suffix: 'Key Concepts', desc: 'Understanding the fundamental ideas' },
    { suffix: 'Examples', desc: 'Practical examples and demonstrations' },
  ];
  
  return topics.map((topic, idx) => ({
    id: `${sectionNumber}.${idx + 1}`,
    number: `${sectionNumber}.${idx + 1}`,
    title: `${sectionTitle} - ${topic.suffix}`,
    description: topic.desc,
    duration: '5 min',
  }));
}

/**
 * Generate a course outline using AI based on topic and optional character
 * POST /api/outlines/generate
 * Body: { topic: string, character?: { id, name, teachingStyle }, difficulty?: string }
 */
outlineRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { topic, character, difficulty = 'intermediate' } = body;

    if (!topic?.trim()) {
      return c.json({
        success: false,
        error: 'Topic is required',
      }, 400);
    }

    // Build character context for the prompt
    let characterContext = '';
    if (character?.name) {
      characterContext = `The course will be taught by ${character.name}`;
      if (character.teachingStyle) {
        characterContext += `, who teaches with this style: "${character.teachingStyle}"`;
      }
      characterContext += '. Tailor the outline to match their teaching approach and personality.';
    }

    const prompt = `Create a comprehensive course outline for learning about: "${topic}"

${characterContext}

Difficulty level: ${difficulty}

Generate a structured course outline with 5-7 main sections. Each section should have 2-4 subsections.

Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "sections": [
    {
      "id": "1",
      "number": "1",
      "title": "Section Title",
      "description": "Brief description of what this section covers",
      "duration": "15 min",
      "children": [
        {
          "id": "1.1",
          "number": "1.1",
          "title": "Subsection Title",
          "description": "What this covers",
          "duration": "5 min"
        }
      ]
    }
  ],
  "learningObjectives": [
    "By the end of this course, you will be able to...",
    "Understand the core concepts of...",
    "Apply knowledge to..."
  ],
  "estimatedDuration": "2 hours",
  "difficulty": "${difficulty}"
}

Make the outline:
1. Logical and progressive (build on previous concepts)
2. Practical with real-world applications
3. Include hands-on exercises or activities where appropriate
4. ${character?.name ? `Reflect ${character.name}'s unique teaching perspective` : 'Be engaging and accessible'}`;

    // Generate outline with timeout protection
    let llmResponse: AIResponse;
    try {
      llmResponse = await runAIWithTimeout(
        // @ts-expect-error - Model name is valid but not in local type definitions
        () => c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: 'You are an expert curriculum designer who creates structured, engaging course outlines. Always respond with ONLY valid JSON, no markdown, no code blocks.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4096,
          temperature: 0.5,
        }),
        25000 // 25 second timeout for full outline
      ) as AIResponse;
    } catch (timeoutError) {
      console.error('Outline generation timed out');
      return c.json({ success: false, error: 'Outline generation timed out. Please try again.' }, 504);
    }

    const content = llmResponse?.response;
    if (!content) {
      return c.json({ success: false, error: 'No response from AI model' }, 500);
    }

    // Ensure content is a string and parse it
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    let parsedOutline: {
      sections: OutlineItem[];
      learningObjectives: string[];
      estimatedDuration: string;
      difficulty: string;
    };

    let cleanedContent = contentStr.trim();
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7);
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3);
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3);
    cleanedContent = cleanedContent.trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedContent = jsonMatch[0];

    try {
      parsedOutline = JSON.parse(cleanedContent);
    } catch {
      console.error('Failed to parse outline:', cleanedContent);
      return c.json({ success: false, error: 'Failed to parse outline' }, 500);
    }

    // Generate a unique ID for this outline
    const outlineId = `outline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    // Build the complete outline
    const outline: GeneratedOutline = {
      id: outlineId,
      topic,
      character: character ? {
        id: character.id,
        name: character.name,
        teachingStyle: character.teachingStyle,
      } : undefined,
      sections: parsedOutline.sections || [],
      learningObjectives: parsedOutline.learningObjectives || [],
      estimatedDuration: parsedOutline.estimatedDuration || '1-2 hours',
      difficulty: (parsedOutline.difficulty as GeneratedOutline['difficulty']) || 'intermediate',
      createdAt: now,
      updatedAt: now,
    };

    // Store the outline in D1 for persistence
    await c.env.DB.prepare(`
      INSERT INTO course_outlines (id, topic, character_json, outline_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      outline.id,
      outline.topic,
      outline.character ? JSON.stringify(outline.character) : null,
      JSON.stringify({
        sections: outline.sections,
        learningObjectives: outline.learningObjectives,
        estimatedDuration: outline.estimatedDuration,
        difficulty: outline.difficulty,
      }),
      outline.createdAt,
      outline.updatedAt
    ).run();

    return c.json({
      success: true,
      outline,
    });
  } catch (error) {
    console.error('Error generating outline:', error);
    return c.json({
      success: false,
      error: 'Failed to generate outline',
    }, 500);
  }
});

/**
 * Generate a course outline with streaming - sends sections as they're generated
 * GET /api/outlines/generate/stream?topic=...&character=...&difficulty=...
 * 
 * Returns Server-Sent Events (SSE) stream with events:
 * - section: A new section was generated
 * - metadata: Learning objectives, duration, difficulty
 * - complete: Generation finished
 * - error: An error occurred
 */
outlineRoutes.get('/generate/stream', async (c) => {
  const topic = c.req.query('topic');
  const characterJson = c.req.query('character');
  const difficulty = c.req.query('difficulty') || 'intermediate';

  if (!topic?.trim()) {
    return c.json({ success: false, error: 'Topic is required' }, 400);
  }

  // Check for pre-cached outline first
  const cached = await getPrecachedOutline(c.env, topic);
  if (cached) {
    // Stream the cached outline
    return streamSSE(c, async (stream) => {
      // Send each section with a small delay for UI effect
      for (let i = 0; i < cached.sections.length; i++) {
        await stream.writeSSE({
          event: 'section',
          data: JSON.stringify({
            index: i,
            section: cached.sections[i],
            total: cached.sections.length,
          }),
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Send metadata
      await stream.writeSSE({
        event: 'metadata',
        data: JSON.stringify({
          learningObjectives: cached.learningObjectives,
          estimatedDuration: cached.estimatedDuration,
          difficulty: cached.difficulty,
        }),
      });

      // Send complete
      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({
          id: cached.id,
          topic: cached.topic,
          cached: true,
        }),
      });
    });
  }

  const character = characterJson ? JSON.parse(characterJson) : undefined;

  // Build character context for the prompt
  let characterContext = '';
  if (character?.name) {
    characterContext = `The course will be taught by ${character.name}`;
    if (character.teachingStyle) {
      characterContext += `, who teaches with this style: "${character.teachingStyle}"`;
    }
    characterContext += '. Tailor the outline to match their teaching approach.';
  }

  // For streaming, we generate sections one at a time
  return streamSSE(c, async (stream) => {
    const outlineId = `outline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const sections: OutlineItem[] = [];

    try {
      // First, get the overall structure (just titles)
      const structurePrompt = `For the topic "${topic}", generate a course outline structure.
${characterContext}
Difficulty: ${difficulty}

Return ONLY valid JSON with 5-7 section titles:
{
  "sectionTitles": ["Section 1 title", "Section 2 title", ...],
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "estimatedDuration": "2 hours",
  "difficulty": "${difficulty}"
}`;

      // First, get the overall structure (just titles) - with timeout
      let structureResponse: AIResponse;
      try {
        structureResponse = await runAIWithTimeout(
          // @ts-expect-error - Model name is valid but not in local type definitions
          () => c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
              { role: 'system', content: 'You are a curriculum designer. Respond with ONLY valid JSON.' },
              { role: 'user', content: structurePrompt },
            ],
            max_tokens: 512,
          }),
          10000 // 10 second timeout for structure
        ) as AIResponse;
      } catch (timeoutError) {
        console.warn('Structure generation timed out, using fallback');
        structureResponse = { response: '{}' };
      }

      let structure: {
        sectionTitles: string[];
        learningObjectives: string[];
        estimatedDuration: string;
        difficulty: string;
      };

      try {
        let content = structureResponse.response || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) content = jsonMatch[0];
        structure = JSON.parse(content);
      } catch {
        structure = {
          sectionTitles: ['Introduction', 'Core Concepts', 'Applications', 'Practice', 'Summary'],
          learningObjectives: [],
          estimatedDuration: '2 hours',
          difficulty: difficulty,
        };
      }

      // Send metadata early
      await stream.writeSSE({
        event: 'metadata',
        data: JSON.stringify({
          learningObjectives: structure.learningObjectives,
          estimatedDuration: structure.estimatedDuration,
          difficulty: structure.difficulty,
          totalSections: structure.sectionTitles.length,
        }),
      });

      // Generate each section in detail
      for (let i = 0; i < structure.sectionTitles.length; i++) {
        const sectionTitle = structure.sectionTitles[i];
        
        const sectionPrompt = `Create detailed content for section ${i + 1} of a course on "${topic}".

Section title: "${sectionTitle}"
${characterContext}

Return ONLY valid JSON:
{
  "id": "${i + 1}",
  "number": "${i + 1}",
  "title": "${sectionTitle}",
  "description": "What this section covers",
  "duration": "15 min",
  "children": [
    {
      "id": "${i + 1}.1",
      "number": "${i + 1}.1",
      "title": "Subsection title",
      "description": "What this covers",
      "duration": "5 min"
    }
  ]
}

Include 2-4 subsections with practical content.`;

        let sectionResponse: AIResponse;
        try {
          sectionResponse = await runAIWithTimeout(
            // @ts-expect-error - Model name is valid but not in local type definitions
            () => c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [
                { role: 'system', content: 'You are a curriculum designer. Respond with ONLY valid JSON.' },
                { role: 'user', content: sectionPrompt },
              ],
              max_tokens: 1024,
            }),
            12000 // 12 second timeout per section
          ) as AIResponse;
        } catch (timeoutError) {
          console.warn(`Section ${i + 1} generation timed out, using fallback`);
          sectionResponse = { response: '{}' };
        }

        try {
          let content = sectionResponse.response || '{}';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) content = jsonMatch[0];
          const section = JSON.parse(content) as OutlineItem;
          
          sections.push(section);

          // Stream the section to the client
          await stream.writeSSE({
            event: 'section',
            data: JSON.stringify({
              index: i,
              section,
              total: structure.sectionTitles.length,
            }),
          });
        } catch {
          // Fallback section with generated children
          const fallbackSection: OutlineItem = {
            id: String(i + 1),
            number: String(i + 1),
            title: sectionTitle,
            description: `Learn about ${sectionTitle.toLowerCase()} and its applications`,
            duration: '15 min',
            children: generateFallbackChildren(String(i + 1), sectionTitle),
          };
          sections.push(fallbackSection);

          await stream.writeSSE({
            event: 'section',
            data: JSON.stringify({
              index: i,
              section: fallbackSection,
              total: structure.sectionTitles.length,
            }),
          });
        }
      }

      // Store the complete outline in D1
      const now = new Date().toISOString();
      await c.env.DB.prepare(`
        INSERT INTO course_outlines (id, topic, character_json, outline_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        outlineId,
        topic,
        character ? JSON.stringify(character) : null,
        JSON.stringify({
          sections,
          learningObjectives: structure.learningObjectives,
          estimatedDuration: structure.estimatedDuration,
          difficulty: structure.difficulty,
        }),
        now,
        now
      ).run();

      // Send complete event
      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({
          id: outlineId,
          topic,
          cached: false,
        }),
      });
    } catch (error) {
      console.error('Streaming outline error:', error);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: 'Failed to generate outline' }),
      });
    }
  });
});

/**
 * Get an outline by ID
 * GET /api/outlines/:id
 */
outlineRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const result = await c.env.DB.prepare(`
      SELECT id, topic, character_json, outline_json, created_at, updated_at
      FROM course_outlines
      WHERE id = ?
    `).bind(id).first<{
      id: string;
      topic: string;
      character_json: string | null;
      outline_json: string;
      created_at: string;
      updated_at: string;
    }>();

    if (!result) {
      return c.json({ success: false, error: 'Outline not found' }, 404);
    }

    const outlineData = JSON.parse(result.outline_json);
    const outline: GeneratedOutline = {
      id: result.id,
      topic: result.topic,
      character: result.character_json ? JSON.parse(result.character_json) : undefined,
      sections: outlineData.sections,
      learningObjectives: outlineData.learningObjectives,
      estimatedDuration: outlineData.estimatedDuration,
      difficulty: outlineData.difficulty,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };

    return c.json({ success: true, outline });
  } catch (error) {
    console.error('Error fetching outline:', error);
    return c.json({ success: false, error: 'Failed to fetch outline' }, 500);
  }
});

/**
 * Update an existing outline
 * PUT /api/outlines/:id
 * Body: { sections?: OutlineItem[], learningObjectives?: string[], estimatedDuration?: string, difficulty?: string }
 */
outlineRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { sections, learningObjectives, estimatedDuration, difficulty } = body;

    // Fetch existing outline
    const existing = await c.env.DB.prepare(`
      SELECT outline_json FROM course_outlines WHERE id = ?
    `).bind(id).first<{ outline_json: string }>();

    if (!existing) {
      return c.json({ success: false, error: 'Outline not found' }, 404);
    }

    const existingData = JSON.parse(existing.outline_json);
    const now = new Date().toISOString();

    // Merge updates
    const updatedOutline = {
      sections: sections || existingData.sections,
      learningObjectives: learningObjectives || existingData.learningObjectives,
      estimatedDuration: estimatedDuration || existingData.estimatedDuration,
      difficulty: difficulty || existingData.difficulty,
    };

    // Update in database
    await c.env.DB.prepare(`
      UPDATE course_outlines
      SET outline_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(updatedOutline), now, id).run();

    // Fetch the full updated outline
    const updated = await c.env.DB.prepare(`
      SELECT id, topic, character_json, outline_json, created_at, updated_at
      FROM course_outlines
      WHERE id = ?
    `).bind(id).first<{
      id: string;
      topic: string;
      character_json: string | null;
      outline_json: string;
      created_at: string;
      updated_at: string;
    }>();

    if (!updated) {
      return c.json({ success: false, error: 'Failed to fetch updated outline' }, 500);
    }

    const outlineData = JSON.parse(updated.outline_json);
    const outline: GeneratedOutline = {
      id: updated.id,
      topic: updated.topic,
      character: updated.character_json ? JSON.parse(updated.character_json) : undefined,
      sections: outlineData.sections,
      learningObjectives: outlineData.learningObjectives,
      estimatedDuration: outlineData.estimatedDuration,
      difficulty: outlineData.difficulty,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    return c.json({ success: true, outline });
  } catch (error) {
    console.error('Error updating outline:', error);
    return c.json({ success: false, error: 'Failed to update outline' }, 500);
  }
});

/**
 * Update a specific section within an outline
 * PATCH /api/outlines/:id/sections/:sectionId
 * Body: { title?: string, description?: string, duration?: string, children?: OutlineItem[] }
 */
outlineRoutes.patch('/:id/sections/:sectionId', async (c) => {
  const outlineId = c.req.param('id');
  const sectionId = c.req.param('sectionId');

  try {
    const body = await c.req.json();

    // Fetch existing outline
    const existing = await c.env.DB.prepare(`
      SELECT outline_json FROM course_outlines WHERE id = ?
    `).bind(outlineId).first<{ outline_json: string }>();

    if (!existing) {
      return c.json({ success: false, error: 'Outline not found' }, 404);
    }

    const existingData = JSON.parse(existing.outline_json);
    const now = new Date().toISOString();

    // Helper to recursively update a section
    const updateSection = (sections: OutlineItem[]): OutlineItem[] => {
      return sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            title: body.title ?? section.title,
            description: body.description ?? section.description,
            duration: body.duration ?? section.duration,
            children: body.children ?? section.children,
          };
        }
        if (section.children) {
          return {
            ...section,
            children: updateSection(section.children),
          };
        }
        return section;
      });
    };

    const updatedSections = updateSection(existingData.sections);
    const updatedOutline = {
      ...existingData,
      sections: updatedSections,
    };

    // Update in database
    await c.env.DB.prepare(`
      UPDATE course_outlines
      SET outline_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(updatedOutline), now, outlineId).run();

    return c.json({
      success: true,
      section: updatedSections.find(s => s.id === sectionId) ||
               updatedSections.flatMap(s => s.children || []).find(c => c.id === sectionId),
    });
  } catch (error) {
    console.error('Error updating section:', error);
    return c.json({ success: false, error: 'Failed to update section' }, 500);
  }
});

/**
 * Delete an outline
 * DELETE /api/outlines/:id
 */
outlineRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    await c.env.DB.prepare(`
      DELETE FROM course_outlines WHERE id = ?
    `).bind(id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting outline:', error);
    return c.json({ success: false, error: 'Failed to delete outline' }, 500);
  }
});

/**
 * Regenerate a specific section using AI
 * POST /api/outlines/:id/sections/:sectionId/regenerate
 * Body: { instructions?: string }
 */
outlineRoutes.post('/:id/sections/:sectionId/regenerate', async (c) => {
  const outlineId = c.req.param('id');
  const sectionId = c.req.param('sectionId');

  try {
    const body = await c.req.json();
    const { instructions } = body;

    // Fetch existing outline
    const existing = await c.env.DB.prepare(`
      SELECT topic, character_json, outline_json FROM course_outlines WHERE id = ?
    `).bind(outlineId).first<{
      topic: string;
      character_json: string | null;
      outline_json: string;
    }>();

    if (!existing) {
      return c.json({ success: false, error: 'Outline not found' }, 404);
    }

    const existingData = JSON.parse(existing.outline_json);
    const character = existing.character_json ? JSON.parse(existing.character_json) : null;

    // Find the current section
    const findSection = (sections: OutlineItem[], id: string): OutlineItem | null => {
      for (const section of sections) {
        if (section.id === id) return section;
        if (section.children) {
          const found = findSection(section.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const currentSection = findSection(existingData.sections, sectionId);
    if (!currentSection) {
      return c.json({ success: false, error: 'Section not found' }, 404);
    }

    // Build regeneration prompt
    let characterContext = '';
    if (character?.name) {
      characterContext = `The course is taught by ${character.name}${character.teachingStyle ? ` with this teaching style: "${character.teachingStyle}"` : ''}.`;
    }

    const prompt = `Regenerate this course section for the topic "${existing.topic}".

Current section:
- Number: ${currentSection.number}
- Title: ${currentSection.title}
${currentSection.description ? `- Description: ${currentSection.description}` : ''}

${characterContext}

${instructions ? `Additional instructions: ${instructions}` : ''}

Generate an improved version of this section with 2-4 subsections.

Return ONLY a valid JSON object (no markdown):
{
  "id": "${currentSection.id}",
  "number": "${currentSection.number}",
  "title": "Improved Section Title",
  "description": "Brief description",
  "duration": "estimated time",
  "children": [
    {
      "id": "${currentSection.id}.1",
      "number": "${currentSection.number}.1",
      "title": "Subsection Title",
      "description": "What this covers",
      "duration": "5 min"
    }
  ]
}`;

    // @ts-expect-error - Model name is valid but not in local type definitions
    const llmResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert curriculum designer. Regenerate course sections to be more engaging and comprehensive. Always respond with ONLY valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
      temperature: 0.6,
    }) as AIResponse;

    const content = llmResponse?.response;
    if (!content) {
      return c.json({ success: false, error: 'No response from AI model' }, 500);
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    let cleanedContent = contentStr.trim();
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7);
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3);
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3);
    cleanedContent = cleanedContent.trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedContent = jsonMatch[0];

    const newSection: OutlineItem = JSON.parse(cleanedContent);

    // Update the section in the outline
    const now = new Date().toISOString();
    const updateSection = (sections: OutlineItem[]): OutlineItem[] => {
      return sections.map(section => {
        if (section.id === sectionId) {
          return newSection;
        }
        if (section.children) {
          return {
            ...section,
            children: updateSection(section.children),
          };
        }
        return section;
      });
    };

    const updatedOutline = {
      ...existingData,
      sections: updateSection(existingData.sections),
    };

    // Save to database
    await c.env.DB.prepare(`
      UPDATE course_outlines
      SET outline_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(updatedOutline), now, outlineId).run();

    return c.json({
      success: true,
      section: newSection,
    });
  } catch (error) {
    console.error('Error regenerating section:', error);
    return c.json({ success: false, error: 'Failed to regenerate section' }, 500);
  }
});

export { outlineRoutes };
