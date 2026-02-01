import { Hono } from 'hono';
import type { Env } from '../types';

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

    const llmResponse = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
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
    }) as AIResponse;

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
    } catch (parseError) {
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

    const llmResponse = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
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

    let newSection: OutlineItem;
    let cleanedContent = contentStr.trim();
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7);
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3);
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3);
    cleanedContent = cleanedContent.trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedContent = jsonMatch[0];

    newSection = JSON.parse(cleanedContent);

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
