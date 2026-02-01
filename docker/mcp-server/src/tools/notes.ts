import { searchCourseContent } from '../rag/cloudflare.js';
import { generateTutorResponse } from '../llm/openai.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ============================================================================
// CRITIQUE NOTES TOOL
// ============================================================================

export const CritiqueNotesSchema = {
  name: 'critique_notes',
  description: 'Review and critique student notes, providing suggestions for improvement',
  inputSchema: {
    type: 'object' as const,
    properties: {
      notes: {
        type: 'string' as const,
        description: 'The notes content to critique (plain text or markdown)',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Optional course code for context-aware feedback',
      },
      focusAreas: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Optional areas to focus critique on (e.g., ["clarity", "completeness", "accuracy"])',
      },
    },
    required: ['notes'],
  },
};

export interface CritiqueNotesParams {
  notes: string;
  courseCode?: string;
  focusAreas?: string[];
}

export async function critiqueNotes(params: CritiqueNotesParams) {
  const { notes, courseCode, focusAreas = ['clarity', 'completeness', 'accuracy'] } = params;

  // Get course context if provided
  let courseContext = '';
  if (courseCode) {
    try {
      const results = await searchCourseContent(courseCode, { limit: 3 });
      if (results.length > 0) {
        courseContext = results.map(r => r.document.content).join('\n\n');
      }
    } catch {
      // Continue without context
    }
  }

  const systemPrompt = `You are an expert academic tutor reviewing student notes. 
Provide constructive, actionable feedback on the notes.

Focus areas: ${focusAreas.join(', ')}

Your feedback should:
1. Highlight what's done well
2. Identify gaps or inaccuracies
3. Suggest specific improvements
4. Recommend additional topics to cover
5. Rate the notes quality (1-10)

Be encouraging but thorough. Format your response with clear sections.`;

  const userMessage = courseContext
    ? `Review these notes for ${courseCode}:\n\n${notes}\n\nCourse context:\n${courseContext}`
    : `Review these notes:\n\n${notes}`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      courseContext,
      { maxTokens: 1500 }
    );

    return {
      success: true,
      critique: response.content,
      usage: response.usage,
      focusAreas,
      courseCode: courseCode || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to critique notes',
    };
  }
}

// ============================================================================
// EXPLAIN CONCEPT TOOL
// ============================================================================

export const ExplainConceptSchema = {
  name: 'explain_concept',
  description: 'Explain a concept with course-relevant context from the knowledge base',
  inputSchema: {
    type: 'object' as const,
    properties: {
      concept: {
        type: 'string' as const,
        description: 'The concept or topic to explain',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Optional course code for course-specific explanation',
      },
      depth: {
        type: 'string' as const,
        enum: ['brief', 'standard', 'detailed'],
        description: 'Level of detail (brief: 1-2 sentences, standard: paragraph, detailed: comprehensive)',
        default: 'standard',
      },
      includeExamples: {
        type: 'boolean' as const,
        description: 'Whether to include practical examples',
        default: true,
      },
    },
    required: ['concept'],
  },
};

export interface ExplainConceptParams {
  concept: string;
  courseCode?: string;
  depth?: 'brief' | 'standard' | 'detailed';
  includeExamples?: boolean;
}

export async function explainConcept(params: ExplainConceptParams) {
  const { concept, courseCode, depth = 'standard', includeExamples = true } = params;

  // Get relevant context from RAG
  let courseContext = '';
  const searchQuery = courseCode ? `${courseCode} ${concept}` : concept;
  
  try {
    const results = await searchCourseContent(searchQuery, { limit: 5 });
    if (results.length > 0) {
      courseContext = results
        .map(r => `[${r.document.course_code}] ${r.document.content}`)
        .join('\n\n---\n\n');
    }
  } catch {
    // Continue without RAG context
  }

  const depthInstructions = {
    brief: 'Provide a concise 1-2 sentence explanation.',
    standard: 'Provide a clear paragraph explanation suitable for a student.',
    detailed: 'Provide a comprehensive explanation with background, details, and implications.',
  };

  const systemPrompt = `You are an expert tutor explaining concepts to students.
${depthInstructions[depth]}
${includeExamples ? 'Include practical examples to illustrate the concept.' : ''}
Use clear, accessible language. If relevant course material is provided, reference it.`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: `Explain: ${concept}` }],
      systemPrompt,
      courseContext,
      { maxTokens: depth === 'detailed' ? 2000 : depth === 'standard' ? 800 : 300 }
    );

    return {
      success: true,
      concept,
      explanation: response.content,
      depth,
      courseCode: courseCode || null,
      hasContext: courseContext.length > 0,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      concept,
      error: error instanceof Error ? error.message : 'Failed to explain concept',
    };
  }
}

// ============================================================================
// GENERATE DIAGRAM TOOL
// ============================================================================

export const GenerateDiagramSchema = {
  name: 'generate_diagram',
  description: `Generate an educational diagram or illustration. 
For CLI/agent use (source: 'cli'): Returns a detailed text description of the diagram that can be used to understand the concept.
For WebApp use (source: 'webapp'): Generates an actual image using DALL-E 3 and returns base64 data.
Default is 'cli' mode for agent integrations.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string' as const,
        description: 'Description of the diagram to generate',
      },
      style: {
        type: 'string' as const,
        enum: ['diagram', 'illustration', 'flowchart', 'infographic', 'sketch'],
        description: 'Visual style of the output',
        default: 'diagram',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Optional course code for context',
      },
      source: {
        type: 'string' as const,
        enum: ['cli', 'webapp'],
        description: "Source of the request: 'cli' for agents/IDE (returns description), 'webapp' for web app (returns image)",
        default: 'cli',
      },
    },
    required: ['description'],
  },
};

export interface GenerateDiagramParams {
  description: string;
  style?: 'diagram' | 'illustration' | 'flowchart' | 'infographic' | 'sketch';
  courseCode?: string;
  source?: 'cli' | 'webapp';
}

export async function generateDiagram(params: GenerateDiagramParams) {
  const { description, style = 'diagram', courseCode, source = 'cli' } = params;

  const stylePrompts = {
    diagram: 'Clean, professional educational diagram with labeled components. White background, clear lines, minimal colors.',
    illustration: 'Educational illustration with clear visual metaphors. Colorful but not distracting.',
    flowchart: 'Clean flowchart with boxes and arrows showing process flow. Professional business style.',
    infographic: 'Modern infographic style with icons, data visualizations, and clear hierarchy.',
    sketch: 'Hand-drawn sketch style, like a whiteboard drawing. Simple and clear.',
  };

  // For CLI/agent mode: Return a detailed text description instead of generating an image
  if (source === 'cli') {
    const systemPrompt = `You are an expert at describing educational diagrams and visual representations.
Create a detailed, structured description of a ${style} that explains: ${description}
${courseCode ? `Context: This is for ${courseCode} course.` : ''}

Your description should include:
1. **Overview**: What the diagram shows at a high level
2. **Components**: List each visual element with labels
3. **Relationships**: How components connect or relate
4. **Visual Layout**: Describe the spatial arrangement
5. **Key Takeaways**: What students should understand from this visualization

Format this so someone could either:
- Understand the concept without seeing the actual image
- Create the diagram themselves based on your description
- Use an image generation tool with this as a detailed prompt`;

    try {
      const response = await generateTutorResponse(
        [{ role: 'user', content: `Describe a ${style} for: ${description}` }],
        systemPrompt,
        '',
        { maxTokens: 1000 }
      );

      return {
        success: true,
        mode: 'description',
        source: 'cli',
        diagramDescription: response.content,
        description,
        style,
        courseCode: courseCode || null,
        usage: response.usage,
        note: 'Image generation is only available in webapp mode. This description can be used to understand the concept or create the diagram manually.',
      };
    } catch (error) {
      return {
        success: false,
        mode: 'description',
        source: 'cli',
        error: error instanceof Error ? error.message : 'Failed to generate diagram description',
      };
    }
  }

  // For WebApp mode: Generate actual image using DALL-E 3
  const prompt = `${stylePrompts[style]} ${courseCode ? `For ${courseCode} course. ` : ''}${description}. Educational, clear, suitable for students.`;

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    });

    const imageResult = response.data?.[0];
    const imageData = imageResult?.b64_json;
    
    if (!imageData) {
      return {
        success: false,
        mode: 'image',
        source: 'webapp',
        error: 'No image generated',
      };
    }

    return {
      success: true,
      mode: 'image',
      source: 'webapp',
      image: `data:image/png;base64,${imageData}`,
      description,
      style,
      revisedPrompt: imageResult?.revised_prompt || null,
    };
  } catch (error) {
    return {
      success: false,
      mode: 'image',
      source: 'webapp',
      error: error instanceof Error ? error.message : 'Failed to generate diagram',
    };
  }
}

// ============================================================================
// GET FORMULAS TOOL
// ============================================================================

export const GetFormulasSchema = {
  name: 'get_formulas',
  description: 'Get relevant formulas, equations, or key definitions for a topic',
  inputSchema: {
    type: 'object' as const,
    properties: {
      topic: {
        type: 'string' as const,
        description: 'The topic to get formulas for',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Optional course code for course-specific formulas',
      },
      format: {
        type: 'string' as const,
        enum: ['latex', 'plain', 'both'],
        description: 'Output format for formulas',
        default: 'latex',
      },
    },
    required: ['topic'],
  },
};

export interface GetFormulasParams {
  topic: string;
  courseCode?: string;
  format?: 'latex' | 'plain' | 'both';
}

export async function getFormulas(params: GetFormulasParams) {
  const { topic, courseCode, format = 'latex' } = params;

  // Get course context
  let courseContext = '';
  const searchQuery = courseCode ? `${courseCode} ${topic} formula equation` : `${topic} formula equation`;
  
  try {
    const results = await searchCourseContent(searchQuery, { limit: 5 });
    if (results.length > 0) {
      courseContext = results.map(r => r.document.content).join('\n\n');
    }
  } catch {
    // Continue without context
  }

  const formatInstructions = {
    latex: 'Format all formulas in LaTeX (e.g., $E = mc^2$ or $$\\int_a^b f(x) dx$$)',
    plain: 'Format formulas in plain text (e.g., E = mc^2)',
    both: 'Provide both LaTeX and plain text versions for each formula',
  };

  const systemPrompt = `You are a subject matter expert providing key formulas and equations.

${formatInstructions[format]}

For each formula, provide:
1. The formula/equation
2. Brief explanation of variables
3. When/how it's used

Organize by category if there are multiple formulas. Be comprehensive but focused on the most important formulas.`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: `What are the key formulas and equations for: ${topic}` }],
      systemPrompt,
      courseContext,
      { maxTokens: 1500 }
    );

    return {
      success: true,
      topic,
      formulas: response.content,
      format,
      courseCode: courseCode || null,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      topic,
      error: error instanceof Error ? error.message : 'Failed to get formulas',
    };
  }
}

// ============================================================================
// CHAT MESSAGE TOOL (Stateless)
// ============================================================================

export const ChatMessageSchema = {
  name: 'chat_message',
  description: 'Send a quick message to the AI tutor without creating a full session (stateless)',
  inputSchema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string' as const,
        description: 'Your message or question',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Optional course code for context',
      },
      persona: {
        type: 'string' as const,
        enum: ['tutor', 'socratic', 'professor', 'mentor'],
        description: 'Tutor persona style',
        default: 'tutor',
      },
      voiceMode: {
        type: 'boolean' as const,
        description: 'If true, response will be optimized for voice (shorter, conversational)',
        default: false,
      },
    },
    required: ['message'],
  },
};

export interface ChatMessageParams {
  message: string;
  courseCode?: string;
  persona?: 'tutor' | 'socratic' | 'professor' | 'mentor';
  voiceMode?: boolean;
}

const PERSONA_PROMPTS = {
  tutor: 'You are a helpful tutor who explains concepts clearly and checks understanding.',
  socratic: 'You are a Socratic tutor who uses questions to guide students to discover answers.',
  professor: 'You are a professor providing thorough, academic explanations with proper terminology.',
  mentor: 'You are a friendly mentor using casual language and real-world examples.',
};

export async function chatMessage(params: ChatMessageParams) {
  const { message, courseCode, persona = 'tutor', voiceMode = false } = params;

  // Get course context if provided
  let courseContext = '';
  if (courseCode) {
    try {
      const results = await searchCourseContent(`${courseCode} ${message}`, { limit: 3 });
      if (results.length > 0) {
        courseContext = results.map(r => r.document.content).join('\n\n');
      }
    } catch {
      // Continue without context
    }
  }

  const voiceInstructions = voiceMode
    ? 'Keep responses concise (2-3 sentences). Use natural, conversational language suitable for speech. Avoid complex formatting, lists, or code blocks.'
    : '';

  const systemPrompt = `${PERSONA_PROMPTS[persona]} ${voiceInstructions}`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: message }],
      systemPrompt,
      courseContext,
      { maxTokens: voiceMode ? 300 : 1024 }
    );

    return {
      success: true,
      response: response.content,
      persona,
      courseCode: courseCode || null,
      voiceMode,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate response',
    };
  }
}

// ============================================================================
// SUGGEST IMPROVEMENTS TOOL (for notes)
// ============================================================================

export const SuggestImprovementsSchema = {
  name: 'suggest_improvements',
  description: 'Suggest specific improvements or additions to notes based on course content',
  inputSchema: {
    type: 'object' as const,
    properties: {
      notes: {
        type: 'string' as const,
        description: 'Current notes content',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Course code to get relevant additions from',
      },
      section: {
        type: 'string' as const,
        description: 'Optional specific section or topic to focus on',
      },
    },
    required: ['notes', 'courseCode'],
  },
};

export interface SuggestImprovementsParams {
  notes: string;
  courseCode: string;
  section?: string;
}

export async function suggestImprovements(params: SuggestImprovementsParams) {
  const { notes, courseCode, section } = params;

  // Get comprehensive course context
  const searchQuery = section ? `${courseCode} ${section}` : courseCode;
  let courseContext = '';
  
  try {
    const results = await searchCourseContent(searchQuery, { limit: 8 });
    if (results.length > 0) {
      courseContext = results.map(r => `[${r.score.toFixed(2)}] ${r.document.content}`).join('\n\n');
    }
  } catch {
    return {
      success: false,
      error: 'Failed to fetch course content',
    };
  }

  const systemPrompt = `You are an expert tutor helping improve student notes for ${courseCode}.

Based on the course content provided, suggest specific improvements:

1. **Missing Topics**: Key concepts from the course not covered in the notes
2. **Incomplete Sections**: Areas that need more detail
3. **Additional Examples**: Helpful examples to add
4. **Connections**: Links between concepts that could be highlighted
5. **Study Tips**: Specific suggestions for this course

Format suggestions as actionable items the student can immediately add to their notes.`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: `My current notes:\n\n${notes}` }],
      systemPrompt,
      courseContext,
      { maxTokens: 1500 }
    );

    return {
      success: true,
      suggestions: response.content,
      courseCode,
      section: section || null,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
    };
  }
}
